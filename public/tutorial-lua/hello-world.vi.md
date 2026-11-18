Bắt đầu với Lua Scripting

Mỗi game có một ô script miễn phí để bạn đánh giá lợi ích của Lua Scripting cho dự án. Làm theo các bước dưới đây để tạo và thực thi script đầu tiên.

---

## 1. Tạo và chỉnh sửa script
* **Khởi tạo:** Tạo script với tên hợp lệ. Tên này là **từ khóa** duy nhất để gọi script từ game client.
![alt](/tutorial-lua/hello-world/step-01.png)
  
* **Mở trình soạn thảo:** Nhấn biểu tượng **Edit** trong danh sách script để mở trình soạn thảo Lua tích hợp trên web.
![alt](/tutorial-lua/hello-world/step-02.png)


## 2. Sử dụng giao diện soạn thảo
Trình soạn thảo có hai phần chính:
* **Vùng viết script:** Khu vực chính để viết logic.
* **Thư viện mẫu:** Nằm bên phải. Mở tab **Core** rồi chọn `#1 tut_hello_output` để tự động nạp mã mẫu.
![alt](/tutorial-lua/hello-world/step-03.png)

> **Quan trọng:** Luôn nhấn **Ctrl+S** hoặc biểu tượng **Save** ở góc trên bên phải sau khi sửa mã.

---

## 3. Thực thi và kiểm tra
Sau khi lưu, cuộn xuống phần **Run Script** để kiểm tra logic.

* **Nhập payload:** Nhập tên của bạn vào trường payload (xem ảnh ví dụ).
* **Thực thi:** Nhấn **Run**.
* **Phân tích:** Khung **Run Result** hiển thị phản hồi JSON và thời gian thực thi theo mili giây (ms).
![alt](/tutorial-lua/hello-world/step-04.png)

---

## 4. Giới hạn hiệu năng
Để đảm bảo máy chủ ổn định và hiệu năng tối ưu, mọi Lua script phải tuân thủ quy tắc sau:
- **Thời gian thực thi tối đa**: 500ms

> **Lưu ý:** Nếu script vượt giới hạn **500ms**, nó sẽ bị dừng. Bạn phải tối ưu logic để chạy trong khoảng thời gian này.

---

## 5. Thực thi script trong Unity
Sau khi kiểm tra script trong Web Editor, bạn có thể tích hợp vào game client:

* **Triển khai:** Mở lớp `BattleScript` trong dự án Unity.
* **Kiểm tra:** Chạy logic trong Unity. Kết quả và hành vi sẽ nhất quán với những gì hiển thị trong Web Editor.
![alt](/tutorial-lua/hello-world/step-05.png)

