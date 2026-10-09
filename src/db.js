"use strict";

const mysql = require("mysql2/promise");
const { config } = require("./config");

let pool = null;

/* Dòng xác nhận "mồ côi": trỏ tới một khách đã bị xoá. Không được tính vào
   bất kỳ con số nào. */
const NOT_ORPHANED =
  "(r.guest_id IS NULL OR EXISTS (SELECT 1 FROM guests g2 WHERE g2.id = r.guest_id))";

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...config.db,
      waitForConnections: true,
      connectionLimit: 4, // Entry Processes trần 20; giữ kết nối ít và rẻ
      queueLimit: 0,
      charset: "utf8mb4_unicode_ci",
      timezone: "+07:00",
    });
  }
  return pool;
}

/* Gói Stellar không có SSH, nên không ai chạy được lệnh tạo bảng trên server.
   Vì vậy ứng dụng tự dựng lược đồ lúc khởi động — idempotent và chỉ chạy một lần
   mỗi tiến trình. Tài khoản MySQL do cPanel tạo có đủ quyền trên CSDL của nó. */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS guests (
     id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
     slug            VARCHAR(60)  NOT NULL,
     name            VARCHAR(120) NOT NULL,
     honorific       VARCHAR(24)  NOT NULL DEFAULT '',  -- không dùng nữa: xưng hô
                                                       -- gõ thẳng vào ô tên. Giữ cột để
                                                       -- không mất dữ liệu đã nhập.
     group_name      VARCHAR(60)  NOT NULL DEFAULT '',
     note            VARCHAR(255) NOT NULL DEFAULT '',
     opened_count    INT UNSIGNED NOT NULL DEFAULT 0,
     first_opened_at DATETIME     NULL,
     last_opened_at  DATETIME     NULL,
     created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY uq_guests_slug (slug),
     KEY ix_guests_group (group_name)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS rsvps (
     id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
     guest_id   INT UNSIGNED NULL,
     slug       VARCHAR(60)  NOT NULL DEFAULT '',
     name       VARCHAR(120) NOT NULL,
     attending  TINYINT(1)   NOT NULL,
     party_size TINYINT UNSIGNED NOT NULL DEFAULT 1,
     created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     KEY ix_rsvps_guest (guest_id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

let schemaReady = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const conn = await getPool().getConnection();
      try {
        for (const statement of SCHEMA) await conn.query(statement);
      } finally {
        conn.release();
      }
    })().catch((err) => {
      schemaReady = null; // cho phép thử lại ở lượt sau
      throw err;
    });
  }
  return schemaReady;
}

async function query(sql, params) {
  await ensureSchema();
  const [rows] = await getPool().execute(sql, params || []);
  return rows;
}

/* ---------- khách mời ---------- */

async function guestBySlug(slug) {
  const rows = await query("SELECT * FROM guests WHERE slug = ? LIMIT 1", [slug]);
  return rows[0] || null;
}

async function guestById(id) {
  const rows = await query("SELECT * FROM guests WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function slugTaken(slug, exceptId) {
  const rows = exceptId
    ? await query("SELECT 1 FROM guests WHERE slug = ? AND id <> ? LIMIT 1", [slug, exceptId])
    : await query("SELECT 1 FROM guests WHERE slug = ? LIMIT 1", [slug]);
  return rows.length > 0;
}

async function listGuests({ search = "", group = "" } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push("(name LIKE ? OR slug LIKE ? OR note LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (group) {
    where.push("group_name = ?");
    params.push(group);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return query(
    `SELECT g.*,
            (SELECT r.attending FROM rsvps r WHERE r.guest_id = g.id ORDER BY r.id DESC LIMIT 1) AS rsvp_attending,
            (SELECT r.party_size FROM rsvps r WHERE r.guest_id = g.id ORDER BY r.id DESC LIMIT 1) AS rsvp_party
       FROM guests g ${clause}
       ORDER BY g.group_name ASC, g.name ASC`,
    params
  );
}

async function listGroups() {
  const rows = await query(
    "SELECT group_name, COUNT(*) AS n FROM guests WHERE group_name <> '' GROUP BY group_name ORDER BY group_name"
  );
  return rows;
}

async function createGuest({ slug, name, groupName, note }) {
  const rows = await query(
    "INSERT INTO guests (slug, name, group_name, note) VALUES (?, ?, ?, ?)",
    [slug, name, groupName, note]
  );
  return rows.insertId;
}

async function updateGuest(id, { slug, name, groupName, note }) {
  await query(
    "UPDATE guests SET slug = ?, name = ?, group_name = ?, note = ? WHERE id = ?",
    [slug, name, groupName, note, id]
  );
}

/**
 * Xoá khách thì xoá luôn xác nhận của họ.
 *
 * Bảng rsvps không có ràng buộc khoá ngoại, nên trước đây các dòng xác nhận
 * nằm lại sau khi khách bị xoá và vẫn được đếm — bảng thống kê báo 1 khách mời
 * nhưng 4 người nhận lời.
 */
async function deleteGuest(id) {
  await query("DELETE FROM rsvps WHERE guest_id = ?", [id]);
  await query("DELETE FROM guests WHERE id = ?", [id]);
}

/**
 * Ghi nhận khách mở thiệp. Gọi theo kiểu bắn-và-quên trong lúc render,
 * nên lỗi ở đây tuyệt đối không được làm hỏng việc trả thiệp.
 */
async function recordOpen(id) {
  await query(
    `UPDATE guests
        SET opened_count = opened_count + 1,
            first_opened_at = COALESCE(first_opened_at, NOW()),
            last_opened_at = NOW()
      WHERE id = ?`,
    [id]
  );
}

/* ---------- xác nhận tham dự ---------- */

async function createRsvp({ guestId, slug, name, attending, partySize }) {
  await query(
    "INSERT INTO rsvps (guest_id, slug, name, attending, party_size) VALUES (?, ?, ?, ?, ?)",
    [guestId, slug, name, attending ? 1 : 0, partySize]
  );
}

async function listRsvps() {
  return query(
    `SELECT r.*, g.group_name
       FROM rsvps r LEFT JOIN guests g ON g.id = r.guest_id
      WHERE ${NOT_ORPHANED}
      ORDER BY r.id DESC`
  );
}

async function stats() {
  const [g] = await query(
    "SELECT COUNT(*) AS total, SUM(opened_count > 0) AS opened FROM guests"
  );
  /* Chỉ đếm xác nhận MỚI NHẤT của mỗi khách, và bỏ qua những dòng mồ côi —
     dòng trỏ tới một khách đã bị xoá. Không lọc mồ côi thì xoá khách xong con
     số vẫn đứng nguyên. Dòng có guest_id rỗng là người vào thiệp chung, vẫn
     tính bình thường. */
  const [r] = await query(
    `SELECT COUNT(*) AS replies,
            SUM(r.attending = 1) AS yes,
            SUM(r.attending = 0) AS no,
            COALESCE(SUM(CASE WHEN r.attending = 1 THEN r.party_size ELSE 0 END), 0) AS heads
       FROM rsvps r
      WHERE r.id IN (SELECT MAX(id) FROM rsvps GROUP BY COALESCE(guest_id, CONCAT('n', id)))
        AND ${NOT_ORPHANED}`
  );
  return {
    total: Number(g.total || 0),
    opened: Number(g.opened || 0),
    replies: Number(r.replies || 0),
    yes: Number(r.yes || 0),
    no: Number(r.no || 0),
    heads: Number(r.heads || 0),
  };
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  query, getPool, close, ensureSchema,
  guestBySlug, guestById, slugTaken, listGuests, listGroups,
  createGuest, updateGuest, deleteGuest, recordOpen,
  createRsvp, listRsvps, stats,
};
