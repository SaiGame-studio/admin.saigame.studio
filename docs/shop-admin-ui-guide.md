# Hướng Dẫn Xây Dựng Shop Admin UI

**Tickets:** P2-T37 / P2-T38 / P2-T39  
**Base URL:** `http://localhost:8080` (dev) — thay bằng biến môi trường `VITE_API_URL`  
**Auth:** Tất cả request đều cần header `Authorization: Bearer <access_token>`

---

## Mục Lục

1. [Tổng Quan Kiến Trúc UI](#1-tổng-quan-kiến-trúc-ui)
2. [Authentication & Permissions](#2-authentication--permissions)
3. [Data Models (TypeScript)](#3-data-models-typescript)
4. [Enum Reference](#4-enum-reference)
5. [Endpoint 1 — Tạo Shop](#5-endpoint-1--tạo-shop)
6. [Endpoint 2 — Thêm Item vào Shop](#6-endpoint-2--thêm-item-vào-shop)
7. [Endpoint 3 — Cập Nhật Item](#7-endpoint-3--cập-nhật-item)
8. [Endpoint 4 — Xoá Item](#8-endpoint-4--xoá-item)
9. [Đọc Dữ Liệu (Read — dùng bằng Player Endpoints)](#9-đọc-dữ-liệu-read)
10. [Luồng UI Hoàn Chỉnh](#10-luồng-ui-hoàn-chỉnh)
11. [Error Handling](#11-error-handling)
12. [Ví Dụ API Client (TypeScript/React)](#12-ví-dụ-api-client-typescriptreact)

---

## 1. Tổng Quan Kiến Trúc UI

Trang Admin Shop gồm 2 cấp chính:

```
/admin/games/:gameId/shops
    └── Shop List (danh sách shops)
            └── /admin/games/:gameId/shops/new          ← Tạo shop mới
            └── /admin/games/:gameId/shops/:shopId      ← Chi tiết shop + quản lý items
                    └── Add Item modal/form
                    └── Edit Item modal/form
                    └── Delete Item confirmation
```

**Prerequisite trước khi dùng Shop Admin:**
- Đã đăng nhập → có `access_token`
- Đã có `game_id` (đăng ký game trước)
- Đã có `item_definition_id` (tạo Item Definition trước, từ Inventory module)

---

## 2. Authentication & Permissions

### Header bắt buộc cho mọi request
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Permissions cần có
| Action | Permission |
|--------|-----------|
| Tạo shop | `shop:create` |
| Thêm item | `shop:create` |
| Sửa item | `shop:update` |
| Xoá item | `shop:delete` |

> Người dùng phải là **Studio Owner** hoặc **Admin** của studio sở hữu game đó.  
> Nếu thiếu quyền, server trả về **HTTP 403 Forbidden**.

---

## 3. Data Models (TypeScript)

```typescript
// Dùng để type-safe khi gọi API và render UI

export type ShopType = 'permanent' | 'daily' | 'weekly' | 'seasonal' | 'event';

export type PurchaseLimitType = 'unlimited' | 'player' | 'global';

export type RestockSchedule = 'none' | 'daily' | 'weekly' | 'monthly';

export interface ShopDefinition {
  id: string;                         // UUID
  studio_id: string;
  game_id: string;
  shop_key: string;                   // slug nội bộ, ví dụ "main_shop"
  name: string;
  description: string;
  shop_type: ShopType;
  is_active: boolean;
  starts_at: string | null;           // ISO-8601 hoặc null
  ends_at: string | null;             // ISO-8601 hoặc null
  currency_item_def_id?: string;      // UUID — null = dùng coin wallet mặc định
  created_at: string;
  updated_at: string;
  items?: ShopItem[];                 // Chỉ có khi gọi Get Shop Detail
}

export interface ShopItem {
  id: string;                         // UUID
  shop_id: string;
  item_def_id: string;                // UUID — liên kết đến Item Definition
  display_name: string;
  description: string;
  price: number;                      // Số coin (hoặc đơn vị theo currency_item_def_id)
  currency_item_def_id?: string;      // Override currency riêng cho item này
  purchase_limit_type: PurchaseLimitType;
  purchase_limit: number;             // 0 = không giới hạn (khi type = unlimited)
  restock_schedule: RestockSchedule;
  stock: number;                      // 0 = unlimited stock
  sort_order: number;
  is_active: boolean;
  available_from?: string | null;     // ISO-8601
  available_until?: string | null;    // ISO-8601
  created_at: string;
  updated_at: string;
  purchased_count?: number;           // Chỉ có trong personalised view (Player endpoint)
}

// Request payloads
export interface CreateShopPayload {
  shop_key: string;
  name: string;
  description?: string;
  shop_type: ShopType;
  is_active: boolean;
  starts_at?: string;                 // ISO-8601, bắt buộc khi shop_type = 'event'
  ends_at?: string;                   // ISO-8601, bắt buộc khi shop_type = 'event'
  currency_item_def_id?: string;      // UUID — để trống = dùng coin wallet
}

export interface AddShopItemPayload {
  item_def_id: string;                // UUID — bắt buộc
  display_name: string;
  description?: string;
  price: number;                      // > 0
  currency_item_def_id?: string;      // Override currency; để trống = kế thừa shop
  purchase_limit_type: PurchaseLimitType;
  purchase_limit: number;             // 0 khi type = 'unlimited'
  restock_schedule: RestockSchedule;
  stock: number;                      // 0 = không giới hạn kho
  sort_order?: number;
  is_active: boolean;
  available_from?: string;
  available_until?: string;
}

export interface UpdateShopItemPayload {
  display_name?: string;
  description?: string;
  price?: number;
  currency_item_def_id?: string;      // "" = xoá override (kế thừa shop); UUID = đặt override mới
  purchase_limit_type?: PurchaseLimitType;
  purchase_limit?: number;
  restock_schedule?: RestockSchedule;
  stock?: number;
  sort_order?: number;
  is_active?: boolean;
  available_from?: string;
  available_until?: string;
}
```

---

## 4. Enum Reference

### `shop_type` — Loại Shop

| Giá trị | Mô tả | Cần `starts_at` / `ends_at`? |
|---------|-------|-------------------------------|
| `permanent` | Cửa hàng thường trực, không có thời hạn | Không |
| `daily` | Làm mới hàng ngày | Không bắt buộc |
| `weekly` | Làm mới hàng tuần | Không bắt buộc |
| `seasonal` | Theo mùa (Spring, Summer, …) | Nên có |
| `event` | Sự kiện giới hạn thời gian | **Bắt buộc** |

> **Gợi ý UI:** Khi user chọn `event`, tự động hiện date-range picker cho `starts_at` / `ends_at`.

---

### `purchase_limit_type` — Loại Giới Hạn Mua

| Giá trị | Mô tả |
|---------|-------|
| `unlimited` | Không giới hạn số lần mua |
| `player` | Mỗi player bị giới hạn riêng (ví dụ: tối đa 3 lần/ngày/người) |
| `global` | Tổng số lần mua của **tất cả** player cộng lại bị giới hạn (ví dụ: chỉ 50 unit/tuần toàn server) |

> **Gợi ý UI:** Khi chọn `unlimited`, ẩn trường `purchase_limit` và `restock_schedule`. Khi chọn `player` hoặc `global`, hiện cả hai.

---

### `restock_schedule` — Lịch Reset Đếm Mua

| Giá trị | Reset khi nào |
|---------|---------------|
| `none` | Không bao giờ reset (lifetime cap) |
| `daily` | Reset lúc 00:00 UTC mỗi ngày |
| `weekly` | Reset lúc 00:00 UTC thứ Hai mỗi tuần |
| `monthly` | Reset lúc 00:00 UTC ngày 1 mỗi tháng |

> Chỉ có ý nghĩa khi `purchase_limit_type` là `player` hoặc `global`.

---

### `stock` — Kho Hàng

| Giá trị | Ý nghĩa |
|---------|---------|
| `0` | Unlimited stock (không giới hạn kho) |
| `> 0` | Tổng số unit có thể bán cho TẤT CẢ player cộng lại |

---

## 5. Endpoint 1 — Tạo Shop

### `POST /api/v1/games/{game_id}/shops`

**Permission:** `shop:create`

#### Request

```http
POST /api/v1/games/{{game_id}}/shops
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body — Shop thường trực (permanent):**
```json
{
  "shop_key": "main_shop",
  "name": "Main Shop",
  "description": "Cửa hàng chính của game.",
  "shop_type": "permanent",
  "is_active": true
}
```

**Body — Shop sự kiện có khung thời gian:**
```json
{
  "shop_key": "spring_event_2026",
  "name": "Spring Event Shop",
  "description": "Cửa hàng sự kiện mùa xuân. Chỉ mở 7 ngày!",
  "shop_type": "event",
  "is_active": true,
  "starts_at": "2026-03-01T00:00:00Z",
  "ends_at": "2026-03-08T00:00:00Z"
}
```

**Body — Shop dùng Item-based currency (ví dụ: Gem):**
```json
{
  "shop_key": "gem_shop",
  "name": "Gem Shop",
  "description": "Mua bằng Gem.",
  "shop_type": "permanent",
  "is_active": true,
  "currency_item_def_id": "<item_definition_id_của_gem>"
}
```

#### Response thành công

**HTTP 201 Created**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "studio_id": "studio-uuid",
  "game_id": "game-uuid",
  "shop_key": "main_shop",
  "name": "Main Shop",
  "description": "Cửa hàng chính của game.",
  "shop_type": "permanent",
  "is_active": true,
  "starts_at": null,
  "ends_at": null,
  "currency_item_def_id": null,
  "created_at": "2026-03-02T00:00:00Z",
  "updated_at": "2026-03-02T00:00:00Z"
}
```

> **Lưu `id` trả về làm `shop_id`** để dùng cho các bước tiếp theo.

#### Validation phía UI trước khi submit

| Field | Rule |
|-------|------|
| `shop_key` | Không rỗng; chỉ chứa `a-z`, `0-9`, `_` (slug) |
| `name` | Không rỗng, tối đa 100 ký tự |
| `shop_type` | Phải chọn một trong 5 giá trị |
| `starts_at` / `ends_at` | Bắt buộc khi `shop_type = event`; `ends_at` > `starts_at` |
| `currency_item_def_id` | Nếu điền phải là UUID hợp lệ |

---

## 6. Endpoint 2 — Thêm Item vào Shop

### `POST /api/v1/games/{game_id}/shops/{shop_id}/items`

**Permission:** `shop:create`

#### Request

```http
POST /api/v1/games/{{game_id}}/shops/{{shop_id}}/items
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Trường hợp 1 — Unlimited (không giới hạn mua):**
```json
{
  "item_def_id": "{{item_definition_id}}",
  "display_name": "Magic Sword",
  "description": "Thanh kiếm phép thuật mạnh mẽ.",
  "price": 200,
  "purchase_limit_type": "unlimited",
  "purchase_limit": 0,
  "restock_schedule": "none",
  "stock": 0,
  "sort_order": 1,
  "is_active": true
}
```

**Trường hợp 2 — Per-player giới hạn 3 lần/ngày:**
```json
{
  "item_def_id": "{{item_definition_id}}",
  "display_name": "Daily Potion",
  "description": "Mỗi player chỉ mua được 3 lần mỗi ngày.",
  "price": 50,
  "purchase_limit_type": "player",
  "purchase_limit": 3,
  "restock_schedule": "daily",
  "stock": 0,
  "sort_order": 2,
  "is_active": true
}
```

**Trường hợp 3 — Rare item, mỗi player chỉ mua 1 lần duy nhất:**
```json
{
  "item_def_id": "{{item_definition_id}}",
  "display_name": "Legendary Blade",
  "description": "Mỗi player chỉ mua được duy nhất 1 lần.",
  "price": 9999,
  "purchase_limit_type": "player",
  "purchase_limit": 1,
  "restock_schedule": "none",
  "stock": 100,
  "sort_order": 3,
  "is_active": true
}
```

**Trường hợp 4 — Global limit 50 unit/tuần (toàn server):**
```json
{
  "item_def_id": "{{item_definition_id}}",
  "display_name": "Limited Edition Badge",
  "description": "Chỉ 50 unit/tuần cho tất cả người chơi.",
  "price": 500,
  "purchase_limit_type": "global",
  "purchase_limit": 50,
  "restock_schedule": "weekly",
  "stock": 0,
  "sort_order": 4,
  "is_active": true
}
```

**Trường hợp 5 — Override currency riêng cho item:**
```json
{
  "item_def_id": "{{item_definition_id}}",
  "display_name": "Special Armor",
  "description": "Mua bằng Ruby (khác với currency mặc định của shop).",
  "price": 10,
  "currency_item_def_id": "<item_definition_id_của_ruby>",
  "purchase_limit_type": "unlimited",
  "purchase_limit": 0,
  "restock_schedule": "none",
  "stock": 0,
  "sort_order": 5,
  "is_active": true
}
```

**Trường hợp 6 — Item có thời gian bán (available_from / available_until):**
```json
{
  "item_def_id": "{{item_definition_id}}",
  "display_name": "New Year Bundle",
  "description": "Chỉ bán từ 01/01 đến 07/01.",
  "price": 888,
  "purchase_limit_type": "unlimited",
  "purchase_limit": 0,
  "restock_schedule": "none",
  "stock": 0,
  "sort_order": 6,
  "is_active": true,
  "available_from": "2026-01-01T00:00:00Z",
  "available_until": "2026-01-07T23:59:59Z"
}
```

#### Response thành công

**HTTP 201 Created**
```json
{
  "id": "item-uuid",
  "shop_id": "shop-uuid",
  "item_def_id": "itemdef-uuid",
  "display_name": "Magic Sword",
  "description": "Thanh kiếm phép thuật mạnh mẽ.",
  "price": 200,
  "currency_item_def_id": null,
  "purchase_limit_type": "unlimited",
  "purchase_limit": 0,
  "restock_schedule": "none",
  "stock": 0,
  "sort_order": 1,
  "is_active": true,
  "available_from": null,
  "available_until": null,
  "created_at": "2026-03-02T00:00:00Z",
  "updated_at": "2026-03-02T00:00:00Z"
}
```

> **Lưu `id` trả về làm `shop_item_id`** để dùng cho Update / Delete.

#### Validation phía UI

| Field | Rule |
|-------|------|
| `item_def_id` | Bắt buộc, phải là UUID hợp lệ (chọn từ Item Definition list) |
| `display_name` | Không rỗng |
| `price` | Số nguyên dương (`> 0`) |
| `purchase_limit_type` | Chọn một trong 3 giá trị |
| `purchase_limit` | `>= 0`; nên là `0` khi type = `unlimited` |
| `restock_schedule` | Chọn một trong 4 giá trị; ẩn/disable khi type = `unlimited` |
| `stock` | `>= 0`; `0` = không giới hạn kho |
| `available_until` | Nếu có `available_from`, phải `> available_from` |

---

## 7. Endpoint 3 — Cập Nhật Item

### `PATCH /api/v1/games/{game_id}/shops/{shop_id}/items/{item_id}`

**Permission:** `shop:update`  
**Semantics:** PATCH — chỉ gửi các field cần thay đổi, field không gửi giữ nguyên.

#### Request

```http
PATCH /api/v1/games/{{game_id}}/shops/{{shop_id}}/items/{{item_id}}
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Ví dụ — Đổi giá và tên (flash sale):**
```json
{
  "price": 180,
  "display_name": "Magic Sword (Sale)"
}
```

**Ví dụ — Tắt item (ẩn khỏi shop):**
```json
{
  "is_active": false
}
```

**Ví dụ — Thay đổi giới hạn mua:**
```json
{
  "purchase_limit_type": "player",
  "purchase_limit": 5,
  "restock_schedule": "weekly"
}
```

**Ví dụ — Đặt thời gian bán:**
```json
{
  "available_from": "2026-04-01T00:00:00Z",
  "available_until": "2026-04-07T23:59:59Z"
}
```

**Ví dụ — Xoá override currency (trả về kế thừa shop):**
```json
{
  "currency_item_def_id": ""
}
```

**Ví dụ — Đặt override currency mới cho item:**
```json
{
  "currency_item_def_id": "<new_item_definition_uuid>"
}
```

#### Response thành công

**HTTP 200 OK** — trả về toàn bộ đối tượng `ShopItem` đã được cập nhật (cùng schema với Add Item).

```json
{
  "id": "item-uuid",
  "shop_id": "shop-uuid",
  "item_def_id": "itemdef-uuid",
  "display_name": "Magic Sword (Sale)",
  "description": "Thanh kiếm phép thuật mạnh mẽ.",
  "price": 180,
  "purchase_limit_type": "unlimited",
  "purchase_limit": 0,
  "restock_schedule": "none",
  "stock": 0,
  "sort_order": 1,
  "is_active": true,
  "created_at": "2026-03-02T00:00:00Z",
  "updated_at": "2026-03-02T10:00:00Z"
}
```

#### Lưu ý về `currency_item_def_id` trong PATCH

| Gửi trong body | Hành vi server |
|----------------|----------------|
| Không gửi field này | Giữ nguyên giá trị hiện tại |
| `"currency_item_def_id": "<uuid>"` | Đặt override mới cho item |
| `"currency_item_def_id": ""` | **Xoá override** — item kế thừa currency của shop |

---

## 8. Endpoint 4 — Xoá Item

### `DELETE /api/v1/games/{game_id}/shops/{shop_id}/items/{item_id}`

**Permission:** `shop:delete`  
**Behaviour:** Soft-delete — item bị ẩn ngay lập tức khỏi player nhưng **dữ liệu không bị xoá** trong DB. Lịch sử mua hàng được giữ nguyên.

#### Request

```http
DELETE /api/v1/games/{{game_id}}/shops/{{shop_id}}/items/{{item_id}}
Authorization: Bearer <access_token>
```

> Không cần body.

#### Response thành công

**HTTP 200 OK**
```json
{
  "message": "shop item deleted"
}
```

#### Gợi ý UI

- Hiện dialog confirmation trước khi xoá: `"Bạn có chắc muốn xoá item này? Hành động này không thể hoàn tác trên UI."`
- Sau khi nhận 200, remove item đó ra khỏi danh sách (local state update) — không cần gọi lại GET.

---

## 9. Đọc Dữ Liệu (Read)

Admin UI cần đọc data để hiển thị danh sách. Dùng lại **2 Player Endpoints** (không cần quyền đặc biệt):

### Lấy danh sách shops

```http
GET /api/v1/games/{game_id}/shops?active_only=false&limit=50&offset=0
Authorization: Bearer <access_token>
```

> Truyền `active_only=false` để hiện **cả shop đang tắt** (admin view).

**Response:**
```json
{
  "shops": [ /* mảng ShopDefinition */ ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

### Lấy chi tiết shop kèm items

```http
GET /api/v1/games/{game_id}/shops/{shop_id}
Authorization: Bearer <access_token>
```

**Response** — `ShopDefinition` với `items[]` được nhúng bên trong:
```json
{
  "id": "shop-uuid",
  "name": "Main Shop",
  "shop_type": "permanent",
  "is_active": true,
  "items": [
    {
      "id": "item-uuid",
      "display_name": "Magic Sword",
      "price": 200,
      "purchase_limit_type": "unlimited",
      "stock": 0,
      "is_active": true
    }
  ]
}
```

---

## 10. Luồng UI Hoàn Chỉnh

### Trang: Danh Sách Shops (`/admin/games/:gameId/shops`)

```
┌─────────────────────────────────────────────────────────┐
│  Shops — Game: "My RPG"              [+ Tạo Shop Mới]   │
├─────────────────────────────────────────────────────────┤
│  Tên              Loại        Trạng thái   Thời gian     │
│  Main Shop        permanent   ● Active     —             │
│  Spring Event     event       ● Active     01/03–08/03   │
│  Gem Shop         permanent   ○ Inactive   —             │
└─────────────────────────────────────────────────────────┘
```

- Click vào shop → chuyển sang trang chi tiết shop.

---

### Trang: Chi Tiết Shop (`/admin/games/:gameId/shops/:shopId`)

```
┌──────────────────────────────────────────────────────────────────┐
│  Main Shop  [permanent]  ● Active                                │
│  "Cửa hàng chính của game."                                      │
├──────────────────────────────────────────────────────────────────┤
│  Items                                              [+ Add Item] │
├──────────────────────────────────────────────────────────────────┤
│  Tên            Giá   Loại giới hạn   Stock   Trạng thái   Action│
│  Magic Sword    200   unlimited        ∞       ● Active    ✏ 🗑  │
│  Daily Potion   50    player/3 daily   ∞       ● Active    ✏ 🗑  │
│  Legend Blade   9999  player/1 ever    100     ● Active    ✏ 🗑  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Form: Tạo Shop Mới

```
Shop Key *          [___________________]  (slug: a-z, 0-9, _)
Tên *               [___________________]
Mô tả               [___________________]
Loại *              [▼ permanent        ]  (dropdown)
Trạng thái          [☑ Bật ngay]

── Chỉ hiện khi shop_type = event hoặc seasonal ──
Bắt đầu            [date-time picker]
Kết thúc           [date-time picker]

── Tuỳ chọn nâng cao ──
Currency (Item Def) [___________________]  (UUID — để trống = dùng coin)

                              [Huỷ]  [Tạo Shop →]
```

---

### Form/Modal: Thêm / Sửa Item

```
Item Definition *   [🔍 Chọn từ danh sách Item Definitions]
Tên hiển thị *      [___________________]
Mô tả               [___________________]
Giá *               [_______]  Coins (hoặc theo currency của shop)
Currency override   [___________________]  (để trống = kế thừa shop)

Giới hạn mua *      [▼ unlimited        ]
                        ↓ (hiện thêm khi chọn player / global)
                    Tối đa: [___] lần
                    Reset:  [▼ none / daily / weekly / monthly]

Kho hàng            [___]  (0 = không giới hạn)
Thứ tự hiển thị     [___]
Trạng thái          [☑ Bật ngay]

── Tuỳ chọn ──
Bán từ             [date-time picker]
Đến                [date-time picker]

                              [Huỷ]  [Lưu]
```

---

## 11. Error Handling

| HTTP Status | Nguyên nhân | Hiển thị với user |
|-------------|-------------|-------------------|
| `400 Bad Request` | Body không hợp lệ, UUID sai | "Dữ liệu không hợp lệ: \<message\>" |
| `401 Unauthorized` | Thiếu hoặc token hết hạn | Redirect về trang login |
| `403 Forbidden` | Thiếu permission `shop:create/update/delete` | "Bạn không có quyền thực hiện thao tác này." |
| `404 Not Found` | `shop_id` hoặc `item_id` không tồn tại | "Không tìm thấy shop / item." |
| `500 Internal Server Error` | Lỗi server | "Đã xảy ra lỗi. Vui lòng thử lại." (log chi tiết ra console) |

**Cấu trúc lỗi từ server:**
```json
{
  "error": "failed to create shop",
  "details": "shop_key already exists"
}
```

---

## 12. Ví Dụ API Client (TypeScript/React)

### Hàm gọi API cơ bản

```typescript
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token: string,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}
```

---

### Shop API module

```typescript
// src/api/shopAdmin.ts

export const ShopAdminApi = {

  // ── Create Shop ─────────────────────────────────────────────────────────
  createShop: (gameId: string, payload: CreateShopPayload, token: string) =>
    apiFetch<ShopDefinition>(
      `/api/v1/games/${gameId}/shops`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    ),

  // ── List Shops (dùng để render danh sách cho admin) ─────────────────────
  listShops: (
    gameId: string,
    token: string,
    params: { activeOnly?: boolean; limit?: number; offset?: number } = {},
  ) => {
    const qs = new URLSearchParams({
      active_only: String(params.activeOnly ?? false), // false = hiện cả inactive
      limit: String(params.limit ?? 50),
      offset: String(params.offset ?? 0),
    });
    return apiFetch<{ shops: ShopDefinition[]; total: number; limit: number; offset: number }>(
      `/api/v1/games/${gameId}/shops?${qs}`,
      {},
      token,
    );
  },

  // ── Get Shop Detail (kèm items) ─────────────────────────────────────────
  getShop: (gameId: string, shopId: string, token: string) =>
    apiFetch<ShopDefinition>(
      `/api/v1/games/${gameId}/shops/${shopId}`,
      {},
      token,
    ),

  // ── Add Shop Item ────────────────────────────────────────────────────────
  addShopItem: (
    gameId: string,
    shopId: string,
    payload: AddShopItemPayload,
    token: string,
  ) =>
    apiFetch<ShopItem>(
      `/api/v1/games/${gameId}/shops/${shopId}/items`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    ),

  // ── Update Shop Item ─────────────────────────────────────────────────────
  updateShopItem: (
    gameId: string,
    shopId: string,
    itemId: string,
    payload: UpdateShopItemPayload,
    token: string,
  ) =>
    apiFetch<ShopItem>(
      `/api/v1/games/${gameId}/shops/${shopId}/items/${itemId}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
      token,
    ),

  // ── Delete Shop Item ─────────────────────────────────────────────────────
  deleteShopItem: (
    gameId: string,
    shopId: string,
    itemId: string,
    token: string,
  ) =>
    apiFetch<{ message: string }>(
      `/api/v1/games/${gameId}/shops/${shopId}/items/${itemId}`,
      { method: 'DELETE' },
      token,
    ),
};
```

---

### Ví dụ sử dụng trong React component

```typescript
// Tạo shop
const newShop = await ShopAdminApi.createShop(gameId, {
  shop_key: 'main_shop',
  name: 'Main Shop',
  shop_type: 'permanent',
  is_active: true,
}, accessToken);

// Thêm item vào shop
const newItem = await ShopAdminApi.addShopItem(gameId, newShop.id, {
  item_def_id: selectedItemDefId,
  display_name: 'Magic Sword',
  price: 200,
  purchase_limit_type: 'unlimited',
  purchase_limit: 0,
  restock_schedule: 'none',
  stock: 0,
  sort_order: 1,
  is_active: true,
}, accessToken);

// Flash sale — giảm giá item
await ShopAdminApi.updateShopItem(gameId, newShop.id, newItem.id, {
  price: 150,
  display_name: 'Magic Sword (Sale)',
}, accessToken);

// Xoá item
await ShopAdminApi.deleteShopItem(gameId, newShop.id, newItem.id, accessToken);
```

---

## Tóm Tắt Endpoint

| Method | URL | Action | Permission |
|--------|-----|--------|-----------|
| `GET` | `/api/v1/games/:gameId/shops` | Lấy danh sách shops | — |
| `GET` | `/api/v1/games/:gameId/shops/:shopId` | Lấy chi tiết shop + items | — |
| `POST` | `/api/v1/games/:gameId/shops` | **Tạo shop mới** | `shop:create` |
| `POST` | `/api/v1/games/:gameId/shops/:shopId/items` | **Thêm item vào shop** | `shop:create` |
| `PATCH` | `/api/v1/games/:gameId/shops/:shopId/items/:itemId` | **Cập nhật item** | `shop:update` |
| `DELETE` | `/api/v1/games/:gameId/shops/:shopId/items/:itemId` | **Xoá item** | `shop:delete` |

---

✅ **Compliance** — Tài liệu này không tạo test file và không thuộc scope test. Không có Ticket ID mới được tạo. Nội dung phản ánh đúng implementation trong P2-T37/T38/T39.
