Cấu hình kẻ địch bằng Entity System

Hệ thống **Battle Script** hỗ trợ tương tác chiến đấu với kẻ địch trong game. Trước khi triển khai logic chiến đấu, bạn cần định nghĩa kẻ địch bằng **Entity System**.

---

## 1. Giới hạn và định nghĩa thực thể
Mặc định, mỗi game hỗ trợ tối đa **10 thực thể** (tương ứng 10 loại kẻ địch riêng biệt).
![alt](/tutorial-lua/enemy-definition/step-01.png)

* **Mở rộng:** Bạn có thể tăng giới hạn bằng cách nâng cấp gói đăng ký.
* **Phân loại:** **Entity Type** và **Rarity** chủ yếu dùng để tổ chức ở bước định nghĩa, nhưng cũng có thể dùng làm điều kiện kích hoạt hoặc yếu tố điều chỉnh trong Lua script.
![alt](/tutorial-lua/enemy-definition/step-02.png)

---

## 2. Chỉ số và tùy chỉnh
Thực thể rất linh hoạt. Bạn có toàn quyền kiểm soát cấu trúc dữ liệu gán cho kẻ địch.

* **Chỉ số tùy chỉnh:** Bạn có thể thêm `hp`, `attack`, `speed` hoặc biến tùy chỉnh bất kỳ. Các chỉ số này có thể được truy cập và thay đổi trực tiếp trong **Battle Script**.
* **Kỹ năng:** Bạn có thể gán kỹ năng cho thực thể.
  > **Lưu ý:** Ở bước này, kỹ năng chỉ là dữ liệu. Mọi logic hoạt động phải được tự triển khai trong **Lua Script** hoặc **mã Game Client**.

![alt](/tutorial-lua/enemy-definition/step-03.png)

---

## 3. Hệ thống chiến lợi phẩm và vật phẩm rơi
Tính năng **Drop Pack IDS** liên kết kẻ địch với hệ thống phần thưởng.
* **Chức năng:** Trường này sử dụng **Gacha Packs** để xử lý vật phẩm rơi.
* **Triển khai:** Khi kẻ địch bị đánh bại, Battle Script kích hoạt các gói liên quan. Bạn có thể liên kết một hoặc nhiều gói với một kẻ địch.

---

## 4. Yêu cầu cho Battle Scripts mẫu
Để kẻ địch tương thích với **Battle Scripts mẫu** được cung cấp, hãy khởi tạo thực thể kẻ địch với các chỉ số sau:
![alt](/tutorial-lua/enemy-definition/step-04.png)

| Chỉ số bắt buộc | Mô tả |
| :--- | :--- |
| `hp` | Điểm sinh lực |
| `attack` | Sức tấn công |
| `defense` | Khả năng giảm sát thương |
| `speed` | Thứ tự hoặc tần suất lượt đi |

*Bạn có thể đặt các chỉ số này thành bất kỳ giá trị số nào phù hợp.*


