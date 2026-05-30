# LLM Token Stats Monitor — Front-end Guide

Trang dành cho **Super Admin** để tra cứu mức tiêu thụ LLM token theo studio / game / user.

---

## 1. Các API cần dùng

### 1.1 Lấy danh sách period hợp lệ

```
GET /api/v1/llm/token-stats/periods
Authorization: Bearer <super-admin-jwt>
```

**Response**
```json
{
  "periods": ["hourly", "daily", "weekly", "monthly"]
}
```

Dùng để populate dropdown chọn period. Gọi một lần khi load trang, cache ở bộ nhớ.

---

### 1.2 Truy vấn token stats (Super Admin)

```
GET /api/v1/admin/llm/token-stats
Authorization: Bearer <super-admin-jwt>
```

**Query params**

| Param | Bắt buộc | Mô tả |
|-------|----------|-------|
| `period` | ✅ | `hourly` / `daily` / `weekly` / `monthly` |
| `studio_id` | ⚠️ chỉ 1 trong 3 | UUID của studio |
| `game_id` | ⚠️ chỉ 1 trong 3 | UUID của game |
| `user_id` | ⚠️ chỉ 1 trong 3 | UUID của user |

> **Quy tắc:** `period` luôn bắt buộc. Phải truyền **đúng 1** trong 3 filter (`studio_id`, `game_id`, `user_id`). Không được truyền 2 hay 3 cùng lúc.

**Ví dụ request**

```
GET /api/v1/admin/llm/token-stats?period=daily&game_id=0196a3b2-1c2d-7e4f-a891-b23456789abc
```

**Response**
```json
{
  "period": "daily",
  "buckets": [
    {
      "label": "2026-05-30T00:00:00Z",
      "input_tokens": 5200,
      "output_tokens": 14300,
      "total_tokens": 19500
    },
    {
      "label": "2026-05-29T00:00:00Z",
      "input_tokens": 3100,
      "output_tokens": 8700,
      "total_tokens": 11800
    }
  ],
  "total_input_tokens": 8300,
  "total_output_tokens": 23000,
  "total_tokens": 31300
}
```

**Các lỗi có thể trả về**

| HTTP | `code` | Nguyên nhân |
|------|--------|-------------|
| 400 | `missing_period` | `period` bị thiếu hoặc không hợp lệ |
| 400 | `missing_filter` | Không truyền bất kỳ filter nào |
| 400 | `ambiguous_filter` | Truyền hơn 1 filter cùng lúc |
| 400 | `invalid_studio_id` | UUID không hợp lệ |
| 400 | `invalid_game_id` | UUID không hợp lệ |
| 400 | `invalid_user_id` | UUID không hợp lệ |
| 403 | — | Caller không phải super admin |

---

## 2. Cấu trúc trang gợi ý

```
┌─────────────────────────────────────────────────────┐
│  LLM Token Stats Monitor                            │
├──────────────┬──────────────┬───────────────────────┤
│ Filter mode  │ Period       │ ID                    │
│ ○ Studio     │ [daily   ▼]  │ [UUID input       ]   │
│ ● Game       │              │                       │
│ ○ User       │              │       [Search]        │
└──────────────┴──────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Tổng hợp                                           │
│  Input tokens: 8,300   Output tokens: 23,000        │
│  Total tokens: 31,300                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Biểu đồ (bar chart theo bucket_time)               │
│  [====] 2026-05-30  19,500                          │
│  [===]  2026-05-29  11,800                          │
│  ...                                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Bảng chi tiết                                      │
│  Bucket time (UTC)  | Input | Output | Total        │
│  2026-05-30T00:00Z  | 5,200 | 14,300 | 19,500       │
│  2026-05-29T00:00Z  | 3,100 |  8,700 | 11,800       │
└─────────────────────────────────────────────────────┘
```

---

## 3. Lookback window theo period

API tự động giới hạn dữ liệu trả về dựa trên `period`:

| Period | Lookback | Số bucket tối đa |
|--------|----------|-----------------|
| `hourly` | 24 giờ gần nhất | ~24 buckets |
| `daily` | 30 ngày gần nhất | ~30 buckets |
| `weekly` | 12 tuần gần nhất | ~12 buckets |
| `monthly` | 12 tháng gần nhất | ~12 buckets |

---

## 4. Logic xây dựng query trên FE

```ts
type FilterMode = 'studio_id' | 'game_id' | 'user_id'
type Period = 'hourly' | 'daily' | 'weekly' | 'monthly'

function buildTokenStatsUrl(
  baseUrl: string,
  period: Period,
  mode: FilterMode,
  id: string
): string {
  const params = new URLSearchParams({ period, [mode]: id })
  return `${baseUrl}/api/v1/admin/llm/token-stats?${params}`
}
```

**Validation trước khi gọi API:**
- `period` khác rỗng và thuộc `['hourly','daily','weekly','monthly']`
- `id` là chuỗi UUID hợp lệ (regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`)
- Chỉ gửi đúng 1 filter param

---

## 5. Xử lý dữ liệu biểu đồ

`buckets` trả về theo thứ tự **mới nhất trước** (`ORDER BY bucket_time DESC`).  
Khi vẽ chart trục thời gian, đảo ngược mảng trước:

```ts
const chartData = response.buckets
  .slice()
  .reverse()
  .map(b => ({
    label: formatBucketLabel(b.label, response.period),
    input: b.input_tokens,
    output: b.output_tokens,
    total: b.total_tokens,
  }))

function formatBucketLabel(isoDate: string, period: Period): string {
  const d = new Date(isoDate)
  if (period === 'hourly')  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
  if (period === 'daily')   return d.toLocaleDateString('vi-VN')
  if (period === 'weekly')  return `W${getISOWeek(d)} ${d.getFullYear()}`
  if (period === 'monthly') return d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })
  return isoDate
}
```

---

## 6. Headers yêu cầu

```
Authorization: Bearer <jwt>
Content-Type: application/json   (nếu có body)
```

JWT phải là token của tài khoản **super admin**. Nếu không, server trả `403`.
