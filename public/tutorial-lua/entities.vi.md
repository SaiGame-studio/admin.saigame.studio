Tất cả hàm thực thể được Lua script hỗ trợ

---

### `game.get_entity_def_by_id(id)`

Lấy `EntityDefinition` (khuôn mẫu kẻ địch/NPC/phòng) theo UUID.

```lua
local entity, err = game.get_entity_def_by_id("e1n2t3i4-...")
if err ~= nil then error(err) end
output.entity_hp = entity.stats.hp
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | có | UUID định nghĩa thực thể. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.get_entity_def_by_key(key)`

Lấy `EntityDefinition` theo khóa dạng chuỗi.

```lua
local entity, err = game.get_entity_def_by_key("goblin_boss")
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `key` | string | có | Khóa thực thể (không rỗng). |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

--- 

### `game.entity_pool_random(pool_key)`

Chọn ngẫu nhiên một thực thể từ pool có tên bằng phương pháp ngẫu nhiên theo trọng số.  
Chỉ các phần tử có `weight > 0` mới được chọn.

```lua
local entity, err = game.entity_pool_random("dungeon_floor_1")
if err ~= nil then error(err) end
output.enemy_id  = entity.id
output.enemy_hp  = entity.stats.hp
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `pool_key` | string | có | Khóa pool (không rỗng). |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.entity_pool_min(pool_key, stat_key [, count])`

Trả về thực thể có giá trị `stat_key` **thấp nhất** trong pool.  
Khi `count <= 1` (mặc định), trả về một bảng. Khi `count > 1`, trả về danh sách.  
Giá trị tối đa của `count` là 100.

```lua
-- single weakest enemy
local weakest, err = game.entity_pool_min("dungeon_floor_1", "hp")

-- three weakest enemies
local list, err = game.entity_pool_min("dungeon_floor_1", "hp", 3)
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `pool_key` | string | có | Khóa pool (không rỗng). |
| 2 | `stat_key` | string | có | Khóa chỉ số dùng để so sánh (không rỗng). |
| 3 | `count` | integer | không | Số thực thể cần trả về (mặc định `1`, tối đa `100`). |

**Trả về:** `(table, nil)` khi `count=1`; `(list-table, nil)` khi `count>1`; `(nil, string)` khi có lỗi.

---

### `game.entity_pool_max(pool_key, stat_key [, count])`

Trả về thực thể có giá trị `stat_key` **cao nhất** trong pool.  
Hoạt động tương tự `entity_pool_min` nhưng sắp xếp giảm dần.

```lua
local strongest, err = game.entity_pool_max("dungeon_floor_1", "attack")
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `pool_key` | string | có | Khóa pool (không rỗng). |
| 2 | `stat_key` | string | có | Khóa chỉ số dùng để so sánh (không rỗng). |
| 3 | `count` | integer | không | Số thực thể cần trả về (mặc định `1`, tối đa `100`). |

**Trả về:** `(table, nil)` khi `count=1`; `(list-table, nil)` khi `count>1`; `(nil, string)` khi có lỗi.

---

### `game.get_entity_pool_def_by_id(id)`

Lấy đầy đủ định nghĩa `EntityPool` (gồm các phần tử, trọng số và chỉ số) theo UUID.

```lua
local pool, err = game.get_entity_pool_def_by_id("p0o1l2d-...")
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | có | UUID của pool thực thể. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.get_entity_pool_def_by_key(pool_key)`

Lấy đầy đủ định nghĩa `EntityPool` theo khóa pool.

```lua
local pool, err = game.get_entity_pool_def_by_key("dungeon_floor_1")
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `pool_key` | string | có | Khóa pool (không rỗng). |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.
