Tất cả hàm preset được Lua script hỗ trợ

---

### `game.get_preset_def_by_id(id)`

Lấy `PresetDefinition` (khuôn mẫu bộ bài/đội hình/bộ trang bị) theo UUID.

```lua
local def, err = game.get_preset_def_by_id("p1r2e3s4-...")
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | có | UUID của định nghĩa preset. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.get_preset_by_id(id)`

Lấy một bản thể `Preset` (bộ bài/đội hình/bộ trang bị của người chơi) theo UUID.

```lua
local preset, err = game.get_preset_by_id("p5r6e7s8-...")
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | có | UUID của bản thể preset. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.get_preset_slots(preset_id)`

Trả về toàn bộ ô của một bản thể preset dưới dạng danh sách các bảng `{ inventory_item_id, slot_index }`.

```lua
local slots, err = game.get_preset_slots("p5r6e7s8-...")
if err ~= nil then error(err) end
for i = 1, #slots do
    game.log("slot " .. slots[i].slot_index .. " item: " .. slots[i].inventory_item_id)
end
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `preset_id` | string (UUID) | có | UUID của bản thể preset. |

**Trả về:** `(list-table, nil)` khi thành công, `(nil, string)` khi có lỗi.

