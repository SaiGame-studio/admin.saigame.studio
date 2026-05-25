# LLM Conversation — Content Links

**For:** Frontend / Studio Dashboard team  
**Auth:** JWT (Bearer token) — all endpoints require a logged-in Studio member  
**Base URL:** `https://api.example.com`

---

## 1. Concept

Một conversation có thể được **liên kết** với các content item (item definition, lore entry, …) mà nó tạo ra hoặc tham chiếu đến. Khi mở lại conversation, frontend có thể hiển thị danh sách content đã được tạo/liên kết trong phiên đó.

Có hai cách một link được tạo:

| Cách | `linked_by` | Mô tả |
|------|-------------|-------|
| **Auto-link** | `null` | Hệ thống tự tạo khi gọi `POST .../create-records` và item được tạo thành công |
| **Manual link** | UUID của user | User chủ động liên kết một content đã có sẵn vào conversation |

---

## 2. Data model

```jsonc
{
  "id": "uuid",
  "conversation_id": "uuid",
  "content_type": "item_definition",   // "item_definition" | "lore_entry" | ...
  "content_id": "uuid",                // ID của content trong bảng tương ứng
  "linked_by": "user-uuid",            // null nếu auto-link
  "created_at": "2026-05-24T10:00:00Z"
}
```

---

## 3. Endpoints

### 3.1 List content links

```
GET /api/v1/games/{game_id}/llm/conversations/{conversation_id}/content
```

Trả về tất cả content đã được liên kết với conversation, sắp xếp theo `created_at` mới nhất trước.

**Response `200`:**
```json
{
  "items": [
    {
      "id": "aaa11111-...",
      "conversation_id": "conv-uuid",
      "content_type": "item_definition",
      "content_id": "item-uuid-1",
      "linked_by": null,
      "created_at": "2026-05-24T10:05:00Z"
    },
    {
      "id": "bbb22222-...",
      "conversation_id": "conv-uuid",
      "content_type": "lore_entry",
      "content_id": "lore-uuid-1",
      "linked_by": "user-uuid",
      "created_at": "2026-05-24T10:01:00Z"
    }
  ],
  "total": 2
}
```

---

### 3.2 Link content (manual)

```
POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/content
```

Liên kết một content đã có sẵn vào conversation. Gọi nhiều lần với cùng `content_type` + `content_id` thì **idempotent** (không lỗi, không duplicate).

**Request body:**
```json
{
  "content_type": "item_definition",
  "content_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `content_type` | string | ✅ | Loại content: `"item_definition"`, `"lore_entry"`, … |
| `content_id` | UUID string | ✅ | ID của content cần link |

**Response `201`:**
```json
{
  "id": "ccc33333-...",
  "conversation_id": "conv-uuid",
  "content_type": "item_definition",
  "content_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "linked_by": "current-user-uuid",
  "created_at": "2026-05-24T10:10:00Z"
}
```

> **Note:** API không kiểm tra `content_id` có tồn tại trong bảng tương ứng hay không. Frontend chịu trách nhiệm truyền đúng ID.

---

### 3.3 Unlink content

```
DELETE /api/v1/games/{game_id}/llm/conversations/{conversation_id}/content/{content_type}/{content_id}
```

Xóa một content link. Hoạt động với cả auto-link và manual link.

**Path params:**

| Param | Ví dụ |
|-------|-------|
| `content_type` | `item_definition` |
| `content_id` | `3fa85f64-5717-4562-b3fc-2c963f66afa6` |

**Response:** `204 No Content`

**Error `404`** nếu link không tồn tại:
```json
{ "code": "not_found", "message": "conversation content link not found" }
```

---

## 4. Auto-link flow

Khi gọi `POST .../create-records`, mỗi item definition được tạo thành công sẽ **tự động** được link vào conversation với `linked_by = null`.

```
POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/create-records
→ tạo N item definitions
→ tự động tạo N content links (content_type = "item_definition")
```

Frontend **không cần** gọi thêm `POST .../content` sau `create-records`.

---

## 5. Suggested UI — "Linked Content" panel

```
┌─────────────────────────────────────────┐
│  Linked Content                  [+ Add] │
├─────────────────────────────────────────┤
│  📦 item_definition                      │
│     Iron Sword          [auto]  [Unlink] │
│     Shadow Dagger       [auto]  [Unlink] │
├─────────────────────────────────────────┤
│  📖 lore_entry                           │
│     The Iron Kingdom    [manual][Unlink] │
└─────────────────────────────────────────┘
```

- `[auto]` = `linked_by` là `null`
- `[manual]` = `linked_by` là UUID của user
- `[+ Add]` → mở picker để chọn content có sẵn → gọi `POST .../content`
- `[Unlink]` → gọi `DELETE .../content/{content_type}/{content_id}`

---

## 6. `goals` field trong stream request

Khi gọi stream endpoint (`item-generation` / `lore-building`), frontend có thể truyền `goals` — danh sách các mục tiêu đã được trích xuất từ các intent trước đó trong cùng conversation. LLM sẽ dùng danh sách này như ngữ cảnh bổ sung.

```http
POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/item-generation
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_prompt": "Now make a matching shield",
  "language": "en",
  "entity_type": "item",
  "lore_entry_ids": [],
  "goals": [
    "Create a legendary fire sword",
    "List warrior-class items for the Iron Kingdom"
  ]
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `goals` | string[] | ❌ | Goals từ các intent trước trong conversation. Bỏ trống hoặc `[]` nếu đây là request đầu tiên. |

**Cách lấy `goals`:** Sau mỗi lần detect-intent thành công, `done` event trả về `detected_goal`. Lưu các giá trị này vào state của conversation và gửi kèm trong request tiếp theo.

```jsonc
// done event từ detect-intent
{
  "type": "done",
  "detected_request_type": "item_generation",
  "detected_goal": "Create a legendary fire sword",   // ← lưu cái này
  "detected_language": "en",
  "detected_entity_type": "item"
}
```
