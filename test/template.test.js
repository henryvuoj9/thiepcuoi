"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { render } = require("../src/template");

test("thiệp chung không mang dữ liệu khách nào", () => {
  const html = render(null);
  assert.ok(!html.includes("window.GUEST="));
  assert.ok(html.includes("<!doctype html>"));
});

test("khách không có tên cũng coi như thiệp chung", () => {
  assert.ok(!render({ name: "", slug: "x" }).includes("window.GUEST="));
});

test("tên khách được chèn vào thiệp", () => {
  const html = render({ name: "Nguyễn Văn Tuấn", honorific: "anh", slug: "tuan" });
  assert.ok(html.includes("window.GUEST="));
  assert.ok(html.includes("Nguy\\u1ec5n V\\u0103n Tu\\u1ea5n") || html.includes("Nguyễn Văn Tuấn"));
  assert.ok(html.includes('"slug":"tuan"'));
});

test("tên chứa thẻ script không thoát ra khỏi thẻ được", () => {
  const html = render({ name: '</script><script>alert(1)</script>', honorific: "", slug: "x" });

  const injected = html.slice(html.indexOf("window.GUEST="));
  const closeTag = injected.slice(0, injected.indexOf("</script>"));

  assert.ok(!closeTag.includes("<"), "dấu < phải được thoát thành \\u003c");
  assert.ok(html.includes("\\u003c"), "phải có chuỗi thoát trong dữ liệu nhúng");
});

test("ký tự phân tách dòng của Unicode được thoát", () => {
  const html = render({ name: `A B C`, honorific: "", slug: "x" });
  assert.ok(!html.includes(" "));
  assert.ok(!html.includes(" "));
});

test("đoạn mã nhúng vẫn là JavaScript chạy được", () => {
  const html = render({ name: '</script>" x', honorific: "anh", slug: "s" });
  const start = html.indexOf("window.GUEST=") + "window.GUEST=".length;
  const json = html.slice(start, html.indexOf("</script>", start));

  const parsed = new Function(`return ${json}`)();
  assert.equal(parsed.name, '</script>" x');
  assert.equal(parsed.honorific, "anh");
});
