/**
 * Bộ nạp tài nguyên của màn bìa.
 *
 * Màn bìa là màn hình chờ, và là một cánh cửa khoá: khách KHÔNG mở được thiệp
 * cho tới khi mọi ảnh bên trong và nhạc đã về đủ. Đổi lại, lúc mở ra thì toàn
 * bộ thiệp hiện ngay lập tức, không có ảnh nào nhảy vào sau.
 *
 * Tải xong một lần thì HTTP cache của trình duyệt giữ lại (tên tệp có mã băm +
 * header immutable), nên lần mở sau gần như tức thì.
 */
(function () {
  var M = window.__ASSETS || { assets: [], audio: null };
  var ring, bar, CIRC = 301.59; // 2*pi*48
  var waiting = [], settled = false;
  var total = 0, loaded = 0;
  var audioCtl = typeof AbortController === "function" ? new AbortController() : null;
  var bgmSrcSet = false;

  /* Mạng hỏng giữa chừng thì vẫn phải mở được thiệp — thà thiếu một ảnh còn
     hơn khách đứng trước cánh cửa khoá vĩnh viễn. */
  var MAX_WAIT_MS = 20000;

  /* Chống nháy font trên bìa.
     Trình duyệt vẽ chữ ngay bằng font dự phòng rồi mới đổi sang font thật khi
     tải xong — với dòng tên cô dâu chú rể viết bằng font chữ ký thì cú đổi đó
     lộ rõ như trục trặc. Nên giữ chữ ở trạng thái chưa hiện cho tới khi font
     sẵn sàng; bìa vốn đã có màn chờ nên không ai thấy mình phải đợi. */
  var root = document.documentElement;
  function revealCoverText() { root.classList.add("fonts-ready"); }
  function refit() { if (typeof window.__fit === "function") window.__fit(); }
  function afterFonts() { revealCoverText(); refit(); }

  if (document.fonts && document.fonts.load) {
    /* Chỉ đợi đúng ba nét chữ mà bìa dùng, không đợi document.fonts.ready —
       cái đó đợi cả 26 tệp Cormorant của phần ruột thiệp, khách sẽ phải nhìn
       phong bì trống quá lâu. Chuỗi mẫu có đủ chữ Việt để kéo cả hai bộ ký tự
       latin và vietnamese về. */
    var probe = "Hải Vũ Phương Linh Trân trọng kính mời";
    Promise.all([
      document.fonts.load('400 40px "New Icon Script VN"', probe),
      document.fonts.load('500 17px "Cormorant SC"', probe),
      document.fonts.load('700 30px "Cormorant SC"', probe),
    ]).then(afterFonts, afterFonts);

    /* Hàm co chữ của bản gốc chạy theo document.fonts.ready. Nếu lời hứa đó
       được giải quyết trước khi font kịp được yêu cầu — chuyện hoàn toàn có thể
       xảy ra tuỳ thời điểm — thì chữ được đo bằng font dự phòng rồi không bao
       giờ đo lại, và chữ tràn ra ngoài khung. Chạy lại cho chắc. */
    if (document.fonts.addEventListener) {
      document.fonts.addEventListener("loadingdone", refit);
    }
    setTimeout(revealCoverText, 3000); // lưới an toàn: font hỏng cũng phải hiện chữ
  } else {
    revealCoverText();
  }

  window.__onAssetsReady = function (cb) { settled ? cb() : waiting.push(cb); };
  window.__assetsReady = function () { return settled; };

  /* Dự phòng: nếu tải nhạc hỏng, vẫn gắn nguồn để thẻ audio tự phát dần. */
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
    bar.style.strokeDashoffset = String(CIRC * (1 - Math.min(1, loaded / total)));
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

  /**
   * Nằm trong HTTP cache chưa đủ: trình duyệt vẫn phải giải mã ảnh, và việc đó
   * xảy ra đúng lúc phong bì mở ra — đó là lý do ảnh bên trong "nhảy vào sau".
   * Giải mã sẵn ở đây để lúc mở thiệp mọi thứ đã nằm trong bộ nhớ ảnh.
   */
  function decodeImage(url) {
    if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(url)) return Promise.resolve();
    return new Promise(function (done) {
      var img = new Image();
      img.onload = img.onerror = function () {
        if (img.decode) img.decode().then(done, done);
        else done();
      };
      img.src = url;
    });
  }

  /**
   * Tải nhạc VÀ chờ tới lúc phát được.
   *
   * Tải xong chưa đủ: trình duyệt còn phải giải mã. Nếu chỉ chờ tải, thiệp mở
   * ra rồi nhạc mới vào sau một nhịp — đúng thứ chủ thiệp phản ánh.
   */
  function loadAudio() {
    return grab(M.audio.url, audioCtl && audioCtl.signal)
      .then(function (blob) {
        var el = document.getElementById("bgm");
        if (!el || bgmSrcSet || !blob) return;
        bgmSrcSet = true;
        el.preload = "auto";
        el.src = URL.createObjectURL(blob);
        return new Promise(function (done) {
          var guard = setTimeout(done, 8000); // mạng kỳ quặc thì đừng treo mãi
          function ok() { clearTimeout(guard); done(); }
          el.addEventListener("canplaythrough", ok, { once: true });
          el.addEventListener("error", ok, { once: true });
          el.load();
        });
      })
      .catch(function () { advance(M.audio.bytes || 0); });
  }

  function start() {
    ring = document.getElementById("loadRing");
    bar = ring && ring.querySelector(".bar");
    if (bar) {
      bar.style.strokeDasharray = String(CIRC);
      bar.style.strokeDashoffset = String(CIRC);
    }

    var coverList = (M.cover || []).slice();
    var list = (M.assets || []).slice();
    for (var i = 0; i < coverList.length; i++) total += coverList[i].bytes || 0;
    for (var j = 0; j < list.length; j++) total += list[j].bytes || 0;
    if (M.audio) total += M.audio.bytes || 0;
    if (!total) return finish();

    if (ring) setTimeout(function () { if (!settled) ring.classList.add("on"); }, 300);

    var guard = setTimeout(finish, MAX_WAIT_MS);

    function fetchAll(items) {
      return Promise.all(items.map(function (a) {
        return grab(a.url)
          .then(function () { return decodeImage(a.url); })
          .catch(function () { advance(a.bytes || 0); });
      }));
    }

    /* Đợt một: chỉ phong bì, con tem và font chữ ký — những thứ khách nhìn thấy
       ngay. Chạy một mình nên không bị các tệp lớn tranh băng thông. */
    var wave1 = fetchAll(coverList);

    /* Đợt hai: phần còn lại, nhạc và font. Chỉ bắt đầu khi đợt một xong. */
    var wave2 = wave1.then(function () {
      var jobs = [fetchAll(list), M.audio ? loadAudio() : Promise.resolve()];
      if (document.fonts && document.fonts.ready) jobs.push(document.fonts.ready.catch(function () {}));
      return Promise.all(jobs);
    });

    var jobs = [wave2];

    Promise.all(jobs).then(function () { clearTimeout(guard); finish(); });
  }

  /* Trình duyệt quá cũ: bỏ qua toàn bộ, thiệp vẫn chạy như bản gốc. */
  if (typeof fetch !== "function" || typeof Promise !== "function") {
    window.__bgmEnsure = function () {
      var el = document.getElementById("bgm");
      if (el && M.audio && !el.src) el.src = M.audio.url;
    };
    window.__onAssetsReady = function (cb) { setTimeout(function () { settled = true; cb(); }, 2600); };
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
