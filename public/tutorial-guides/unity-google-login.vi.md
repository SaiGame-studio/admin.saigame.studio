Cho người chơi đăng nhập vào game Unity bằng tài khoản Google thông qua Sai Server. Component `GoogleBackendLogin` mở trang đăng nhập Google trên trình duyệt, chờ Sai Server hoàn tất đăng nhập rồi chuyển token cho `SaiAuth`. Dự án Unity không cần cài Google SDK.

**Trong bài này bạn sẽ:**
- đăng nhập Google ngay từ Unity Inspector,
- gọi đăng nhập Google bằng code,
- xử lý các trường hợp hủy, hết thời gian và bị từ chối.

## Chuẩn bị

- Dự án Unity đã kết nối Sai Server với Game ID hợp lệ (xem [Cài Unity Package](/tutorials/guides/import-unity-package)).
- Thiết bị có trình duyệt. Trang đăng nhập được mở bằng trình duyệt hệ thống.

## Đăng nhập Google hoạt động thế nào

1. Unity yêu cầu Sai Server tạo một **phiên đăng nhập** cho game.
2. Sai Server trả về URL đăng nhập, Unity mở URL đó trên trình duyệt.
3. Người chơi đăng nhập Google trên trình duyệt. Nếu tài khoản bật xác thực hai lớp, trang này sẽ hỏi thêm mã 2FA.

> 🖼️ **CHỖ ĐẶT ẢNH** · `/tutorial-guides/unity-google-login/2fa-browser-page.png`  
> Cần chụp: trang trình duyệt hỏi mã 2FA 6 số sau khi đăng nhập Google, với tài khoản đã bật 2FA.  
> ⚙️ **Cần chụp trong Unity:** trang này chỉ hiện sau khi nhấn **Start Login** trong Unity, bạn chụp thủ công.

4. Unity kiểm tra phiên vài giây một lần. Khi đăng nhập xong, Unity nhận access token và refresh token.
5. Token được chuyển cho `SaiAuth`, nên mọi lệnh gọi Sai Server khác hoạt động như khi đăng nhập bằng mật khẩu.

Sai Server khớp tài khoản Google theo email: nếu đã có tài khoản dùng email đó thì đăng nhập vào tài khoản ấy, nếu chưa thì tạo tài khoản mới ở lần đăng nhập đầu tiên.

## Bước 1: Thử đăng nhập Google trong Inspector

1. Vào **Play Mode**.
2. Chọn component `GoogleBackendLogin` trên object `SaiServer`.
3. Nhấn **Start Login**. Trình duyệt mở trang đăng nhập Google.
4. Đăng nhập Google trên trình duyệt.

![Component GoogleBackendLogin trong Inspector](/tutorial-guides/unity-google-login/step-01.jpg)

> 🖼️ **CHỖ ĐẶT ẢNH** · `/tutorial-guides/unity-google-login/google-signin-page.png`  
> Cần chụp: trang đăng nhập Google mở trên trình duyệt hệ thống sau khi nhấn **Start Login** (che email thật).  
> ⚙️ **Cần chụp trong Unity:** trang này chỉ hiện sau khi nhấn **Start Login** trong Unity, bạn chụp thủ công.


**Kết quả mong đợi:** component hiển thị access token và thông tin user, `SaiAuth` đã ở trạng thái đăng nhập. Nhấn **Get Me** trên `SaiAuth` để kiểm tra.

> 🖼️ **CHỖ ĐẶT ẢNH** · `/tutorial-guides/unity-google-login/login-success.png`  
> Cần chụp: `GoogleBackendLogin` trong Inspector sau khi đăng nhập thành công (đã có token và user data, làm mờ một phần token) cùng log **Get Me** trong Console.  
> ⚙️ **Cần chụp trong Unity:** bạn chụp thủ công trong Unity Editor (Play Mode).


Các nút khác:
- **Cancel Login** – ngừng chờ lượt đăng nhập hiện tại.
- **Open Auth URL** – mở lại trang đăng nhập nếu trình duyệt chưa mở.
- **Set Token To SaiAuth** – chép lại token đang lưu sang `SaiAuth`.
- **Clear Auth Data** – xóa token đang lưu trên component.

## Bước 2: Đăng nhập Google bằng code

```csharp
using SaiGame.Services;
using UnityEngine;

public class GoogleLoginButton : MonoBehaviour
{
    public void OnClickGoogleLogin()
    {
        SaiServer.Instance.GoogleBackendLogin.StartLogin(
            response => Debug.Log($"Google login OK: {response.user.username}"),
            error => Debug.LogWarning($"Google login failed: {error}"));
    }
}
```

Sau khi đăng nhập thành công, tiếp tục như bình thường, ví dụ tải hoặc tạo tiến trình người chơi bằng [Gamer Progress](/tutorials/guides/create-gamer-progress).

Bạn cũng có thể đăng ký các sự kiện `OnLoginSuccess`, `OnLoginFailure` và `OnSessionCreated` của `GoogleBackendLogin`.

## Bước 3: Xử lý kết quả đăng nhập

Callback lỗi trả về một trong các giá trị sau:

| Lỗi | Ý nghĩa | Cách xử lý |
|---|---|---|
| `cancelled` | Đã gọi `CancelLogin()`. | Hiện lại các lựa chọn đăng nhập. |
| `user_denied:...` | Người chơi từ chối đăng nhập Google. | Đề xuất cách đăng nhập khác. |
| `session_expired` | Phiên đăng nhập hết hạn trước khi người chơi hoàn tất. | Bắt đầu đăng nhập lại. |
| `timeout` | Unity ngừng chờ. Mặc định là 300 giây (**Max Login Duration Seconds**). | Bắt đầu đăng nhập lại. |
| `create_session_failed: ...` | Unity không tạo được phiên, thường do mạng hoặc Game ID. | Kiểm tra kết nối và Game ID. |
| `server_error:...` | Server không hoàn tất được đăng nhập Google. | Thử lại, nếu vẫn lỗi thì liên hệ hỗ trợ. |

Mỗi lúc chỉ chạy được một lượt đăng nhập. Gọi `StartLogin` khi đang đăng nhập sẽ nhận lỗi `Login already in progress!`.

## Lỗi thường gặp

- **Trình duyệt không mở.** Nhấn **Open Auth URL**, hoặc đọc `AuthUrl` trong code rồi tự mở.
- **Luôn bị timeout.** Đảm bảo người chơi đăng nhập xong trong thời gian giới hạn và thiết bị truy cập được Sai Server API.
- **Đăng nhập Google xong nhưng không có dữ liệu game.** Đăng nhập Google chỉ xác thực user. Hãy gọi `GamerProgress.GetProgress` hoặc `CreateProgress` để tải save của người chơi.

## Câu hỏi thường gặp

### Có cần Google Sign-In SDK cho Unity không?
Không. Việc đăng nhập diễn ra trên trình duyệt, Unity chỉ giao tiếp với Sai Server.

### Tài khoản Google có phải là cùng người chơi với tài khoản mật khẩu không?
Sai Server khớp theo **email**. Nếu đã có tài khoản Sai Server dùng cùng email, người chơi đăng nhập vào tài khoản đó và giữ nguyên tiến trình. Nếu chưa, tài khoản mới được tạo ở lần đăng nhập Google đầu tiên.

### Đăng nhập Google có dùng được với xác thực hai lớp không?
Có. Nếu tài khoản bật 2FA, trang trình duyệt sẽ hỏi mã trước khi hoàn tất đăng nhập.

## Bước tiếp theo

- [Tạo Gamer Progress](/tutorials/guides/create-gamer-progress)
- [Lưu game đám mây đa nền tảng](/tutorials/guides/cross-platform-save)
