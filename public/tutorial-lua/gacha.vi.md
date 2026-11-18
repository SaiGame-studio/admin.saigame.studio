Tất cả hàm gói gacha được Lua script hỗ trợ

---

### `game.get_gacha_pack_by_id(id)`

Lấy định nghĩa `GachaPack` theo UUID.

```lua
local pack, err = game.get_gacha_pack_by_id("e5f6a7b8-...")
if err ~= nil then error(err) end
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | có | UUID của gói gacha. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.open_gacha_pack(pack_id [, container_id [, idempotency_key]])`

Mở một gói gacha cho người chơi đã xác thực.  
Nếu bỏ qua `idempotency_key`, hệ thống tự tạo UUID ngẫu nhiên.

```lua
local result, err = game.open_gacha_pack("e5f6a7b8-...")
if err ~= nil then error(err) end
-- result.transaction_id, result.items[], result.is_duplicate
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `pack_id` | string (UUID) | có | UUID của gói gacha cần mở. |
| 2 | `container_id` | string (UUID) | không | UUID của bản thể container (truyền `""` để bỏ qua). |
| 3 | `idempotency_key` | string | không | Khóa chống xử lý trùng; tự tạo nếu để trống. |

**Trả về:** `(table, nil)` khi thành công, bảng chứa `transaction_id`, `collect_destination`, `mailbox_message_id`, `is_duplicate`, `items[]`; `(nil, string)` khi có lỗi.

---

### `game.get_container_def_by_id(id)`

Lấy khuôn mẫu `ItemContainerDefinition` theo UUID.

```lua
local def, err = game.get_container_def_by_id("c9d0e1f2-...")
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | có | UUID định nghĩa container. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.get_container_by_id(id)`

Lấy một bản thể `ItemContainer` cụ thể (bản ghi thuộc người chơi) theo UUID. Quyền sở hữu được kiểm tra ở phía máy chủ.

```lua
local container, err = game.get_container_by_id("c9d0e1f2-...")
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | có | UUID của bản thể container. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

