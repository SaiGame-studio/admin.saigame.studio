Hướng dẫn này cung cấp cái nhìn tổng quan về cách quản lý luồng chiến đấu bằng bộ máy thực thi script nội bộ.

# Hướng dẫn viết script cho hệ thống chiến đấu

Nếu chỉ có một script, bạn vẫn có thể làm theo bài học này, dù thao tác có thể hơi bất tiện hơn.

Nếu cần thêm script để học thuận tiện hơn, hãy liên hệ Sai để được hỗ trợ thêm một số script miễn phí.

---

## 1. Bắt đầu trận chiến
Script **Battle Start** khởi tạo môi trường chiến đấu. Để nạp mã mẫu, tạo script mới, mở chế độ chỉnh sửa và áp dụng mẫu `#1 battle_start`.

### Chức năng chính
Script thực hiện ba thao tác chính:
1.  **Chọn kẻ địch:** Chọn ngẫu nhiên kẻ địch từ `pool_key` được cung cấp trong payload yêu cầu.
2.  **Tạo nhân vật tham chiến:** Tạo nhân vật của người chơi bằng `preset_id` được truyền qua payload.
3.  **Khởi tạo phiên:** Lưu dữ liệu chiến đấu vào bộ nhớ máy chủ bằng hàm `game.battle_session_create()`.
![alt](/tutorial-lua/execute-script/step-01.png)

### Tham số payload yêu cầu
| Tham số | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `pool_key` | string | Định danh pool sinh kẻ địch. |
| `preset_id` | string | ID preset nhân vật cần triển khai. |

---

## 2. Trạng thái trận chiến
Khi trận chiến đang diễn ra, bạn có thể truy vấn trạng thái hiện tại bất kỳ lúc nào. Dùng mẫu `#5 battle_status` cho logic này.

### Triển khai
Để kiểm tra trạng thái, bạn phải truyền `session_id` (còn gọi là Battle ID) trong payload. Nhờ đó, script lấy được dữ liệu thời gian thực về sinh lực, số lượt và các bên đang tham chiến.
![alt](/tutorial-lua/execute-script/step-02.png)

---

## 3. Logic lượt chiến đấu
Script này quản lý việc thực thi từng lượt chiến đấu. Mẫu được cung cấp minh họa cơ chế tấn công cơ bản và giảm sinh lực.

### Quy trình
* **Thực thi:** Xử lý tương tác giữa người chơi và kẻ địch.
* **Điều kiện thắng/thua:** Vòng lặp tiếp tục cho đến khi một bên bị tiêu diệt.
* **Tùy chỉnh:** Bạn có thể viết lại logic để phù hợp với cơ chế riêng (ví dụ: điểm yếu nguyên tố, hiệu ứng tăng cường hoặc AI phức tạp).
![alt](/tutorial-lua/execute-script/step-03.png)

> **Quan trọng:** Nếu mẫu mặc định không đáp ứng tình huống của bạn, hãy liên hệ **Sai** để được hỗ trợ kỹ thuật.

---

## 4. Kết thúc trận chiến (kết thúc hoặc bỏ chạy)
Có hai cách chính để chấm dứt phiên chiến đấu: `battle_flee` và `battle_end`.

### a. Bỏ chạy
* **Cơ chế:** Dùng RNG (bộ sinh số ngẫu nhiên) để xác định việc bỏ chạy có thành công hay không.
* **Kết quả:** Nếu thành công, phiên đóng lại mà không phát sinh hiệu ứng hoặc phần thưởng nào khác.
![alt](/tutorial-lua/execute-script/step-04.png)

### b. Kết thúc trận chiến
Logic này xử lý điều kiện thắng và thua dựa trên số kẻ địch còn lại.
![alt](/tutorial-lua/execute-script/step-05.png)

* **Thất bại:** Kích hoạt nếu gọi `battle_end` khi vẫn còn kẻ địch sống.
* **Chiến thắng và nhận chiến lợi phẩm:** Kích hoạt khi tất cả kẻ địch đã bị đánh bại.
    * **Vật phẩm rơi:** Script gọi `game.open_entity_drop_packs` nếu Gacha packs đã được gán cho kẻ địch hoặc pool.
    * **Yêu cầu chìa khóa:** Nếu gói yêu cầu chìa khóa cụ thể, người chơi phải sở hữu chìa khóa đó để nhận chiến lợi phẩm.
    * **Mẹo tối ưu:** Kết hợp với **Item Generator** để quản lý chi phí “Năng lượng” khi mở gói, ngăn người chơi liên tục lặp trận chiến.
* **Luồng thay thế:** Bạn có thể chuyển logic chiến lợi phẩm sang script **Battle Turn** nếu muốn vật phẩm rơi ngay khi kẻ địch chết thay vì chờ kết thúc trận.
