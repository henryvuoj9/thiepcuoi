# Bảng font — thiệp cưới Hải Vũ & Phương Linh (bản v4, theo mẫu Etsy)

File nguồn để sửa: `v4_template.html` → chạy `python3 build.py` → ra `lv-wedding-invitation.html` (font, texture, đường ren được nhúng lúc build).

Ba "vai" font, khai báo ở đầu CSS trong `v4_template.html` (khối `:root`):

| Vai | Biến CSS | Font đang dùng | Nguồn | Ghi chú |
|---|---|---|---|---|
| Script (tên, tiêu đề chữ ký) | `--script` | **New Icon Script VN** | Font mẫu Canva + bộ dấu VN tự ghép, nhúng base64 | Thương mại, nên mua trước khi public |
| Caps (chữ nhỏ giãn, nút, nhãn, số) | `--sc` | **Cormorant SC** | Google Fonts | Đúng font chữ nhỏ của mẫu Etsy. Mẫu Canva dùng The Seasons (thương mại) |
| Body (câu dài, địa chỉ, ô nhập) | `--serif` | **Cormorant Garamond** italic 300 | Google Fonts | |

Muốn đổi font của cả một vai: sửa 1 dòng biến. Muốn đổi riêng một chữ: sửa dòng CSS ghi ở cột cuối.

## Từng chữ trên trang

### Màn phong bì (cover, nền da nâu + ren + sáp oval)
| Chữ | Font | Cỡ / weight / giãn | Màu | CSS |
|---|---|---|---|---|
| "Trân trọng kính mời" | Cormorant SC | 13px · 500 · 0.20em | ngà mờ | `.cover .txt .sc` |
| "Hải Vũ / & Phương Linh" | New Icon Script VN | 40–56px tự co | ngà | `.cover .txt .names` |
| "V & L" dập trên dấu sáp | Cormorant SC | 19px · 500 · 0.18em, dập nổi | be xám | `.seal .ini` |
| "Mở thiệp" | Cormorant SC | 14px · 0.20em, nhấp nháy | ngà mờ | `.cover .open` |

### Hero (phong bì mở: thẻ + khung ảnh + tim ren)
| Chữ | Font | Cỡ / weight / giãn | Màu | CSS |
|---|---|---|---|---|
| "Save the date" trên thẻ | Cormorant SC | 11px · 0.24em | nâu nhạt | `.card .sc` |
| "Hải Vũ / & / Phương Linh" trên thẻ | New Icon Script VN | 26px, tự co theo bề rộng thẻ | nâu | `.card .names` |
| "15.11.2026" trong tim ren | Cormorant SC | 19 (đơn vị SVG) · 500 · 0.12em | nâu | `.heart text` |
| "V & L" trên mặt phong bì | Cormorant SC | 14px · 0.30em | ngà mờ | `.env .ini` |

### Gặp nhau tại
| Chữ | Font | Cỡ / weight / giãn | Màu | CSS |
|---|---|---|---|---|
| "Gặp nhau tại" | Cormorant SC | 13px · 0.20em | nâu nhạt | `.sc` |
| "Thành phố Hồ Chí Minh" | New Icon Script VN | 34–44px tự co | nâu | `.meet .city` |
| "Chủ nhật, 15 tháng 11 năm 2026" / "Mười tám giờ" | Cormorant SC | 13px · 0.18em | nâu nhạt | `.meet .when .sc` |
| Lời mời (đoạn nghiêng) | Cormorant Garamond | 19px · italic 300 | nâu nhạt | `.copy` |
| Số đếm ngược | Cormorant SC | 42px · 400 | nâu | `.cd b` |
| "Ngày / Giờ / Phút / Giây" | Cormorant SC | 10px · 0.20em | nâu mờ | `.cd span` |
| Nút "Xác nhận tham dự" | Cormorant SC | 13px · 500 · 0.16em | ngà trên nâu | `.pill` |
| "Rất mong được đón tiếp bạn." | Cormorant SC | 12px · 0.20em | nâu nhạt | `.sc` |

### Gia đình hai bên
| Chữ | Font | Cỡ / weight / giãn | Màu | CSS |
|---|---|---|---|---|
| "Gia đình hai bên", "Nhà trai", "Nhà gái" | Cormorant SC | 13 / 12px · 0.20em | nâu nhạt | `.sc`, `.fam .sc` |
| Tên ba mẹ | Cormorant Garamond | 16px · 400 | nâu | `.fam p` |
| "Hải Vũ" / "Phương Linh" | New Icon Script VN | 28px, tự co | nâu | `.fam .who` |

### Chương trình
| Chữ | Font | Cỡ / weight / giãn | Màu | CSS |
|---|---|---|---|---|
| "Chương trình" | Cormorant SC | 13px · 0.20em | nâu nhạt | `.sc` |
| "Lễ Thành Hôn" / "Tiệc Cưới" | New Icon Script VN | 44px, tự co | nâu | `.ev .script` |
| "09:30 · Chủ nhật, 15 . 11 . 2026" | Cormorant SC | 13px · 0.20em | nâu nhạt | `.ev .sc` |
| Tên địa điểm | Cormorant SC | 18px · 0.06em | nâu | `.ev .place` |
| Địa chỉ | Cormorant Garamond | 17px · italic 300 | nâu nhạt | `.ev .addr` |
| Nút "Xem bản đồ" | Cormorant SC | 13px · 500 · 0.16em | ngà trên nâu | `.pill` |
| "Thêm vào lịch" | Cormorant SC | 13px · 0.20em, gạch chân | nâu nhạt | `.link` |

### Xác nhận tham dự (RSVP)
| Chữ | Font | Cỡ / weight / giãn | Màu | CSS |
|---|---|---|---|---|
| "Xác nhận tham dự" | Cormorant SC | 13px · 0.20em | nâu nhạt | `.sc` |
| "Rất mong gặp bạn" | New Icon Script VN | 38–48px | nâu | inline `style` trên `h2` |
| "Vui lòng xác nhận trước ngày…" | Cormorant Garamond | 17px · italic 300 | nâu nhạt | `.copy` |
| Nhãn ô nhập | Cormorant SC | 12px · 0.20em | nâu nhạt | `.f label` |
| Chữ gõ vào ô / placeholder | Cormorant Garamond | 19px · italic | nâu / nâu mờ | `.f input, .f textarea` |
| Ô chọn | Cormorant Garamond | 19px · thẳng | nâu | `.f select` |
| Nút gạt "Có, mình sẽ đến / Rất tiếc…" | Cormorant SC | 12px · 0.14em | nâu / ngà khi chọn | `.seg label` |
| Nút "Gửi xác nhận" | Cormorant SC | 13px · 500 · 0.16em | ngà trên nâu | `.pill` |
| "Cảm ơn bạn" | New Icon Script VN | 44px | nâu | `.thanks .script` |
| Câu cảm ơn | Cormorant Garamond | 18px · italic 300 | nâu nhạt | `.thanks p` |

### Footer (nền vữa)
| Chữ | Font | Cỡ / weight / giãn | Màu | CSS |
|---|---|---|---|---|
| "Với tất cả yêu thương" | Cormorant SC | 13px · 0.20em | ngà | `.footer .sc` |
| Monogram | ảnh `logo.png` (không có file: "VL" New Icon Script 66px trong vòng oval) | | ngà | `.mono` |
| "Mọi thắc mắc xin liên hệ…" + số điện thoại | Cormorant SC | 15px · 0.04em | ngà / ngà gạch chân | `.footer .contact` |
| "Về đầu thư" | Cormorant SC | 13px · 0.20em, gạch chân | ngà | `.footer .up` |

## Font có sẵn để đổi sang
- Đã kiểm tra có dấu tiếng Việt trên Google Fonts: Cormorant SC, Cormorant Garamond, Cormorant Unicase, EB Garamond, Playfair Display; script: Imperial Script, Ballet, Pinyon Script, Great Vibes, Corinthia, Lavishly Yours, Ephesis, Birthstone, Meow Script (xem `font_research/script_compare.png`).
- Font mẫu Canva chưa có: The Seasons (caps, thương mại). Font mẫu Etsy chưa có: script kiểu Bickham (thương mại). Nếu mua, gửi file .otf/.ttf, tôi ghép dấu VN bằng `fonts/build_vn.py` như đã làm với New Icon Script.
