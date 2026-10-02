"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const slugs = require("../src/slug");

test("bỏ dấu tiếng Việt", () => {
  assert.equal(slugs.slugify("Nguyễn Văn Tuấn"), "nguyen-van-tuan");
  assert.equal(slugs.slugify("Phương Linh"), "phuong-linh");
  assert.equal(slugs.slugify("Hải Vũ"), "hai-vu");
});

test("đ và Đ là chữ cái riêng, không phải d có dấu", () => {
  assert.equal(slugs.slugify("Đặng Đình Đức"), "dang-dinh-duc");
  assert.equal(slugs.slugify("đỗ"), "do");
});

test("gọt khoảng trắng, dấu câu và gạch thừa", () => {
  assert.equal(slugs.slugify("  Cô  Mai --- Dì Hoa!! "), "co-mai-di-hoa");
  assert.equal(slugs.slugify("A/B & C"), "a-b-c");
});

test("tên không có ký tự la-tinh nào thì trả chuỗi rỗng", () => {
  assert.equal(slugs.slugify("!!!"), "");
  assert.equal(slugs.slugify(""), "");
});

test("cắt ở 60 ký tự", () => {
  assert.ok(slugs.slugify("a".repeat(200)).length <= 60);
});

test("nhận biết slug hợp lệ", () => {
  assert.ok(slugs.isValid("tuan"));
  assert.ok(slugs.isValid("nguyen-van-tuan"));
  assert.ok(!slugs.isValid("Tuan"), "chữ hoa không hợp lệ");
  assert.ok(!slugs.isValid("-tuan"), "không được mở đầu bằng gạch");
  assert.ok(!slugs.isValid("tuan-"), "không được kết thúc bằng gạch");
  assert.ok(!slugs.isValid("tuan--anh"), "không được hai gạch liền");
  assert.ok(!slugs.isValid("favicon.ico"), "dấu chấm không hợp lệ");
  assert.ok(!slugs.isValid("tuan/anh"));
});

test("giữ các đường dẫn hệ thống", () => {
  for (const word of ["admin", "api", "assets", "ADMIN"]) {
    assert.ok(slugs.isReserved(word), `${word} phải bị giữ`);
  }
  assert.ok(!slugs.isReserved("tuan"));
});

test("tự tránh trùng bằng hậu tố số", async () => {
  const used = new Set(["tuan", "tuan-2"]);
  const taken = async (s) => used.has(s);

  assert.equal(await slugs.unique("Tuấn", taken), "tuan-3");
  assert.equal(await slugs.unique("Mai", taken), "mai");
});

test("không bao giờ sinh ra slug trùng đường dẫn hệ thống", async () => {
  assert.equal(await slugs.unique("admin", async () => false), "admin-2");
});

test("tên vô nghĩa vẫn cho ra slug dùng được", async () => {
  assert.equal(await slugs.unique("!!!", async () => false), "khach");
});
