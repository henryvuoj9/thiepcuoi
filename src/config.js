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

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name} — xem .env.example`);
  return value;
}

const config = {
  get siteUrl() {
    return (process.env.SITE_URL || "https://vulinh.site").replace(/\/+$/, "");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get adminUser() {
    return process.env.ADMIN_USER || "admin";
  },
  get adminPasswordHash() {
    return required("ADMIN_PASSWORD_HASH");
  },
  get db() {
    return {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: required("DB_USER"),
      password: process.env.DB_PASSWORD || "",
      database: required("DB_NAME"),
    };
  },
};

module.exports = { loadEnv, config };
