# Container Definition — Liên kết với Item Definition

> **Dành cho:** Frontend / Game Client  
> **Cập nhật:** 2026-03-04

---

## Tổng quan

Mỗi **Container Definition** có thể được liên kết với **1 Item Definition**. Khi liên kết được thiết lập:

1. Metadata của Item Definition sẽ tự động được ghi thêm trường `linked_container_definition_id`.
2. Khi player sở hữu item đó, game client gọi endpoint `ensure-container` → server tự động tạo container cho player nếu chưa có (idempotent).

---

## 1. Tạo Container Definition (có liên kết)

### `POST /api/v1/games/{game_id}/container-definitions`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Mô tả |
|---|---|---|---|
| `name` | string | ✅ | Tên của container definition |
| `container_type` | string | ✅ | Loại container: `"shulker_box"` hoặc `"inventory"` |
| `grid_cols` | int | ✅ | Số cột lưới (min 1) |
| `grid_rows` | int | ✅ | Số hàng lưới (min 1) |
| `is_portable` | bool | ❌ | Container có thể mang theo (mặc định `false`) |
| `linked_item_definition_id` | string (UUID) | ❌ | UUID của item definition muốn liên kết |
| `metadata` | object | ❌ | Metadata tùy chỉnh |

**Ví dụ — tạo container có liên kết:**
```json
{
  "name": "Magic Chest",
  "container_type": "shulker_box",
  "grid_cols": 5,
  "grid_rows": 5,
  "is_portable": true,
  "linked_item_definition_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "metadata": {}
}
```

**Ví dụ — tạo container không liên kết:**
```json
{
  "name": "Basic Bag",
  "container_type": "shulker_box",
  "grid_cols": 3,
  "grid_rows": 3,
  "is_portable": true
}
```

**Response `201 Created`:**
```json
{
  "container_definition": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "studio_id": "...",
    "game_id": "...",
    "name": "Magic Chest",
    "container_type": "shulker_box",
    "grid_cols": 5,
    "grid_rows": 5,
    "is_portable": true,
    "linked_item_definition_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "metadata": {},
    "created_at": "...",
    "updated_at": "..."
  }
}
```

> **Side effect tự động:** Nếu `linked_item_definition_id` được cung cấp, server sẽ tự động cập nhật `metadata` của Item Definition đó với:
> ```json
> { "linked_container_definition_id": "<container_definition_id vừa tạo>" }
> ```

---

## 2. Cập nhật Container Definition (thêm / sửa / xóa liên kết)

### `PATCH /api/v1/games/{game_id}/container-definitions/{definition_id}`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (tất cả fields đều optional — chỉ gửi field muốn thay đổi):**
| Field | Type | Mô tả |
|---|---|---|
| `name` | string | Đổi tên |
| `grid_cols` | int | Thay đổi số cột (xem lưu ý phía dưới) |
| `grid_rows` | int | Thay đổi số hàng |
| `linked_item_definition_id` | string | **UUID** = thiết lập liên kết mới; **`""`** (chuỗi rỗng) = xóa liên kết; **bỏ qua field** = giữ nguyên |
| `metadata` | object | Ghi đè metadata (toàn bộ object) |
| `force` | bool | `true` = bỏ qua orphan check khi thu nhỏ lưới |

### Các trường hợp `linked_item_definition_id`:

| Gửi lên | Kết quả |
|---|---|
| `"linked_item_definition_id": "uuid-string"` | Thiết lập liên kết đến item definition đó |
| `"linked_item_definition_id": ""` | **Xóa** liên kết (set về NULL) |
| *(không gửi field)* | Giữ nguyên liên kết hiện tại, không thay đổi |

**Ví dụ — gắn liên kết mới:**
```json
{
  "linked_item_definition_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Ví dụ — xóa liên kết:**
```json
{
  "linked_item_definition_id": ""
}
```

**Ví dụ — đổi tên và mở rộng lưới (không động đến liên kết):**
```json
{
  "name": "Big Chest",
  "grid_cols": 8,
  "grid_rows": 8
}
```

**Response `200 OK`:**
```json
{
  "container_definition": {
    "id": "...",
    "name": "Big Chest",
    "grid_cols": 8,
    "grid_rows": 8,
    "linked_item_definition_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    ...
  }
}
```

> **Lưu ý thu nhỏ lưới:** Nếu giảm `grid_cols` / `grid_rows` mà có item đang nằm ở ô ngoài vùng mới → server trả `409 Conflict`. Gửi thêm `"force": true` để bỏ qua kiểm tra này (item giữ tọa độ cũ).

---

## 3. Game Client: Mở container bằng item (ensure-container)

### `POST /api/v1/games/{game_id}/inventory/ensure-container`

Endpoint này được gọi **sau khi player nhận được item** có liên kết container. Server sẽ kiểm tra player đã có container chưa, nếu chưa thì tạo mới (idempotent — gọi nhiều lần vẫn an toàn).

**Headers:**
```
Authorization: Bearer <player_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "item_definition_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response `200 OK`:**
```json
{
  "container": {
    "id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "studio_id": "...",
    "game_id": "...",
    "owner_user_id": "<player_id>",
    "item_container_definition_id": "...",
    "container_type": "shulker_box",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Các lỗi có thể xảy ra:**

| HTTP | Nguyên nhân |
|---|---|
| `400` | `item_definition_id` không phải UUID hợp lệ |
| `401` | Thiếu JWT token |
| `403` | Player **không sở hữu** item definition này |
| `404` | Item definition không có liên kết container definition |
| `500` | Lỗi server |

---

## 4. Flow hoàn chỉnh (Tóm tắt)

```
[Studio Admin]
  │
  ├─ Tạo Item Definition (vd: "Magic Chest Key")
  │
  ├─ Tạo Container Definition (vd: "Magic Chest")
  │    └─ linked_item_definition_id = ID của "Magic Chest Key"
  │         → Server tự động ghi metadata vào "Magic Chest Key":
  │              { "linked_container_definition_id": "<ID của Magic Chest>" }
  │
[Game Server / Grant System]
  │
  ├─ Grant item "Magic Chest Key" cho player
  │    → Service tự động gọi EnsureLinkedContainer (best-effort)
  │
[Game Client]
  │
  └─ Khi player mở item "Magic Chest Key":
       POST /api/v1/games/{game_id}/inventory/ensure-container
            { "item_definition_id": "<ID của Magic Chest Key>" }
       → Nhận về container đã tồn tại hoặc vừa được tạo
```

---

## 5. Đọc metadata của Item Definition

Sau khi liên kết được thiết lập, có thể kiểm tra qua `GET /api/v1/games/{game_id}/item-definitions/{item_definition_id}`:

```json
{
  "item_definition": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Magic Chest Key",
    "metadata": {
      "linked_container_definition_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  }
}
```

Field `linked_container_definition_id` trong metadata là **UUID dạng string** của container definition tương ứng.

---

## 6. Lưu ý quan trọng

- Mỗi container definition chỉ được liên kết với **tối đa 1** item definition (unique constraint trong DB, scoped theo `studio_id + game_id`).
- Metadata sync (`linked_container_definition_id` trên item def) là **best-effort** — không ảnh hưởng đến kết quả của API call nếu sync thất bại.
- `ensure-container` là **idempotent** — game client có thể gọi nhiều lần, luôn trả về container hiện tại.
- Khi xóa liên kết (`linked_item_definition_id: ""`), metadata trên item definition **không bị xóa** (giữ lại giá trị cũ như historical reference).
