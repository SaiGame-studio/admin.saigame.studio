# Player Event Daily Stats API

> Ticket: P2-T72  
> Worker chạy nền aggregate data mỗi ~1 phút. Chỉ game có plugin tier **rare / epic / legendary** mới có data.

---

## Endpoint

```
GET /api/v1/games/{game_id}/event-stats
```

**Auth:** Bearer token (studio member). Game phải thuộc studio của token.

---

## Path Parameters

| Param | Bắt buộc | Mô tả |
|---|---|---|
| `game_id` | Có | UUID của game |

---

## Query Parameters

| Param | Bắt buộc | Định dạng | Mô tả |
|---|---|---|---|
| `from` | Không | `YYYY-MM-DD` | Ngày bắt đầu, **inclusive** (UTC). Bỏ trống = không giới hạn |
| `to` | Không | `YYYY-MM-DD` | Ngày kết thúc, **inclusive** (UTC). Bỏ trống = không giới hạn |
| `event_type` | Không | `string` | Lọc theo 1 event type cụ thể. Bỏ trống = trả tất cả |

> `to` phải ≥ `from`, nếu không sẽ trả về `400 Bad Request`.

---

## Response

### 200 OK

```json
{
  "game_id": "3f2d1a00-0000-0000-0000-000000000000",
  "from": "2026-03-01",
  "to": "2026-03-13",
  "event_type": "login",
  "stats": [
    {
      "studio_id":    "9c1b2a00-0000-0000-0000-000000000000",
      "game_id":      "3f2d1a00-0000-0000-0000-000000000000",
      "event_type":   "login",
      "stat_date":    "2026-03-13T00:00:00Z",
      "player_count": 1380,
      "event_count":  5100,
      "refreshed_at": "2026-03-13T06:00:00Z"
    },
    {
      "studio_id":    "9c1b2a00-0000-0000-0000-000000000000",
      "game_id":      "3f2d1a00-0000-0000-0000-000000000000",
      "event_type":   "login",
      "stat_date":    "2026-03-12T00:00:00Z",
      "player_count": 1210,
      "event_count":  4850,
      "refreshed_at": "2026-03-13T06:00:00Z"
    }
  ]
}
```

#### Field descriptions

| Field | Type | Mô tả |
|---|---|---|
| `game_id` | `string (UUID)` | Game ID được query |
| `from` | `string \| null` | Ngày bắt đầu đã dùng, `null` nếu không truyền |
| `to` | `string \| null` | Ngày kết thúc đã dùng, `null` nếu không truyền |
| `event_type` | `string` | Event type đã filter, `""` nếu không filter |
| `stats` | `array` | Mảng kết quả (luôn là array, **không bao giờ `null`**, có thể rỗng `[]`) |
| `stats[].stat_date` | `string (ISO 8601)` | Ngày thống kê (UTC). Phần `T00:00:00Z` bỏ qua khi hiển thị |
| `stats[].event_type` | `string` | Tên event type |
| `stats[].player_count` | `number` | Số **unique players** trigger event trong ngày (`COUNT DISTINCT user_id`) |
| `stats[].event_count` | `number` | Tổng số lần event xảy ra trong ngày (`COUNT *`) |
| `stats[].refreshed_at` | `string (ISO 8601)` | Thời điểm data được aggregate lần cuối |

> `stats` được sắp xếp theo `stat_date DESC` (ngày mới nhất trước).

---

## Error Responses

| HTTP | Khi nào |
|---|---|
| `400 Bad Request` | `from` / `to` sai format (`YYYY-MM-DD`), hoặc `to < from` |
| `401 Unauthorized` | Thiếu hoặc hết hạn Bearer token |
| `403 Forbidden` | Token không có quyền truy cập game này |
| `500 Internal Server Error` | Lỗi phía server / DB |

```json
{
  "error": "invalid 'from' date",
  "detail": "expected format YYYY-MM-DD"
}
```

---

## Ví dụ

### Lấy 30 ngày gần nhất, tất cả event types

```http
GET /api/v1/games/3f2d1a00-0000-0000-0000-000000000000/event-stats?from=2026-02-12&to=2026-03-13
Authorization: Bearer <token>
```

### Lấy chỉ event `match_end` trong tháng 3

```http
GET /api/v1/games/3f2d1a00-0000-0000-0000-000000000000/event-stats?from=2026-03-01&to=2026-03-31&event_type=match_end
Authorization: Bearer <token>
```

### Lấy toàn bộ lịch sử (không filter ngày)

```http
GET /api/v1/games/3f2d1a00-0000-0000-0000-000000000000/event-stats
Authorization: Bearer <token>
```

---

## Gợi ý render DAG / Chart

Data trả về đã được aggregate sẵn theo `(stat_date, event_type)` — mỗi item là 1 điểm dữ liệu trên trục thời gian:

```
stat_date  │ login │ match_end │ item_pickup
───────────┼───────┼───────────┼────────────
2026-03-13 │  1380 │       920 │       4100
2026-03-12 │  1210 │       870 │       3800
2026-03-11 │  1100 │       810 │       3500
```

**Cách xử lý phía frontend:**

1. Gọi API **không truyền `event_type`** để lấy tất cả event types trong 1 request.
2. Group `stats[]` theo `event_type` → tạo các series riêng biệt.
3. Dùng `stat_date` làm trục X (chỉ lấy phần date, bỏ phần time).
4. Chọn `player_count` hoặc `event_count` tùy theo metric muốn hiển thị.
5. Nếu muốn xem chi tiết 1 event type → truyền thêm `event_type=<value>` để giảm payload.
