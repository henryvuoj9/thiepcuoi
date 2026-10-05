# Thiệp cưới online — Hải Vũ & Phương Linh (bàn giao)

## Cách build (bắt buộc sau mọi thay đổi)
```bash
cd "/Users/lap14539/tmp claude/wedding_invitation"
python3 build.py v20_template.html          # template hiện hành
cp lv-wedding-invitation.html ~/Downloads/   # bản chia sẻ
```
`build.py` đọc template, thay các placeholder `__X__` bằng base64 của font/ảnh/nhạc trong `assets/` và `fonts/`,
sinh SVG viền ren oval, ghi ra `lv-wedding-invitation.html` (1 file độc lập ~4.9MB). **File HTML không đọc assets/ lúc mở** —
đổi ảnh/nhạc là phải build lại. Cần Python 3 + Pillow (+ numpy, scipy chỉ cho script xử lý ảnh).

## File quan trọng
| File | Vai trò |
|---|---|
| `v20_template.html` | Template HIỆN HÀNH (burgundy). v3…v19 là lịch sử, đừng sửa. |
| `build.py` | Ghép asset → HTML. Nhận `assets/photo.jpg` (tự xoay EXIF, thu 900×1200 → `photo_web.jpg`) và `assets/music_web.mp3`. |
| `lv-wedding-invitation.html` | Bản build mới nhất. |
| `fonts/NewIconScript-VN.woff2` | Font tên (New Icon Script của Canva + bộ dấu VN tự ghép bằng `fonts/build_vn.py`). Font thương mại — nên mua trước khi public. |
| `assets/envelope_closed_bg.jpg` | Phong bì đóng (cover), đã đổi burgundy từ `envelope_closed_v3.jpg` (nâu, crop từ Canva page 4). Đỉnh nắp ở x=0.5, y=0.68 (desktop) / 0.70 (mobile) — hằng số `TIP_Y_*` trong template. |
| `assets/envelope_open_bg.webp` | Phong bì mở (hero), burgundy, đã xóa tờ giấy ngà. Bản nâu: `envelope_open_nocard.webp`. |
| `assets/stamp_beige_logo.webp` | Dấu sáp be dập logo VL. Nguồn: `stamp_raw.png` (seal hồng Canva) + `../logo.png`. |
| `assets/lace_frame_web.webp`, `orchid_web.webp`, `swan_web.png` | Thẻ ren vuông, hoa lan, thiên nga (tách từ Canva page 6/7). |
| `assets/photo.jpg` | Ảnh cưới trong oval (user cung cấp). |
| `assets/music.mp3` → `music_web.mp3` | Nhạc (Love of My Life), nén 80kbps khi nhúng. |
| `../logo.png`, `../logo-dark.png` | Logo VL tách nền (trắng / nâu). |
| `font_map.md`, `asset_checklist.md`, `TWEAK_GUIDE.md` | Tài liệu cũ (TWEAK panel đã gỡ ở v13). |

Canva design nguồn: https://www.canva.com/design/DAHWpL8dwNE (page 4 phong bì đóng, 5 phong bì mở, 6 hoa, 7 ren/sáp, 8 stamp).

## Sửa nội dung
Tất cả trong `window.DATA` ở cuối template: tên, bố mẹ, địa điểm/địa chỉ/mapQuery, ngày giờ (`weddingDate` ISO cho countdown + `whenDay/whenTime` hiển thị + `calStart/calEnd` cho Google Calendar + `dateShort` trên thẻ), `parking` (2 ghi chú dưới bản đồ), `timeline` (4 mốc + icon), `rsvpDeadline`, `contact`.
Tên khách & xưng hô: placeholder `{Tên khách}` / `{anh/chị}`, ghi đè bằng link `?g=Quốc%20Khánh&x=anh`. `?open=1` bỏ qua bì thư để xem nhanh.

## Sửa giao diện
Số đo (cỡ chữ, khoảng cách, vị trí hoa/thiên nga/oval…) là biến CSS trong `:root` (bộ điện thoại) và `@media (min-width:900px) :root` (bộ laptop): `--c-*` bì thư, `--h-*` thư mở, `--i-*` thông tin, `--t-*` lịch trình, `--r-*` RSVP. Màu: `--brown/--brown-2/--brown-3/--ink/--ink-2/--ink-3/--line` (hiện là burgundy #5B1F2A).
Hàm JS `fit()` tự co chữ nowrap theo bề rộng; nhóm `gA..gD,gF` ép cùng cỡ. `envpos()` đặt ảnh phong bì phủ kín màn và ghi `--c-tip/--c-tipx` để stamp bám đỉnh nắp.

## Bẫy đã gặp
- Bất kỳ phần tử nào rộng hơn màn (vd countdown min-width) làm layout viewport mobile rộng ra → cover/stamp lệch. Giữ `documentElement.scrollWidth == innerWidth`.
- Chụp kiểm tra: headless Chrome `--screenshot` với URL `file://` đáng tin hơn Browser pane; thêm `--virtual-time-budget=9000` để font/fit chạy xong.
- Canva connector: edit chỉ hiện sau `commit`; ảnh AI phải đặt lên page rồi export; hết credit thì generate-image bị chặn.
