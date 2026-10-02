"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const auth = require("../src/auth");

const SECRET = "bi-mat-kiem-thu";

test("mật khẩu đúng thì khớp, sai thì không", () => {
  const stored = auth.hashPassword("mat-khau-rat-dai-123");
  assert.ok(auth.verifyPassword("mat-khau-rat-dai-123", stored));
  assert.ok(!auth.verifyPassword("mat-khau-rat-dai-124", stored));
  assert.ok(!auth.verifyPassword("", stored));
});

test("mỗi lần băm cho muối khác nhau", () => {
  const a = auth.hashPassword("cung-mot-mat-khau");
  const b = auth.hashPassword("cung-mot-mat-khau");
  assert.notEqual(a, b);
  assert.ok(auth.verifyPassword("cung-mot-mat-khau", a));
  assert.ok(auth.verifyPassword("cung-mot-mat-khau", b));
});

test("chuỗi băm không chứa ký tự $ — nó phải sống được trong biến môi trường", () => {
  const stored = auth.hashPassword("mat-khau-rat-dai-123");
  assert.ok(!stored.includes("$"), "ký tự $ bị shell nuốt khi cPanel lưu biến môi trường");
  assert.match(stored, /^scrypt\.[0-9a-f]{32}\.[0-9a-f]{64}$/);
});

test("vẫn đọc được chuỗi băm định dạng $ cũ", () => {
  const legacy = auth.hashPassword("cu-phap-cu").replace(/\./g, "$");
  assert.ok(auth.verifyPassword("cu-phap-cu", legacy));
  assert.ok(!auth.verifyPassword("sai", legacy));
});

test("chuỗi băm bị shell nuốt mất phần sau thì từ chối, không cho qua", () => {
  assert.equal(auth.verifyPassword("bat-ky-gi", "scrypt"), false);
  assert.equal(auth.verifyPassword("", "scrypt"), false);
});

test("chuỗi băm hỏng thì từ chối, không ném lỗi", () => {
  for (const bad of ["", "rác", "scrypt.xx", "scrypt.ab.cd", "bcrypt.a.b", "scrypt"]) {
    assert.equal(auth.verifyPassword("gì đó", bad), false, `phải từ chối: ${bad}`);
  }
});

test("phiên hợp lệ đọc lại được", () => {
  const token = auth.issueSession("admin", SECRET);
  assert.deepEqual(auth.readSession(token, SECRET), { user: "admin" });
});

test("sửa nội dung phiên thì chữ ký hỏng", () => {
  const token = auth.issueSession("admin", SECRET);
  const [body, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ u: "hacker", e: Date.now() + 1e6 })).toString("base64url");

  assert.equal(auth.readSession(`${forged}.${sig}`, SECRET), null);
  assert.equal(auth.readSession(token, "bi-mat-khac"), null);
  assert.equal(auth.readSession("rác", SECRET), null);
  assert.equal(auth.readSession("", SECRET), null);
});

test("phiên hết hạn bị từ chối", () => {
  const body = Buffer.from(JSON.stringify({ u: "admin", e: Date.now() - 1000 })).toString("base64url");
  const { createHmac } = require("node:crypto");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");

  assert.equal(auth.readSession(`${body}.${sig}`, SECRET), null);
});

test("token CSRF gắn với đúng phiên đó", () => {
  const a = auth.issueSession("admin", SECRET);
  const b = auth.issueSession("admin", SECRET);

  assert.ok(auth.csrfValid(auth.csrfToken(a, SECRET), a, SECRET));
  assert.ok(!auth.csrfValid(auth.csrfToken(b, SECRET), a, SECRET));
  assert.ok(!auth.csrfValid("", a, SECRET));
  assert.ok(!auth.csrfValid("rác", a, SECRET));
});
