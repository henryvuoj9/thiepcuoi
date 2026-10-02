# Thiệp cưới Hải Vũ & Phương Linh

Máy chủ phát thiệp cưới theo đường dẫn riêng cho từng khách (`vulinh.site/tuan`),
kèm trang quản trị để thêm khách, lấy link gửi, theo dõi ai đã mở thiệp và xem
xác nhận tham dự.

---

## Chạy thử ở máy

```bash
npm install
npm run preview      # http://localhost:3000
```

Chế độ xem thử dùng cơ sở dữ liệu giả trong RAM nên **không cần cài MySQL**.
Dữ liệu mất khi tắt. Đăng nhập quản trị: `admin` / `xem-thu-123456`.

```bash
npm test             # 42 kiểm thử
npm run build        # dựng lại thiệp từ source/invitation.html
```

---

## Deploy lên Namecheap

Toàn bộ các bước dưới đây làm trong cPanel, **không cần SSH**.

### 1. Đưa code lên GitHub

```bash
git add -A
git commit -m "Thiệp cưới: máy chủ theo slug + CRM quản lý khách"
gh repo create thiepcuoi --private --source=. --push
```

Repo không chứa mật khẩu nào — `.env` đã nằm trong `.gitignore`.

### 2. Tạo cơ sở dữ liệu

cPanel → **MySQL® Databases**

1. *Create New Database*: `thiepcuoi` → cPanel đặt tên thật thành `<tàikhoản>_thiepcuoi`
2. *Add New User*: đặt tên và mật khẩu mạnh (bấm Password Generator rồi lưu lại)
3. *Add User To Database* → chọn cặp vừa tạo → tick **ALL PRIVILEGES**

Không cần tạo bảng: ứng dụng tự dựng lược đồ ở lần chạy đầu tiên.

### 3. Tạo ứng dụng Node

cPanel → **Setup Node.js App** → *Create Application*

| Trường | Giá trị |
|---|---|
| Node.js version | 20 (hoặc 18) |
| Application mode | Production |
| Application root | `thiepcuoi` |
| Application URL | `vulinh.site` |
| Application startup file | `app.js` |

### 4. Nối với GitHub

cPanel → **Git™ Version Control** → *Create*

- Bật *Clone a Repository*
- **Clone URL**: địa chỉ repo trên GitHub
- **Repository Path**: `repositories/thiepcuoi`

> Repo **private** cần khoá SSH: cPanel → *SSH Access* → *Manage SSH Keys* →
> tạo khoá → copy public key → dán vào GitHub → repo → *Settings* → *Deploy keys*.
> Muốn nhanh thì để repo public cũng được — trong đó không có bí mật nào.

Tạo xong: *Manage* → **Pull or Deploy** → *Deploy HEAD Commit*.
Tệp `.cpanel.yml` sẽ tự chép mã nguồn vào `~/thiepcuoi` và tài nguyên tĩnh vào
`~/public_html/assets`.

### 5. Khai báo biến môi trường

Quay lại **Setup Node.js App** → mở ứng dụng → mục *Environment variables*,
thêm từng biến:

| Biến | Giá trị |
|---|---|
| `SITE_URL` | `https://vulinh.site` |
| `SESSION_SECRET` | chuỗi ngẫu nhiên (xem bên dưới) |
| `ADMIN_USER` | `admin` |
| `ADMIN_PASSWORD_HASH` | chuỗi băm (xem bên dưới) |
| `DB_HOST` | `localhost` |
| `DB_NAME` | `<tàikhoản>_thiepcuoi` |
| `DB_USER` | `<tàikhoản>_<user>` |
| `DB_PASSWORD` | mật khẩu đã lưu ở bước 2 |

Hai giá trị cần tạo ở máy anh:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run hash-password -- 'mật khẩu quản trị của anh'
```

> Cách khác: tạo tệp `~/thiepcuoi/.env` bằng File Manager theo mẫu `.env.example`.
> Dùng giao diện biến môi trường thì gọn hơn và không có tệp nào để lỡ tay commit.

### 6. Cài gói và khởi động

Vẫn ở **Setup Node.js App**: bấm **Run NPM Install**, rồi **Restart**.

Mở `https://vulinh.site` — thiệp chung phải hiện ra.
Mở `https://vulinh.site/admin` — đăng nhập được là xong.

### 7. Bật HTTPS

cPanel → **SSL/TLS Status** → *Run AutoSSL*.
Sau đó cPanel → **Domains** → bật *Force HTTPS Redirect*.

### 8. Chống "ngủ đông" (nên làm)

Passenger tắt ứng dụng khi vắng khách, làm người vào tiếp theo chờ 1–3 giây.
cPanel → **Cron Jobs** → thêm lịch *Every 5 minutes*:

```
curl -s -o /dev/null https://vulinh.site/healthz
```

### Cập nhật về sau

```bash
git push
```

Rồi cPanel → *Git Version Control* → **Manage**:

1. **Update from Remote** — kéo code mới từ GitHub về máy chủ
2. Kiểm tra dòng **HEAD Commit** đã đổi sang commit mới nhất
3. **Deploy HEAD Commit** — chép code vào chỗ chạy
4. Setup Node.js App → **Restart**

> **Hai nút này làm hai việc khác hẳn nhau.** `Deploy HEAD Commit` chỉ triển
> khai cái HEAD *đang có* trên máy chủ. Quên bước 1 thì bấm deploy bao nhiêu
> lần cũng vẫn ra bản cũ, không có lỗi nào báo. Luôn đọc dòng HEAD Commit để
> xác nhận.
>
> Máy chủ chạy **LiteSpeed**, không đọc tín hiệu `tmp/restart.txt` của
> Passenger — phải bấm Restart bằng tay.

Không cần chạy lại NPM Install trừ khi `package.json` đổi.

Muốn biết chắc bản nào đang chạy: mở `/admin/diag?k=<8 ký tự đầu của
SESSION_SECRET>`. Trang này in phiên bản, thời điểm deploy, hình dạng từng
biến môi trường và trạng thái kết nối CSDL — không in giá trị nào.

---

## Dùng hằng ngày

Vào `vulinh.site/admin`:

- **Thêm khách** — nhập tên, đường dẫn tự sinh không dấu (`Nguyễn Văn Tuấn` → `nguyen-van-tuan`).
  Muốn ngắn gọn thì tự gõ `tuan` vào ô đường dẫn.
- **Copy link** — bấm nút trên mỗi dòng, dán thẳng vào Zalo/Messenger.
- **Mở thiệp** — hiện số lần và thời điểm mở gần nhất. Mỗi máy chỉ đếm một lần
  trong 6 tiếng, nên con số phản ánh người thật chứ không phải số lần tải lại.
- **Nhóm** — gắn "Nhà trai", "Bạn đại học"… rồi lọc theo nhóm.
- **Xác nhận** — xem ai nhận lời, ai bận, tổng số người sẽ đến.
- **Tải CSV** — mở bằng Excel, đã có BOM nên tiếng Việt không vỡ.

---

## Sửa nội dung thiệp

Nội dung (tên, địa điểm, giờ, bố mẹ, số điện thoại) nằm trong `window.DATA`
ở `source/invitation.html`. Sửa xong:

```bash
npm run build && npm test && git commit -am "Đổi giờ tiệc" && git push
```

Rồi deploy lại như bước "Cập nhật về sau".

---

## Cấu trúc

```
source/invitation.html   bản gốc 4.9 MB, mọi thứ nhúng inline — nguồn duy nhất
tools/build.mjs          tách tài nguyên, cắt nhạc, sinh template
tools/audio.mjs          cắt + nén nhạc bằng afconvert của macOS
tools/fetch-fonts.mjs    tải font Google về source/fonts/ (chạy tay, hiếm khi cần)
source/fonts/            font tự host, có commit — thiệp không gọi ra Internet
src/template.html        ĐẦU RA của build (45 KB) — có commit, đừng sửa tay
public/assets/           ĐẦU RA của build — có commit, đừng sửa tay
src/server.js            khung Express
src/routes/              invite (thiệp), admin (CRM), api (xác nhận)
src/db.js                MySQL + tự dựng lược đồ
src/client/loader.js     bộ nạp phía trình duyệt, vòng tiến trình quanh con tem
app.js                   điểm khởi động cho Passenger
.cpanel.yml              kịch bản deploy của cPanel
```

Thư mục `src/template.html` và `public/assets/` là sản phẩm của build nhưng
**vẫn được commit**: hosting không có `afconvert` nên không tự dựng lại được,
và nhờ vậy deploy chỉ còn là chép tệp.

---

## Giới hạn đã biết

- **Bộ đếm chặn dò mật khẩu và chặn spam nằm trong RAM từng tiến trình.**
  Passenger chạy nhiều tiến trình nên con số không dùng chung. Đủ chặn máy quét
  tự động; không phải lớp phòng thủ nghiêm túc trước tấn công có chủ đích.
- **"Lần sau khỏi tải" phụ thuộc HTTP cache của trình duyệt.** Safari trên iPhone
  dọn cache sau khoảng 7 ngày không ghé thăm, khi đó khách tải lại. Không hỏng,
  chỉ chậm như lần đầu.
- **Thiệp không tải font từ Google nữa.** File gốc trỏ sang
  `fonts.googleapis.com` với hai họ font xếp sai thứ tự bảng chữ cái — Google
  trả 404 và **không font nào tải được**, toàn bộ chữ rơi về Georgia. Giờ font
  nằm trong `source/fonts/` và được nhúng thẳng vào trang. Muốn đổi bộ chữ thì
  sửa `tools/fetch-fonts.mjs` rồi chạy `node tools/fetch-fonts.mjs && npm run build`.
- **Biến môi trường không được chứa ký tự `$`.** cPanel cho giá trị đi qua một
  lớp shell, nên `$abc` bị nuốt thành chuỗi rỗng. Vì vậy chuỗi băm mật khẩu
  ngăn bằng dấu chấm. Có kiểm thử chặn không cho `$` quay lại.
- **Nhạc dùng HE-AAC 48 kbps.** Trình duyệt rất cũ có thể giải mã thiếu lớp SBR
  và nghe hơi đục. Bản AAC-LC 64 kbps đã dựng sẵn ở `public/assets/bgm-lc.*.m4a`;
  muốn đổi thì hoán vị hai phần tử trong `AUDIO.variants` của `tools/build.mjs`
  rồi chạy lại `npm run build`.
