-- Lược đồ CSDL. Ứng dụng tự chạy các câu lệnh này lúc khởi động
-- (xem ensureSchema trong src/db.js), nên bình thường bạn không cần dùng tệp này.
-- Giữ lại để tra cứu, và để nhập tay qua phpMyAdmin nếu cần.

CREATE TABLE IF NOT EXISTS guests (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug            VARCHAR(60)  NOT NULL,
  name            VARCHAR(120) NOT NULL,
  honorific       VARCHAR(24)  NOT NULL DEFAULT '',
  group_name      VARCHAR(60)  NOT NULL DEFAULT '',
  note            VARCHAR(255) NOT NULL DEFAULT '',
  opened_count    INT UNSIGNED NOT NULL DEFAULT 0,
  first_opened_at DATETIME     NULL,
  last_opened_at  DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_guests_slug (slug),
  KEY ix_guests_group (group_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rsvps (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_id   INT UNSIGNED NULL,
  slug       VARCHAR(60)  NOT NULL DEFAULT '',
  name       VARCHAR(120) NOT NULL,
  attending  TINYINT(1)   NOT NULL,
  party_size TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_rsvps_guest (guest_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
