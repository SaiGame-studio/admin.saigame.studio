Unity SDK của Sai Server nằm trong thư mục `Assets/SaiGame` của project. **Đừng chỉnh sửa các file trong thư mục này.**

## Vì sao

Chúng tôi phát hành phiên bản mới của Sai Game SDK rất đều đặn, kèm bản sửa lỗi và tính năng mới. Khi cập nhật SDK, các file trong `Assets/SaiGame` sẽ bị thay thế, nên:

- mọi thay đổi bạn đã làm trong đó sẽ **bị ghi đè**, hoặc
- bản cập nhật **xung đột** với thay đổi của bạn và game có thể không compile được.

Giữ nguyên SDK thì bạn luôn sẵn sàng cập nhật lên mọi phiên bản mới bất cứ lúc nào.

## Nên làm gì thay vào đó

- Đặt script của bạn trong **thư mục riêng**, bên ngoài `Assets/SaiGame`.
- Gọi SDK từ script của bạn qua các hàm và sự kiện public, ví dụ `SaiAuth.OnLoginSuccess`.
- Tải phiên bản SDK mới tại [Unity Package releases](https://github.com/SaiGame-studio/ss-unity/releases).

## Cần thứ SDK chưa có?

Nếu bạn gặp bất kỳ vấn đề gì, hoặc SDK thiếu thứ bạn cần, hãy liên hệ với chúng tôi thay vì sửa SDK. Chúng tôi có thể sửa trong bản phát hành tiếp theo để mọi người cùng được hưởng. Bạn cũng có thể tìm chúng tôi trên [Discord](https://discord.gg/UU3YarmVde).
