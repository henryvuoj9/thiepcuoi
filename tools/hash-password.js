#!/usr/bin/env node
"use strict";

/* Tạo chuỗi băm mật khẩu để dán vào ADMIN_PASSWORD_HASH trong .env.
   Dùng: npm run hash-password -- 'mật khẩu của bạn'  */

const { hashPassword } = require("../src/auth");

const password = process.argv[2];
if (!password) {
  console.error("Dùng: npm run hash-password -- 'mật khẩu của bạn'");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Mật khẩu nên dài ít nhất 10 ký tự.");
  process.exit(1);
}

console.log(hashPassword(password));
