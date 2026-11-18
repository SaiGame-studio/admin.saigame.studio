Tất cả hàm kho đồ được Lua script hỗ trợ

---

### `game.grant_item(item_def_id, amount)`

Cấp `amount` đơn vị vật phẩm cho người chơi hiện tại.

```lua
local err = game.grant_item("d2b4e1a0-...", 5)
if err ~= nil then
    output.error = err
end
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `item_def_id` | string (UUID) | có | ID `ItemDefinition` cần cấp. |
| 2 | `amount` | integer | có | Số lượng cần cấp. Phải > 0. |

**Trả về:** `nil` khi thành công, thông báo lỗi kiểu `string` khi thất bại.

---

### `game.deduct_item(item_def_id, amount)`

Trừ `amount` đơn vị vật phẩm khỏi kho của người chơi hiện tại.

```lua
local err = game.deduct_item("d2b4e1a0-...", 1)
if err ~= nil then
    output.error = err
end
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `item_def_id` | string (UUID) | có | ID `ItemDefinition` cần trừ. |
| 2 | `amount` | integer | có | Số lượng cần trừ. Phải > 0. |

**Trả về:** `nil` khi thành công, thông báo lỗi kiểu `string` khi thất bại.

---

### `game.get_item_def_by_id(id)`

Lấy khuôn mẫu `ItemDefinition` (mục trong danh mục) theo UUID.

```lua
local def, err = game.get_item_def_by_id("d2b4e1a0-...")
if err ~= nil then error(err) end
output.item_name = def.name
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | có | UUID của `ItemDefinition`. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.get_item_def_by_code(code)`

Lấy khuôn mẫu `ItemDefinition` theo mã dạng chuỗi.

```lua
local def, err = game.get_item_def_by_code("sword_iron")
if err ~= nil then error(err) end
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `code` | string | có | Mã vật phẩm (không rỗng). |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.get_item_instance_by_id(id)`

Lấy một bản thể `InventoryItem` cụ thể (bản ghi thuộc người chơi) theo UUID.

```lua
local item, err = game.get_item_instance_by_id("a1b2c3d4-...")
if err ~= nil then error(err) end
output.item_quantity = item.quantity
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | có | UUID của bản thể vật phẩm trong kho. |

**Trả về:** `(table, nil)` khi thành công, `(nil, string)` khi có lỗi.

---

### `game.update_item_private_properties(item_id, version, props)`

Gộp `props` vào trường JSONB `private_properties` của vật phẩm trong kho và tăng phiên bản của vật phẩm.  
Khóa `"level"` được dành riêng và không được xuất hiện trong `props`.

```lua
local err = game.update_item_private_properties(item.id, item.version, {
    enchant_level = 3,
    durability    = 80
})
if err ~= nil then output.error = err end
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `item_id` | string (UUID) | có | UUID của vật phẩm trong kho. |
| 2 | `version` | integer | có | Phiên bản hiện tại dùng để kiểm soát đồng thời lạc quan. |
| 3 | `props` | table | có | Các cặp khóa/giá trị cần gộp vào thuộc tính riêng tư. |

**Trả về:** `nil` khi thành công, thông báo lỗi kiểu `string` khi thất bại.

