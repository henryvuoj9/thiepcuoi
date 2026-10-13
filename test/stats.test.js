"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startApp, makeClient } = require("./helpers");

let app, admin;

before(async () => {
  app = await startApp();
  admin = makeClient(app.base);
  await admin("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ user: "admin", password: app.password }).toString(),
  });
});

after(async () => { await app.stop(); });

const rsvp = (body) =>
  makeClient(app.base)("/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

function csrfOf(html) {
  return /name="_csrf" value="([^"]+)"/.exec(html)[1];
}

/** Đọc các con số ngay từ bảng điều khiển, như chủ thiệp nhìn thấy. */
async function dashboardNumbers() {
  const html = await (await admin("/admin")).text();
  const out = {};
  for (const m of html.matchAll(/<div class="n">(\d+)<\/div><div class="l">([^<]+)<\/div>/g)) {
    out[m[2]] = Number(m[1]);
  }
  return out;
}

test("xoá khách thì mọi con số tính lại cho đúng", async () => {
  /* Lỗi thật: bảng rsvps không có ràng buộc khoá ngoại, nên xác nhận của khách
     đã xoá vẫn nằm lại và vẫn được đếm — bảng báo 1 khách mời nhưng 4 nhận lời. */
  const id = await app.db.createGuest({ slug: "an", name: "Trần Văn An", honorific: "anh", groupName: "", note: "" });
  await rsvp({ slug: "an", name: "Trần Văn An", attending: true, guests: 3 });

  let n = await dashboardNumbers();
  assert.equal(n["Khách mời"], 1);
  assert.equal(n["Nhận lời"], 1);
  assert.equal(n["Tổng người đến"], 3);

  await app.db.deleteGuest(id);

  n = await dashboardNumbers();
  assert.equal(n["Khách mời"], 0, "đã xoá khách");
  assert.equal(n["Nhận lời"], 0, "xác nhận của khách đã xoá không được đếm nữa");
  assert.equal(n["Tổng người đến"], 0);
  assert.equal(n["Bận"], 0);
});

test("xác nhận của khách đã xoá biến khỏi bảng xác nhận", async () => {
  const id = await app.db.createGuest({ slug: "binh", name: "Lê Bình", honorific: "anh", groupName: "", note: "" });
  await rsvp({ slug: "binh", name: "Lê Bình", attending: true, guests: 2 });
  assert.match(await (await admin("/admin/rsvps")).text(), /Lê Bình/);

  await app.db.deleteGuest(id);
  assert.ok(!(await (await admin("/admin/rsvps")).text()).includes("Lê Bình"), "còn sót dòng mồ côi");
});

test("khách đổi ý thì chỉ tính lần trả lời mới nhất", async () => {
  const id = await app.db.createGuest({ slug: "cuong", name: "Phạm Cường", honorific: "anh", groupName: "", note: "" });
  await rsvp({ slug: "cuong", name: "Phạm Cường", attending: true, guests: 4 });
  await rsvp({ slug: "cuong", name: "Phạm Cường", attending: false, guests: 1 });

  const n = await dashboardNumbers();
  assert.equal(n["Nhận lời"], 0, "lần sau là từ chối");
  assert.equal(n["Bận"], 1);
  assert.equal(n["Tổng người đến"], 0, "không được cộng 4 người của lần trả lời cũ");

  await app.db.deleteGuest(id);
});

test("người vào thiệp chung vẫn được tính", async () => {
  /* Họ không gắn với khách nào, nên không phải dòng mồ côi — đừng lọc nhầm. */
  await rsvp({ name: "Người lạ", attending: true, guests: 2 });

  const n = await dashboardNumbers();
  assert.equal(n["Khách mời"], 0);
  assert.equal(n["Nhận lời"], 1);
  assert.equal(n["Tổng người đến"], 2);
});

test("xoá được từng dòng xác nhận, kể cả dòng không gắn với khách nào", async () => {
  /* Chủ thiệp xoá hết khách mà bảng vẫn báo 3 người nhận lời. Hoá ra đó là các
     xác nhận gửi từ thiệp chung — không gắn khách nên không phải dòng mồ côi,
     phép đếm không sai. Thiếu là thiếu cách xoá chúng: CRM chỉ xoá được khách. */
  /* Các kiểm thử trong tệp này dùng chung trạng thái, nên đo theo mức chênh. */
  const before = await dashboardNumbers();
  await rsvp({ name: "Người thử nghiệm", attending: true, guests: 2 });

  let n = await dashboardNumbers();
  assert.equal(n["Khách mời"], 0, "không có khách nào");
  assert.equal(n["Nhận lời"], before["Nhận lời"] + 1, "vẫn đếm xác nhận từ thiệp chung");

  const page = await (await admin("/admin/rsvps")).text();
  assert.match(page, /gửi từ thiệp chung/, "phải nói rõ dòng này từ đâu tới");
  /* Dòng mới nhất nằm trên cùng — bảng sắp xếp giảm dần theo id. */
  const id = /\/admin\/rsvps\/(\d+)\/delete/.exec(page)[1];

  await admin(`/admin/rsvps/${id}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _csrf: csrfOf(page) }).toString(),
  });

  n = await dashboardNumbers();
  assert.equal(n["Nhận lời"], before["Nhận lời"], "xoá xong phải về mức cũ");
  assert.equal(n["Tổng người đến"], before["Tổng người đến"]);
  assert.ok(!(await (await admin("/admin/rsvps")).text()).includes("Người thử nghiệm"));
});

test("không có token CSRF thì không xoá được xác nhận", async () => {
  await rsvp({ name: "Khách cần giữ", attending: true, guests: 1 });
  const page = await (await admin("/admin/rsvps")).text();
  const id = /\/admin\/rsvps\/(\d+)\/delete/.exec(page)[1];

  const res = await admin(`/admin/rsvps/${id}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "",
  });
  assert.equal(res.status, 403);
  assert.match(await (await admin("/admin/rsvps")).text(), /Khách cần giữ/);
});
