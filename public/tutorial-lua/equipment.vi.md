Tất cả hàm trang bị được Lua script hỗ trợ

---

### `game.get_equipped_in_slot(slot_key)`

Trả về vật phẩm trong kho mà người chơi đã xác thực đang trang bị ở ô được chỉ định.

```lua
local item, err = game.get_equipped_in_slot("weapon")
if err ~= nil then error(err) end
output.weapon_id = item.id
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `slot_key` | string | có | Khóa ô trang bị (không rỗng). |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

