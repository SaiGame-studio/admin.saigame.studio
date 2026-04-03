# Hướng dẫn tích hợp thanh toán SePay (Frontend)

## Tổng quan flow

```
User chọn gói sCoin → Gọi API initiate → Nhận QR + thông tin CK → User chuyển khoản
→ SePay phát hiện → Webhook về server → Server cộng sCoin → Notify Telegram
```

## Base URL

| Môi trường | URL |
|------------|-----|
| QA         | `https://qa-api.saigame.studio` |

> Tất cả API yêu cầu header `Authorization: Bearer <access_token>` (trừ webhook).

---

## Bước 1: Lấy danh sách gói nạp

```
GET /payments/packages
```

**Response:**
```json
{
  "packages": [
    {
      "id": "uuid",
      "key": "starter_100",
      "name": "Gói 100 sCoin",
      "price_amount": 20000,
      "price_currency": "VND",
      "base_scoin": 100,
      "bonus_scoin": 10,
      "total_scoin": 110
    }
  ]
}
```

---

## Bước 2: Lấy danh sách phương thức thanh toán

```
GET /payments/methods
```

**Response:**
```json
{
  "methods": [
    {
      "id": "uuid",
      "provider_key": "sepay_personal",
      "display_name": "Bank Transfer (SePay)",
      "description": "Pay via personal bank transfer...",
      "icon_url": "https://...",
      "supports_subscription": false,
      "is_active": true,
      "sort_order": 4
    }
  ]
}
```

> Frontend filter `provider_key === "sepay_personal"` để hiển thị option SePay.

---

## Bước 3: Tạo giao dịch (Initiate Payment)

```
POST /payments/initiate
Content-Type: application/json
```

**Request body:**
```json
{
  "package_key": "starter_100",
  "provider_key": "sepay_personal",
  "idempotency_key": "unique-random-string-per-request"
}
```

> `idempotency_key` phải unique mỗi lần tạo giao dịch mới (dùng UUID v4). Có thể gửi qua header `X-Idempotency-Key` thay vì body.

**Response (201 Created):**
```json
{
  "transaction": {
    "id": "tx-uuid",
    "user_id": "user-uuid",
    "provider_key": "sepay_personal",
    "status": "pending",
    "amount": 20000,
    "currency": "VND",
    "scoin_amount": 110,
    "created_at": "2026-04-03T10:00:00Z"
  },
  "intent": {
    "provider_transaction_id": "SEPAY1A2B3C4D",
    "qr_code_data": "https://img.vietqr.io/image/MB-0368587689-compact2.png?amount=20000&addInfo=SEPAY1A2B3C4D&accountName=SAI",
    "bank_account": "0368587689",
    "bank_name": "MB Bank",
    "transfer_amount": 20000,
    "transfer_note": "SEPAY1A2B3C4D",
    "expires_at": "2026-04-03T10:30:00Z"
  }
}
```

---

## Bước 4: Hiển thị UI thanh toán

Từ response `intent`, frontend cần hiển thị:

| Field | Hiển thị |
|-------|----------|
| `qr_code_data` | Render dưới dạng ảnh `<img src="...">` — đây là URL ảnh VietQR |
| `bank_account` | Số tài khoản: **0368587689** |
| `bank_name` | Ngân hàng: **MB Bank** |
| `transfer_amount` | Số tiền: **20,000 VND** |
| `transfer_note` | Nội dung CK: **SEPAY1A2B3C4D** (bắt buộc ghi đúng) |
| `expires_at` | Hiển thị countdown (hết hạn sau 30 phút) |

### UI gợi ý

```
┌─────────────────────────────────────┐
│  Quét mã QR để thanh toán           │
│                                     │
│       ┌───────────────┐             │
│       │   [VietQR]    │             │
│       └───────────────┘             │
│                                     │
│  Hoặc chuyển khoản thủ công:        │
│  Ngân hàng:    MB Bank              │
│  Số TK:        0368587689     [Copy]│
│  Số tiền:      20,000 VND    [Copy] │
│  Nội dung CK:  SEPAY1A2B3C4D [Copy]│
│                                     │
│  ⚠ Ghi đúng nội dung chuyển khoản  │
│  ⏱ Hết hạn sau: 28:45              │
└─────────────────────────────────────┘
```

---

## Bước 5: Polling trạng thái giao dịch

Sau khi user chuyển khoản, frontend cần poll để biết khi nào server nhận được webhook từ SePay:

```
GET /payments/transactions/{tx_id}
```

**Response:**
```json
{
  "id": "tx-uuid",
  "status": "completed",
  "scoin_amount": 110,
  "completed_at": "2026-04-03T10:05:00Z"
}
```

### Các trạng thái (`status`)

| Status | Ý nghĩa | UI |
|--------|----------|-----|
| `pending` | Đang chờ thanh toán | Hiển thị QR + countdown |
| `completed` | Đã thanh toán thành công | ✅ Hiển thị "Nạp thành công!" |
| `failed` | Thanh toán thất bại | ❌ Hiển thị lỗi |
| `expired` | Hết hạn (quá 30 phút) | Hiển thị "Đã hết hạn, vui lòng tạo giao dịch mới" |
| `credit_failed` | Server nhận tiền nhưng cộng sCoin lỗi | Hiển thị "Đang xử lý, liên hệ admin" |

### Polling strategy

```typescript
const POLL_INTERVAL = 5000; // 5 giây
const MAX_POLL_TIME = 30 * 60 * 1000; // 30 phút

async function pollTransaction(txId: string) {
  const start = Date.now();
  
  while (Date.now() - start < MAX_POLL_TIME) {
    const res = await api.get(`/payments/transactions/${txId}`);
    const { status } = res.data;
    
    if (status === 'completed') {
      showSuccess('Nạp sCoin thành công!');
      return;
    }
    if (status === 'failed' || status === 'expired') {
      showError('Giao dịch không thành công');
      return;
    }
    
    await sleep(POLL_INTERVAL);
  }
  
  showError('Hết thời gian chờ');
}
```

---

## Bước 6: Xem lịch sử giao dịch

```
GET /payments/transactions?limit=20&offset=0
```

**Response:**
```json
{
  "transactions": [...],
  "limit": 20,
  "offset": 0
}
```

---

## Lưu ý quan trọng

1. **Nội dung chuyển khoản phải chính xác** — SePay match giao dịch bằng mã `SEPAYXXXXXXXX` trong nội dung CK. Nếu user ghi sai, tiền sẽ không được ghi nhận tự động.

2. **Idempotency** — Luôn tạo `idempotency_key` mới (UUID v4) cho mỗi lần user bấm "Thanh toán". Nếu gửi lại cùng key, server trả về giao dịch cũ thay vì tạo mới.

3. **Hết hạn 30 phút** — Sau 30 phút, giao dịch hết hạn. Frontend nên hiển thị countdown và disable QR khi hết hạn.

4. **Không cần gọi webhook** — Webhook là server-to-server giữa SePay và backend. Frontend chỉ cần poll trạng thái.
