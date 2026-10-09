"use strict";

const { readFileSync } = require("node:fs");
const { join } = require("node:path");

/* Đọc một lần lúc khởi động, giữ nguyên trong RAM.
   Mỗi lượt khách chỉ còn là một phép nối chuỗi. */
const RAW = readFileSync(join(__dirname, "template.html"), "utf8");
const MARKER = "<!--GUEST-->";

const at = RAW.indexOf(MARKER);
if (at === -1) {
  throw new Error("template.html thiếu dấu <!--GUEST--> — chạy lại `npm run build`");
}

const HEAD = RAW.slice(0, at);
const TAIL = RAW.slice(at + MARKER.length);

/**
 * Nhúng JSON vào trong thẻ <script> cho an toàn.
 * JSON.stringify không thoát "</script>", U+2028 hay U+2029 — ba thứ đủ
 * để thoát khỏi thẻ script hoặc làm hỏng cú pháp.
 */
function embed(value) {
  // Dựng từ chuỗi: viết thẳng U+2028/U+2029 vào mã nguồn là tự bắn vào chân.
  const LINE_SEPARATORS = new RegExp("[\\u2028\\u2029]", "g");
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(LINE_SEPARATORS, (c) => "\\u" + c.charCodeAt(0).toString(16));
}

/**
 * @param {{name: string, slug: string}|null} guest
 *        null = thiệp chung, không hiện tên ai.
 */
function render(guest) {
  if (!guest || !guest.name) return HEAD + TAIL;

  const payload = {
    name: guest.name,
    slug: guest.slug || "",
  };
  return `${HEAD}<script>window.GUEST=${embed(payload)}</script>${TAIL}`;
}

module.exports = { render };
