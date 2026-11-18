Để chiến đấu với kẻ địch, trước tiên bạn cần tạo một nhóm nhân vật có thể điều khiển.

## 1. Tạo nhân vật bằng Item Definitions
- Hướng dẫn này trình bày cách định nghĩa nhân vật bằng Item Definitions và thiết lập đội hình thông qua Game Presets.
- Trong hệ thống này, nhân vật được tạo bằng mô-đun **Item Definition**.

### Các bước cấu hình:
* **Name:** Đặt định danh duy nhất. Với JRPG, hãy dùng tên nhân vật cụ thể; với RPG truyền thống, nên dùng lớp nghề nghiệp (ví dụ: Warrior, Mage).
* **Category:** Bắt buộc đặt thành **Character**.
* **Chỉ số cơ bản:** Tối thiểu phải định nghĩa ba thuộc tính mà Battle Script yêu cầu sau đây:
    * `attack`
    * `defense`
    * `hp`

![alt](/tutorial-lua/3a-characters-preset/step-01.png)

> **Lưu ý**
> Bạn có thể thêm thuộc tính tùy chỉnh sau để hỗ trợ cơ chế chơi riêng, nhưng ba thuộc tính trên là bắt buộc để thực thi logic cốt lõi của script.

### Kiểm tra:
Đảm bảo tài khoản **Test Player** sở hữu các vật phẩm nhân vật vừa tạo trước khi kiểm tra script.
![alt](/tutorial-lua/3a-characters-preset/step-02.png)

---

## 2. Thiết lập Game Presets

**Game Presets** là khuôn mẫu để người chơi sắp xếp nhân vật thành đội hình dùng cho Battle Scripts.
![alt](/tutorial-lua/3a-characters-preset/step-03.png)
* **Lưu ý về logic:** Mặc định, Battle Script không có cơ chế chọn ngẫu nhiên nhân vật từ Preset. Nếu thiết kế yêu cầu chọn ngẫu nhiên người tham chiến, bạn phải tự triển khai logic này trong Lua script.

---

## 3. Hoàn thiện đội hình trong Game Client

Để hoàn tất thiết lập, mở **Game Client** và thực hiện các bước sau:

1.  **Tạo đội hình** dựa trên Game Preset đã thiết lập.
2.  **Thêm nhân vật** từ Item Definitions vào các ô của Preset.

| ![alt](/tutorial-lua/3a-characters-preset/step-04.png) | ![alt](/tutorial-lua/3a-characters-preset/step-05.png) |
| :---: | :---: |

Sau khi hoàn tất các bước này, môi trường đã sẵn sàng để triển khai **Battle Script**.
