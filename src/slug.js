"use strict";

/** Không được đặt trùng: đây là các đường dẫn hệ thống. */
const RESERVED = new Set([
  "admin", "api", "assets", "static", "public",
  "favicon.ico", "robots.txt", "sitemap.xml", "healthz",
]);

/**
 * "Nguyễn Văn Tuấn" -> "nguyen-van-tuan"
 * Bỏ dấu tiếng Việt bằng NFD rồi gỡ dấu tổ hợp; đ/Đ phải xử lý riêng
 * vì nó là một chữ cái riêng, không phải d có dấu.
 */
function slugify(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isReserved(slug) {
  return RESERVED.has(String(slug || "").toLowerCase());
}

/** Slug hợp lệ: chữ thường, số và dấu gạch ngang ở giữa. */
function isValid(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug || "")) && slug.length <= 60;
}

/**
 * Tìm slug chưa ai dùng: "tuan", rồi "tuan-2", "tuan-3"...
 * @param {string} base      slug mong muốn
 * @param {(s: string) => Promise<boolean>} taken  kiểm tra đã có chưa
 */
async function unique(base, taken) {
  const root = slugify(base) || "khach";
  let candidate = root;
  let n = 1;

  while (isReserved(candidate) || (await taken(candidate))) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

module.exports = { slugify, isReserved, isValid, unique, RESERVED };
