Bản hướng dẫn này phác thảo các bước thiết lập ban đầu để tích hợp SaiGame SDK vào dự án Unity của bạn.

### 1. Điều kiện tiên quyết & Cài đặt

* **Đăng ký Game:** Đảm bảo trò chơi của bạn đã được khởi tạo trong hệ thống SaiGame.
* **Phiên bản Unity:**
    * Khuyên dùng: **Unity 6.x** hoặc mới hơn.
    * Phiên bản cũ: Nếu bạn đang sử dụng phiên bản cũ hơn và gặp lỗi, vui lòng [liên hệ **Sai** để được hỗ trợ](https://discord.gg/UU3YarmVde).
* **Thiết lập SDK:**
  1. Tải về **Unity Package** mới nhất từ [liên kết này](https://github.com/SaiGame-studio/ss-unity/releases).
![alt](/tutorial-guides/import-unity-package/step-01.png)

  2. Import package vào dự án của bạn.
  3. Kéo prefab `SaiServer` trong thư mục `Assets/SaiGame/Prefabs` vào scene. Tất cả các dịch vụ (xác thực, vật phẩm, nhiệm vụ, chiến đấu…) đã được gắn sẵn bên trong.
![alt](/tutorial-guides/import-unity-package/step-02.png)

---

### 2. Cấu hình

Chọn object `SaiServer` trong cửa sổ Hierarchy. Inspector của nó chứa mọi thiết lập cần thiết để kết nối dự án với backend.

#### Server Endpoint
Đặt **Server Endpoint** thành `Production API (HTTPS) - api.saigame.studio` để đảm bảo bạn đang tương tác với dữ liệu thực tế (live data). Đây là giá trị mặc định.
![alt](/tutorial-guides/import-unity-package/step-03.png)

#### Định danh Game
1. Đi tới trang **Game Detail** trên dashboard và sao chép **Game ID**.
![alt](/tutorial-guides/import-unity-package/step-04.png)
2. Trong cửa sổ Unity Inspector, chọn component `SaiServer`.
3. Dán ID vào trường **Game ID**.
![alt](/tutorial-guides/import-unity-package/step-05.png)

#### Tuỳ chọn: Dùng file `.env`
Thay vì nhập Game ID và tài khoản test trực tiếp vào Inspector, bạn có thể lưu chúng trong file `.env`:
1. Trong Inspector của `SaiServer`, nhấn **Create .env**. Thao tác này sao chép `Assets/SaiGame/env.txt` thành file `.env` ở thư mục gốc của dự án.
2. Mở `.env` và điền `GAME_ID`, `USERNAME` và `PASSWORD`.
3. Bật **Load .env on Play**. Khi vào Play Mode, Game ID sẽ được áp dụng cho `SaiServer` và thông tin đăng nhập cho `SaiAuth`.

> **Lưu ý:** Tuyệt đối không commit file `.env` lên source control. Thông tin đăng nhập đọc từ file này chỉ được lưu trong PlayerPrefs, không lưu vào file scene.

![alt](/tutorial-guides/import-unity-package/step-06.jpg)

#### Kiểm tra kết nối
Nhấn **Test Connection** trong Inspector của `SaiServer`. Thông báo `✓ Connection test passed!` trong Console xác nhận Unity đã kết nối được tới server. Nút **Show Service Info** sẽ in ra base URL hiện tại và trạng thái đăng nhập.

---

### 3. Xác thực & Kiểm thử

Chuyển Unity sang **Play Mode** để bắt đầu kiểm tra việc tích hợp.

#### Xác thực người dùng
Sử dụng component `SaiAuth` để thực hiện các hành động sau:
* **Register** để tạo tài khoản mới.
* **Login** với thông tin đã có.
* **Get Me** để tải thông tin người dùng hiện tại, **Refresh Token** và **Logout**.
![alt](/tutorial-guides/import-unity-package/step-07.png)

#### Đăng nhập Google (Tuỳ chọn)
Người chơi cũng có thể đăng nhập bằng Google thông qua component `GoogleBackendLogin`:
1. Nhấn **Start Login**. Trình duyệt sẽ mở trang đăng nhập Google.
2. Hoàn tất đăng nhập trên trình duyệt. Unity sẽ kiểm tra trạng thái với server và khi đăng nhập thành công, token sẽ tự động được chuyển sang `SaiAuth`.
3. Dùng **Cancel Login** để huỷ, hoặc **Open Auth URL** nếu trình duyệt không tự mở.

![alt](/tutorial-guides/import-unity-package/step-08.jpg)

#### Debug & Triển khai
Inspector có sẵn các nút hỗ trợ để kiểm tra nhanh.
* **Console Shortcuts:** Mỗi khi bạn nhấn một nút test, một dòng **Color Log** sẽ xuất hiện trong Console.
* **Điều hướng Code:** Nhấp vào dòng log sẽ dẫn bạn trực tiếp đến hàm xử lý logic đó. Bạn có thể sử dụng các hàm này làm tham khảo khi viết script riêng cho game của mình.
![alt](/tutorial-guides/import-unity-package/step-09.png)
---

### 4. Các bước tiếp theo
* Việc đăng nhập hoặc tạo tài khoản thành công chỉ mới tạo ra một người dùng hệ thống, nó không tự động đăng ký họ thành "Player" (Người chơi) trong trò chơi cụ thể của bạn.
* Chúng ta sẽ tìm hiểu logic để chuyển đổi một người dùng thành một Người chơi thực thụ trong **bài hướng dẫn tiếp theo**.
* Trong các component `SaiServer` và `SaiAuth` còn rất nhiều thứ bạn có thể tìm hiểu, cứ tự nhiên khám phá chúng theo tốc độ của riêng mình.
