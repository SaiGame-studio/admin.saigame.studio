Tất cả hàm nhiệm vụ được Lua script hỗ trợ

---

### `game.get_quest_def_by_id(id)`

Lấy khuôn mẫu `QuestDefinition` theo UUID.

```lua
local quest, err = game.get_quest_def_by_id("q1w2e3r4-...")
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | có | UUID định nghĩa nhiệm vụ. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

