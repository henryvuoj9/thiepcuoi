"use strict";

const express = require("express");
const zlib = require("node:zlib");
const { join } = require("node:path");

const dbErrors = require("./db-errors");
const invite = require("./routes/invite");
const admin = require("./routes/admin");
const api = require("./routes/api");

/** Đọc cookie mà không cần cookie-parser. */
function cookies(req, res, next) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    const key = part.slice(0, eq).trim();
    if (!key || key in out) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  req.cookies = out;
  next();
}


/**
 * Nén gzip cho HTML.
 *
 * Apache nén tệp tĩnh giúp rồi, nhưng phản hồi đi qua Passenger thì cần .htaccess
 * ở thư mục gốc — mà tệp đó do cPanel sinh ra, ta không nên ghi đè. Nén ngay tại
 * Node rẻ hơn nhiều so với rủi ro đó: 45 KB thiệp còn khoảng 11 KB, tốn ~1ms CPU.
 */
function compressText(req, res, next) {
  if (!/\bgzip\b/.test(req.headers["accept-encoding"] || "")) return next();

  const send = res.send.bind(res);
  res.send = (body) => {
    if (typeof body !== "string" || body.length < 1400) return send(body);

    const type = String(res.getHeader("Content-Type") || "text/html; charset=utf-8");
    if (!/text\/|json|javascript/.test(type)) return send(body);

    res.setHeader("Content-Type", type);
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Vary", "Accept-Encoding");
    res.removeHeader("Content-Length");
    return send(zlib.gzipSync(body, { level: 6 }));
  };
  next();
}

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", true); // đứng sau Apache/Passenger

  app.use(express.json({ limit: "16kb" }));
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));
  app.use(cookies);
  app.use(compressText);

  /* Trên cPanel, Apache phục vụ /assets trực tiếp từ public_html và không bao giờ
     chạm tới Node. Dòng này chỉ để chạy thử ở máy cục bộ. */
  app.use(
    "/assets",
    express.static(join(__dirname, "..", "public", "assets"), {
      immutable: true,
      maxAge: "365d",
      fallthrough: false,
    })
  );

  app.use("/api", api);
  app.use("/admin", admin);
  app.use("/", invite);

  app.use((req, res) => {
    res.status(404).type("text/plain; charset=utf-8").send("Không tìm thấy trang này.");
  });

  app.use((err, req, res, next) => {
    console.error("Lỗi không bắt được:", err);
    if (res.headersSent) return next(err);

    /* Lỗi cấu hình hay lỗi kết nối CSDL thì nói thẳng phải sửa gì — không thì
       người dựng trang chỉ thấy "có sự cố" và phải đoán qua nhiều vòng.
       Chỉ hiện mã lỗi và lời khuyên, không hiện giá trị cấu hình nào. */
    const lines = ["Máy chủ gặp sự cố. Thử lại sau ít phút."];

    if (dbErrors.isMissingConfig(err)) {
      lines.push("", `Cấu hình: ${err.message}`);
    } else {
      const found = dbErrors.explain(err);
      if (found) lines.push("", `Mã lỗi: ${found.code}`, found.hint);
    }

    res.status(500).type("text/plain; charset=utf-8").send(lines.join("\n"));
  });

  return app;
}

module.exports = { createApp };
