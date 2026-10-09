#!/usr/bin/env node
"use strict";

/* Xem thử ở máy cục bộ, không cần MySQL.
 * Dùng CSDL giả trong RAM (dữ liệu mất khi tắt) để xem thiệp và thử CRM.
 *
 *   npm run preview     ->  http://localhost:3000
 *   Tài khoản: admin / xem-thu-123456
 */

const { hashPassword } = require("../src/auth");
const { makeFakeDb } = require("../test/helpers");

process.env.SITE_URL = process.env.SITE_URL || "http://localhost:3000";
process.env.SESSION_SECRET = "chi-dung-de-xem-thu";
process.env.ADMIN_USER = "admin";
process.env.ADMIN_PASSWORD_HASH = hashPassword("xem-thu-123456");

const db = makeFakeDb();
const dbPath = require.resolve("../src/db.js");
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: db };

const { createApp } = require("../src/server");

(async () => {
  await db.createGuest({ slug: "tuan", name: "anh Nguyễn Quang Tuấn", groupName: "Nhà gái", note: "Bạn thân chú rể" });
  await db.createGuest({ slug: "co-mai", name: "cô Mai", groupName: "Họ hàng", note: "" });
  await db.createGuest({ slug: "gia-dinh-hoa", name: "gia đình anh Hoà", groupName: "Đồng nghiệp", note: "" });

  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, () => {
    console.log(`Xem thử tại  http://localhost:${port}`);
    console.log(`  thiệp chung      http://localhost:${port}/`);
    console.log(`  thiệp của Tuấn   http://localhost:${port}/tuan`);
    console.log(`  CRM              http://localhost:${port}/admin   (admin / xem-thu-123456)`);
  });
})();
