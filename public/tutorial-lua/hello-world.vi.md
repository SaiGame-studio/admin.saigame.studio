Bắt đầu với Lua Scripting

Mặc định mỗi game có **7 ô script**, nên bạn có thể dùng thử Lua Scripting cho dự án ngay. Bộ đếm ở đầu trang **Scripts** cho biết bạn đã dùng bao nhiêu ô; plugin có thể nâng giới hạn này. Làm theo các bước dưới đây để tạo và chạy script đầu tiên.

![alt](/tutorial-lua/hello-world/step-00.png)

---

## 1. Tạo và chỉnh sửa script
* **Khởi tạo:** Nhấn **Kịch bản mới** và nhập tên. Tên phải bắt đầu bằng chữ cái và chỉ gồm chữ thường, số và dấu gạch dưới (ví dụ `hello_world`). Tên này là **trigger key** duy nhất mà game client dùng để gọi script.
![alt](/tutorial-lua/hello-world/step-01.png)
  
* **Mở trình soạn thảo:** Nhấn biểu tượng **Sửa script** (bút chì) trong danh sách script để mở trình soạn thảo Lua tích hợp trên web.
![alt](/tutorial-lua/hello-world/step-02.png)

> **Lưu ý:** Giữ công tắc **Hoạt động** ở trạng thái bật. Script không hoạt động sẽ không chạy được.

## 2. Sử dụng giao diện soạn thảo
Trình soạn thảo có hai phần chính:
* **Nội dung Script:** Khu vực chính để viết logic. Lỗi cú pháp được đánh dấu ngay khi gõ, và thanh dung lượng cho biết bạn đã dùng bao nhiêu trong giới hạn **250 KB** của script.
* **Script mẫu:** Nằm bên phải. Mở tab **Core** rồi chọn `#1 tut_hello_output` để nạp mã mẫu. Dùng công tắc **Thay thế / Thêm vào** để chọn mã mẫu sẽ thay thế mã hiện tại hay được thêm vào cuối.
![alt](/tutorial-lua/hello-world/step-03.png)

> **Quan trọng:** Luôn nhấn **Ctrl+S** hoặc biểu tượng **Lưu** trên thanh công cụ của trình soạn thảo sau khi sửa mã.

---

## 3. Thực thi và kiểm tra
Sau khi lưu, cuộn xuống phần **Chạy Thử** để kiểm tra logic.

* **Profile người chơi:** Script chạy dưới tài khoản của chính bạn, vì vậy bạn cần có profile người chơi trong game này. Xem huy hiệu trạng thái cạnh nút **Chạy**: nếu hiển thị **Chưa có profile**, nhấn **Tạo hồ sơ**. Nút **Chạy** chỉ bật khi huy hiệu hiển thị **Đã có profile**.
![alt](/tutorial-lua/hello-world/step-04-profile.png)
* **Nhập payload:** Nhập payload dạng JSON. Các giá trị đầu vào nằm trong object `payload`:
```json
{
  "payload": {
    "player_name": "Alice"
  }
}
```
* **Thực thi:** Nhấn **Chạy**.
* **Phân tích:** Khung **Kết quả** hiển thị phản hồi JSON và thời gian thực thi theo mili giây (ms). Với ví dụ trên, output chứa `greeting = "Hello, Alice!"` và `processed = true`. Nếu bỏ `player_name`, lời chào sẽ là `"Hello, stranger!"`.
![alt](/tutorial-lua/hello-world/step-04.png)

> **Mẹo:** Nhấn **Ctrl+S** trong ô payload (hoặc biểu tượng **Lưu** của nó) để giữ lại payload cho lần sau.

---

## 4. Giới hạn
Để đảm bảo máy chủ ổn định và hiệu năng tối ưu, mọi Lua script phải tuân thủ các quy tắc sau:
- **Thời gian thực thi tối đa**: 500ms
- **Dung lượng script tối đa**: 250 KB

> **Lưu ý:** Nếu script vượt giới hạn **500ms**, nó sẽ bị dừng. Bạn phải tối ưu logic để chạy trong khoảng thời gian này.

---

## 5. Thực thi script trong Unity
Sau khi kiểm tra script trong Web Editor, bạn có thể tích hợp vào game client:

* **Triển khai:** Mở lớp `BattleScript` trong dự án Unity.
* **Kiểm tra:** Chạy logic trong Unity. Kết quả và hành vi sẽ nhất quán với những gì hiển thị trong Web Editor.
![alt](/tutorial-lua/hello-world/step-05.png)
