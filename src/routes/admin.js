"use strict";

const express = require("express");
const db = require("../db");
const slugs = require("../slug");
const auth = require("../auth");
const { config } = require("../config");
const { esc, layout } = require("../admin/view");

const COOKIE = "tc_session";
const router = express.Router();

/* ---------- giới hạn số lần thử mật khẩu ----------
   Bộ đếm nằm trong RAM nên mỗi tiến trình Passenger đếm riêng. Không hoàn hảo,
   nhưng đủ chặn dò mật khẩu tự động, và không cần thêm bảng trong CSDL. */
const attempts = new Map();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function tooManyAttempts(ip) {
  const rec = attempts.get(ip);
  if (!rec || Date.now() - rec.at > WINDOW_MS) return false;
  return rec.n >= MAX_ATTEMPTS;
}

function noteFailure(ip) {
  const rec = attempts.get(ip);
  if (!rec || Date.now() - rec.at > WINDOW_MS) attempts.set(ip, { n: 1, at: Date.now() });
  else rec.n += 1;
}

/* ---------- phiên ---------- */

function currentUser(req) {
  const token = req.cookies[COOKIE];
  const session = token && auth.readSession(token, config.sessionSecret);
  return session ? { name: session.user, token } : null;
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.redirect("/admin/login");
  req.user = user;
  req.csrf = auth.csrfToken(user.token, config.sessionSecret);
  next();
}

function requireCsrf(req, res, next) {
  if (!auth.csrfValid(req.body._csrf, req.user.token, config.sessionSecret)) {
    return res.status(403).send("Phiên làm việc đã hết hạn. Tải lại trang rồi thử lại.");
  }
  next();
}

function flashOf(req) {
  if (req.query.ok) return { ok: true, text: String(req.query.ok) };
  if (req.query.err) return { ok: false, text: String(req.query.err) };
  return null;
}

function back(res, path, ok, text) {
  const key = ok ? "ok" : "err";
  res.redirect(`${path}?${key}=${encodeURIComponent(text)}`);
}

/* ---------- đăng nhập ---------- */

router.get("/login", (req, res) => {
  if (currentUser(req)) return res.redirect("/admin");
  res.send(
    layout({
      title: "Đăng nhập",
      flash: flashOf(req),
      user: null,
      body: `<form class="panel" method="post" action="/admin/login">
        <div style="margin-bottom:12px"><label for="u">Tài khoản</label>
          <input id="u" name="user" autocomplete="username" autofocus required></div>
        <div style="margin-bottom:18px"><label for="p">Mật khẩu</label>
          <input id="p" name="password" type="password" autocomplete="current-password" required></div>
        <button type="submit" style="width:100%">Vào quản trị</button>
      </form>`,
    })
  );
});

router.post("/login", (req, res) => {
  const ip = req.ip || "?";
  if (tooManyAttempts(ip)) {
    return back(res, "/admin/login", false, "Thử sai quá nhiều lần. Đợi 15 phút rồi thử lại.");
  }

  /* Cấu hình hỏng và mật khẩu sai nhìn giống hệt nhau từ phía người dùng.
     Tách ra, nếu không một chuỗi băm bị shell cắt cụt sẽ giả dạng "sai mật
     khẩu" và người dựng trang gõ lại mật khẩu đúng hàng chục lần. */
  if (!auth.looksLikeHash(config.adminPasswordHash)) {
    return back(res, "/admin/login", false,
      "Cấu hình ADMIN_PASSWORD_HASH không hợp lệ — có thể đã bị cắt cụt khi lưu. Tạo lại bằng: npm run hash-password");
  }

  const okUser = String(req.body.user || "") === config.adminUser;
  const okPass = auth.verifyPassword(String(req.body.password || ""), config.adminPasswordHash);

  if (!okUser || !okPass) {
    noteFailure(ip);
    return back(res, "/admin/login", false, "Sai tài khoản hoặc mật khẩu.");
  }

  attempts.delete(ip);
  res.cookie(COOKIE, auth.issueSession(config.adminUser, config.sessionSecret), {
    httpOnly: true,
    sameSite: "strict",
    secure: req.protocol === "https",
    maxAge: auth.SESSION_HOURS * 3600 * 1000,
    path: "/",
  });
  res.redirect("/admin");
});

router.get("/logout", (req, res) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.redirect("/admin/login");
});

router.use(requireAuth);

/* ---------- bảng điều khiển ---------- */

function guestRow(g, siteUrl, csrf) {
  const link = `${siteUrl}/${g.slug}`;
  const opened = g.opened_count > 0
    ? `<span class="ok">${g.opened_count} lần</span><br><span class="dim" style="font-size:12px">${
        g.last_opened_at ? new Date(g.last_opened_at).toLocaleString("vi-VN") : ""
      }</span>`
    : `<span class="dim">chưa mở</span>`;

  let rsvp = `<span class="dim">—</span>`;
  if (g.rsvp_attending === 1) rsvp = `<span class="ok">Đến · ${g.rsvp_party || 1}</span>`;
  else if (g.rsvp_attending === 0) rsvp = `<span class="no">Bận</span>`;

  return `<tr>
    <td><strong>${esc(g.name)}</strong>${g.honorific ? ` <span class="dim">(${esc(g.honorific)})</span>` : ""}
        ${g.note ? `<br><span class="dim" style="font-size:12px">${esc(g.note)}</span>` : ""}</td>
    <td><a class="slug" href="/${esc(g.slug)}" target="_blank" rel="noopener">/${esc(g.slug)}</a></td>
    <td>${g.group_name ? `<span class="tag">${esc(g.group_name)}</span>` : ""}</td>
    <td>${opened}</td>
    <td>${rsvp}</td>
    <td><div class="actions">
      <button type="button" class="btn sm ghost copy" data-link="${esc(link)}">Copy link</button>
      <a class="btn sm ghost" href="/admin/guests/${g.id}">Sửa</a>
      <form method="post" action="/admin/guests/${g.id}/delete" style="display:inline"
            onsubmit="return confirm('Xoá ${esc(g.name).replace(/'/g, "\\'")} khỏi danh sách?')">
        <input type="hidden" name="_csrf" value="${esc(csrf)}">
        <button class="btn sm danger" type="submit">Xoá</button>
      </form>
    </div></td>
  </tr>`;
}

const COPY_SCRIPT = `<script>
document.addEventListener("click", function (e) {
  var b = e.target.closest(".copy");
  if (!b) return;
  var link = b.dataset.link, old = b.textContent;
  function done() { b.textContent = "Đã copy"; setTimeout(function(){ b.textContent = old; }, 1400); }
  if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, fallback);
  else fallback();
  function fallback() {
    var t = document.createElement("textarea");
    t.value = link; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); done(); } catch (err) { prompt("Copy link:", link); }
    document.body.removeChild(t);
  }
});
</script>`;

router.get("/", async (req, res, next) => {
  try {
    const search = String(req.query.q || "").trim();
    const group = String(req.query.group || "").trim();
    const [list, groups, s] = await Promise.all([
      db.listGuests({ search, group }),
      db.listGroups(),
      db.stats(),
    ]);

    const options = groups
      .map((g) => `<option value="${esc(g.group_name)}"${g.group_name === group ? " selected" : ""}>${esc(g.group_name)} (${g.n})</option>`)
      .join("");

    const cards = `<div class="cards">
      <div class="card"><div class="n">${s.total}</div><div class="l">Khách mời</div></div>
      <div class="card"><div class="n">${s.opened}</div><div class="l">Đã mở thiệp</div></div>
      <div class="card"><div class="n">${s.yes}</div><div class="l">Nhận lời</div></div>
      <div class="card"><div class="n">${s.no}</div><div class="l">Bận</div></div>
      <div class="card"><div class="n">${s.heads}</div><div class="l">Tổng người đến</div></div>
    </div>`;

    const addForm = `<div class="panel">
      <h2>Thêm khách</h2>
      <form method="post" action="/admin/guests">
        <input type="hidden" name="_csrf" value="${esc(req.csrf)}">
        <div class="row">
          <div><label for="n">Họ và tên</label><input id="n" name="name" required placeholder="Nguyễn Văn Tuấn"></div>
          <div><label for="h">Xưng hô</label><input id="h" name="honorific" placeholder="anh" list="hons">
            <datalist id="hons"><option>anh</option><option>chị</option><option>cô</option><option>chú</option><option>bác</option><option>em</option><option>gia đình</option></datalist></div>
          <div><label for="s">Đường dẫn</label><input id="s" name="slug" class="slug" placeholder="tự sinh từ tên"></div>
          <div><label for="gr">Nhóm</label><input id="gr" name="group" placeholder="Nhà trai" list="grps">
            <datalist id="grps">${groups.map((g) => `<option>${esc(g.group_name)}</option>`).join("")}</datalist></div>
          <div><button type="submit">Thêm</button></div>
        </div>
      </form>
    </div>`;

    const filter = `<form class="panel" method="get" action="/admin">
      <div class="row">
        <div><label for="q">Tìm kiếm</label><input id="q" name="q" value="${esc(search)}" placeholder="tên, đường dẫn hoặc ghi chú"></div>
        <div><label for="g">Nhóm</label><select id="g" name="group"><option value="">Tất cả nhóm</option>${options}</select></div>
        <div><button type="submit">Lọc</button></div>
        <div><a class="btn ghost" href="/admin">Bỏ lọc</a></div>
      </div>
    </form>`;

    const table = list.length
      ? `<div class="panel"><div class="scroll"><table>
           <thead><tr><th>Khách</th><th>Đường dẫn</th><th>Nhóm</th><th>Mở thiệp</th><th>Xác nhận</th><th></th></tr></thead>
           <tbody>${list.map((g) => guestRow(g, config.siteUrl, req.csrf)).join("")}</tbody>
         </table></div></div>`
      : `<div class="panel"><p class="dim" style="margin:0">Chưa có khách nào. Thêm người đầu tiên ở khung trên.</p></div>`;

    res.send(
      layout({
        title: "Danh sách khách mời",
        user: req.user,
        flash: flashOf(req),
        body: cards + addForm + filter + table + COPY_SCRIPT,
      })
    );
  } catch (err) {
    next(err);
  }
});

/* ---------- thêm / sửa / xoá ---------- */

function readGuestForm(body) {
  return {
    name: String(body.name || "").trim().slice(0, 120),
    honorific: String(body.honorific || "").trim().slice(0, 24),
    groupName: String(body.group || "").trim().slice(0, 60),
    note: String(body.note || "").trim().slice(0, 255),
    slug: String(body.slug || "").trim().toLowerCase(),
  };
}

router.post("/guests", requireCsrf, async (req, res, next) => {
  try {
    const form = readGuestForm(req.body);
    if (!form.name) return back(res, "/admin", false, "Chưa nhập tên khách.");

    const wanted = form.slug || slugs.slugify(form.name);
    if (form.slug && !slugs.isValid(form.slug)) {
      return back(res, "/admin", false, "Đường dẫn chỉ được dùng chữ thường, số và dấu gạch ngang.");
    }
    const slug = await slugs.unique(wanted, (s) => db.slugTaken(s));

    await db.createGuest({ ...form, slug });
    back(res, "/admin", true, `Đã thêm ${form.name} — đường dẫn /${slug}`);
  } catch (err) {
    next(err);
  }
});

router.get("/guests/:id", async (req, res, next) => {
  try {
    const g = await db.guestById(req.params.id);
    if (!g) return res.status(404).send("Không tìm thấy khách này.");

    const groups = await db.listGroups();
    res.send(
      layout({
        title: `Sửa: ${g.name}`,
        user: req.user,
        flash: flashOf(req),
        body: `<form class="panel" method="post" action="/admin/guests/${g.id}">
          <input type="hidden" name="_csrf" value="${esc(req.csrf)}">
          <div class="row">
            <div><label for="n">Họ và tên</label><input id="n" name="name" value="${esc(g.name)}" required></div>
            <div><label for="h">Xưng hô</label><input id="h" name="honorific" value="${esc(g.honorific)}"></div>
          </div>
          <div class="row" style="margin-top:12px">
            <div><label for="s">Đường dẫn</label><input id="s" name="slug" class="slug" value="${esc(g.slug)}" required></div>
            <div><label for="gr">Nhóm</label><input id="gr" name="group" value="${esc(g.group_name)}" list="grps">
              <datalist id="grps">${groups.map((x) => `<option>${esc(x.group_name)}</option>`).join("")}</datalist></div>
          </div>
          <div style="margin-top:12px"><label for="no">Ghi chú riêng (khách không thấy)</label>
            <input id="no" name="note" value="${esc(g.note)}"></div>
          <div style="margin-top:18px;display:flex;gap:10px">
            <button type="submit">Lưu</button>
            <a class="btn ghost" href="/admin">Quay lại</a>
          </div>
        </form>
        <div class="panel"><h2>Thống kê</h2>
          <p style="margin:0">Mở thiệp: <strong>${g.opened_count}</strong> lần.
          ${g.first_opened_at ? `Lần đầu ${new Date(g.first_opened_at).toLocaleString("vi-VN")}.` : "Chưa mở lần nào."}</p>
        </div>`,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.post("/guests/:id", requireCsrf, async (req, res, next) => {
  try {
    const form = readGuestForm(req.body);
    if (!form.name) return back(res, `/admin/guests/${req.params.id}`, false, "Chưa nhập tên khách.");
    if (!slugs.isValid(form.slug) || slugs.isReserved(form.slug)) {
      return back(res, `/admin/guests/${req.params.id}`, false, "Đường dẫn không hợp lệ hoặc đã bị hệ thống giữ.");
    }
    if (await db.slugTaken(form.slug, req.params.id)) {
      return back(res, `/admin/guests/${req.params.id}`, false, `Đường dẫn /${form.slug} đã có người dùng.`);
    }

    await db.updateGuest(req.params.id, form);
    back(res, "/admin", true, `Đã lưu ${form.name}.`);
  } catch (err) {
    next(err);
  }
});

router.post("/guests/:id/delete", requireCsrf, async (req, res, next) => {
  try {
    await db.deleteGuest(req.params.id);
    back(res, "/admin", true, "Đã xoá khách khỏi danh sách.");
  } catch (err) {
    next(err);
  }
});

/* ---------- xác nhận tham dự ---------- */

router.get("/rsvps", async (req, res, next) => {
  try {
    const list = await db.listRsvps();
    const rows = list
      .map(
        (r) => `<tr>
          <td><strong>${esc(r.name)}</strong>${r.slug ? `<br><span class="slug dim">/${esc(r.slug)}</span>` : ""}</td>
          <td>${r.group_name ? `<span class="tag">${esc(r.group_name)}</span>` : ""}</td>
          <td>${r.attending ? `<span class="ok">Sẽ đến</span>` : `<span class="no">Bận</span>`}</td>
          <td>${r.attending ? r.party_size : ""}</td>
          <td class="dim">${new Date(r.created_at).toLocaleString("vi-VN")}</td>
        </tr>`
      )
      .join("");

    res.send(
      layout({
        title: "Xác nhận tham dự",
        user: req.user,
        flash: flashOf(req),
        body: list.length
          ? `<div class="panel"><div class="scroll"><table>
               <thead><tr><th>Khách</th><th>Nhóm</th><th>Trả lời</th><th>Số người</th><th>Lúc</th></tr></thead>
               <tbody>${rows}</tbody></table></div></div>`
          : `<div class="panel"><p class="dim" style="margin:0">Chưa ai xác nhận.</p></div>`,
      })
    );
  } catch (err) {
    next(err);
  }
});

/* ---------- xuất CSV ---------- */

function csvCell(value) {
  const s = String(value === null || value === undefined ? "" : value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

router.get("/export.csv", async (req, res, next) => {
  try {
    const list = await db.listGuests({});
    const header = ["Tên", "Xưng hô", "Đường dẫn", "Link đầy đủ", "Nhóm", "Ghi chú", "Số lần mở", "Mở lần cuối", "Xác nhận", "Số người"];
    const lines = [header.join(";")];

    for (const g of list) {
      lines.push(
        [
          g.name, g.honorific, g.slug, `${config.siteUrl}/${g.slug}`, g.group_name, g.note,
          g.opened_count,
          g.last_opened_at ? new Date(g.last_opened_at).toLocaleString("vi-VN") : "",
          g.rsvp_attending === 1 ? "Sẽ đến" : g.rsvp_attending === 0 ? "Bận" : "",
          g.rsvp_attending === 1 ? g.rsvp_party || 1 : "",
        ].map(csvCell).join(";")
      );
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="khach-moi.csv"');
    res.send("﻿" + lines.join("\r\n")); // BOM để Excel đọc đúng tiếng Việt
  } catch (err) {
    next(err);
  }
});

module.exports = router;
