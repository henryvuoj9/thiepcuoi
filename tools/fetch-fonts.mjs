/**
 * Tải font Google về để tự host. Chạy tay một lần, kết quả commit vào repo.
 *
 *   node tools/fetch-fonts.mjs
 *
 * Vì sao không để nguyên thẻ <link> trỏ sang Google:
 *  - URL trong file gốc liệt kê hai họ font sai thứ tự bảng chữ cái nên Google
 *    trả 404, và KHÔNG font nào tải được — toàn bộ chữ rơi về Georgia.
 *  - Ở Việt Nam fonts.googleapis.com vốn chập chờn; thiệp cưới không nên phụ
 *    thuộc vào một máy chủ bên thứ ba để hiện đúng mặt chữ.
 *  - Tự host thì font nằm chung một nơi với mọi tài nguyên khác, cache vĩnh
 *    viễn như nhau, và không gửi thông tin khách sang bên thứ ba.
 *
 * Chỉ giữ hai bộ ký tự latin và vietnamese. Nhờ unicode-range, trình duyệt chỉ
 * tải đúng bộ và đúng nét chữ mà trang thực sự dùng tới.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "source", "fonts");
const KEEP_SUBSETS = new Set(["latin", "vietnamese"]);

/* Các họ font PHẢI xếp theo thứ tự bảng chữ cái, nếu không Google trả 404. */
const URL =
  "https://fonts.googleapis.com/css2" +
  "?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500" +
  "&family=Cormorant+SC:wght@300;400;500;600;700" +
  "&display=swap";

/* UA của trình duyệt hiện đại thì Google mới trả woff2. */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseFaces(css) {
  const faces = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  let m;

  while ((m = re.exec(css))) {
    const [, subset, body] = m;
    const pick = (key) => (new RegExp(`${key}:\\s*([^;]+);`).exec(body) || [, ""])[1].trim();
    faces.push({
      subset,
      family: pick("font-family").replace(/['"]/g, ""),
      style: pick("font-style") || "normal",
      weight: pick("font-weight") || "400",
      range: pick("unicode-range"),
      url: (/url\(([^)]+)\)/.exec(body) || [, ""])[1].replace(/['"]/g, ""),
    });
  }
  return faces;
}

const slug = (f) =>
  `${f.family.toLowerCase().replace(/\s+/g, "-")}-${f.weight}${f.style === "italic" ? "-italic" : ""}-${f.subset}`;

const css = await fetch(URL, { headers: { "User-Agent": UA } }).then((r) => {
  if (!r.ok) throw new Error(`Google Fonts trả ${r.status} — kiểm tra thứ tự bảng chữ cái của các họ font`);
  return r.text();
});

const faces = parseFaces(css).filter((f) => KEEP_SUBSETS.has(f.subset));
if (!faces.length) throw new Error("Không phân tích được @font-face nào");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const manifest = [];
for (const f of faces) {
  const data = Buffer.from(await fetch(f.url, { headers: { "User-Agent": UA } }).then((r) => r.arrayBuffer()));
  const file = `${slug(f)}.woff2`;
  writeFileSync(join(OUT, file), data);
  manifest.push({ file, family: f.family, style: f.style, weight: f.weight, range: f.range, bytes: data.length });
  console.log(`${String((data.length / 1024).toFixed(1)).padStart(7)} KB  ${file}`);
}

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `\n${manifest.length} tệp, tổng ${(manifest.reduce((n, f) => n + f.bytes, 0) / 1024).toFixed(0)} KB`
);
