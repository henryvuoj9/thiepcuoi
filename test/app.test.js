"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startApp, makeClient } = require("./helpers");

let app, guest, admin;

before(async () => {
  app = await startApp();
  guest = makeClient(app.base);
  admin = makeClient(app.base);
  await app.db.createGuest({ slug: "tuan", name: "Nguyễn Văn Tuấn", honorific: "anh", groupName: "Nhà trai", note: "" });
});

after(async () => { await app.stop(); });

/* ---------- thiệp ---------- */

test("trang gốc trả thiệp chung, không tên ai", async () => {
  const res = await guest("/");
  const html = await res.text();

  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  assert.ok(!html.includes("window.GUEST="));
});

test("thiệp không được để proxy lưu lại", async () => {
  const res = await guest("/");
  assert.match(res.headers.get("cache-control"), /no-store/);
});

test("slug có thật trả thiệp mang tên khách", async () => {
  const res = await guest("/tuan");
  const html = await res.text();

  assert.equal(res.status, 200);
  assert.ok(html.includes("window.GUEST="));
  assert.ok(html.includes('"slug":"tuan"'));
});

test("slug lạ vẫn trả thiệp chung chứ không báo lỗi", async () => {
  const res = await makeClient(app.base)("/khong-he-ton-tai");
  const html = await res.text();

  assert.equal(res.status, 200);
  assert.ok(!html.includes("window.GUEST="));
});

test("đường dẫn không phải slug thì 404, không trả cả thiệp", async () => {
  for (const path of ["/favicon.ico", "/robots.txt", "/tuan-", "/a_b"]) {
    const res = await makeClient(app.base)(path);
    assert.equal(res.status, 404, `${path} phải trả 404`);
  }
});

test("gõ hoa/thường lẫn lộn thì đưa về địa chỉ chuẩn", async () => {
  const res = await makeClient(app.base)("/TuAn");
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "/tuan");
});

test("đếm lượt mở một lần cho mỗi máy, tải lại không cộng thêm", async () => {
  const visitor = makeClient(app.base);
  const before = (await app.db.guestBySlug("tuan")).opened_count;

  await visitor("/tuan");
  await new Promise((r) => setTimeout(r, 30)); // ghi nhận chạy kiểu bắn-và-quên
  const afterFirst = (await app.db.guestBySlug("tuan")).opened_count;
  assert.equal(afterFirst, before + 1);

  await visitor("/tuan");
  await visitor("/tuan");
  await new Promise((r) => setTimeout(r, 30));
  assert.equal((await app.db.guestBySlug("tuan")).opened_count, before + 1, "tải lại không được cộng thêm");

  await makeClient(app.base)("/tuan"); // máy khác
  await new Promise((r) => setTimeout(r, 30));
  assert.equal((await app.db.guestBySlug("tuan")).opened_count, before + 2);
});

/* ---------- xác nhận tham dự ---------- */

test("gửi xác nhận được lưu và gắn đúng khách", async () => {
  const res = await guest("/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "tuan", name: "Nguyễn Văn Tuấn", attending: true, guests: 3 }),
  });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });

  const saved = app.db._state.rsvps.at(-1);
  assert.equal(saved.name, "Nguyễn Văn Tuấn");
  assert.equal(saved.partySize, 3);
  assert.equal(saved.attending, true);
  assert.equal(saved.guestId, 1, "phải nối được với khách qua slug");
});

test("thiếu tên thì từ chối", async () => {
  const res = await guest("/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "tuan", name: "   ", attending: true }),
  });
  assert.equal(res.status, 400);
});

test("số người bị kẹp vào khoảng hợp lý", async () => {
  await guest("/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Khách lạ", attending: true, guests: 9999 }),
  });
  assert.equal(app.db._state.rsvps.at(-1).partySize, 10);
});

/* ---------- quản trị ---------- */

function csrfOf(html) {
  return /name="_csrf" value="([^"]+)"/.exec(html)[1];
}

test("chưa đăng nhập thì bị đẩy về trang đăng nhập", async () => {
  const res = await makeClient(app.base)("/admin");
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/admin/login");
});

test("sai mật khẩu thì không vào được", async () => {
  const client = makeClient(app.base);
  const res = await client("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ user: "admin", password: "sai-mat-khau" }).toString(),
  });

  assert.equal(res.status, 302);
  assert.match(res.headers.get("location"), /err=/);
  assert.equal((await client("/admin")).status, 302, "vẫn phải bị chặn");
});

test("chuỗi băm bị cắt cụt thì nói là lỗi cấu hình, không nói sai mật khẩu", async () => {
  const good = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_HASH = "scrypt"; // đúng thứ shell để lại sau khi nuốt $...

  const res = await makeClient(app.base)("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ user: "admin", password: app.password }).toString(),
  });

  process.env.ADMIN_PASSWORD_HASH = good;
  assert.match(decodeURIComponent(res.headers.get("location")), /ADMIN_PASSWORD_HASH/);
});

test("đúng mật khẩu thì vào được danh sách khách", async () => {
  const res = await admin("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ user: "admin", password: app.password }).toString(),
  });
  assert.equal(res.headers.get("location"), "/admin");

  const page = await admin("/admin");
  const html = await page.text();

  assert.equal(page.status, 200);
  assert.ok(html.includes("Nguyễn Văn Tuấn"));
  assert.ok(html.includes("https://vulinh.site/tuan"), "phải dựng sẵn link đầy đủ để copy");
});

test("thêm khách thì slug tự sinh từ tên", async () => {
  const html = await (await admin("/admin")).text();

  await admin("/admin/guests", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      _csrf: csrfOf(html), name: "Lê Thị Mai Phương", honorific: "chị", group: "Nhà gái",
    }).toString(),
  });

  const added = await app.db.guestBySlug("le-thi-mai-phuong");
  assert.ok(added, "phải tạo được khách với slug không dấu");
  assert.equal(added.honorific, "chị");
  assert.equal(added.group_name, "Nhà gái");
});

test("trùng slug thì tự thêm hậu tố", async () => {
  const html = await (await admin("/admin")).text();

  await admin("/admin/guests", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _csrf: csrfOf(html), name: "Nguyễn Văn Tuấn" }).toString(),
  });

  assert.ok(await app.db.guestBySlug("nguyen-van-tuan"));
});

test("không có token CSRF thì từ chối ghi", async () => {
  const res = await admin("/admin/guests", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ name: "Kẻ giả mạo" }).toString(),
  });

  assert.equal(res.status, 403);
  assert.equal(await app.db.guestBySlug("ke-gia-mao"), null);
});

test("không nhận slug trùng đường dẫn hệ thống", async () => {
  const html = await (await admin("/admin")).text();

  await admin("/admin/guests", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _csrf: csrfOf(html), name: "Quản trị", slug: "admin" }).toString(),
  });

  const saved = app.db._state.guests.find((g) => g.name === "Quản trị");
  assert.ok(saved);
  assert.notEqual(saved.slug, "admin", "slug admin phải bị né");
});

test("xuất CSV có BOM và link đầy đủ", async () => {
  const res = await admin("/admin/export.csv");
  // res.text() nuốt BOM theo đúng chuẩn fetch, nên phải soi ở mức byte.
  const bytes = Buffer.from(await res.arrayBuffer());

  assert.match(res.headers.get("content-type"), /text\/csv/);
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], "cần BOM để Excel đọc đúng tiếng Việt");
  assert.ok(bytes.toString("utf8").includes("https://vulinh.site/tuan"));
});

test("thoát ra thì mất quyền", async () => {
  await admin("/admin/logout");
  assert.equal((await admin("/admin")).status, 302);
});
