Hướng dẫn này trình bày giới hạn hệ thống, chọn ngẫu nhiên theo trọng số và tích hợp Gacha, giúp bạn chuyển từ các lời gọi thực thể cơ bản sang logic Lua nâng cao.

## 1. Tổng quan
Battle Scripts có thể tương tác trực tiếp với kẻ địch (Entity) bằng hàm `game.get_entity_def_by_key(key_string)`, nhưng **Entity Pools** là cách phổ biến để tạo hệ thống chiến đấu linh hoạt và dễ mở rộng. Hướng dẫn này trình bày cơ chế, giới hạn và các bước cấu hình Entity Pools.

Entity Pools là nơi tập hợp thực thể để Lua Scripts quản lý nhóm kẻ địch hiệu quả. Chúng đặc biệt hữu ích cho các cuộc chạm trán ngẫu nhiên, logic theo đợt và hệ thống phần thưởng mà không cần viết cứng từng tương tác với thực thể.

---

## 2. Giới hạn kỹ thuật
* **Giới hạn tổng số pool:** Mỗi game có tối đa **1.000 pool**. Không thể mở rộng giới hạn này.
* **Giới hạn phần tử:** Mỗi pool chứa tối đa **200 phần tử**.
* **Sử dụng định nghĩa:** Tạo hoặc sử dụng pool **không tiêu tốn** hạn mức Entity Definitions, giúp tiết kiệm tài nguyên khi có nhiều nội dung.
![alt](/tutorial-lua/entity-pool/step-01.png)

---

## 3. Quy trình cấu hình

### a. Gán trọng số
Mỗi thực thể thêm vào pool phải được gán **Weight**. Khi trận chiến bắt đầu, script truy vấn pool. Nếu chọn ngẫu nhiên, hệ thống tính tổng trọng số trong pool để xác định kết quả.

| Tham số | Yêu cầu | Mô tả |
| :--- | :--- | :--- |
| **Weight** | Bắt buộc (số nguyên) | Xác định xác suất thực thể được chọn trong một lần chọn ngẫu nhiên. |

![alt](/tutorial-lua/entity-pool/step-02.png)

> **Lưu ý:** Nếu Battle Script không dùng chọn ngẫu nhiên theo trọng số (ví dụ: chọn kẻ địch theo chỉ mục), giá trị trọng số không ảnh hưởng đến việc chọn. Bạn có thể nhập một giá trị bất kỳ để điền trường này.

### b. Tích hợp Gacha Pack
Entity Pools không chỉ phục vụ logic chiến đấu. Bạn có thể liên kết pool với **Gacha Packs** cụ thể để phân phối phần thưởng trong Battle Scripts, tự động hóa quá trình từ “đánh bại kẻ địch” đến “nhận chiến lợi phẩm”.
![alt](/tutorial-lua/entity-pool/step-03.png)

---

## 4. Chuẩn bị chiến đấu
1. Thêm các kẻ địch đã định nghĩa vào pool.
2. Cấu hình trọng số nếu cuộc chạm trán cần chọn ngẫu nhiên.

