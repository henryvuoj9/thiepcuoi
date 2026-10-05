# Cách tự căn chỉnh thiệp rồi gửi lại cho Claude

1. Mở file `lv-wedding-invitation.html` kèm `?tweak=1` ở cuối địa chỉ (hoặc bấm đúp file rồi thêm `?tweak=1` vào thanh địa chỉ).
   Ví dụ: `file:///Users/lap14539/Downloads/lv-wedding-invitation.html?tweak=1`
2. Có **hai bộ số riêng**: cửa sổ rộng từ 900px là bộ **Laptop**, nhỏ hơn là bộ **Điện thoại**. Panel ghi rõ đang chỉnh bộ nào; thu/phóng cửa sổ trình duyệt để chuyển bộ (hoặc mở trên điện thoại thật).
3. Bảng điều khiển hiện bên phải (máy tính) hoặc nửa dưới (điện thoại). Kéo slider hoặc gõ số; thiệp đổi ngay lập tức, đúng font và layout thật.
4. Nút **Bì thư / Nội dung** để chuyển qua lại giữa màn bì thư và trang chi tiết.
5. Chỉnh xong bấm **Sao chép JSON** (gồm cả hai bộ) → dán vào chat cho Claude. Claude đặt các giá trị đó làm mặc định và build lại.
6. Giá trị bạn chỉnh tự lưu trong trình duyệt, mở lại vẫn còn. **Mặc định** để quay về bản gốc. Ô dán JSON + **Áp dụng JSON** để nạp lại một bộ số cũ.

Panel chỉ hiện khi có `?tweak=1`, khách mời không thấy. Thứ chưa chỉnh được bằng panel: màu sắc, font chữ, nội dung text (Claude sửa trong `DATA`).
