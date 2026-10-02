"use strict";

const express = require("express");
const db = require("../db");

const router = express.Router();

/* Chặn spam biểu mẫu ở mức thô. Bộ đếm theo tiến trình, đủ cho một đám cưới. */
const hits = new Map();
const MAX_PER_HOUR = 20;

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.at > 3600 * 1000) {
    hits.set(ip, { n: 1, at: now });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_PER_HOUR;
}

router.post("/rsvp", async (req, res) => {
  if (rateLimited(req.ip || "?")) {
    return res.status(429).json({ ok: false, error: "Gửi quá nhiều lần, thử lại sau." });
  }

  const body = req.body || {};
  const name = String(body.name || "").trim().slice(0, 120);
  const slug = String(body.slug || "").trim().toLowerCase().slice(0, 60);
  const attending = body.attending === true || body.attending === "true";
  const partySize = Math.min(10, Math.max(1, parseInt(body.guests, 10) || 1));

  if (!name) return res.status(400).json({ ok: false, error: "Thiếu tên." });

  try {
    let guestId = null;
    if (slug) {
      const guest = await db.guestBySlug(slug);
      if (guest) guestId = guest.id;
    }
    await db.createRsvp({ guestId, slug, name, attending, partySize });
    res.json({ ok: true });
  } catch (err) {
    console.error("Không lưu được xác nhận:", err.message);
    res.status(500).json({ ok: false, error: "Lỗi máy chủ." });
  }
});

module.exports = router;
