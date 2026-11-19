Kết nối dự án Unity với backend Sai Server. Bạn sẽ cài SaiGame Unity SDK, thêm prefab `SaiServer`, nhập Game ID, kiểm tra kết nối và đăng nhập. Xong bài này, Unity đã giao tiếp được với game của bạn trên Sai Server.

**Trong bài này bạn sẽ:**
- cài SaiGame Unity package,
- cấu hình prefab `SaiServer` với Game ID,
- (tùy chọn) nạp cấu hình từ file `.env`,
- kiểm tra kết nối và đăng nhập bằng `SaiAuth`.

## Chuẩn bị

- Một game đã tạo trên Sai Server và **Game ID** của nó (xem [Tạo Studio](/tutorials/guides/create-a-studio)).
- **Unity 6.x trở lên** (khuyến nghị). Nếu dùng phiên bản cũ hơn và gặp lỗi, hãy [hỏi Sai trên Discord](https://discord.gg/UU3YarmVde).

## Bước 1: Cài SaiGame Unity package

1. Tải Unity package mới nhất tại [trang release của SaiGame SDK](https://github.com/SaiGame-studio/ss-unity/releases).
2. Import package vào dự án Unity.
3. Kéo prefab `SaiServer` từ `Assets/SaiGame/Prefabs` vào scene. Mọi dịch vụ (xác thực, cloud save, vật phẩm, nhiệm vụ, battle…) đã được nối sẵn bên trong.

![Tải SaiGame Unity package](/tutorial-guides/import-unity-package/step-01.png)

![Prefab SaiServer trong scene](/tutorial-guides/import-unity-package/step-02.png)

Tên package và phiên bản hiển thị ở đầu Inspector của `SaiServer`. Hãy cho biết phiên bản này khi cần hỗ trợ.

## Bước 2: Đặt Server Endpoint và Game ID

Chọn object `SaiServer` trong Hierarchy.

1. **Server Endpoint:** xác nhận URL production chỉ đọc là **https://api.saigame.studio**.
2. **Game ID:** mở trang **Game Detail** của game trong trang quản trị, sao chép Game ID và dán vào ô **Game ID**.

Khi Game ID hợp lệ, ô chỉ-đọc **Game Name** sẽ hiện tên game. Nhấn **Refresh** bên cạnh để tải lại tên.

![Cài đặt Server Endpoint](/tutorial-guides/import-unity-package/step-03.png)

![Sao chép Game ID ở trang Game Detail](/tutorial-guides/import-unity-package/step-04.png)

![Dán Game ID vào component SaiServer](/tutorial-guides/import-unity-package/step-05.png)

## Bước 3 (tùy chọn): Lưu cấu hình trong file .env

File `.env` giúp Game ID và tài khoản test không bị lưu vào file scene.

1. Trong mục **Environment** của Inspector `SaiServer`, nhấn **Create .env**. Unity sẽ sao chép `Assets/SaiGame/env.example.txt` thành file `.env` ở thư mục gốc dự án (cạnh thư mục `Assets`). Nút này bị tắt nếu `.env` đã tồn tại.
2. Mở `.env` và điền các khóa cần dùng:

```ini
GAME_ID=your-game-id-here
USERNAME=your-username-here
PASSWORD=your-password-here
```

3. Bật **Load .env on Play** và dùng các công tắc sau để áp dụng cấu hình khi vào Play Mode:
   - **Override game id** – dùng `GAME_ID`.
   - **Override credentials** – gửi `USERNAME` và `PASSWORD` cho `SaiAuth`.

![Cài đặt Load .env on Play](/tutorial-guides/import-unity-package/step-06.png)

> **Bảo mật:** không bao giờ commit `.env` lên source control. Thông tin đăng nhập từ file này chỉ được lưu trong PlayerPrefs, không lưu vào file scene.

**Khi build:** mục **Load .env.build on build** hoạt động tương tự. Nhấn **Create .env.build** và điền `GAME_ID`. Khi bật **Override game id**, Game ID chỉ được ghi vào bản build, scene gốc không bị thay đổi.

## Bước 4: Kiểm tra kết nối

Nhấn **Test Connection** trong Inspector `SaiServer`.

**Kết quả mong đợi:** Console hiện `✓ Connection test passed!`. **Show Service Info** in ra base URL hiện tại và trạng thái đăng nhập.

Nếu thấy `✗ Connection test failed!`, xem phần "Lỗi thường gặp" bên dưới.

## Bước 5: Đăng nhập bằng SaiAuth

Chọn `SaiServer` trong Hierarchy rồi mở **Sai Auth (Script)** trong Inspector. Vào **Play Mode**, rồi dùng component `SaiAuth`:

- **Register** – tạo tài khoản mới (email, username, password).
- **Login (Check 2FA)** – đăng nhập bằng username và password.
- **2FA Login** – nếu tài khoản bật xác thực hai lớp, Console sẽ cảnh báo cần mã. Nhập mã 6 số vào **2FA Code** rồi nhấn **2FA Login**.
- **Get Me** – tải thông tin user hiện tại. **Refresh Token** – làm mới access token. **Logout** – đăng xuất.

![Inspector SaiAuth với các nút Login, 2FA Login, Register, Refresh Token và Get Me](/tutorial-guides/import-unity-package/step-07.png)

Gọi tương tự bằng code:

```csharp
using SaiGame.Services;

SaiServer.Instance.SaiAuth.Login(
    "username", "password",
    response => Debug.Log($"Logged in as {response.user.username}"),
    error => Debug.LogError(error));
```

**Kết quả mong đợi:** Console ghi `Login successful.` và **Get Me** in ra username của bạn.

Người chơi cũng có thể đăng nhập bằng Google. Xem [Đăng nhập Google trong Unity](/tutorials/guides/unity-google-login).

## Dùng log trong Inspector để tìm code

Mỗi nút test đều ghi một **log có màu** vào Console. Nhấn vào log để mở hàm xử lý tương ứng, rồi dùng các hàm này làm mẫu khi viết script cho game.

Ví dụ, **Show Service Info** ghi tên thao tác có màu, tiếp theo là base URL và trạng thái đăng nhập. Ảnh dưới được chụp trước khi đăng nhập.

![Log Show Service Info trong Unity Console trước khi đăng nhập](/tutorial-guides/import-unity-package/step-09.png)

## Lỗi thường gặp

- **Connection test failed.** Kiểm tra kết nối internet và xác nhận Sai Server đang hoạt động. Nếu vẫn gặp lỗi, hãy [nhờ hỗ trợ trên Discord](https://discord.gg/UU3YarmVde).
- **Game Name để trống.** Game ID sai hoặc thuộc game khác. Sao chép lại từ trang Game Detail.
- **Giá trị trong .env không được áp dụng.** Đảm bảo `.env` nằm ở thư mục gốc dự án (không nằm trong `Assets`) và đã bật **Load .env on Play**.
- **Đăng nhập đòi mã 2FA.** Tài khoản đã bật 2FA. Dùng **2FA Code** và **2FA Login**.

## Câu hỏi thường gặp

### Sai Server SDK hỗ trợ Unity phiên bản nào?
Khuyến nghị Unity 6.x trở lên.

### Đăng nhập có phải là đã trở thành người chơi của game không?
Không. Đăng nhập chỉ tạo hoặc tải user Sai Server. User trở thành **người chơi** của game khi bạn tạo Gamer Progress cho họ, nội dung của bài tiếp theo.

## Bước tiếp theo

- [Đăng nhập Google trong Unity](/tutorials/guides/unity-google-login)
- [Tạo Gamer Progress](/tutorials/guides/create-gamer-progress)
