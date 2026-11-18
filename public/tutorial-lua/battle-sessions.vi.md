Tất cả hàm chiến đấu được Lua script hỗ trợ

--- 

### `game.battle_session_create(state)`

Tạo phiên chiến đấu mới (trạng thái = `active`) và lưu trạng thái ban đầu vào Redis (TTL 30 phút).  
Trả về lỗi nếu người chơi đã có phiên đang hoạt động.

```lua
local session_id, err = game.battle_session_create({
    round = 1,
    player_hp = 100,
    enemy_hp  = 80
})
if err ~= nil then error(err) end
output.session_id = session_id
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `state` | table | có | Trạng thái chiến đấu ban đầu (cặp khóa/giá trị tùy ý). |

**Trả về:** `(session_id_string, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.battle_session_get(session_id)`

Đọc trạng thái chiến đấu hiện tại từ Redis.

```lua
local state, err = game.battle_session_get(session_id)
if err ~= nil then error(err) end
output.round = state.round
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | có | UUID của phiên chiến đấu. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.battle_session_update(session_id, state)`

Ghi đè trạng thái chiến đấu trong Redis (đặt lại TTL thành 30 phút).

```lua
state.round     = state.round + 1
state.enemy_hp  = state.enemy_hp - damage
local err = game.battle_session_update(session_id, state)
if err ~= nil then output.error = err end
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | có | UUID của phiên chiến đấu. |
| 2 | `state` | table | có | Trạng thái mới cần ghi (thay thế trạng thái trước đó). |

**Trả về:** `nil` khi thành công, lỗi kiểu `string` khi thất bại.

---

### `game.battle_session_end(session_id [, end_data])`

Đánh dấu phiên là `ended` trong PostgreSQL, lưu `end_data` và xóa khóa Redis.

```lua
local err = game.battle_session_end(session_id, {
    winner   = "player",
    exp_gain = 150
})
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | có | UUID của phiên chiến đấu. |
| 2 | `end_data` | table | không | Dữ liệu kết quả lưu vào bản ghi phiên. Mặc định là `{}`. |

**Trả về:** `nil` khi thành công, lỗi kiểu `string` khi thất bại.

---

### `game.battle_session_flee(session_id)`

Đánh dấu phiên là `fled` trong PostgreSQL và xóa khóa Redis.

```lua
local err = game.battle_session_flee(session_id)
if err ~= nil then output.error = err end
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | có | UUID của phiên chiến đấu. |

**Trả về:** `nil` khi thành công, lỗi kiểu `string` khi thất bại.

---

### `game.open_entity_drop_packs(session_id, entity_def_id, pack_ids)`

Mở tất cả gói vật phẩm rơi gacha được liệt kê cho kẻ địch đã bị đánh bại trong phiên chiến đấu.  
Tối đa 7 ID gói cho mỗi lần gọi.

```lua
local results, err = game.open_entity_drop_packs(session_id, entity.id, {
    "pack-uuid-1",
    "pack-uuid-2"
})
if err ~= nil then error(err) end
for i = 1, #results do
    game.log("pack " .. results[i].pack_name .. " success=" .. tostring(results[i].success))
end
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | có | UUID của phiên chiến đấu đang hoạt động. |
| 2 | `entity_def_id` | string (UUID) | có | UUID định nghĩa thực thể đã bị đánh bại. |
| 3 | `pack_ids` | table (mảng chuỗi UUID) | có | Danh sách UUID các gói gacha cần mở. Tối đa 7 phần tử. |

**Trả về:** `(list-table, nil)` khi thành công, mỗi phần tử là `{ pack_id, pack_name, success, error }`; `(nil, string)` khi có lỗi.

