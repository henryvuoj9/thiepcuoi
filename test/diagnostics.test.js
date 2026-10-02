"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startApp, makeClient } = require("./helpers");
const dbErrors = require("../src/db-errors");

test("dịch được các mã lỗi MySQL hay gặp", () => {
  assert.match(dbErrors.explain({ code: "ER_BAD_DB_ERROR" }).hint, /DB_NAME/);
  assert.match(dbErrors.explain({ code: "ER_ACCESS_DENIED_ERROR" }).hint, /DB_USER/);
  assert.match(dbErrors.explain({ code: "ER_DBACCESS_DENIED_ERROR" }).hint, /ALL PRIVILEGES/);
  assert.match(dbErrors.explain({ code: "ECONNREFUSED" }).hint, /DB_HOST/);
});

test("mã lỗi CSDL lạ vẫn được nêu, nhưng không bịa lời khuyên", () => {
  const found = dbErrors.explain({ code: "ER_MOT_LOI_LA" });
  assert.equal(found.code, "ER_MOT_LOI_LA");
  assert.match(found.hint, /Tra mã lỗi/);
});

test("lỗi không phải của CSDL thì bỏ qua", () => {
  assert.equal(dbErrors.explain({}), null);
  assert.equal(dbErrors.explain({ code: "EACCES" }), null);
  assert.equal(dbErrors.explain(null), null);
});

test("nhận ra lỗi thiếu biến môi trường", () => {
  assert.ok(dbErrors.isMissingConfig(new Error("Thiếu biến môi trường DB_NAME — xem .env.example")));
  assert.ok(!dbErrors.isMissingConfig(new Error("gì đó khác")));
});

/* ---------- qua HTTP thật ---------- */

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

test("CSDL hỏng thì trang quản trị nói rõ phải sửa biến nào", async () => {
  app.db.listGuests = async () => {
    const err = new Error("Unknown database 'vuliextv__thiepcuoi'");
    err.code = "ER_BAD_DB_ERROR";
    throw err;
  };

  const res = await admin("/admin");
  const body = await res.text();

  assert.equal(res.status, 500);
  assert.match(body, /ER_BAD_DB_ERROR/);
  assert.match(body, /DB_NAME/);
});

test("trang lỗi không được để lộ tên CSDL hay mật khẩu", async () => {
  app.db.listGuests = async () => {
    const err = new Error("Access denied for user 'vuliextv_admin'@'localhost' (using password: YES)");
    err.code = "ER_ACCESS_DENIED_ERROR";
    throw err;
  };

  const body = await (await admin("/admin")).text();

  assert.ok(!body.includes("vuliextv_admin"), "không được in tài khoản CSDL");
  assert.ok(!body.includes("using password"), "không được in thông điệp gốc của MySQL");
  assert.match(body, /ER_ACCESS_DENIED_ERROR/);
});

test("thiệp vẫn phục vụ khách bình thường dù CSDL hỏng", async () => {
  app.db.guestBySlug = async () => {
    const err = new Error("Unknown database");
    err.code = "ER_BAD_DB_ERROR";
    throw err;
  };

  const res = await makeClient(app.base)("/tuan");
  assert.equal(res.status, 200, "khách không được thấy lỗi — đây là thiệp cưới");
  assert.ok(!(await res.text()).includes("window.GUEST="));
});

/* ---------- trang chẩn đoán ---------- */

test("không có khoá thì không xem được trang chẩn đoán", async () => {
  const res = await makeClient(app.base)("/admin/diag");
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/admin/login");

  const wrong = await makeClient(app.base)("/admin/diag?k=sai-khoa");
  assert.equal(wrong.status, 302);
});

test("đúng khoá thì báo hình dạng cấu hình", async () => {
  const k = process.env.SESSION_SECRET.slice(0, 8);
  const body = await (await makeClient(app.base)(`/admin/diag?k=${k}`)).text();

  assert.match(body, /ADMIN_PASSWORD_HASH: dài \d+, đúng dạng/);
  assert.match(body, /SESSION_SECRET/);
  assert.match(body, /CƠ SỞ DỮ LIỆU/);
});

test("trang chẩn đoán không được lộ giá trị cấu hình nào", async () => {
  const k = process.env.SESSION_SECRET.slice(0, 8);
  const body = await (await makeClient(app.base)(`/admin/diag?k=${k}`)).text();

  assert.ok(!body.includes(process.env.SESSION_SECRET), "không được in SESSION_SECRET");
  assert.ok(!body.includes(process.env.ADMIN_PASSWORD_HASH), "không được in chuỗi băm");
  assert.ok(!body.includes(app.password), "không được in mật khẩu");
});

test("chuỗi băm bị shell nuốt thì trang chẩn đoán chỉ thẳng ra", async () => {
  const good = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_HASH = "scrypt";

  const k = process.env.SESSION_SECRET.slice(0, 8);
  const body = await (await makeClient(app.base)(`/admin/diag?k=${k}`)).text();

  process.env.ADMIN_PASSWORD_HASH = good;
  assert.match(body, /SAI DẠNG/);
  assert.match(body, /dấu \$ đã bị shell nuốt/);
});

test("phát hiện khoảng trắng thừa trong giá trị", async () => {
  const good = process.env.ADMIN_USER;
  process.env.ADMIN_USER = "admin  ";

  const k = process.env.SESSION_SECRET.slice(0, 8);
  const body = await (await makeClient(app.base)(`/admin/diag?k=${k}`)).text();

  process.env.ADMIN_USER = good;
  assert.match(body, /CÓ KHOẢNG TRẮNG THỪA/);
});
