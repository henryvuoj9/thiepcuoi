"use strict";

/* Dịch mã lỗi của MySQL/Node thành câu nói rõ phải sửa biến môi trường nào.
   Chỉ hiện mã lỗi và lời khuyên — không bao giờ hiện tên CSDL, tài khoản hay
   mật khẩu, vì trang lỗi này ai cũng xem được. */
const EXPLAIN = {
  ER_BAD_DB_ERROR:
    "Không tồn tại cơ sở dữ liệu mang tên đó. Kiểm tra biến DB_NAME — copy nguyên văn từ cPanel > MySQL Databases.",
  ER_ACCESS_DENIED_ERROR:
    "MySQL từ chối đăng nhập. Kiểm tra DB_USER và DB_PASSWORD.",
  ER_DBACCESS_DENIED_ERROR:
    "Tài khoản đúng nhưng chưa được cấp quyền vào cơ sở dữ liệu này. Vào cPanel > MySQL Databases > Add User To Database và tick ALL PRIVILEGES.",
  ER_TABLEACCESS_DENIED_ERROR:
    "Tài khoản thiếu quyền trên bảng. Cấp lại ALL PRIVILEGES trong cPanel > MySQL Databases.",
  ECONNREFUSED:
    "Không kết nối được tới máy chủ MySQL. Kiểm tra DB_HOST (thường là localhost) và DB_PORT.",
  ENOTFOUND:
    "Không tìm thấy máy chủ MySQL theo tên trong DB_HOST.",
  ETIMEDOUT:
    "Kết nối tới MySQL quá hạn. Kiểm tra DB_HOST và DB_PORT.",
};

/** @returns {{code: string, hint: string}|null} null nếu không phải lỗi CSDL. */
function explain(err) {
  const code = err && err.code;
  if (!code) return null;

  const hint = EXPLAIN[code];
  if (hint) return { code, hint };

  // Lỗi CSDL lạ: vẫn cho xem mã để tra cứu, nhưng không bịa lời khuyên.
  if (/^(ER_|PROTOCOL_|ECONN|EHOST|ENOTFOUND|ETIMEDOUT)/.test(code)) {
    return { code, hint: "Lỗi cơ sở dữ liệu. Tra mã lỗi trên để biết chi tiết." };
  }
  return null;
}

/** Thiếu biến môi trường thì config ném lỗi có chữ "Thiếu biến môi trường". */
function isMissingConfig(err) {
  return Boolean(err && /Thiếu biến môi trường/.test(err.message || ""));
}

module.exports = { explain, isMissingConfig };
