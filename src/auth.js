"use strict";

const { randomBytes, scryptSync, timingSafeEqual, createHmac } = require("node:crypto");

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };
const SESSION_HOURS = 12;

/* ---------- mật khẩu ---------- */

/** Băm mật khẩu thành chuỗi "scrypt$<salt hex>$<hash hex>" để dán vào .env */
function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  let expected;
  try {
    expected = Buffer.from(parts[2], "hex");
  } catch {
    return false;
  }
  if (expected.length !== SCRYPT.keylen) return false;

  const actual = scryptSync(password, Buffer.from(parts[1], "hex"), SCRYPT.keylen, SCRYPT);
  return timingSafeEqual(actual, expected);
}

/* ---------- phiên đăng nhập ---------- */
/* Cookie tự chứa, ký bằng HMAC. Không cần kho phiên phía máy chủ — điều này
   quan trọng vì Passenger chạy nhiều tiến trình, bộ nhớ không dùng chung. */

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function issueSession(user, secret) {
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  // Nonce để hai lần đăng nhập không bao giờ cho ra cùng một token — nhờ đó
  // token CSRF dẫn xuất từ phiên cũng khác nhau giữa các phiên.
  const nonce = randomBytes(9).toString("base64url");
  const body = Buffer.from(JSON.stringify({ u: user, e: expires, n: nonce })).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

function readSession(token, secret) {
  const raw = String(token || "");
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;

  const body = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1));
  const want = Buffer.from(sign(body, secret));
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data.e || data.e < Date.now()) return null;
    return { user: data.u };
  } catch {
    return null;
  }
}

/* ---------- chống CSRF ---------- */
/* Cookie đã đặt SameSite=Strict; token này là lớp thứ hai cho biểu mẫu admin. */

function csrfToken(sessionToken, secret) {
  return sign(`csrf:${sessionToken}`, secret);
}

function csrfValid(given, sessionToken, secret) {
  const a = Buffer.from(String(given || ""));
  const b = Buffer.from(csrfToken(sessionToken, secret));
  return a.length === b.length && timingSafeEqual(a, b);
}

module.exports = {
  hashPassword, verifyPassword,
  issueSession, readSession,
  csrfToken, csrfValid,
  SESSION_HOURS,
};
