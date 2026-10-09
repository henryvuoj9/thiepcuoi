"use strict";

/* Máy phát triển không có MySQL, nên tầng CSDL được thay bằng bản giả giữ dữ
   liệu trong RAM. Mọi thứ phía trên nó — định tuyến, phiên, CSRF, kết xuất
   thiệp — vẫn là mã thật chạy qua HTTP thật. */

const { hashPassword } = require("../src/auth");

const PASSWORD = "mat-khau-rat-dai-123";

function makeFakeDb() {
  const state = { guests: [], rsvps: [], nextGuestId: 1 };

  /* Dòng xác nhận còn "sống": không trỏ tới khách nào, hoặc trỏ tới khách còn tồn tại. */
  const alive = (r) => r.guestId == null || state.guests.some((g) => String(g.id) === String(r.guestId));

  const api = {
    _state: state,
    async ensureSchema() {},
    async guestBySlug(slug) {
      return state.guests.find((g) => g.slug === slug) || null;
    },
    async guestById(id) {
      return state.guests.find((g) => String(g.id) === String(id)) || null;
    },
    async slugTaken(slug, exceptId) {
      return state.guests.some((g) => g.slug === slug && String(g.id) !== String(exceptId));
    },
    async listGuests() {
      return state.guests.map((g) => ({ ...g, rsvp_attending: null, rsvp_party: null }));
    },
    async listGroups() {
      const seen = new Map();
      for (const g of state.guests) {
        if (g.group_name) seen.set(g.group_name, (seen.get(g.group_name) || 0) + 1);
      }
      return [...seen].map(([group_name, n]) => ({ group_name, n }));
    },
    async createGuest({ slug, name, groupName, note }) {
      const id = state.nextGuestId++;
      state.guests.push({
        id, slug, name,
        group_name: groupName || "",
        note: note || "",
        opened_count: 0, first_opened_at: null, last_opened_at: null,
      });
      return id;
    },
    async updateGuest(id, { slug, name, groupName, note }) {
      const g = await api.guestById(id);
      if (g) Object.assign(g, { slug, name, group_name: groupName, note });
    },
    async deleteGuest(id) {
      /* Giống bản thật: xoá khách thì xoá luôn xác nhận của họ, nếu không các
         dòng đó mồ côi và vẫn bị đếm. */
      state.rsvps = state.rsvps.filter((r) => String(r.guestId) !== String(id));
      state.guests = state.guests.filter((g) => String(g.id) !== String(id));
    },
    async recordOpen(id) {
      const g = await api.guestById(id);
      if (!g) return;
      g.opened_count += 1;
      g.first_opened_at = g.first_opened_at || new Date();
      g.last_opened_at = new Date();
    },
    async createRsvp(row) {
      state.rsvps.push({ ...row, id: state.rsvps.length + 1, created_at: new Date() });
    },
    async listRsvps() {
      return [...state.rsvps].filter(alive).reverse();
    },
    async stats() {
      /* Phản chiếu đúng ngữ nghĩa của bản thật: chỉ lấy xác nhận MỚI NHẤT của
         mỗi khách, và bỏ qua dòng mồ côi. */
      const latest = new Map();
      for (const r of state.rsvps.filter(alive)) {
        latest.set(r.guestId == null ? `n${r.id}` : `g${r.guestId}`, r);
      }
      const rows = [...latest.values()];
      return {
        total: state.guests.length,
        opened: state.guests.filter((g) => g.opened_count > 0).length,
        replies: rows.length,
        yes: rows.filter((r) => r.attending).length,
        no: rows.filter((r) => !r.attending).length,
        heads: rows.filter((r) => r.attending).reduce((n, r) => n + (r.partySize || 1), 0),
      };
    },
    async close() {},
  };
  return api;
}

/** Dựng ứng dụng thật trên một cổng ngẫu nhiên, với CSDL giả. */
async function startApp() {
  process.env.SITE_URL = "https://vulinh.site";
  process.env.SESSION_SECRET = "bi-mat-dung-cho-kiem-thu";
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASSWORD_HASH = hashPassword(PASSWORD);

  const dbPath = require.resolve("../src/db.js");
  const fake = makeFakeDb();
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fake };

  const { createApp } = require("../src/server");
  const server = createApp().listen(0);
  await new Promise((done) => server.once("listening", done));

  const base = `http://127.0.0.1:${server.address().port}`;

  return {
    base,
    db: fake,
    password: PASSWORD,
    async stop() {
      await new Promise((done) => server.close(done));
    },
  };
}

/** fetch không tự đi theo redirect, và nhớ cookie giữa các lượt gọi. */
function makeClient(base) {
  const jar = new Map();

  return async function call(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (jar.size) {
      headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    }

    const res = await fetch(base + path, { ...options, headers, redirect: "manual" });

    for (const raw of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      const key = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === "") jar.delete(key);
      else jar.set(key, value);
    }

    return res;
  };
}

module.exports = { startApp, makeClient, makeFakeDb };
