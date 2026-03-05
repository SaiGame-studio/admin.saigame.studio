# Quest Chain — Hướng dẫn Frontend CRUD

> **Base URL:** `{{api_url}}/api/v1`  
> **Auth:** Tất cả request phải kèm `Authorization: Bearer <token>` header.  
> **Tenant context:** `studio_id` và `game_id` đọc từ path — backend tự inject tenant, FE không cần gửi trong body.

---

## Mục lục

1. [Tổng quan luồng](#1-tổng-quan-luồng)
2. [CRUD Quest Chain](#2-crud-quest-chain)
3. [CRUD Quest Definition](#3-crud-quest-definition)
4. [Liên kết Quest Definition vào Chain](#4-liên-kết-quest-definition-vào-chain)
5. [Player — Xem chain với progress](#5-player--xem-chain-với-progress)
6. [Player — Claim reward](#6-player--claim-reward)
7. [Enum reference](#7-enum-reference)
8. [Error handling](#8-error-handling)

---

## 1. Tổng quan luồng

```
[Admin] Tạo Chain  →  Tạo Quest Definitions (gắn chain_id + prereq)  →  Active
                                    ↓
[Player] GetChain with progress  →  RecordEvent (tự động từ game)  →  ClaimReward
```

**Quan hệ dữ liệu:**
```
QuestChain
  └── QuestDefinition  (quest_chain_id = chain.id)
        └── QuestDefinition  (prerequisite_quest_id = prev.id)  ← tạo DAG
```

Quest Definition được **liên kết vào chain** thông qua 2 field trong body khi tạo/cập nhật quest:
- `quest_chain_id` — ID của chain cha
- `prerequisite_quest_id` — ID của quest phải hoàn thành trước (tùy chọn)

---

## 2. CRUD Quest Chain

### 2.1 Tạo Chain

```
POST /api/v1/studios/{studio_id}/games/{game_id}/quest-chains
```

**Request body:**
```json
{
  "chain_key": "tutorial_chain",
  "display_name": "Tutorial Chain",
  "description": "Introductory quest chain for new players.",
  "chain_type": "linear",
  "is_active": true
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `chain_key` | string | ✅ | Unique per game. Dùng snake_case. Không đổi được sau khi tạo. |
| `display_name` | string | ✅ | Tên hiển thị cho player |
| `description` | string | ❌ | Mô tả chuỗi quest |
| `chain_type` | enum | ✅ | `linear` \| `branching` \| `parallel` |
| `is_active` | bool | ✅ | `true` = player thấy chain này |

**Response `201 Created`:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "studio_id": "...",
  "game_id": "...",
  "chain_key": "tutorial_chain",
  "display_name": "Tutorial Chain",
  "description": "Introductory quest chain for new players.",
  "chain_type": "linear",
  "is_active": true,
  "deleted_at": null,
  "created_at": "2026-03-05T10:00:00Z",
  "updated_at": "2026-03-05T10:00:00Z"
}
```

> ⚠️ Lưu lại `id` — đây là `chain_id` dùng ở mọi endpoint sau.

---

### 2.2 Lấy danh sách Chain

```
GET /api/v1/studios/{studio_id}/games/{game_id}/quest-chains?limit=20&offset=0
```

| Query param | Default | Mô tả |
|-------------|---------|-------|
| `limit` | 50 | Số item mỗi trang |
| `offset` | 0 | Skip N item (pagination) |

**Response `200 OK`:**
```json
{
  "chains": [
    {
      "id": "a1b2c3d4-...",
      "chain_key": "tutorial_chain",
      "display_name": "Tutorial Chain",
      "chain_type": "linear",
      "is_active": true,
      "created_at": "2026-03-05T10:00:00Z",
      "updated_at": "2026-03-05T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

**Pagination helper:**
```js
const totalPages = Math.ceil(data.total / data.limit);
const currentPage = Math.floor(data.offset / data.limit) + 1;
```

---

### 2.3 Cập nhật Chain

```
PATCH /api/v1/studios/{studio_id}/games/{game_id}/quest-chains/{chain_id}
```

PATCH — chỉ gửi field muốn thay đổi (partial update):

```json
{
  "display_name": "Updated Tutorial Chain",
  "is_active": false
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| `display_name` | string? | Tên mới |
| `description` | string? | Mô tả mới |
| `chain_type` | enum? | Đổi kiểu chain |
| `is_active` | bool? | Ẩn/hiện chain |

**Response `200 OK`:** trả về object `QuestChain` đã cập nhật (cùng shape với Create).

**Errors:**
- `404` — chain không tồn tại hoặc đã bị xóa

---

### 2.4 Xóa Chain (Soft Delete)

```
DELETE /api/v1/studios/{studio_id}/games/{game_id}/quest-chains/{chain_id}
```

Không có request body.

**Response `204 No Content`** — thành công, không có body.

> ⚠️ Soft delete — chain chỉ bị ẩn (`deleted_at` được set). Quest definitions liên kết vẫn còn trong DB.

---

## 3. CRUD Quest Definition

Quest Definition là bản thiết kế của 1 quest cụ thể. Sau khi tạo, cần **gắn vào chain** qua `quest_chain_id`.

### 3.1 Tạo Quest Definition

```
POST /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions
```

**Request body (ví dụ quest login 3 ngày):**
```json
{
  "name": "Login 3 days",
  "description": "Login into the game for 3 consecutive days.",
  "quest_type": "story",
  "conditions": {
    "operator": "AND",
    "clauses": [
      {
        "clause_id": "daily_login",
        "type": "login",
        "target": 3
      }
    ]
  },
  "rewards": [
    {
      "reward_type": "coin",
      "amount": 500
    },
    {
      "reward_type": "item",
      "item_definition_id": "uuid-của-item",
      "quantity_min": 1,
      "quantity_max": 1
    }
  ],
  "quest_chain_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "prerequisite_quest_id": null,
  "is_active": true,
  "sort_order": 1
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `name` | string | ✅ | Tên quest |
| `description` | string | ❌ | Mô tả |
| `quest_type` | enum | ✅ | `one_time` \| `repeatable` \| `daily` \| `story` \| `battle_pass_task` |
| `conditions` | object | ✅ | Điều kiện hoàn thành (xem chi tiết bên dưới) |
| `rewards` | array | ✅ | Danh sách phần thưởng |
| `quest_chain_id` | uuid? | ❌ | **ID chain cha** — để liên kết quest vào chain |
| `prerequisite_quest_id` | uuid? | ❌ | ID quest phải xong trước quest này |
| `is_active` | bool | ✅ | Có hiện cho player không |
| `sort_order` | int | ✅ | Thứ tự hiển thị trong chain (bắt đầu từ 1) |

**Cấu trúc `conditions`:**
```json
{
  "operator": "AND",
  "clauses": [
    {
      "clause_id": "a",         // unique string trong quest này — dùng làm key lưu progress
      "type": "login",          // event type (login, item_collect, gacha_opened, ...)
      "target": 3               // số lần cần đạt
    }
  ]
}
```

**Ví dụ collect item:**
```json
{
  "operator": "AND",
  "clauses": [
    {
      "clause_id": "collect_sword",
      "type": "item_collect",
      "target": 1,
      "items": [
        { "item_definition_id": "uuid-sword", "quantity": 1 }
      ]
    }
  ]
}
```

**Cấu trúc `rewards`:**
```jsonc
// Coin reward
{ "reward_type": "coin", "amount": 500 }

// Item reward (fixed quantity)
{ "reward_type": "item", "item_definition_id": "uuid", "quantity_min": 1, "quantity_max": 1 }

// Item reward (random 1-3)
{ "reward_type": "item", "item_definition_id": "uuid", "quantity_min": 1, "quantity_max": 3 }
```

**Response `201 Created`:**
```json
{
  "id": "q1q2q3q4-...",
  "studio_id": "...",
  "game_id": "...",
  "name": "Login 3 days",
  "description": "Login into the game for 3 consecutive days.",
  "quest_type": "story",
  "conditions": { "operator": "AND", "clauses": [...] },
  "rewards": [...],
  "quest_chain_id": "a1b2c3d4-...",
  "prerequisite_quest_id": null,
  "is_active": true,
  "sort_order": 1,
  "created_at": "2026-03-05T10:05:00Z",
  "updated_at": "2026-03-05T10:05:00Z"
}
```

---

### 3.2 Lấy danh sách Quest Definition

```
GET /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions?active_only=true&limit=50&offset=0
```

| Query param | Default | Mô tả |
|-------------|---------|-------|
| `active_only` | false | Chỉ lấy quest đang active |
| `limit` | 50 | |
| `offset` | 0 | |

**Response `200 OK`:**
```json
{
  "quests": [ { ...QuestDefinition }, ... ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

> **Tip:** Để hiển thị danh sách quest của 1 chain cụ thể, lấy toàn bộ rồi filter phía FE theo `quest_chain_id`.

---

### 3.3 Lấy 1 Quest Definition

```
GET /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions/{quest_id}
```

**Response `200 OK`:** Trả về object `QuestDefinition` đầy đủ.

**Errors:**
- `404` — không tìm thấy

---

### 3.4 Cập nhật Quest Definition

```
PATCH /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions/{quest_id}
```

Partial update — chỉ gửi field cần đổi:

```json
{
  "name": "Login 5 days",
  "is_active": false
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| `name` | string? | |
| `description` | string? | |
| `conditions` | object? | Thay toàn bộ cây điều kiện |
| `rewards` | array? | Thay toàn bộ reward |
| `is_active` | bool? | |
| `sort_order` | int? | |

> ⚠️ `quest_chain_id` và `prerequisite_quest_id` **không có trong UpdateInput** — muốn re-link phải xóa và tạo lại quest.

**Response `200 OK`:** Object `QuestDefinition` đã cập nhật.

---

### 3.5 Xóa Quest Definition

```
DELETE /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions/{quest_id}
```

**Response `204 No Content`.**

---

## 4. Liên kết Quest Definition vào Chain

### Cách thức hoạt động

Không có endpoint riêng để "add quest to chain". Việc liên kết được thực hiện **khi tạo Quest Definition** bằng cách truyền `quest_chain_id` trong body.

### Ví dụ: Tạo chain "Tutorial" gồm 3 quest tuần tự

**Bước 1:** Tạo chain
```
POST /quest-chains
→ Nhận chain_id = "chain-aaa"
```

**Bước 2:** Tạo Quest 1 (không có prereq)
```json
POST /quest-definitions
{
  "name": "Welcome! Login for the first time",
  "quest_type": "story",
  "quest_chain_id": "chain-aaa",
  "prerequisite_quest_id": null,
  "sort_order": 1,
  ...
}
→ Nhận quest_id = "quest-001"
```

**Bước 3:** Tạo Quest 2 (prereq = Quest 1)
```json
POST /quest-definitions
{
  "name": "Open your first Gacha Pack",
  "quest_type": "story",
  "quest_chain_id": "chain-aaa",
  "prerequisite_quest_id": "quest-001",
  "sort_order": 2,
  ...
}
→ Nhận quest_id = "quest-002"
```

**Bước 4:** Tạo Quest 3 (prereq = Quest 2)
```json
POST /quest-definitions
{
  "name": "Collect 5 items",
  "quest_type": "story",
  "quest_chain_id": "chain-aaa",
  "prerequisite_quest_id": "quest-002",
  "sort_order": 3,
  ...
}
```

**Kết quả DAG:**
```
Quest 1 (locked → in_progress khi login)
  └── Quest 2 (locked cho đến khi Quest 1 claimed)
        └── Quest 3 (locked cho đến khi Quest 2 claimed)
```

### chain_type ảnh hưởng như thế nào

| `chain_type` | Hành vi unlock |
|-------------|----------------|
| `linear` | Quest tiếp theo unlock **sau khi** quest trước được claimed. DAG theo `prerequisite_quest_id`. |
| `parallel` | Tất cả quests trong chain unlock **ngay lập tức** — `prerequisite_quest_id` bị bỏ qua. |
| `branching` | Nhiều nhánh song song. Quest unlock khi prereq riêng của nó được claimed. |

---

## 5. Player — Xem chain với progress

Endpoint này dành cho **player**, không phải admin.

```
GET /api/v1/games/{game_id}/quest-chains/{chain_id}
```

> Yêu cầu token player (không phải studio token).

**Response `200 OK`:**
```json
{
  "chain": {
    "id": "chain-aaa",
    "chain_key": "tutorial_chain",
    "display_name": "Tutorial Chain",
    "chain_type": "linear",
    "is_active": true
  },
  "nodes": [
    {
      "quest": {
        "id": "quest-001",
        "name": "Welcome! Login for the first time",
        "description": "...",
        "quest_type": "story",
        "conditions": { "operator": "AND", "clauses": [...] },
        "rewards": [{ "reward_type": "coin", "amount": 100 }],
        "sort_order": 1,
        "is_active": true
      },
      "progress": {
        "id": "prog-xyz",
        "status": "claimed",
        "progress_data": { "daily_login": 1 },
        "completed_at": "2026-03-05T08:00:00Z",
        "claimed_at": "2026-03-05T08:01:00Z"
      }
    },
    {
      "quest": {
        "id": "quest-002",
        "name": "Open your first Gacha Pack",
        "sort_order": 2
      },
      "progress": {
        "status": "in_progress",
        "progress_data": { "gacha_open": 0 }
      }
    },
    {
      "quest": {
        "id": "quest-003",
        "name": "Collect 5 items",
        "sort_order": 3
      },
      "progress": null
    }
  ]
}
```

**`progress` field:**

| `status` | Ý nghĩa | Action cho FE |
|----------|---------|---------------|
| `null` | Chưa bắt đầu / bị lock | Hiện lock icon |
| `in_progress` | Đang làm | Hiện progress bar |
| `completed` | Đủ điều kiện nhận thưởng | Hiện nút **Claim** |
| `claimed` | Đã nhận thưởng | Hiện checkmark |
| `locked` | Prereq chưa xong | Hiện lock icon |
| `expired` | Hết hạn (daily quest) | Hiện expired badge |

**Render progress bar:**
```js
// Ví dụ quest login 3 ngày, clause_id = "daily_login"
const current = progress.progress_data?.daily_login ?? 0;
const target = quest.conditions.clauses.find(c => c.clause_id === "daily_login")?.target ?? 1;
const percent = Math.min(100, Math.round((current / target) * 100));
```

---

## 6. Player — Claim reward

```
POST /api/v1/games/{game_id}/quests/{quest_id}/claim
```

**Request body:**
```json
{
  "idempotency_key": "claim-{user_id}-{quest_id}-{timestamp}"
}
```

> `idempotency_key` là string bất kỳ unique per claim attempt. Dùng để retry-safe — cùng key sẽ trả về cùng kết quả mà không grant lại.

**Gợi ý tạo key phía FE:**
```js
const idempotencyKey = `claim-${userId}-${questId}-${Date.now()}`;
// Lưu key này trước khi gọi API để có thể retry nếu network lỗi
```

**Response `200 OK`:**
```json
{
  "id": "claim-uuid",
  "user_id": "...",
  "quest_definition_id": "quest-001",
  "idempotency_key": "claim-xxx-yyy-zzz",
  "rewards_granted": [
    {
      "reward_type": "coin",
      "amount": 500,
      "coin_transaction_id": "..."
    },
    {
      "reward_type": "item",
      "item_definition_id": "...",
      "quantity": 1,
      "inventory_item_id": "...",
      "mailbox_message_id": "..."
    }
  ],
  "claimed_at": "2026-03-05T10:10:00Z"
}
```

**Errors:**

| HTTP | Lý do | Xử lý FE |
|------|-------|----------|
| `422` | Quest chưa completed | Ẩn nút Claim, refresh progress |
| `409` | Đã claim rồi | Coi như thành công, refresh UI |
| `410` | Quest expired (daily) | Hiện thông báo hết hạn |
| `400` | Missing `idempotency_key` | Fix code |

---

## 7. Enum reference

### `chain_type`
| Value | Mô tả |
|-------|-------|
| `linear` | Tuần tự, 1 prereq chain |
| `branching` | Nhiều nhánh song song |
| `parallel` | Tất cả unlock ngay |

### `quest_type`
| Value | Dùng trong chain? | Mô tả |
|-------|------------------|-------|
| `story` | ✅ Chính | Quest story/tutorial trong chain |
| `one_time` | ✅ | Làm 1 lần, không reset |
| `repeatable` | ❌ | Có thể làm lại |
| `daily` | ❌ | Dùng với Daily Quest Pool |
| `battle_pass_task` | ❌ | Dùng với Battle Pass |

### `quest_status` (player progress)
| Value | Mô tả |
|-------|-------|
| `in_progress` | Đang làm |
| `completed` | Xong, chờ claim |
| `claimed` | Đã nhận thưởng |
| `locked` | Prereq chưa hoàn thành |
| `expired` | Hết hạn |

### Event types (trong `conditions.clauses[*].type`)
| Value | Khi nào trigger |
|-------|----------------|
| `login` | Player login |
| `item_collect` | Player nhận item (từ gacha, shop, ...) |
| `gacha_opened` | Player mở gacha pack |

---

## 8. Error handling

**Shape lỗi chuẩn (tất cả endpoint):**
```json
{
  "error": "failed to create quest chain",
  "message": "CreateQuestChain: ..."
}
```

**Checklist khi gặp lỗi:**

| Lỗi | Nguyên nhân thường gặp |
|-----|----------------------|
| `chain_type check constraint` | Gửi giá trị không hợp lệ — phải là `linear`, `branching`, hoặc `parallel` |
| `column "display_name" does not exist` | DB chưa chạy migration 056 |
| `chain_key already exists` | `chain_key` trùng trong game — dùng giá trị khác |
| `quest limit reached` (422) | Vượt quota — liên hệ upgrade plan |
| `chain not found` (404) | `chain_id` sai hoặc chain đã bị xóa |
