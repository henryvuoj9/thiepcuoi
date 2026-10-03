/**
 * Lớp chẩn đoán hiển thị, bật bằng ?debug=1
 *
 * Có những lỗi bố cục chỉ xảy ra trên máy thật và không tài nào dựng lại được
 * bằng chế độ giả lập thiết bị của Chrome: người dùng bật phóng to chữ trong
 * cài đặt hệ thống, font tải hỏng, hoặc trình duyệt trong ứng dụng Zalo/Messenger.
 * Trang này đo thẳng những thứ đó rồi in ra để chụp màn hình gửi đi.
 */
(function () {
  if (!/[?&]debug=1/.test(location.search)) return;

  /**
   * Đo hệ số phóng chữ của hệ thống.
   * Canvas không bị cài đặt phóng chữ của trình duyệt tác động, còn DOM thì có —
   * nên tỉ lệ giữa hai phép đo chính là hệ số đang bị áp.
   */
  function textScale() {
    var probe = "ABCDEFGHIJabcdefghij0123456789";
    var el = document.createElement("span");
    el.textContent = probe;
    el.style.cssText = "position:absolute;left:-9999px;top:0;font:16px/1 serif;white-space:pre";
    document.body.appendChild(el);
    var domWidth = el.getBoundingClientRect().width;
    document.body.removeChild(el);

    var ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return null;
    ctx.font = "16px serif";
    var canvasWidth = ctx.measureText(probe).width;
    return canvasWidth ? domWidth / canvasWidth : null;
  }

  function box(sel) {
    var el = document.querySelector(sel);
    return el ? Math.round(el.getBoundingClientRect().width) : null;
  }

  /**
   * Thẻ được đặt left:5% width:90% nên bề rộng phải đúng 90% khối bìa.
   * Safari từng tính theo nội dung bên trong khi thẻ vừa có left+right vừa có
   * aspect-ratio, làm thẻ co lại và dồn sang trái. So thẳng cho khỏi đoán.
   */
  function cardWidth() {
    var actual = box(".card");
    var comp = box(".comp");
    if (actual === null || comp === null) return "—";
    var expected = Math.round(comp * 0.9);
    var off = Math.abs(actual - expected) > 2;
    return actual + (off ? "  <<< SAI, phải là " + expected : "  (đúng)");
  }

  function size(sel) {
    var el = document.querySelector(sel);
    if (!el) return "—";
    var computed = Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10;
    var inline = el.style.fontSize || "chưa đặt";
    return computed + "px (hàm co chữ: " + inline + ")";
  }

  function report() {
    var scale = textScale();
    var fonts = document.fonts
      ? ["400 40px \"New Icon Script VN\"", "500 17px \"Cormorant SC\"", "400 19px \"Cormorant Garamond\""]
          .map(function (f) {
            return (document.fonts.check(f, "Hải Vũ") ? "CÓ  " : "HỎNG") + "  " + f.replace(/"/g, "");
          })
          .join("\n")
      : "trình duyệt không hỗ trợ kiểm tra font";

    var lines = [
      "CHẨN ĐOÁN HIỂN THỊ",
      "",
      "Màn hình   " + window.innerWidth + " x " + window.innerHeight + "  @" + (window.devicePixelRatio || 1) + "x",
      "Thiết bị   " + screen.width + " x " + screen.height,
      "Phóng chữ  " + (scale === null ? "không đo được" : scale.toFixed(2) + "x" + (scale > 1.05 ? "   <<< ĐANG BẬT PHÓNG CHỮ" : "  (bình thường)")),
      "",
      "FONT",
      fonts,
      "",
      "KÍCH THƯỚC",
      "trang      " + box(".sheet"),
      "khối bìa   " + box(".comp"),
      "tấm thẻ    " + cardWidth(),
      "",
      "CỠ CHỮ TRÊN THẺ",
      "Save the date  " + size(".card .sc:not(.date)"),
      "tên           " + size("#cardNames .nm"),
      "16.11         " + size("#cardDate"),
      "",
      "Trình duyệt",
      navigator.userAgent,
    ];

    var pre = document.createElement("pre");
    pre.textContent = lines.join("\n");
    pre.style.cssText =
      "position:fixed;left:0;right:0;top:0;z-index:99999;margin:0;padding:12px;" +
      "background:#1b120c;color:#f6f2ec;font:11px/1.45 ui-monospace,Menlo,monospace;" +
      "white-space:pre-wrap;word-break:break-word;max-height:100%;overflow:auto;" +
      "border-bottom:2px solid #c9a46a";
    document.body.appendChild(pre);
  }

  /* Đợi hàm co chữ chạy xong rồi mới đo, nếu không sẽ đo nhầm trạng thái giữa chừng. */
  if (document.readyState === "complete") setTimeout(report, 2000);
  else window.addEventListener("load", function () { setTimeout(report, 2000); });
})();
