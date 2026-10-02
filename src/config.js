"use strict";

const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

/**
 * Nạp file .env mà không cần thư viện ngoài.
 * Chỉ đặt biến chưa tồn tại, nên biến môi trường thật luôn thắng.
 */
function loadEnv(file) {
  const path = file || join(__dirname, "..", ".env");
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

/* Luôn gọt khoảng trắng hai đầu. Giá trị đi qua ô nhập của cPanel, qua clipboard,
   qua trình soạn thảo — một dấu cách hay ký tự xuống dòng lọt vào là mọi thứ hỏng
   âm thầm: tên đăng nhập không khớp, chuỗi hex giải mã lệch, và biểu hiện ra ngoài
   chỉ là "sai mật khẩu". */
function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function optional(name, fallback) {
  const value = clean(process.env[name]);
  return value || fallback;
}

function required(name) {
  const value = clean(process.env[name]);
  if (!value) throw new Error(`Thiếu biến môi trường ${name} — xem .env.example`);
  return value;
}

const config = {
  get siteUrl() {
    return optional("SITE_URL", "https://vulinh.site").replace(/\/+$/, "");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get adminUser() {
    return optional("ADMIN_USER", "admin");
  },
  get adminPasswordHash() {
    return required("ADMIN_PASSWORD_HASH");
  },
  get db() {
    return {
      host: optional("DB_HOST", "localhost"),
      port: Number(optional("DB_PORT", "3306")),
      user: required("DB_USER"),
      password: clean(process.env.DB_PASSWORD),
      database: required("DB_NAME"),
    };
  },
};

module.exports = { loadEnv, config };
