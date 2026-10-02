"use strict";

function esc(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CSS = `
*{box-sizing:border-box}
body{margin:0;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  background:#f6f2ec;color:#3d2b20}
a{color:#5c4433}
.wrap{max-width:1100px;margin:0 auto;padding:24px 18px 80px}
header{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:22px}
header h1{font-size:19px;letter-spacing:.14em;text-transform:uppercase;margin:0;font-weight:600}
header nav{margin-left:auto;display:flex;gap:16px;font-size:14px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:24px}
.card{background:#fff;border:1px solid #e4dbcd;border-radius:10px;padding:14px 16px}
.card .n{font-size:26px;font-weight:600;line-height:1.1}
.card .l{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8d7a6a;margin-top:4px}
.panel{background:#fff;border:1px solid #e4dbcd;border-radius:10px;padding:18px;margin-bottom:22px}
.panel h2{font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:#8d7a6a;margin:0 0 14px}
label{display:block;font-size:12px;color:#8d7a6a;margin-bottom:4px}
input,select,textarea{width:100%;padding:9px 11px;border:1px solid #d9cfbe;border-radius:7px;
  background:#fdfbf8;font:inherit;color:inherit}
input:focus,select:focus{outline:2px solid #bda88c;outline-offset:-1px}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;align-items:end}
button,.btn{font:inherit;padding:9px 16px;border-radius:7px;border:1px solid #5c4433;background:#5c4433;
  color:#f6f2ec;cursor:pointer;text-decoration:none;display:inline-block;white-space:nowrap}
button:hover,.btn:hover{background:#4a3426}
.btn.ghost{background:transparent;color:#5c4433}
.btn.ghost:hover{background:#efe8dc}
.btn.danger{border-color:#9a3b2e;color:#9a3b2e;background:transparent}
.btn.danger:hover{background:#9a3b2e;color:#fff}
.btn.sm,button.sm{padding:5px 10px;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8d7a6a;
  padding:0 10px 8px;border-bottom:1px solid #e4dbcd;font-weight:600}
td{padding:10px;border-bottom:1px solid #f0e9dd;vertical-align:middle}
tr:last-child td{border-bottom:0}
.slug{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:#5c4433}
.tag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:#efe8dc;color:#6b5847}
.ok{color:#2f6b4f;font-weight:600}
.no{color:#9a3b2e}
.dim{color:#a6968a}
.msg{padding:11px 14px;border-radius:8px;margin-bottom:18px;font-size:14px}
.msg.good{background:#e6f0e9;border:1px solid #bcd6c6;color:#2f6b4f}
.msg.bad{background:#f7e4e0;border:1px solid #e0bdb5;color:#9a3b2e}
.scroll{overflow-x:auto}
.login{max-width:330px;margin:14vh auto;padding:0 18px}
.login .panel{padding:26px}
.actions{display:flex;gap:6px;flex-wrap:wrap}
@media (max-width:620px){th:nth-child(4),td:nth-child(4){display:none}}
`;

function layout({ title, body, flash, user }) {
  const nav = user
    ? `<nav>
         <a href="/admin">Khách mời</a>
         <a href="/admin/rsvps">Xác nhận</a>
         <a href="/admin/export.csv">Tải CSV</a>
         <a href="/admin/logout">Thoát</a>
       </nav>`
    : "";

  const banner = flash
    ? `<div class="msg ${flash.ok ? "good" : "bad"}">${esc(flash.text)}</div>`
    : "";

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="${user ? "wrap" : "login"}">
<header><h1>${esc(title)}</h1>${nav}</header>
${banner}
${body}
</div>
</body>
</html>`;
}

module.exports = { esc, layout };
