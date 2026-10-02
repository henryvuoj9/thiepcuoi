# Asset cần lấy để render giống mẫu Etsy "The Chestnut Letter"

Quy ước chung: **PNG nền trong suốt** cho mọi thứ đè lên nền (ren, hoa, khung, sáp); **JPG** cho texture nền. Cỡ tối thiểu ghi ở từng mục (màn hình retina cần gấp 2 kích thước hiển thị). Bỏ vào thư mục `wedding_invitation/assets/` với đúng tên file, tôi tự ghép.

## A. Quyết định độ giống (bắt buộc)

| # | Asset | Tên file | Yêu cầu | Gợi ý nguồn |
|---|---|---|---|---|
| A1 | **Texture giấy nâu vân da** (mặt phong bì) | `paper_brown.jpg` | ≥ 1200×1800, tông nâu hạt dẻ, vân giấy kraft/da nhẹ, không hoa văn. Chính texture này làm cả màn cover lẫn phong bì mở. | Freepik/Unsplash "kraft paper texture brown", Envato "leather paper" |
| A2 | **Dải ren trắng ngà** viền mép nắp | `lace_strip.png` | PNG trong suốt, dải ngang ≥ 2000×250, mép scallop + lỗ ren thật, tile được (hai đầu nối liền). | Etsy/Creative Market "lace border png", Freepik "lace trim transparent" |
| A3 | **Dấu sáp oval ngà** có hoa loa kèn | `wax_seal.png` | PNG trong suốt ≥ 800×1000, sáp màu ngà/kem, oval, có bóng nổi sẵn; **không có chữ** (tôi đặt "V & L" bằng font). Nếu muốn hoa loa kèn dập nổi thì chọn mẫu có sẵn hoa. | Etsy "wax seal mockup png ivory oval", Creative Market "calla lily wax seal" |
| A4 | **Phong bì nâu mở** (hero) | `envelope_open.png` | PNG trong suốt ≥ 1600×1200, phong bì nhìn thẳng, nắp lật ra sau, túi trước để hở, cùng tông với A1. Nếu không có, tôi dựng từ A1 (chấp nhận được). | Etsy "brown envelope mockup png open" |
| A5 | **Khung ảnh oval ren** | `frame_oval.png` | PNG trong suốt ≥ 900×1100, khung ngà viền scallop/ren, lòng trong suốt để lồng ảnh; cung cấp thêm kích thước lỗ (tôi tự đo cũng được). | Etsy "lace oval frame png", Freepik "vintage oval frame white" |
| A6 | **Trái tim ren** | `heart_lace.png` | PNG trong suốt ≥ 900×800, tim ngà viền ren, giữa trống để ghi ngày. | Etsy "lace heart doily png" |
| A7 | **Ảnh cưới** cho khung oval | `photo_hero.jpg` | Dọc, ≥ 1200×1500, tông ấm/ngoài trời như mẫu (ảnh full body, cô dâu chú rể ở giữa). | Ảnh của bạn |

## B. Nâng chất (tùy chọn, đã có bản tạm)

| # | Asset | Tên file | Yêu cầu | Ghi chú |
|---|---|---|---|---|
| B1 | **Hoa/cành treo** (cụm hoa loa kèn trắng + lá rủ hai bên phong bì) | `flowers_left.png`, `flowers_right.png` | PNG trong suốt ≥ 800×1200 mỗi bên, nền trong suốt sạch (không viền trắng). | Đây là thứ tôi không tự dựng được; mẫu có 2 cụm. |
| B2 | **Texture vữa xám nâu** cho footer | `plaster.jpg` | ≥ 1200×1200, vữa/thạch cao có vệt bay, tông xám nâu ấm. | Đã có bản sinh bằng code, ảnh thật đẹp hơn nhiều. |
| B3 | **Thẻ save-the-date viền sọc** | không cần | Tôi dựng bằng CSS được. | |
| B4 | **Font caps "The Seasons"** (nếu muốn giống Canva) | `TheSeasons-Regular.otf`, `-Bold.otf` | Mua Creative Market ~15 USD. Hiện dùng Cormorant SC (đúng mẫu Etsy). | Tôi ghép dấu VN bằng `fonts/build_vn.py`. |
| B5 | **Font script mẫu Etsy** (kiểu Bickham) | `.otf` | Bickham Script Pro (Adobe Fonts) hoặc tương đương. Hiện dùng New Icon Script của mẫu Canva. | Chỉ cần nếu bạn thích script Etsy hơn Canva. |

## C. Nội dung (điền vào `window.DATA` trong `v4_template.html`)

- Tên đầy đủ ba mẹ hai bên; số điện thoại liên hệ.
- Ngày giờ chính xác từng buổi, tên + địa chỉ địa điểm (dùng cho nút bản đồ và Thêm vào lịch).
- Hạn RSVP.
- Câu chữ tiếng Việt nếu muốn khác bản tạm ("Trân trọng kính mời", "Gặp nhau tại", "Rất mong gặp bạn"…).

## Lưu ý bản quyền
- Không dùng ảnh chụp từ demo Etsy làm asset; phải mua/tải đúng license (personal use là đủ vì thiệp cho đám cưới của bạn).
- Freepik/Unsplash: bản free thường cần ghi nguồn; Etsy/Creative Market: trả phí 1 lần, sạch nhất.
- Font New Icon Script hiện là bản lấy từ site Canva, cần mua (Creative Fabrica) trước khi gửi thiệp.
