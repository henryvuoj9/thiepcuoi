/**
 * Dựng thiệp: tách tài nguyên nhúng base64 khỏi file HTML gốc.
 *
 *   source/invitation.html  (4.9 MB, mọi thứ nhúng inline)
 *        -> src/template.html   (~40 KB, server giữ trong RAM)
 *        -> public/assets/*     (ảnh, font, nhạc; tên có mã băm, Apache phục vụ)
 *
 * Chạy ở máy lập trình, KHÔNG chạy trên hosting (hosting không có afconvert).
 * Kết quả được commit vào Git để deploy chỉ còn là chép tệp.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, rmSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeVariants } from "./audio.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "source", "invitation.html");
const OUT_TEMPLATE = join(ROOT, "src", "template.html");
const OUT_ASSETS = join(ROOT, "public", "assets");

/* Biến CSS giữ lại -> tên tệp. Thứ tự không quan trọng. */
const KEEP = {
  "--plaster": "plaster",
  "--paper": "paper",
  "--env-v2": "env",
  "--env-open": "env-open",
  "--stamp": "stamp",
  "--lace-frame": "lace-frame",
  "--swan": "swan",
  "--orchid": "orchid",
};

/* Chết hẳn: .flap và .laces đều display:none và không có gì bật chúng lên. */
const DEAD = ["--tex-env", "--lace-strip"];

/* Tải trước vì khách nhìn thấy ngay ở màn bìa. */
const COVER = new Set(["env", "stamp", "script"]);

const AUDIO = {
  endSec: 100,
  fadeSec: 2.5,
  variants: [
    { name: "bgm", codec: "aach", bitrate: 48000 }, // HE-AAC, mặc định
    { name: "bgm-lc", codec: "aac", bitrate: 64000 }, // AAC-LC, dự phòng tương thích
  ],
};

const EXT = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "font/woff2": "woff2",
};

const written = [];
const selfHostedFonts = new Set(); // không nằm trong danh sách nạp sẵn: unicode-range quyết định tải cái nào

function hash(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, 8);
}

function emit(name, ext, buf) {
  const file = `${name}.${hash(buf)}.${ext}`;
  writeFileSync(join(OUT_ASSETS, file), buf);
  written.push({ name, url: `/assets/${file}`, bytes: buf.length });
  return `/assets/${file}`;
}

function fromBase64(mime, b64, name) {
  const ext = EXT[mime];
  if (!ext) throw new Error(`Không rõ phần mở rộng cho ${mime}`);
  return emit(name, ext, Buffer.from(b64, "base64"));
}

/** Thay đúng một kết quả khớp, báo lỗi rõ ràng nếu nguồn đã đổi dạng. */
function replaceOnce(html, re, make, what) {
  const m = re.exec(html);
  if (!m) throw new Error(`Không tìm thấy ${what} trong source/invitation.html — nguồn đã thay đổi?`);
  return html.slice(0, m.index) + make(m) + html.slice(m.index + m[0].length);
}

function build() {
  rmSync(OUT_ASSETS, { recursive: true, force: true });
  mkdirSync(OUT_ASSETS, { recursive: true });

  let html = readFileSync(SRC, "utf8");
  const before = html.length;

  /* 1. Bỏ hai biến chết (236 KB). Các quy tắc CSS dùng chúng đều display:none. */
  for (const v of DEAD) {
    html = replaceOnce(html, new RegExp(`\\s*${v}:url\\(data:[^)]*\\);`), () => "", v);
  }

  /* 2. Ảnh nền khai báo qua biến CSS. */
  for (const [v, name] of Object.entries(KEEP)) {
    html = replaceOnce(
      html,
      new RegExp(`${v}:url\\(data:([a-z0-9/+.-]+);base64,([A-Za-z0-9+/=]+)\\)`),
      (m) => `${v}:url(${fromBase64(m[1], m[2], name)})`,
      v
    );
  }

  /* 3. Font chữ ký trong @font-face. */
  html = replaceOnce(
    html,
    /src:url\(data:(font\/woff2);base64,([A-Za-z0-9+/=]+)\)/,
    (m) => `src:url(${fromBase64(m[1], m[2], "script")})`,
    "font woff2"
  );

  /* 3b. Font chữ tự host.
     File gốc trỏ sang fonts.googleapis.com với hai họ font XẾP SAI THỨ TỰ bảng
     chữ cái — Google trả 404 và không font nào tải được, toàn bộ chữ rơi về
     Georgia. Nhúng thẳng @font-face vào trang thì vừa sửa hẳn lỗi đó, vừa bỏ
     được một chặng DNS + TLS + tải CSS trước khi font kịp bắt đầu tải. */
  const fontDir = join(ROOT, "source", "fonts");
  const fonts = JSON.parse(readFileSync(join(fontDir, "manifest.json"), "utf8"));
  const faceRules = fonts
    .map((f) => {
      const url = emit(f.file.replace(/\.woff2$/, ""), "woff2", readFileSync(join(fontDir, f.file)));
      selfHostedFonts.add(url);
      return (
        `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};` +
        `font-display:swap;src:url(${url}) format('woff2');unicode-range:${f.range}}`
      );
    })
    .join("\n  ");

  html = replaceOnce(
    html,
    /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">[\s\S]*?<link href="https:\/\/fonts\.googleapis\.com[^>]*>/,
    () => `<style>\n  ${faceRules}\n</style>`,
    "thẻ link tới Google Fonts"
  );

  /* 4. Ảnh cưới trong window.DATA. */
  html = replaceOnce(
    html,
    /photo:\s*"data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)"/,
    (m) => `photo: "${fromBase64(m[1], m[2], "photo")}"`,
    "ảnh cưới"
  );

  /* 4b. Logo riêng: thả tệp vào source/logo.(png|svg|webp|jpg) là tự nhận.
          Có logo thì vòng tròn chữ lồng "VL" ở cuối thiệp được thay bằng ảnh
          (CSS .mono.has-img::before đã lo việc giấu vòng tròn đi).
          Nền chỗ đó là màu nâu ấm, nên logo sáng màu / nền trong suốt hợp nhất. */
  const logoFile = ["png", "svg", "webp", "jpg"]
    .map((ext) => join(ROOT, "source", `logo.${ext}`))
    .find((f) => existsSync(f));

  if (logoFile) {
    const ext = logoFile.split(".").pop();
    const url = emit("logo", ext, readFileSync(logoFile));
    html = replaceOnce(html, /\n  logo: "",/, () => `\n  logo: "${url}",`, "khoá logo");
    console.log(`Logo             dùng ${logoFile.replace(ROOT + "/", "")}`);
  }

  /* 5. Nhạc nền: cắt + nén, bỏ hẳn khỏi HTML. */
  let audio = null;
  html = replaceOnce(
    html,
    /<audio id="bgm"[^>]*src="data:audio\/mpeg;base64,([A-Za-z0-9+/=]+)"[^>]*>\s*<\/audio>/,
    (m) => {
      const encoded = encodeVariants(Buffer.from(m[1], "base64"), AUDIO);
      let primary = null;
      for (const v of AUDIO.variants) {
        const buf = encoded.get(v.name);
        const url = emit(v.name, "m4a", buf);
        if (!primary) primary = { url, bytes: buf.length };
      }
      audio = primary;
      return `<audio id="bgm" loop preload="none"></audio>`;
    },
    "thẻ audio"
  );

  /* 6. Vòng tiến trình quanh con tem. */
  html = replaceOnce(
    html,
    /<div class="stamp"><\/div>/,
    () =>
      `<div class="stamp" id="stamp"></div>\n  <svg class="ring" id="loadRing" viewBox="0 0 100 100" aria-hidden="true">` +
      `<circle class="trk" cx="50" cy="50" r="48"/><circle class="bar" cx="50" cy="50" r="48"/></svg>`,
    "div.stamp"
  );
  html = replaceOnce(
    html,
    /<div class="guest">/,
    () => `<div class="guest" id="guestBlock">`,
    "div.guest"
  );
  html = replaceOnce(
    html,
    /\n<\/style>/,
    () =>
      `\n  .ring{position:absolute;left:var(--c-tipx,50%);top:var(--c-tip);width:calc(var(--c-stamp) * 1.44);height:calc(var(--c-stamp) * 1.44);` +
      `transform:translate(-50%,-50%) rotate(-90deg);z-index:4;pointer-events:none;opacity:0;transition:opacity .5s ease}\n` +
      `  .ring.on{opacity:1}\n` +
      `  .ring circle{fill:none;stroke-width:1.2;stroke-linecap:round}\n` +
      `  .ring .trk{stroke:rgba(246,242,236,.16)}\n` +
      `  .ring .bar{stroke:rgba(246,242,236,.75);transition:stroke-dashoffset .3s linear}\n` +
      // Chưa tải xong thì không mời gọi chạm: bìa chưa mở được, mời gọi chỉ gây bực.
      `  .cover .open{animation:none;opacity:0}\n` +
      `  .cover.ready .open{animation:up .8s var(--ease) forwards,hint 3s ease-in-out .9s infinite}\n</style>`,
    "thẻ đóng style"
  );

  /* 7. Tải trước tài nguyên màn bìa + chèn bộ nạp. */
  const cover = written.filter((a) => COVER.has(a.name));
  const preloads = cover
    .map((a) =>
      a.url.endsWith(".woff2")
        ? `<link rel="preload" as="font" type="font/woff2" crossorigin href="${a.url}">`
        : `<link rel="preload" as="image" href="${a.url}">`
    )
    .join("\n");

  const manifest = {
    assets: written
      .filter((a) => !a.name.startsWith("bgm") && !selfHostedFonts.has(a.url))
      .map((a) => ({ url: a.url, bytes: a.bytes })),
    audio,
  };
  const loader = readFileSync(join(ROOT, "src", "client", "loader.js"), "utf8");

  html = replaceOnce(
    html,
    /\n<\/head>/,
    () =>
      `\n${preloads}\n<script>window.__ASSETS=${JSON.stringify(manifest)}</script>\n<script>${loader}</script>\n</head>`,
    "thẻ đóng head"
  );

  /* 8. Chỗ máy chủ chèn tên khách. */
  html = replaceOnce(
    html,
    /<script>\n\/\* ====== NỘI DUNG THIỆP/,
    (m) => `<!--GUEST-->\n${m[0]}`,
    "khối script chính"
  );

  /* 9. Ưu tiên window.GUEST do máy chủ chèn; không có khách thì dùng lời chung. */
  html = replaceOnce(
    html,
    /const qs = new URLSearchParams\(location\.search\); if \(qs\.get\("g"\)\)[^\n]*\n/,
    () =>
      `const qs = new URLSearchParams(location.search), G = window.GUEST || {};\n` +
      `  const gName = G.name || qs.get("g") || "", gHon = G.honorific || qs.get("x") || "";\n` +
      `  if (gName) { D.guest = gName; if (gHon) D.honorific = gHon;\n` +
      `                const rn = document.getElementById("rName"); if (rn) rn.value = gName; }\n` +
      `  else { D.guest = ""; D.honorific = ""; D.closing = D.closingGeneric;\n` +
      `         const gb = document.getElementById("guestBlock"); if (gb) gb.style.display = "none"; }\n`,
    "dòng đọc tham số khách"
  );

  /* 10. Lời kết dùng khi không biết tên khách. */
  html = replaceOnce(
    html,
    /\n  closing: "/,
    (m) => `\n  closingGeneric: "Rất mong được đón tiếp quý khách trong ngày vui của gia đình chúng tôi.",${m[0]}`,
    "khoá closing"
  );

  /* 11. Con tem đập khi tải xong, thay cho mốc 2,6 giây cố định. */
  html = replaceOnce(
    html,
    /setTimeout\(\(\) => cover\.classList\.add\("ready"\), 2600\);/,
    () => `window.__onAssetsReady(() => cover.classList.add("ready"));`,
    "hẹn giờ ready"
  );

  /* 12. Khách chạm mở sớm: đảm bảo thẻ audio có nguồn trước khi gọi play. */
  html = replaceOnce(
    html,
    /bgm\.play\(\)\.then\(/,
    () => `window.__bgmEnsure(); bgm.play().then(`,
    "lời gọi bgm.play"
  );

  /* 13. Gửi xác nhận về máy chủ. Bản gốc chỉ ẩn form rồi hiện lời cảm ơn. */
  html = replaceOnce(
    html,
    /\$\("rsvpForm"\)\.addEventListener\("submit"[\s\S]*?\$\("thanks"\)\.classList\.add\("show"\); \}\);/,
    () => `$("rsvpForm").addEventListener("submit", e => { e.preventDefault();
    const name = $("rName"); if (!name.value.trim()) { name.focus(); name.style.borderBottomColor = "#9a3b2e"; return; }
    const btn = $("rsvpForm").querySelector("button[type=submit]"), label = btn.textContent;
    btn.disabled = true; btn.textContent = "Đang gửi…";
    fetch("/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: (window.GUEST || {}).slug || "", name: name.value.trim(),
        attending: $("aYes").checked, guests: parseInt($("rGuests").value, 10) || 1 }) })
      .then(r => { if (!r.ok) throw new Error(r.status);
        $("rsvpForm").classList.add("hide"); $("thanks").classList.add("show"); })
      .catch(() => { btn.disabled = false; btn.textContent = label === "Gửi lại" ? label : "Gửi lại"; }); });`,
    "trình xử lý gửi xác nhận"
  );

  /* 15. Khoá cánh cửa: chưa tải xong thì chạm cũng không mở, và không phát nhạc.
         Đổi lại, lúc mở ra toàn bộ thiệp hiện ngay, không ảnh nào nhảy vào sau. */
  html = replaceOnce(
    html,
    /function open\(\)\{ if \(opened\) return; opened = true;/,
    () => `function open(){ if (opened || !window.__assetsReady()) return; opened = true;`,
    "hàm mở thiệp"
  );

  /* 16. Chỉ đi tìm tệp logo khi thực sự có khai báo.
         Bản gốc luôn thử tải "logo.png"; tệp đó không tồn tại nên mỗi lượt khách
         tốn một request 404 rồi mới rơi về chữ lồng. */
  html = replaceOnce(
    html,
    /const probe = new Image\(\);[^\n]*probe\.src = D\.logo \|\| "logo\.png";/,
    () =>
      `if (D.logo) { const probe = new Image(); probe.onload = () => { const m = $("mono"); ` +
      `m.innerHTML = ""; m.appendChild(probe); m.classList.add("has-img"); }; ` +
      `probe.alt = "Monogram"; probe.src = D.logo; }`,
    "đoạn dò tệp logo"
  );

  writeFileSync(OUT_TEMPLATE, html);

  const assetBytes = readdirSync(OUT_ASSETS).reduce(
    (n, f) => n + readFileSync(join(OUT_ASSETS, f)).length,
    0
  );
  const coverBytes = cover.reduce((n, a) => n + a.bytes, 0);

  const kb = (n) => (n / 1024).toFixed(0).padStart(6) + " KB";
  console.log("Nguồn            " + kb(before));
  console.log("Template         " + kb(html.length));
  console.log("Assets (tổng)    " + kb(assetBytes) + `  (${written.length} tệp)`);
  console.log("-".repeat(46));
  console.log("Thấy màn bìa     " + kb(html.length + coverBytes));
  console.log("Nhạc             " + kb(audio.bytes));
}

build();
