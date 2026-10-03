"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const HTML = readFileSync(join(ROOT, "src", "template.html"), "utf8");

test("mọi đường dẫn /assets/ trong thiệp đều có tệp thật", () => {
  const refs = [...new Set([...HTML.matchAll(/\/assets\/[A-Za-z0-9._-]+/g)].map((m) => m[0]))];
  assert.ok(refs.length > 10, "phải có nhiều tài nguyên");

  const missing = refs.filter((r) => !existsSync(join(ROOT, "public", r)));
  assert.deepEqual(missing, [], "tài nguyên được tham chiếu nhưng không tồn tại");
});

test("không còn tài nguyên nhúng base64 nào", () => {
  assert.equal(HTML.includes("base64,"), false, "tách tài nguyên chưa triệt để");
});

test("không phụ thuộc máy chủ font bên ngoài", () => {
  /* File gốc trỏ sang Google với hai họ font xếp sai thứ tự bảng chữ cái, nên
     Google trả 404 và không font nào tải được. Tự host để không bao giờ lặp lại. */
  assert.ok(!HTML.includes("fonts.googleapis.com"), "còn gọi sang Google Fonts");
  assert.ok(!HTML.includes("fonts.gstatic.com"), "còn gọi sang Google Fonts");
});

test("khai báo đủ cả hai họ chữ mà thiết kế dùng", () => {
  for (const family of ["Cormorant Garamond", "Cormorant SC", "New Icon Script VN"]) {
    assert.ok(HTML.includes(`font-family:'${family}'`) || HTML.includes(`font-family:"${family}"`),
      `thiếu @font-face cho ${family}`);
  }
});

test("mỗi @font-face đều có unicode-range và font-display swap", () => {
  const faces = HTML.match(/@font-face\{[^}]*\}/g) || [];
  assert.ok(faces.length >= 20, `chỉ thấy ${faces.length} @font-face`);

  const cormorant = faces.filter((f) => f.includes("Cormorant"));
  for (const f of cormorant) {
    assert.match(f, /unicode-range:/, "thiếu unicode-range — trình duyệt sẽ tải cả bộ không cần tới");
    assert.match(f, /font-display:swap/, "thiếu font-display:swap — chữ sẽ vô hình trong lúc chờ");
  }
});

test("font Cormorant không bị nạp sẵn, font chữ ký thì có", () => {
  /* Nạp sẵn cả 26 tệp Cormorant là tải thừa nửa MB — unicode-range đã lo việc
     chỉ tải đúng bộ ký tự và đúng nét chữ mà trang dùng tới.
     Ngược lại font chữ ký riêng của thiệp hiện ngay trên bìa, không có
     unicode-range và chỉ 26 KB, nên phải nạp cùng màn bìa. */
  const manifest = JSON.parse(/window\.__ASSETS=(\{.*?\})<\/script>/s.exec(HTML)[1]);
  const urls = manifest.assets.map((a) => a.url);

  assert.deepEqual(urls.filter((u) => u.includes("cormorant")), [], "Cormorant bị đưa vào danh sách nạp sẵn");
  assert.ok(urls.some((u) => /\/assets\/script\.[a-z0-9]+\.woff2$/.test(u)), "thiếu font chữ ký trong danh sách nạp sẵn");
});

test("font chữ ký được khai báo tải trước ở thẻ head", () => {
  assert.match(HTML, /<link rel="preload" as="font" type="font\/woff2" crossorigin href="\/assets\/script\.[a-z0-9]+\.woff2">/);
});

test("chỗ máy chủ chèn tên khách vẫn còn", () => {
  assert.ok(HTML.includes("<!--GUEST-->"));
});

/* ---------- hành vi màn bìa ---------- */

test("dòng mời mở thư vẫn còn, nhưng chỉ hiện sau khi tải xong", () => {
  /* Từng bỏ hẳn, rồi chủ thiệp muốn giữ lại — nhưng vẫn phải gắn với .ready,
     vì mời chạm trong lúc bìa chưa mở được thì chỉ gây bực. */
  assert.ok(HTML.includes("Mở thư và bật nhạc"), "chủ thiệp muốn giữ dòng này");
});

test("nền giấy được tách ra tệp riêng, không nhúng base64", () => {
  assert.match(HTML, /--paper:url\(\/assets\/paper\.[a-z0-9]+\.jpg\)/);
});

test("xưng hô hiện trước tên khách trên bìa", () => {
  assert.match(HTML, /honCap \? honCap \+ " " : ""/);
});

test("chưa tải xong thì chạm cũng không mở được thiệp", () => {
  /* Yêu cầu của chủ thiệp: mở ra là phải thấy đủ, không có ảnh nào nhảy vào
     sau, và không có nhạc phát dở. Nên cánh cửa khoá cho tới khi tải xong. */
  assert.match(HTML, /function open\(\)\{ if \(opened \|\| !window\.__assetsReady\(\)\) return;/);
  assert.match(HTML, /window\.__assetsReady = function \(\) \{ return settled; \};/);
});

test("dấu mời chạm chỉ hiện sau khi tải xong", () => {
  assert.match(HTML, /\.cover \.open\{animation:none;opacity:0\}/);
  assert.match(HTML, /\.cover\.ready \.open\{animation:up/);
});

test("ảnh được giải mã sẵn, không chỉ tải về", () => {
  /* Nằm trong HTTP cache chưa đủ — trình duyệt vẫn giải mã lúc phong bì mở ra,
     và đó chính là lúc ảnh nhảy vào sau. */
  assert.match(HTML, /function decodeImage\(url\)/);
  assert.match(HTML, /img\.decode\(\)/);
});

test("có lưới an toàn để mạng hỏng không khoá chết thiệp", () => {
  assert.match(HTML, /MAX_WAIT_MS = \d+/);
  assert.match(HTML, /setTimeout\(finish, MAX_WAIT_MS\)/);
});

test("mọi ảnh bên trong thiệp đều nằm trong danh sách phải tải xong trước", () => {
  const manifest = JSON.parse(/window\.__ASSETS=(\{.*?\})<\/script>/s.exec(HTML)[1]);
  const urls = manifest.assets.map((a) => a.url).join(" ");

  for (const name of ["lace-frame", "swan", "orchid", "photo", "plaster", "env-open", "logo", "paper"]) {
    assert.ok(urls.includes("/assets/" + name + "."), `thiếu ${name} — ảnh này sẽ nhảy vào sau khi mở thiệp`);
  }
  assert.ok(manifest.audio && manifest.audio.url, "nhạc phải tải xong trước khi mở");
});

test("chữ trên bìa chờ font thật rồi mới hiện", () => {
  /* Không có cái này thì tên cô dâu chú rể được vẽ bằng font dự phòng trước,
     rồi nhảy sang font chữ ký — nhìn như trục trặc. */
  assert.match(HTML, /\.cover \.txt \.sc,\.cover \.txt \.w,\.cover \.guest\{animation-play-state:paused\}/);
  assert.match(HTML, /html\.fonts-ready .*animation-play-state:running/);
  assert.match(HTML, /document\.fonts\.load\('400 40px "New Icon Script VN"'/);
});

test("chỉ chờ ba nét chữ của bìa, không chờ toàn bộ font", () => {
  /* document.fonts.ready chờ cả 26 tệp Cormorant của phần ruột — khách sẽ
     nhìn phong bì trống quá lâu. */
  /* document.fonts.ready vẫn được dùng hợp lệ ở chỗ khác — bản gốc dùng nó để
     căn lại cỡ chữ sau khi font tải xong. Chỉ cấm dùng nó để mở khoá chữ bìa. */
  assert.ok(!/document\.fonts\.ready[\s\S]{0,40}revealCoverText/.test(HTML), "đang chờ toàn bộ font mới hiện chữ bìa");
  assert.match(HTML, /document\.fonts\.ready\.then\(\(\) => \{ fit\(\)/, "mất đoạn căn lại cỡ chữ của bản gốc");
  assert.match(HTML, /setTimeout\(revealCoverText, 3000\)/, "thiếu lưới an toàn");
});

test("chế độ giảm chuyển động vẫn thấy chữ trên bìa", () => {
  /* Lỗi sẵn có: media query tắt animation bằng !important, các phần tử này
     kẹt ở opacity:0 nên toàn bộ chữ trên bìa vô hình. */
  assert.match(HTML, /@media \(prefers-reduced-motion:reduce\)\{\.cover[^}]*opacity:1!important\}/);
});

/* ---------- chống chữ tràn khung ---------- */

test("mọi dòng chữ trên tấm thẻ đều nằm trong hệ tự-co-chữ", () => {
  /* Trước đây chỉ tên cô dâu chú rể được tự co. "Save the date" và ngày thì
     không — nên khi chữ bị vẽ to hơn thiết kế, chúng tràn ra và bị clip-path
     của tấm thẻ cắt mất. */
  assert.match(HTML, /<p class="sc fit">Save the date<\/p>/);
  assert.match(HTML, /<p class="sc date fit" id="cardDate">/);
});

test("chạy lại hàm co chữ khi font về muộn", () => {
  /* Hàm co chữ của bản gốc bám vào document.fonts.ready. Nếu lời hứa đó được
     giải quyết trước khi font kịp được yêu cầu thì chữ bị đo bằng font dự
     phòng rồi không bao giờ đo lại. */
  assert.match(HTML, /document\.fonts\.addEventListener\("loadingdone", refit\)/);
  assert.match(HTML, /function refit\(\) \{ if \(typeof window\.__fit === "function"\) window\.__fit\(\); \}/);
});

test("có trang chẩn đoán hiển thị, và nó im lặng khi không được gọi", () => {
  assert.match(HTML, /if \(!\/\[\?&\]debug=1\/\.test\(location\.search\)\) return;/);
  assert.match(HTML, /CHẨN ĐOÁN HIỂN THỊ/);
  assert.match(HTML, /function textScale\(\)/);
});

test("tấm thẻ không được vừa có left+right vừa có aspect-ratio", () => {
  /* Safari tính bề rộng theo nội dung bên trong khi gặp tổ hợp đó, thẻ co lại
     còn 2/3 và dồn sang trái vì mép trái vẫn neo ở 5%. Tệ hơn, nó tạo vòng lặp
     phản hồi với hàm co chữ: thẻ hẹp -> chữ nhỏ -> nội dung hẹp -> thẻ hẹp thêm.
     Ghi bề rộng ra tường minh thì không engine nào hiểu khác được. */
  const rule = /\.card\{[^}]*\}/.exec(HTML)[0];
  assert.ok(rule.includes("width:90%"), "thiếu bề rộng tường minh");
  assert.ok(!rule.includes("right:5%"), "còn dùng right:5% cùng aspect-ratio");
});

test("khách không khai xưng hô thì không hiện chữ mẫu", () => {
  assert.match(HTML, /if \(gName\) \{ D\.guest = gName; D\.honorific = gHon;/);
  assert.match(HTML, /replace\(\/\\s\+\/g, " "\)\.trim\(\)/, "lời kết phải gộp khoảng trắng thừa");
});
