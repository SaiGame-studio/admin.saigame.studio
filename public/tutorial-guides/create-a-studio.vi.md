Tạo Studio, Team và Game đầu tiên trong trang quản trị Sai Server. Đây là bước đầu tiên trước khi kết nối dự án Unity với backend Sai Server, chỉ mất khoảng năm phút.

**Trong bài này bạn sẽ:**
- tạo Studio (không gian làm việc chính),
- kiểm tra Team được tạo sẵn cho bạn,
- tạo Game đầu tiên và sao chép **Game ID** để dùng trong Unity.

## Chuẩn bị

- Một tài khoản Sai Server đã **xác minh email**.
- Đã bật **<a href="/profile?tab=settings" rel="nofollow">xác thực hai lớp (2FA)</a>** cho tài khoản.
- Đủ **sCoin** nếu đây không phải studio đầu tiên của bạn (xem <a href="#create-a-studio-cost">Chi phí bao nhiêu?</a>).

## Bước 1: Tạo Studio

Studio là không gian làm việc chính. Mọi Team, Game và thành viên đều thuộc về một Studio.

1. Mở trang **Studios**.
2. Nhập tên studio và nhấn **Create**.

![Tạo studio mới trong trang quản trị Sai Server](/tutorial-guides/create-a-studio/step-01.png)

## Bước 2: Kiểm tra Team

Khi bạn tạo studio, Sai Server tự tạo một team mặc định (**Team #1**) và thêm bạn làm chủ sở hữu.

Mở tab **Teams** trong studio, sau đó chọn **Team #1** để mở trang chi tiết team.

![Tab Teams trong studio hiển thị Team #1](/tutorial-guides/create-a-studio/step-02.png)

- **Làm một mình?** Bạn không cần thêm ai.
- **Làm cùng người khác?** Nhờ từng đồng đội đăng ký tài khoản Sai Server và gửi bạn **User ID**. Trên trang chi tiết team, dùng nút **Add Member** trong phần **Members** để thêm họ.

![Phần Members của team với nút Add Member](/tutorial-guides/create-a-studio/step-03.png)

## Bước 3: Tạo Game đầu tiên

1. Tạo game mới tại <a href="/games/new" rel="nofollow">trang tạo game</a>.
2. Trên trang chi tiết team, nhấn **Add Games** trong phần **Games** rồi chọn game để mọi thành viên trong team cùng làm được.

![Tạo game](/tutorial-guides/create-a-studio/step-04.png)

![Phần Games của team với nút Add Games](/tutorial-guides/create-a-studio/step-05.png)

**Kết quả mong đợi:** game xuất hiện trong studio. Mở trang **Game Detail** và sao chép **Game ID**. Bạn sẽ dán nó vào Unity ở bài tiếp theo.

<a id="create-a-studio-cost"></a>

## Chi phí bao nhiêu?

Studio, Team và Game được **trả một lần bằng sCoin**, không có phí hằng tháng.

| Hạng mục | Mặc định | Chi phí thêm |
|---|---|---|
| Studio | Studio đầu tiên miễn phí | 50 sCoin cho mỗi studio tiếp theo |
| Game mỗi studio | 2 | 5 sCoin cho mỗi slot game thêm |
| Team mỗi studio | 1 | 10 sCoin cho mỗi team thêm |
| Thành viên mỗi studio | 5 | 50 sCoin cho thêm 50 slot thành viên |

Một số tính năng trong game (ví dụ Leaderboard) cần gói đăng ký hằng tháng cho game. Các bài liên quan sẽ ghi rõ khi cần.

## Lỗi thường gặp

- **Không tạo được studio.** Kiểm tra email đã được xác minh và tài khoản đã bật <a href="/profile?tab=settings" rel="nofollow">2FA</a>.
- **Không đủ sCoin.** Chỉ studio đầu tiên là miễn phí. Hãy nạp sCoin trước khi tạo studio khác hoặc mua thêm slot.
- **Muốn xóa studio.** Chủ sở hữu có thể xóa studio không còn game nào. Nếu tài khoản dùng 2FA, bạn sẽ được hỏi mã 2FA.

## Câu hỏi thường gặp

### Sai Server có miễn phí để bắt đầu không?
Có. Studio đầu tiên miễn phí, gồm 2 slot game, 1 team và 5 thành viên.

### Studio, Team và Game khác nhau thế nào?
**Studio** là không gian làm việc và là nơi thanh toán. **Team** nhóm những người làm việc cùng nhau. **Game** là một dự án, có người chơi, vật phẩm và cài đặt riêng. Thứ bậc là Studio > Team > Game > Player.

### Tôi có phải trả tiền hằng tháng cho studio hay game không?
Không. Studio, team, game và slot đều mua một lần bằng sCoin.

## Bước tiếp theo

- [Cài Unity Package](/tutorials/guides/import-unity-package)
- [Đăng nhập Google trong Unity](/tutorials/guides/unity-google-login)
