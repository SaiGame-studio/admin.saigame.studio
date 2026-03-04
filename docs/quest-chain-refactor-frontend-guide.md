# Quest Chain Refactor — Frontend Migration Guide

> **Ngày hiệu lực:** 2026-03-05  
> **Ticket liên quan:** P2-T14  
> **Tóm tắt:** Quan hệ giữa Quest Definition và Quest Chain đã được đổi từ **Many-to-One** (FK trực tiếp trên quest) sang **Many-to-Many** (pivot table `quest_chain_members`). Một quest definition giờ có thể xuất hiện trong nhiều chain khác nhau. Logic "quest nào được unlock tiếp theo" được lưu trên pivot row thay vì trên quest definition.

---

## Mục lục

1. [Breaking Changes trên QuestDefinition](#1-breaking-changes-trên-questdefinition)
2. [Resource mới: QuestChainMember](#2-resource-mới-questchainmember)
3. [4 Endpoint mới — Quản lý Chain Membership](#3-4-endpoint-mới--quản-lý-chain-membership)
4. [Thay đổi trên response của Player endpoint](#4-thay-đổi-trên-response-của-player-endpoint)
5. [Endpoint cũ KHÔNG thay đổi](#5-endpoint-cũ-không-thay-đổi)
6. [Luồng Admin điển hình](#6-luồng-admin-điển-hình)
7. [Luồng Player điển hình](#7-luồng-player-điển-hình)
8. [Error codes cần xử lý](#8-error-codes-cần-xử-lý)
9. [Checklist Frontend](#9-checklist-frontend)

---

## 1. Breaking Changes trên QuestDefinition

### Hai field đã bị XÓA hoàn toàn

| Field cũ | Lý do xóa |
|---|---|
| `quest_chain_id` | Không còn ý nghĩa — một quest có thể thuộc nhiều chain |
| `prerequisite_quest_id` | Thay bằng `unlock_quest_ids` trên pivot row |

**Response của `GET /quest-definitions` và `GET /quest-definitions/{quest_id}` trước đây:**

```json
{
  "id": "uuid",
  "name": "Kill 10 Wolves",
  "quest_type": "one_time",
  "quest_chain_id": "uuid-of-chain",
  "prerequisite_quest_id": "uuid-of-previous-quest",
  "conditions": { ... },
  "rewards": [ ... ],
  "is_active": true,
  "sort_order": 0,
  "created_at": "...",
  "updated_at": "..."
}
```

**Response SAU khi refactor:**

```json
{
  "id": "uuid",
  "name": "Kill 10 Wolves",
  "quest_type": "one_time",
  "conditions": { ... },
  "rewards": [ ... ],
  "is_active": true,
  "sort_order": 0,
  "created_at": "...",
  "updated_at": "..."
}
```

> ⚠️ **Hành động cần làm:** Xóa bỏ mọi chỗ frontend đọc hoặc ghi `quest_chain_id` / `prerequisite_quest_id` từ/vào quest definition. Form tạo/sửa quest definition không được gửi hai field này nữa.

---

## 2. Resource mới: QuestChainMember

`QuestChainMember` là pivot row nối một **QuestChain** với một **QuestDefinition**. Nó lưu thêm:

- `sort_order` — thứ tự hiển thị của quest trong chain này
- `unlock_quest_ids` — danh sách `quest_definition_id` sẽ được **mở khóa** khi player hoàn thành quest này trong chain này

### Schema của QuestChainMember

```typescript
interface QuestChainMember {
  id: string;                   // UUID của pivot row
  chain_id: string;             // UUID của chain
  quest_definition_id: string;  // UUID của quest definition
  sort_order: number;           // Thứ tự trong chain (0-based)
  unlock_quest_ids: string[];   // Danh sách quest_definition_id sẽ unlock sau khi quest này hoàn thành
  created_at: string;           // ISO 8601
  updated_at: string;           // ISO 8601
}
```

**Ví dụ:**

```json
{
  "id": "a1b2c3d4-...",
  "chain_id": "chain-uuid",
  "quest_definition_id": "quest-A-uuid",
  "sort_order": 0,
  "unlock_quest_ids": ["quest-B-uuid", "quest-C-uuid"],
  "created_at": "2026-03-05T10:00:00Z",
  "updated_at": "2026-03-05T10:00:00Z"
}
```

> Ý nghĩa ví dụ trên: Khi player hoàn thành "quest-A" trong "chain", hai quest "quest-B" và "quest-C" sẽ được mở khóa.

---

## 3. 4 Endpoint mới — Quản lý Chain Membership

Tất cả 4 endpoint đều là **Admin-only** và yêu cầu header:
- `Authorization: Bearer <admin_token>`
- `X-Studio-Id: <studio_uuid>`

Base path: `/api/v1/studios/{studio_id}/games/{game_id}/quest-chains/{chain_id}/members`

---

### 3.1 List tất cả quest trong một chain

```
GET /api/v1/studios/{studio_id}/games/{game_id}/quest-chains/{chain_id}/members
```

**Permission:** `quest:read`

**Path params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `studio_id` | UUID | Studio hiện tại |
| `game_id` | UUID | Game hiện tại |
| `chain_id` | UUID | Chain cần xem |

**Response `200 OK`:**

```json
{
  "members": [
    {
      "id": "pivot-row-uuid",
      "chain_id": "chain-uuid",
      "quest_definition_id": "quest-A-uuid",
      "sort_order": 0,
      "unlock_quest_ids": ["quest-B-uuid"],
      "created_at": "2026-03-05T10:00:00Z",
      "updated_at": "2026-03-05T10:00:00Z"
    },
    {
      "id": "pivot-row-uuid-2",
      "chain_id": "chain-uuid",
      "quest_definition_id": "quest-B-uuid",
      "sort_order": 1,
      "unlock_quest_ids": [],
      "created_at": "2026-03-05T10:01:00Z",
      "updated_at": "2026-03-05T10:01:00Z"
    }
  ]
}
```

> **Lưu ý:** Response là `{ "members": [...] }`, không phải array trực tiếp.

---

### 3.2 Thêm quest vào chain

```
POST /api/v1/studios/{studio_id}/games/{game_id}/quest-chains/{chain_id}/members
```

**Permission:** `quest:write`

**Request body:**

```json
{
  "quest_definition_id": "uuid-of-quest",
  "sort_order": 0,
  "unlock_quest_ids": ["uuid-of-quest-to-unlock-after"]
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `quest_definition_id` | UUID | ✅ | Quest muốn thêm vào chain |
| `sort_order` | number | ✅ | Vị trí trong chain (giá trị nhỏ hơn = hiển thị trước) |
| `unlock_quest_ids` | UUID[] | ✅ | Danh sách quest sẽ unlock khi quest này hoàn thành. Gửi `[]` nếu không unlock gì |

**Response `201 Created`:** Trả về object `QuestChainMember` vừa tạo (xem schema phần 2).

**Response `409 Conflict`:** Quest đó đã tồn tại trong chain này rồi.

```json
{
  "error": "quest already in chain",
  "detail": "quest: quest definition already in this chain"
}
```

> ⚠️ **Quan trọng:** Một `quest_definition_id` chỉ được thêm vào một chain **một lần duy nhất**. Nếu muốn quest đó xuất hiện ở nhiều vị trí, cần dùng các quest definition khác nhau (hoặc tạo bản sao).

---

### 3.3 Cập nhật pivot row (sort_order hoặc unlock_quest_ids)

```
PATCH /api/v1/studios/{studio_id}/games/{game_id}/quest-chains/{chain_id}/members/{quest_id}
```

**Permission:** `quest:write`

**Path params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `chain_id` | UUID | Chain |
| `quest_id` | UUID | `quest_definition_id` của pivot row cần sửa (KHÔNG phải `id` của pivot row) |

**Request body (tất cả field đều optional — chỉ gửi field cần thay đổi):**

```json
{
  "sort_order": 2,
  "unlock_quest_ids": ["quest-C-uuid", "quest-D-uuid"]
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `sort_order` | number? | Thứ tự mới trong chain |
| `unlock_quest_ids` | UUID[]? | **Ghi đè toàn bộ** danh sách unlock. Gửi `[]` để xóa hết. Nếu không gửi field này, danh sách cũ được giữ nguyên |

> ⚠️ **Lưu ý đặc biệt về `unlock_quest_ids`:**  
> - Nếu **KHÔNG gửi** field `unlock_quest_ids` → danh sách cũ **KHÔNG bị thay đổi**  
> - Nếu gửi `"unlock_quest_ids": []` → xóa hết danh sách unlock  
> - Nếu gửi `"unlock_quest_ids": ["uuid1", "uuid2"]` → **thay thế hoàn toàn** (không phải append)

**Response `200 OK`:** Trả về object `QuestChainMember` đã được cập nhật.

**Response `404 Not Found`:** Không tìm thấy pivot row.

```json
{
  "error": "chain member not found",
  "detail": "quest: chain member pivot row not found"
}
```

---

### 3.4 Xóa quest khỏi chain

```
DELETE /api/v1/studios/{studio_id}/games/{game_id}/quest-chains/{chain_id}/members/{quest_id}
```

**Permission:** `quest:write`

**Path params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `chain_id` | UUID | Chain |
| `quest_id` | UUID | `quest_definition_id` của pivot row cần xóa |

**Response `204 No Content`:** Xóa thành công, không có body.

**Response `404 Not Found`:** Pivot row không tồn tại.

---

## 4. Thay đổi trên response của Player endpoint

### 4.1 GET chain + progress — thay đổi trong `nodes[]`

```
GET /api/v1/games/{game_id}/quest-chains/{chain_id}
```

Endpoint này **không thay đổi path/method**, nhưng mỗi node trong `nodes[]` giờ có thêm `unlock_quest_ids`:

**Response TRƯỚC:**

```json
{
  "chain": { ... },
  "nodes": [
    {
      "quest_id": "uuid",
      "name": "Defeat the Dragon",
      "sort_order": 0,
      "status": "completed"
    }
  ]
}
```

**Response SAU:**

```json
{
  "chain": { ... },
  "nodes": [
    {
      "quest": {
        "id": "quest-A-uuid",
        "name": "Defeat the Dragon",
        ...
      },
      "progress": {
        "status": "completed",
        ...
      },
      "unlock_quest_ids": ["quest-B-uuid"]
    }
  ]
}
```

> **Thay đổi cấu trúc node quan trọng:**
> - Từ flat object `{ quest_id, name, sort_order, status }` → wrapper `{ quest: QuestDefinition, progress: PlayerQuestProgress | null, unlock_quest_ids: UUID[] }`
> - `unlock_quest_ids` cho frontend biết quest nào sẽ được "sáng lên" khi node này hoàn thành

**TypeScript types:**

```typescript
interface QuestWithProgress {
  quest: QuestDefinition;
  progress: PlayerQuestProgress | null;
  unlock_quest_ids: string[];  // Có thể là [] nếu không unlock gì thêm
}

interface QuestChainWithProgress {
  chain: QuestChain;
  nodes: QuestWithProgress[];
}
```

---

## 5. Endpoint cũ KHÔNG thay đổi

Các endpoint dưới đây **giữ nguyên** path, method, và hầu hết request/response body. Chỉ cần xóa bỏ xử lý các field đã bị remove (`quest_chain_id`, `prerequisite_quest_id`):

| Method | Path | Thay đổi |
|---|---|---|
| `POST` | `/studios/{s}/games/{g}/quest-chains` | Không đổi |
| `GET` | `/studios/{s}/games/{g}/quest-chains` | Không đổi |
| `PATCH` | `/studios/{s}/games/{g}/quest-chains/{chain_id}` | Không đổi |
| `DELETE` | `/studios/{s}/games/{g}/quest-chains/{chain_id}` | Không đổi |
| `POST` | `/studios/{s}/games/{g}/quest-definitions` | Bỏ 2 field cũ trong form |
| `GET` | `/studios/{s}/games/{g}/quest-definitions` | Response không còn 2 field cũ |
| `GET` | `/studios/{s}/games/{g}/quest-definitions/{quest_id}` | Response không còn 2 field cũ |
| `PATCH` | `/studios/{s}/games/{g}/quest-definitions/{quest_id}` | Bỏ 2 field cũ trong body |
| `DELETE` | `/studios/{s}/games/{g}/quest-definitions/{quest_id}` | Không đổi |
| `GET` | `/games/{g}/quests` | Không đổi |
| `POST` | `/games/{g}/quests/{quest_id}/claim` | Không đổi |
| `GET` | `/games/{g}/quest-claims` | Không đổi |

---

## 6. Luồng Admin điển hình

### Tạo chain với 3 quest theo thứ tự tuyến tính (A → B → C)

```
1. POST /studios/s/games/g/quest-definitions   → tạo Quest A  → nhận id: "qa"
2. POST /studios/s/games/g/quest-definitions   → tạo Quest B  → nhận id: "qb"
3. POST /studios/s/games/g/quest-definitions   → tạo Quest C  → nhận id: "qc"

4. POST /studios/s/games/g/quest-chains        → tạo Chain X  → nhận id: "cx"

5. POST /studios/s/games/g/quest-chains/cx/members
   Body: { "quest_definition_id": "qa", "sort_order": 0, "unlock_quest_ids": ["qb"] }
   → A unlock B khi hoàn thành

6. POST /studios/s/games/g/quest-chains/cx/members
   Body: { "quest_definition_id": "qb", "sort_order": 1, "unlock_quest_ids": ["qc"] }
   → B unlock C khi hoàn thành

7. POST /studios/s/games/g/quest-chains/cx/members
   Body: { "quest_definition_id": "qc", "sort_order": 2, "unlock_quest_ids": [] }
   → C là quest cuối, không unlock gì thêm
```

### Tạo chain có nhánh (A → B và A → C song song)

```
5. POST .../cx/members
   Body: { "quest_definition_id": "qa", "sort_order": 0, "unlock_quest_ids": ["qb", "qc"] }
   → A unlock cả B lẫn C

6. POST .../cx/members
   Body: { "quest_definition_id": "qb", "sort_order": 1, "unlock_quest_ids": [] }

7. POST .../cx/members
   Body: { "quest_definition_id": "qc", "sort_order": 1, "unlock_quest_ids": [] }
```

### Tái sử dụng một quest trong nhiều chain

```
Quest "Daily Login" (id: "dl") đã tồn tại.

POST .../chain-X/members   Body: { "quest_definition_id": "dl", "sort_order": 0, "unlock_quest_ids": [] }
POST .../chain-Y/members   Body: { "quest_definition_id": "dl", "sort_order": 2, "unlock_quest_ids": ["other"] }
```

Quest "Daily Login" hiện có thể xuất hiện trong nhiều chain khác nhau với `sort_order` và `unlock_quest_ids` riêng biệt ở từng chain.

---

## 7. Luồng Player điển hình

```
1. GET /games/{g}/quest-chains/{chain_id}
   → Lấy chain + toàn bộ progress hiện tại của player

2. Render graph/danh sách dựa trên nodes[]:
   - nodes[i].progress.status = "locked"       → Quest bị khóa, hiện icon khóa
   - nodes[i].progress.status = "in_progress"  → Quest đang chạy, hiện thanh tiến độ
   - nodes[i].progress.status = "completed"    → Có thể claim, hiện nút "Nhận thưởng"
   - nodes[i].progress.status = "claimed"      → Đã nhận, hiện checkmark

3. Khi nodes[i].progress.status = "completed":
   → Highlight các quest trong nodes[i].unlock_quest_ids sẽ được mở khóa tiếp theo

4. POST /games/{g}/quests/{quest_id}/claim
   Body: { "idempotency_key": "unique-key" }
   → Nhận thưởng
```

---

## 8. Error codes cần xử lý

### Endpoint mới — chain members

| HTTP Status | `error` field | Khi nào xảy ra |
|---|---|---|
| `400 Bad Request` | `"invalid chain_id"` / `"invalid quest_id"` | UUID không hợp lệ trong path |
| `400 Bad Request` | `"invalid request body"` | JSON body không parse được |
| `404 Not Found` | `"chain member not found"` | Pivot row không tồn tại (PATCH / DELETE) |
| `409 Conflict` | `"quest already in chain"` | Quest đã có trong chain (POST) |
| `500 Internal Server Error` | `"failed to ..."` | Lỗi server |

### Error response format (chung toàn hệ thống)

```json
{
  "error": "mô tả ngắn gọn",
  "detail": "chi tiết kỹ thuật hơn"
}
```

---

## 9. Checklist Frontend

- [ ] **Xóa** mọi reference đến `quest_chain_id` trong form tạo/sửa quest definition  
- [ ] **Xóa** mọi reference đến `prerequisite_quest_id` trong form tạo/sửa quest definition  
- [ ] **Cập nhật** TypeScript types / interfaces cho `QuestDefinition` (bỏ 2 field trên)  
- [ ] **Thêm** TypeScript type / interface cho `QuestChainMember`  
- [ ] **Thêm** API service functions cho 4 endpoint mới (list/add/update/remove chain members)  
- [ ] **Build UI** quản lý chain membership: danh sách quest trong chain, thêm/sửa/xóa  
- [ ] **Cập nhật** UI hiển thị chain graph cho player: đọc `unlock_quest_ids` từ mỗi node để vẽ mũi tên hoặc highlight quest tiếp theo  
- [ ] **Xử lý** `409 Conflict` khi thêm quest đã có trong chain (thông báo lỗi thân thiện)  
- [ ] **Xử lý** `404 Not Found` khi PATCH/DELETE pivot row không tồn tại  
- [ ] **Kiểm tra** PATCH `unlock_quest_ids`: luôn gửi **toàn bộ** danh sách mới (không phải chỉ gửi item thêm/bỏ)  
