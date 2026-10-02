"use strict";

const express = require("express");
const db = require("../db");
const slugs = require("../slug");
const { render } = require("../template");

const router = express.Router();

/* Một lượt "mở thiệp" chỉ đếm một lần mỗi 6 tiếng cho mỗi máy, nếu không
   mỗi lần khách tải lại trang lại cộng thêm một và con số mất ý nghĩa. */
const SEEN_HOURS = 6;

function alreadyCounted(req, id) {
  return req.cookies[`seen_${id}`] === "1";
}

function markCounted(res, id) {
  res.cookie(`seen_${id}`, "1", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SEEN_HOURS * 3600 * 1000,
    path: "/",
  });
}

function sendInvitation(res, guest) {
  // Thiệp mang tên riêng của khách nên không được để proxy nào lưu lại.
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(render(guest));
}

/* Cron trong cPanel gọi địa chỉ này vài phút một lần để Passenger khỏi ngủ,
   nhờ đó khách đầu tiên không phải chờ khởi động lại. Rẻ hơn gọi vào "/"
   vì không dựng cả thiệp. */
router.get("/healthz", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.type("text/plain").send("ok");
});

router.get("/", (req, res) => sendInvitation(res, null));

router.get("/:slug", async (req, res) => {
  const raw = String(req.params.slug || "");
  const slug = raw.toLowerCase();

  /* Khách gõ /Tuan hay /TUAN vẫn ra đúng thiệp, nhưng đưa về một địa chỉ chuẩn
     để lượt mở không bị đếm tách ra nhiều biến thể. */
  if (raw !== slug) return res.redirect(301, `/${slug}`);

  if (!slugs.isValid(slug) || slugs.isReserved(slug)) {
    return res.status(404).type("text/plain; charset=utf-8").send("Không tìm thấy trang này.");
  }

  let guest = null;
  try {
    guest = await db.guestBySlug(slug);
  } catch (err) {
    // CSDL trục trặc không được phép làm sập thiệp cưới: vẫn trả thiệp chung.
    console.error("Không tra được khách theo slug:", err.message);
  }

  if (guest && !alreadyCounted(req, guest.id)) {
    markCounted(res, guest.id);
    db.recordOpen(guest.id).catch((err) => console.error("Không ghi được lượt mở:", err.message));
  }

  sendInvitation(res, guest);
});

module.exports = router;
