/**
 * Bộ nạp tài nguyên của màn bìa.
 *
 * Màn bìa chính là màn hình chờ: khách ngắm phong bì trong lúc ảnh, font và nhạc
 * chảy về nền. Con tem bắt đầu đập khi mọi thứ sẵn sàng — thay cho mốc 2,6 giây
 * tuỳ tiện của bản gốc.
 *
 * Tải xong một lần thì HTTP cache của trình duyệt giữ lại (tên file có mã băm +
 * header immutable), nên lần mở sau không tải lại.
 */
(function () {
  var M = window.__ASSETS || { assets: [], audio: null };
  var ring, bar, CIRC = 301.59; // 2*pi*48
  var waiting = [], settled = false;
  var total = 0, loaded = 0;
  var audioCtl = typeof AbortController === "function" ? new AbortController() : null;
  var bgmSrcSet = false;

  window.__onAssetsReady = function (cb) { settled ? cb() : waiting.push(cb); };

  /* Khách chạm mở trước khi tải xong: bỏ việc tải nền, cho thẻ audio tự phát dần. */
  window.__bgmEnsure = function () {
    if (bgmSrcSet || !M.audio) return;
    bgmSrcSet = true;
    if (audioCtl) try { audioCtl.abort(); } catch (e) {}
    var el = document.getElementById("bgm");
    if (el) el.src = M.audio.url;
  };

  function finish() {
    if (settled) return;
    settled = true;
    if (ring) ring.classList.remove("on");
    for (var i = 0; i < waiting.length; i++) { try { waiting[i](); } catch (e) {} }
    waiting.length = 0;
  }

  function paint() {
    if (!bar || !total) return;
    var p = Math.min(1, loaded / total);
    bar.style.strokeDashoffset = String(CIRC * (1 - p));
  }

  function advance(n) { loaded += n; paint(); }

  /* Tải một tệp, báo tiến trình theo từng đoạn. Trả Blob nếu đọc được luồng. */
  function grab(url, signal) {
    return fetch(url, { signal: signal, credentials: "omit" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      if (!res.body || !res.body.getReader) {
        return res.blob().then(function (b) { advance(b.size); return b; });
      }
      var reader = res.body.getReader(), parts = [];
      return (function pump() {
        return reader.read().then(function (r) {
          if (r.done) return new Blob(parts);
          parts.push(r.value);
          advance(r.value.length);
          return pump();
        });
      })();
    });
  }

  function start() {
    ring = document.getElementById("loadRing");
    bar = ring && ring.querySelector(".bar");
    if (bar) {
      bar.style.strokeDasharray = String(CIRC);
      bar.style.strokeDashoffset = String(CIRC);
    }

    var list = (M.assets || []).slice();
    var saveData = navigator.connection && navigator.connection.saveData;
    var wantAudio = M.audio && !saveData;

    for (var i = 0; i < list.length; i++) total += list[i].bytes || 0;
    if (wantAudio) total += M.audio.bytes || 0;
    if (!total) return finish();

    if (ring) setTimeout(function () { if (!settled) ring.classList.add("on"); }, 400);

    /* Lưới an toàn: mạng quá chậm thì vẫn mở khoá con tem, đừng bắt khách chờ mãi. */
    var guard = setTimeout(finish, 12000);

    var jobs = list.map(function (a) { return grab(a.url).catch(function () { advance(a.bytes || 0); }); });

    if (wantAudio) {
      jobs.push(
        grab(M.audio.url, audioCtl && audioCtl.signal)
          .then(function (blob) {
            if (bgmSrcSet || !blob) return;
            bgmSrcSet = true;
            var el = document.getElementById("bgm");
            if (el) el.src = URL.createObjectURL(blob);
          })
          .catch(function () { advance(M.audio.bytes || 0); })
      );
    }

    Promise.all(jobs).then(function () { clearTimeout(guard); finish(); });
  }

  /* Không có fetch (trình duyệt rất cũ) thì bỏ qua toàn bộ, thiệp vẫn chạy bình thường. */
  if (typeof fetch !== "function" || typeof Promise !== "function") {
    window.__bgmEnsure = function () {
      var el = document.getElementById("bgm");
      if (el && M.audio && !el.src) el.src = M.audio.url;
    };
    window.__onAssetsReady = function (cb) { setTimeout(cb, 2600); };
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
