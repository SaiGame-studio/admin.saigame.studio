# Worker Status API — Front-End Render Guide

**Endpoint:** `GET /api/v1/admin/workers/status`  
**Auth:** JWT (Super admin only)

---

## Response Shape

```jsonc
{
  "collected_at": "2026-05-30T10:00:00Z",   // ISO 8601 UTC — khi nào snapshot này được tạo
  "workers": [
    {
      // --- Live fields (thay đổi mỗi request) ---
      "name": "transaction_expiry",          // string — ID duy nhất của worker
      "state": "idle",                       // "running" | "idle" | "pending" | "disabled"
      "running": false,                      // bool — true khi đang thực thi ngay lúc này
      "last_run": "2026-05-30T09:45:00Z",   // ISO 8601 UTC | null nếu chưa chạy lần nào
      "next_notify_at": null,                // ISO 8601 UTC | null — chỉ có ở 1 số worker
      "details": {                           // object | null — thông tin bổ sung tùy worker
        "queue_size": "42"
      },

      // --- Static fields (không đổi, hardcoded từ server) ---
      "meta": {
        "description": "...",                // mô tả worker làm gì, chạy khi nào
        "collects_data": ["table_a", "..."], // danh sách data source
        "telegram_preview": {               // mẫu tin nhắn Telegram worker gửi
          "chat_id": "-100...",
          "text": "..."
        },
        "no_trigger_reason": "..."          // string | "" — nếu rỗng = có thể trigger thủ công
      }
    }
  ]
}
```

---

## `state` — Cách render badge

| `state`    | Label hiển thị | Màu gợi ý | Ý nghĩa |
|------------|----------------|-----------|---------|
| `running`  | ● Running      | Xanh lá (green-500) | Worker đang thực thi ngay lúc này |
| `idle`     | ● Idle         | Xanh dương (blue-400) | Đã chạy xong, đang chờ lịch tiếp theo |
| `pending`  | ● Pending      | Vàng (amber-400) | Server vừa start, chưa chạy lần nào |
| `disabled` | ○ Disabled     | Xám (gray-400) | Worker không được cấu hình |

> **Lưu ý quan trọng:** `state === "pending"` **không có nghĩa là lỗi**. Worker đang hoạt động bình thường — chỉ chưa đến giờ chạy lần đầu kể từ khi server khởi động. Không dùng màu đỏ cho `pending`.

---

## `last_run` — Cách hiển thị

- **Nếu `null`:** Hiển thị `—` hoặc `Never`
- **Nếu có giá trị:** Format relative time + absolute tooltip

```
last_run: "2026-05-30T09:45:00Z"
→ hiển thị: "15 minutes ago"
→ tooltip:  "2026-05-30 09:45:00 UTC"
```

---

## `next_notify_at` — Cách hiển thị

Chỉ một số worker có field này (ví dụ: `system_monitor`). Dùng `omitempty` nên sẽ không xuất hiện trong JSON nếu không có.

- **Nếu không có field:** Không render gì cả
- **Nếu có:** Hiển thị countdown "Next alert in X min"

---

## `details` — Cách hiển thị

Object key-value tùy ý, render dạng bảng nhỏ hoặc expandable section.

```
details: { "queue_size": "42", "last_batch": "15" }
→ Queue size: 42
→ Last batch: 15
```

Nếu `details` là `null` hoặc không có field: không render section này.

---

## `meta.no_trigger_reason` — Nút trigger thủ công

```
no_trigger_reason === ""   → hiển thị nút "Run Now" (enabled)
no_trigger_reason !== ""   → hiển thị icon 🔒 + tooltip = nội dung no_trigger_reason
```

---

## Ví dụ full response

```json
{
  "collected_at": "2026-05-30T10:00:00Z",
  "workers": [
    {
      "name": "transaction_expiry",
      "state": "idle",
      "running": false,
      "last_run": "2026-05-30T09:45:00Z",
      "meta": {
        "description": "Worker định kỳ (mỗi 15 phút) đánh dấu các giao dịch awaiting_payment đã hết hạn.",
        "collects_data": [
          "payment_transactions (status=awaiting_payment, expires_at < NOW())",
          "payment_method_configs"
        ],
        "telegram_preview": {
          "chat_id": "-1001234567890",
          "text": "⏱️ TransactionExpiryWorker — 2026-05-30 12:00 UTC\n• Đã expire: 3 giao dịch"
        },
        "no_trigger_reason": ""
      }
    },
    {
      "name": "subscription_renewal",
      "state": "pending",
      "running": false,
      "last_run": null,
      "meta": {
        "description": "Worker chạy hằng ngày lúc 02:00 UTC. Gia hạn các subscription sắp hết hạn.",
        "collects_data": [
          "payment_subscriptions (status=active, next_billing_at <= NOW()+1h)"
        ],
        "telegram_preview": {
          "chat_id": "-1001234567890",
          "text": "🔔 SubscriptionRenewalWorker — 2026-05-30 02:00 UTC\n• Đã gia hạn: 5"
        },
        "no_trigger_reason": ""
      }
    },
    {
      "name": "db_backup",
      "state": "idle",
      "running": false,
      "last_run": "2026-05-30T21:00:00Z",
      "meta": {
        "description": "Worker chạy hằng ngày lúc 04:00 GMT+7 gọi pg_dump.",
        "collects_data": ["toàn bộ cluster PostgreSQL"],
        "telegram_preview": {
          "chat_id": "-1001234567890",
          "text": "🚨 Worker Error..."
        },
        "no_trigger_reason": "Chỉ nên chạy 1 lần/ngày để tránh CPU/IO spike."
      }
    }
  ]
}
```

---

## Polling / Refresh

API này là snapshot tại thời điểm gọi — không có WebSocket hay SSE.

- **Gợi ý interval:** Poll mỗi **30 giây** khi tab đang active
- **Dừng poll** khi tab ẩn (Page Visibility API)
- Dùng `collected_at` để hiển thị "Last updated X seconds ago"

---

## Danh sách 14 workers hiện tại

| `name` | Lịch chạy | Group |
|--------|-----------|-------|
| `aggregation_cron` | Hằng ngày 02:00 UTC | Analytics |
| `activity_summary` | Liên tục (flush mỗi 5 phút) | Analytics |
| `player_event_stats` | Mỗi 1 phút | Analytics |
| `leaderboard_score` | Mỗi 15 giây | Leaderboard |
| `leaderboard_daily_reset` | Mỗi 1 phút | Leaderboard |
| `transaction_worker` | Liên tục (event-driven) | Transaction |
| `coin_fraud_audit` | Hằng ngày 02:00 UTC | Security |
| `plugin_expiry` | Mỗi 1 giờ | Plugin |
| `system_monitor` | Check mỗi 30 giây, report mỗi 1 giờ | System |
| `db_backup` | Hằng ngày 04:00 GMT+7 | System |
| `transaction_expiry` | Mỗi 15 phút | Payment |
| `payment_reconciliation` | Mỗi 1 giờ | Payment |
| `billing_retry` | Mỗi 6 giờ | Payment |
| `subscription_renewal` | Hằng ngày 02:00 UTC | Payment |
