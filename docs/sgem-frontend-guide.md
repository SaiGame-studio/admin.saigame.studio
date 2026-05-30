# sGem — Front-End Integration Guide

**sGem** là hard premium currency của player (💎). Dùng để mua item trong shop, mua LLM token, v.v.

**Tỷ giá cố định:** 100 sGem = $1.00 · 100 sGem = 25.000 VND  
**Không có bonus** — số lượng sGem nhận được luôn bằng đúng giá trị ghi trên gói.

---

## Tổng quan API

| Method | Path | Auth | Mục đích |
|--------|------|------|----------|
| `GET` | `/api/v1/payments/sgem-packages` | JWT | Danh sách gói sGem đang bán |
| `GET` | `/api/v1/payments/sgem-packages/{id}` | JWT | Chi tiết một gói |
| `POST` | `/api/v1/payments/sgem-packages/{id}/purchase` | JWT | Khởi tạo thanh toán |
| `GET` | `/api/v1/me/sgem-wallet` | JWT | Số dư ví sGem của player |
| `GET` | `/api/v1/me/sgem-transactions` | JWT | Lịch sử giao dịch sGem |

Tất cả đều yêu cầu header `Authorization: Bearer <jwt>`.

---

## 1. Danh sách gói sGem

### `GET /api/v1/payments/sgem-packages`

```jsonc
// Response 200
{
  "packages": [
    {
      "id": "00000004-0000-0000-0000-000000000013",
      "package_key": "sgem_1000_usd",
      "name": "1,000 sGem — $9.99",
      "description": "Great for regular players who shop often and want a reliable balance.",
      "sgem_amount": 1000,
      "price_amount": 999,       // cents × 100 → hiển thị: 999 / 100 = $9.99
      "price_currency": "USD",
      "prices": {                // tất cả giá đều × 100
        "USD": 999,              // $9.99
        "VND": 25000000,         // 250.000 đ
        "JPY": 150000,
        "EUR": 919,
        "GBP": 789,
        "KRW": 1379000,
        "THB": 35000,
        "CNY": 7244,
        "SGD": 1349,
        "AUD": 1549
      },
      "is_active": true,
      "available_from": null,
      "available_until": null,
      "sort_order": 130,
      "metadata": {},
      "created_at": "2026-05-30T00:00:00Z",
      "updated_at": "2026-05-30T00:00:00Z"
    }
    // ...
  ]
}
```

**Lưu ý hiển thị giá:**
- Mọi giá trong `prices` đều được lưu dạng **integer × 100**
- Để hiển thị: `prices["VND"] / 100` → `250000` → format thành `250.000 đ`
- Chọn key trong `prices` theo currency của user (detect từ IP/profile hoặc để user chọn)
- Fallback về `price_amount / 100` + `price_currency` nếu currency không có trong `prices`

**Sort:** Server trả về theo `sort_order` tăng dần. Không cần sort lại ở client.

**Chỉ render gói `is_active = true`** — API đã lọc sẵn, nhưng nên guard thêm ở client.

---

## 2. Chi tiết một gói

### `GET /api/v1/payments/sgem-packages/{id}`

```jsonc
// Response 200
{
  "package": { /* cùng shape như item trong mảng packages ở trên */ }
}

// Response 404
{
  "error": "package_not_found",
  "message": "sgem package not found"
}
```

---

## 3. Mua sGem (khởi tạo thanh toán)

### `POST /api/v1/payments/sgem-packages/{id}/purchase`

**Request body:**
```jsonc
{
  "method_config_id": "uuid-cua-payment-method",  // bắt buộc
  "idempotency_key": "user-123-sgem-1000-1717000000" // bắt buộc, unique mỗi lần bấm mua
}
```

**`idempotency_key`:** Client tự tạo, đảm bảo unique per attempt (ví dụ: `{userId}-{packageId}-{timestamp}`). Nếu user bấm mua 2 lần với cùng key và giao dịch đầu đã `completed` → server trả `409` thay vì charge 2 lần.

**Response 201 — thành công:**
```jsonc
{
  "transaction": {
    "id": "uuid-cua-transaction",
    "idempotency_key": "user-123-sgem-1000-1717000000",
    "user_id": "uuid-cua-user",
    "status": "awaiting_payment",          // hoặc "processing"
    "amount": 999,                         // giá fiat (cents × 100)
    "currency": "USD",
    "currency_type": "sgem",              // "sgem" | "scoin"
    "currency_package_id": "00000004-0000-0000-0000-000000000013",
    "currency_amount": 1000,              // số sGem sẽ nhận (raw units)
    "provider_key": "stripe",
    "created_at": "2026-05-30T10:00:00Z"
  },
  "intent": {
    "provider_transaction_id": "pi_xxx",
    "payment_url": "https://checkout.stripe.com/...",  // redirect user đến đây
    "expires_at": "2026-05-30T10:15:00Z"              // deadline thanh toán
  }
}
```

**Response 4xx — lỗi:**
```jsonc
// 400 — thiếu field
{ "error": "validation_error", "message": "method_config_id is required" }

// 404 — gói không tồn tại
{ "error": "initiate_sgem_payment_failed", "message": "sgem package not found" }

// 409 — idempotency key đã được dùng cho giao dịch completed
{ "error": "initiate_sgem_payment_failed", "message": "duplicate payment" }

// 429 — vượt quá 99 giao dịch/ngày
{ "error": "initiate_sgem_payment_failed", "message": "daily transaction limit exceeded" }
```

**Flow sau khi nhận response 201:**
1. Lưu `transaction.id` vào local state
2. Redirect hoặc open `intent.payment_url` (Stripe Checkout, VNPay, v.v.)
3. Sau khi user thanh toán xong, provider webhook tự động credit sGem vào ví
4. Poll `GET /api/v1/me/sgem-wallet` hoặc dùng WebSocket để cập nhật số dư

---

## 4. Ví sGem

### `GET /api/v1/me/sgem-wallet`

```jsonc
// Response 200
{
  "id": "uuid-cua-wallet",
  "user_id": "uuid-cua-user",
  "balance": 1500,       // số dư hiện tại (raw sGem units)
  "total_bought": 3000,  // tổng đã mua từ trước đến nay
  "total_spent": 1500,   // tổng đã tiêu
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-05-30T10:05:00Z"
}
```

Hiển thị `balance` trực tiếp — không cần chia. `1500` = 1.500 💎.

---

## 5. Lịch sử giao dịch sGem

### `GET /api/v1/me/sgem-transactions?limit=20&offset=0`

```jsonc
// Response 200
{
  "transactions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "amount": 1000,              // dương = nhận, âm = tiêu
      "type": "payment_gateway",   // xem bảng type bên dưới
      "status": "completed",
      "balance_before": 500,
      "balance_after": 1500,
      "reference_id": "uuid-payment-transaction",
      "reference_type": "payment_transaction",
      "description": "sGem top-up via stripe",
      "created_at": "2026-05-30T10:05:00Z",
      "processed_at": "2026-05-30T10:05:01Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

**Query params:**
- `limit` — số item mỗi trang (default `20`, max nên giới hạn ở `100`)
- `offset` — bỏ qua N item đầu (pagination kiểu offset)

---

## Bảng `type` của giao dịch

| `type` | Dấu `amount` | Ý nghĩa | Label gợi ý |
|---|---|---|---|
| `payment_gateway` | ➕ dương | Mua sGem qua cổng thanh toán | Top-up |
| `admin_correction` | ± | Admin cộng/trừ thủ công | Adjustment |
| `llm_token_purchase` | ➖ âm | Mua LLM token bằng sGem | AI Token |
| `shop_purchase` | ➖ âm | Mua item trong shop | Shop |
| `shop_refund` | ➕ dương | Hoàn tiền từ shop | Refund |

---

## Bảng `status` của giao dịch

| `status` | Badge | Ý nghĩa |
|---|---|---|
| `completed` | ✅ Xanh lá | Thành công, balance đã cập nhật |
| `pending` | 🕐 Vàng | Đang xử lý |
| `processing` | 🔄 Xanh dương | Provider đang confirm |
| `failed` | ❌ Đỏ | Thất bại |

---

## Lấy danh sách payment methods

Cần `method_config_id` khi gọi purchase. Lấy từ:

```
GET /api/v1/payments/methods
```

```jsonc
{
  "methods": [
    {
      "id": "uuid-method",
      "provider_key": "stripe",
      "name": "Credit / Debit Card",
      "is_active": true
    }
  ]
}
```

Render thành dropdown hoặc radio list cho user chọn trước khi bấm mua.

---

## UI Flow gợi ý

```
[Shop/Top-up Screen]
  ↓ GET /api/v1/payments/sgem-packages
  → render danh sách gói (lọc is_active = true, sort theo sort_order)

[User chọn gói + chọn payment method]
  ↓ POST /api/v1/payments/sgem-packages/{id}/purchase
  → 201: redirect đến intent.payment_url
  → lỗi: hiển thị message tương ứng

[Sau khi thanh toán xong (redirect back từ provider)]
  ↓ GET /api/v1/me/sgem-wallet
  → cập nhật số dư hiển thị ở header/navbar

[Trang lịch sử]
  ↓ GET /api/v1/me/sgem-transactions?limit=20&offset=0
  → render table/list với pagination
```

---

## So sánh sGem vs sCoin

| | sGem 💎 | sCoin 🪙 |
|---|---|---|
| Đối tượng | **Player** (end user) | **Studio / Developer** |
| Dùng để | Mua item shop, LLM token | Mua plugin, game slot, platform features |
| Mua từ | `/api/v1/payments/sgem-packages/{id}/purchase` | `/api/v1/payments/initiate` |
| Xem ví | `/api/v1/me/sgem-wallet` | `/api/v1/coins/wallet` |
| Lịch sử | `/api/v1/me/sgem-transactions` | `/api/v1/coins/transactions` |

---

## ⚠️ Breaking Changes — Payment Transaction Object

Kể từ **migration 192** (generic currency columns), shape của `PaymentTransaction` đã thay đổi.

**Cũ (đã xóa):**
```jsonc
{
  "scoin_package_id": "uuid",   // ← removed
  "scoin_amount": 1000,         // ← removed
  "scoin_credited_at": null,    // ← removed
  "sgem_package_id": "uuid",    // ← removed
  "sgem_amount": 1000,          // ← removed
  "sgem_credited_at": null      // ← removed
}
```

**Mới (thay thế):**
```jsonc
{
  "currency_type": "sgem",          // "sgem" | "scoin" — loại currency
  "currency_package_id": "uuid",    // ID gói tương ứng
  "currency_amount": 1000,          // số lượng currency sẽ nhận (raw units)
  "currency_credited_at": null      // thời điểm credit thành công (null = chưa credit)
}
```

**Áp dụng cho tất cả endpoint trả về `PaymentTransaction`:**
- `POST /api/v1/payments/sgem-packages/{id}/purchase` → field `transaction` trong response
- `POST /api/v1/payments/initiate` (sCoin) → field `transaction` trong response
- `GET /api/v1/payments/transactions` → mảng `transactions`
- `GET /api/v1/payments/transactions/{id}`
- Admin endpoints: `GET /api/v1/admin/payments/transactions`

**Frontend cần:**
1. Thay mọi đọc `tx.sgem_amount` / `tx.scoin_amount` → đọc `tx.currency_amount`
2. Thay mọi đọc `tx.sgem_package_id` / `tx.scoin_package_id` → đọc `tx.currency_package_id`
3. Dùng `tx.currency_type` để phân biệt `"sgem"` vs `"scoin"` nếu cần render khác nhau
