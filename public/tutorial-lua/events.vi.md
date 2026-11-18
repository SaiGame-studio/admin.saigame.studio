Tất cả hàm loại sự kiện được Lua script hỗ trợ

---

### `game.get_event_type_by_id(id_or_name)`

Lấy `GameEventType` theo UUID hoặc tên dạng chuỗi.

```lua
local evt, err = game.get_event_type_by_id("player_kill")
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `id_or_name` | string | có | Chuỗi UUID hoặc tên loại sự kiện. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.get_event_type_by_name(name)`

Lấy `GameEventType` theo tên dạng chuỗi.

```lua
local evt, err = game.get_event_type_by_name("player_kill")
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `name` | string | có | Tên loại sự kiện (không rỗng). |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

