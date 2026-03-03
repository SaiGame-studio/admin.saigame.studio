# Quest Definition — Mô tả các trường

Tài liệu này giải thích ý nghĩa của từng trường trong form **Create / Edit Quest Definition**.

---

## Thông tin cơ bản

### `name` *(bắt buộc)*
**Tên hiển thị** của quest.  
Người chơi sẽ thấy tên này trên UI.  
Ví dụ: `"First Blood"`, `"Defeat 10 Goblins"`.

---

### `description`
**Mô tả chi tiết** hướng dẫn người chơi cách hoàn thành quest.  
Ví dụ: `"Kill 10 enemies to complete this quest."`.

---

## Phân loại quest

### `quest_type` *(bắt buộc)*
Xác định **chu kỳ sống** của quest — quest được reset hay chỉ hoàn thành một lần.

| Giá trị | Ý nghĩa |
|---|---|
| `one_time` | Chỉ hoàn thành **1 lần duy nhất** trên toàn bộ vòng đời tài khoản. Sau khi claim xong, quest biến mất (soft-delete progress). Dùng cho milestone, thành tích tổng thể. |
| `repeatable` | Có thể hoàn thành **nhiều lần**. Reset logic do hệ thống ngoài quyết định (event, admin trigger). Dùng cho quest sự kiện tuần, tháng. |
| `daily` | Thuộc **Daily Quest Pool** — tự động reset lúc nửa đêm (UTC). Khi `quest_type = daily`, quest phải được gán vào một pool qua endpoint pool/quests. |
| `battle_pass_task` | Là **nhiệm vụ trong Battle Pass** — khi hoàn thành sẽ cộng `bonus_xp` vào điểm Battle Pass của người chơi thay vì trao reward trực tiếp. `rewards` có thể để trống. |
| `story` | Thuộc **Quest Chain** — phải có `quest_chain_id`, có thể có `prerequisite_quest_id` để định nghĩa thứ tự mở khóa. |

---

## Điều kiện hoàn thành

### `conditions` *(bắt buộc)*
Cây điều kiện AND/OR gồm các clause. Mỗi clause là một yêu cầu có thể theo dõi tiến độ riêng.  
Xem chi tiết cấu trúc tại [quest-condition-type.md](quest-condition-type.md).

Các `type` được hỗ trợ:

| Giá trị | Mô tả |
|---|---|
| `login` | Đăng nhập |
| `item_collect` | Thu thập item (hỗ trợ nhiều loại item cùng lúc) |
| `gacha_opened` | Mở gacha pack |

---

### *(đã bỏ)* `condition_type` / `condition_target` / `condition_metadata`
Các field phẳng này đã được thay thế bởi `conditions` từ migration 055.

---

## Sắp xếp & khóa quest

### `sort_order`
Thứ tự hiển thị trong danh sách quest (số nhỏ hơn = hiển thị trước).  
Mặc định: `0`. Không ảnh hưởng đến logic mở khóa.

---

### `quest_chain_id` *(tùy chọn)*
UUID của **Quest Chain** mà quest này thuộc về.  
- Bắt buộc nếu `quest_type = story`.  
- Để trống nếu quest là **standalone** (không thuộc chain nào).  
- Chuỗi chain được hiển thị dạng DAG (đồ thị có hướng không vòng) trên giao diện người chơi.

---

### `prerequisite_quest_id` *(tùy chọn — còn gọi là "Unlock After Quest ID")*
UUID của **quest phải hoàn thành trước** để quest này được mở khóa.  
- Chỉ có ý nghĩa khi `quest_chain_id != null`.  
- Nếu để trống: quest tự động ở trạng thái `in_progress` ngay khi chain được gán cho player.  
- Nếu điền vào: quest ở trạng thái `locked` cho đến khi quest tiên quyết đạt `claimed`.

Ví dụ chuỗi tuyến tính:
```
Quest A (không prereq) → Quest B (prereq = A) → Quest C (prereq = B)
```

---

### `is_active`
Bật / tắt quest.  
- `true`: quest xuất hiện trong danh sách và có thể được assign cho người chơi.  
- `false`: quest bị ẩn — player đang có progress vẫn giữ nguyên, nhưng quest mới sẽ không được assign.

---

## Phần thưởng (`rewards`)

Mỗi phần tử trong mảng `rewards` là một `RewardConfig`:

### `reward_type`
Loại phần thưởng:

| Giá trị | Mô tả |
|---|---|
| `coin` | Cộng xu vào ví của người chơi. Kết hợp với `amount`. |
| `item` | Cấp item vào inventory. Kết hợp với `item_definition_id`, `quantity_min`, `quantity_max`. |

---

### `amount` *(dùng khi `reward_type = coin`)*
Số lượng coin sẽ cộng vào ví người chơi khi claim thành công.  
Ví dụ: `100` → +100 coin.

---

### `item_definition_id` *(dùng khi `reward_type = item`)*
UUID của **ItemDefinition** sẽ được cấp vào inventory.  
Phải là item hợp lệ trong cùng game.

---

### `quantity_min` / `quantity_max` *(dùng khi `reward_type = item`)*
Số lượng item sẽ cấp, được **lấy ngẫu nhiên** trong khoảng `[quantity_min, quantity_max]`.  
Để cấp số cố định, đặt `quantity_min = quantity_max`.

Ví dụ:
- `quantity_min = 1, quantity_max = 1` → cấp đúng **1 item**.
- `quantity_min = 1, quantity_max = 3` → cấp ngẫu nhiên **1, 2 hoặc 3 item**.

---

## Tóm tắt — Bảng nhanh

| Trường UI | JSON field | Bắt buộc | Mô tả ngắn |
|---|---|:---:|---|
| Name | `name` | ✅ | Tên hiển thị của quest |
| Description | `description` | | Mô tả cách hoàn thành |
| Quest Type | `quest_type` | ✅ | Chu kỳ: `one_time` / `repeatable` / `daily` / `battle_pass_task` / `story` |
| Condition Type | `condition_type` | ✅ | Loại event game server gửi lên (tự do định nghĩa) |
| Condition Target | `condition_target` | ✅ | Ngưỡng event cần tích lũy (≥ 1) |
| Sort Order | `sort_order` | | Thứ tự hiển thị (nhỏ hơn = trước) |
| Chain Group ID | `quest_chain_id` | | Quest Chain mà quest thuộc về |
| Unlock After Quest ID | `prerequisite_quest_id` | | Quest phải hoàn thành trước |
| Active | `is_active` | | Bật / tắt quest |
| Reward → Coin / `amount` | `rewards[].amount` | | Số coin cộng khi claim |
| Reward → Item / `item_definition_id` | `rewards[].item_definition_id` | | Item ID sẽ cấp |
| Reward → Item / qty | `rewards[].quantity_min` + `quantity_max` | | Số lượng item (fixed hoặc random range) |
