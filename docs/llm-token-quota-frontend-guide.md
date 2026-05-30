# LLM Token Quota — Front-End Integration Guide

**LLM token quota** là hệ thống quản lý lượng token AI mà mỗi game được phép sử dụng.  
Có **hai loại pool**:

| Pool | Nguồn | Ưu tiên dùng |
|------|-------|--------------|
| **Premium** | Studio mua thêm | Được dùng **trước** |
| **Free** | Platform cấp sẵn khi tạo game | Dùng **sau** khi premium hết |

Khi cả hai pool về 0, LLM API trả `402 Payment Required`.

---

## Tổng quan API (Super Admin only)

| Method | Path | Mục đích |
|--------|------|----------|
| `GET` | `/api/v1/admin/games/{game_id}/llm-tokens/balance` | Xem số dư token của game |
| `POST` | `/api/v1/admin/games/{game_id}/llm-tokens/topup` | Cộng thêm token thủ công |

Tất cả đều yêu cầu:
```
Authorization: Bearer <super_admin_jwt>
```

---

## 1. Xem số dư token

### `GET /api/v1/admin/games/{game_id}/llm-tokens/balance`

#### Response 200

```jsonc
{
  "game_id": "019768ab-0000-7000-8000-000000000001",

  // Free pool — platform cấp
  "free_tokens_total":     1000000,   // tổng đã được cấp/cộng từ trước đến nay
  "free_tokens_used":       120000,   // đã tiêu thụ thực tế
  "free_tokens_reserved":    10000,   // đang bị giữ bởi request đang xử lý
  "free_tokens_remaining":   870000,  // = total - used - reserved (có thể dùng ngay)

  // Premium pool — mua thêm
  "premium_tokens_total":   500000,
  "premium_tokens_used":     80000,
  "premium_tokens_reserved":  5000,
  "premium_tokens_remaining": 415000
}
```

#### Response khi game không tồn tại hoặc chưa được seed quota

```jsonc
// 404 Not Found
{
  "error": "quota not found",
  "detail": "no quota row found for this game — ensure the game exists and its quotas have been seeded"
}
```

---

## 2. Cộng token thủ công (Top-up)

### `POST /api/v1/admin/games/{game_id}/llm-tokens/topup`

#### Request body

```jsonc
{
  "free_tokens":    500000,  // số token free muốn cộng thêm (≥ 1, bỏ qua nếu không cần)
  "premium_tokens": 100000  // số token premium muốn cộng thêm (≥ 1, bỏ qua nếu không cần)
}
```

- Ít nhất một trong hai trường phải `> 0`.
- Có thể gửi cả hai cùng lúc.
- Đây là **cộng thêm** (delta), không phải ghi đè.

#### Request body — chỉ cộng free

```jsonc
{ "free_tokens": 1000000 }
```

#### Request body — chỉ cộng premium

```jsonc
{ "premium_tokens": 250000 }
```

#### Response 200 — cả hai được cộng

```jsonc
{
  "game_id": "019768ab-0000-7000-8000-000000000001",
  "free_tokens_total":    1500000,   // chỉ có khi free_tokens > 0 trong request
  "premium_tokens_total":  600000    // chỉ có khi premium_tokens > 0 trong request
}
```

> **Lưu ý**: Response chỉ trả về trường tương ứng với pool được top-up.  
> Để lấy toàn bộ số dư sau khi top-up, gọi thêm API `/balance`.

#### Response 400 — không có trường nào hợp lệ

```jsonc
{
  "error": "invalid request",
  "detail": "free_tokens or premium_tokens must be greater than 0"
}
```

#### Response 403 — không phải super admin

```jsonc
{
  "error": "forbidden",
  "detail": "super admin access required"
}
```

---

## 3. Hướng dẫn triển khai UI

### 3.1 Trang quản lý quota cho một game

Gợi ý bố cục:

```
┌─────────────────────────────────────────────────────┐
│  Game: "My Awesome Game"  [game_id: 019768ab-...]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🆓 Free Tokens                                     │
│  ████████████░░░░░░░  87%  870,000 / 1,000,000     │
│  Used: 120,000  ·  Reserved: 10,000                 │
│                                          [Top-up ↑] │
│                                                     │
│  💎 Premium Tokens                                  │
│  ████████░░░░░░░░░░░  83%  415,000 / 500,000       │
│  Used: 80,000  ·  Reserved: 5,000                   │
│                                          [Top-up ↑] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3.2 Progress bar — màu sắc gợi ý

| Remaining % | Màu thanh |
|-------------|-----------|
| ≥ 50% | Xanh lá (`#22c55e`) |
| 20% – 49% | Vàng cam (`#f59e0b`) |
| < 20% | Đỏ (`#ef4444`) |
| 0 | Xám + icon ⚠️ |

```ts
function getBarColor(remaining: number, total: number): string {
  if (total === 0) return '#6b7280'
  const pct = remaining / total
  if (pct >= 0.5) return '#22c55e'
  if (pct >= 0.2) return '#f59e0b'
  return '#ef4444'
}
```

### 3.3 Hiển thị số token — format có dấu phân cách

```ts
function formatTokens(n: number): string {
  return n.toLocaleString('en-US')  // "1,000,000"
}
```

### 3.4 Modal Top-up

Gợi ý form:

```
┌──────────────────────────────────┐
│  Top-up Free Tokens              │
│                                  │
│  Amount to add                   │
│  [        500000        ] tokens │
│                                  │
│  Current total: 1,000,000        │
│  After top-up:  1,500,000        │
│                                  │
│          [Cancel]  [Confirm ✓]   │
└──────────────────────────────────┘
```

- Validate: chỉ nhận số nguyên dương trước khi gọi API.
- Preview "After top-up" = `current_total + input_amount` (tính client-side để UX nhanh).
- Sau khi gọi thành công, reload lại `/balance` để cập nhật UI.

### 3.5 Luồng gọi API hoàn chỉnh (TypeScript)

```ts
const BASE = '/api/v1/admin'

interface LLMBalance {
  game_id: string
  free_tokens_total: number
  free_tokens_used: number
  free_tokens_reserved: number
  free_tokens_remaining: number
  premium_tokens_total: number
  premium_tokens_used: number
  premium_tokens_reserved: number
  premium_tokens_remaining: number
}

interface TopUpRequest {
  free_tokens?: number
  premium_tokens?: number
}

interface TopUpResponse {
  game_id: string
  free_tokens_total?: number
  premium_tokens_total?: number
}

async function getLLMBalance(gameId: string, jwt: string): Promise<LLMBalance> {
  const res = await fetch(`${BASE}/games/${gameId}/llm-tokens/balance`, {
    headers: { Authorization: `Bearer ${jwt}` },
  })
  if (!res.ok) throw await res.json()
  return res.json()
}

async function topUpTokens(
  gameId: string,
  jwt: string,
  body: TopUpRequest,
): Promise<TopUpResponse> {
  if (!body.free_tokens && !body.premium_tokens) {
    throw new Error('At least one token amount must be > 0')
  }
  const res = await fetch(`${BASE}/games/${gameId}/llm-tokens/topup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await res.json()
  return res.json()
}
```

---

## 4. Xử lý lỗi

| HTTP Status | Nguyên nhân | Hiển thị cho user |
|-------------|-------------|-------------------|
| `400` | Body thiếu hoặc sai định dạng | "Vui lòng nhập số lượng token hợp lệ." |
| `403` | Không phải super admin | "Bạn không có quyền thực hiện thao tác này." |
| `404` | Game chưa có quota row (hiếm gặp) | "Game chưa được khởi tạo quota. Liên hệ engineering." |
| `500` | Lỗi server | "Đã xảy ra lỗi, vui lòng thử lại sau." |

```ts
function handleApiError(err: { error: string; detail: string }, status: number): string {
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (status === 404) return 'Game chưa được khởi tạo quota. Liên hệ engineering.'
  if (status === 400) return 'Vui lòng nhập số lượng token hợp lệ.'
  return 'Đã xảy ra lỗi, vui lòng thử lại sau.'
}
```

---

## 5. Polling / Refresh

- Quota thay đổi khi có LLM call đang xử lý (`reserved` tăng) hoặc sau khi xử lý xong (`used` tăng, `reserved` giảm).
- **Không cần real-time**. Poll mỗi 30–60 giây là đủ cho màn hình admin.
- Sau mỗi lần top-up thành công, gọi lại `/balance` ngay lập tức (không cần chờ poll).

```ts
// React example
useEffect(() => {
  const load = () => getLLMBalance(gameId, jwt).then(setBalance)
  load()
  const timer = setInterval(load, 30_000)
  return () => clearInterval(timer)
}, [gameId])
```

---

## 6. Lưu ý quan trọng

- **`remaining` = `total − used − reserved`** — đây là con số quan trọng nhất, hiển thị nổi bật.
- `reserved` là token đang bị "giữ" bởi các LLM request đang in-flight. Nếu request thành công, chúng chuyển sang `used`. Nếu lỗi, `reserved` giảm về.
- `total` chỉ tăng, không bao giờ giảm. Top-up là cộng vào `total`.
- Premium được **ưu tiên dùng trước** free ở phía server — UI nên phản ánh điều này (ví dụ: hiển thị "Premium (priority)" trong label).
- Cả hai API đều yêu cầu **super admin JWT** — đừng expose cho studio owner hoặc player.
