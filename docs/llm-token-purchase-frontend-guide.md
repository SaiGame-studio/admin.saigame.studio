# LLM Token Purchase — Front-End Integration Guide

Studio member dùng **sGem** để mua thêm **premium LLM token** cho game.  
Token nạp vào pool premium của game — được dùng **trước** pool free khi gọi LLM API.

> **Lưu ý**: Giao dịch là **non-refundable** — sGem bị trừ ngay, không hoàn trả.

---

## Tổng quan API

| Method | Path | Auth | Mục đích |
|--------|------|------|----------|
| `POST` | `/api/v1/games/{game_id}/llm-tokens/purchase` | JWT (studio member) | Mua gói token premium |
| `GET` | `/api/v1/games/{game_id}/llm-tokens/balance` | JWT (studio member) | Xem số dư token (free + premium) |

Yêu cầu header:
```
Authorization: Bearer <studio_member_jwt>
```

---

## Danh sách gói token (hardcoded)

Các gói cố định, không thay đổi — hiển thị trực tiếp trong UI mà không cần gọi API lấy danh sách:

| Key | Tokens | sGem | Ghi chú |
|-----|--------|------|---------|
| `trial` | 50,000 | 50 | Thử nghiệm |
| `starter` | 200,000 | 200 | |
| `growth` | 1,000,000 | 1,000 | Phổ biến |
| `scale` | 5,000,000 | 4,500 | ~10% tiết kiệm |
| `pro` | 20,000,000 | 17,000 | ~15% tiết kiệm |

**Tỷ giá sGem → Token:** 1 sGem ≈ 1,000 token (gói càng lớn càng tiết kiệm).

---

## Mua gói token

### `POST /api/v1/games/{game_id}/llm-tokens/purchase`

#### Request body

```jsonc
{
  "package": "growth"   // key của gói, bắt buộc
}
```

#### Response 201 — thành công

```jsonc
{
  "purchase_id":          "019768cd-0000-7000-8000-000000000042",  // UUID của bản ghi mua
  "game_id":              "019768ab-0000-7000-8000-000000000001",
  "package":              "growth",
  "tokens_purchased":     1000000,     // số token được nạp vào pool premium
  "sgem_spent":           1000,        // số sGem đã bị trừ
  "premium_tokens_total": 1000000,     // tổng premium token của game SAU khi nạp
  "created_at":           "2026-05-30T10:00:00Z"
}
```

> `premium_tokens_total` là tổng token premium còn lại sau giao dịch này.  
> Dùng trường này để cập nhật UI số dư mà không cần gọi thêm `/balance`.

#### Response 400 — package key không hợp lệ

```jsonc
{
  "error":  "invalid package",
  "detail": "invalid token package key"
}
```

Xảy ra khi `package` bị thiếu hoặc không nằm trong danh sách: `trial`, `starter`, `growth`, `scale`, `pro`.

#### Response 402 — sGem không đủ

```jsonc
{
  "error":  "insufficient sGem balance",
  "detail": "not enough sGem to purchase this token package"
}
```

Hiển thị dialog mời user nạp thêm sGem.

#### Response 403 — không có quyền truy cập game

```jsonc
{
  "error": "forbidden"
}
```

User không phải thành viên của studio sở hữu game này.

---

## Flow UI gợi ý

```
[Màn hình chọn gói]
  ├─ Hiển thị 5 gói (lấy từ bảng hardcoded ở trên)
  ├─ Disable nút mua nếu sGem < sgem_cost của gói
  └─ Khi nhấn "Mua":
       ├─ Gọi POST /api/v1/games/{game_id}/llm-tokens/purchase
       ├─ Loading state...
       ├─ 201 → toast "Mua thành công! +1,000,000 token"
       │         cập nhật số dư sGem và premium_tokens_total từ response
       ├─ 402 → dialog "Số dư sGem không đủ — nạp thêm?"
       ├─ 400 → toast lỗi kỹ thuật (không nên xảy ra nếu UI dùng đúng key)
       └─ 5xx → toast "Có lỗi xảy ra, thử lại sau"
```

---

## Kiểm tra số dư token

### `GET /api/v1/games/{game_id}/llm-tokens/balance`

Trả về số dư đầy đủ (free pool + premium pool) của game.

```
GET /api/v1/games/{game_id}/llm-tokens/balance
Authorization: Bearer <studio_member_jwt>
```

#### Response 200

```jsonc
{
  "game_id":                  "019768ab-0000-7000-8000-000000000001",
  "free_tokens_total":        500000,
  "free_tokens_used":         123000,
  "free_tokens_reserved":     0,
  "free_tokens_remaining":    377000,
  "premium_tokens_total":     1000000,
  "premium_tokens_used":      45000,
  "premium_tokens_reserved":  0,
  "premium_tokens_remaining": 955000
}
```

> Sau khi mua gói, response 201 của `/purchase` đã trả về `premium_tokens_total` mới nhất — chỉ cần gọi `/balance` khi cần xem cả free pool hoặc refresh toàn bộ trạng thái.

---

## Lấy số dư sGem của user

```
GET /api/v1/me/sgem-wallet
Authorization: Bearer <jwt>
```

Xem chi tiết tại [sgem-frontend-guide.md](./sgem-frontend-guide.md).

---

## Tài liệu liên quan

- [sgem-frontend-guide.md](./sgem-frontend-guide.md) — quản lý ví sGem
- [llm-token-quota-frontend-guide.md](./llm-token-quota-frontend-guide.md) — xem quota LLM (super admin)
- [llm-token-pricing-analysis.md](./llm-token-pricing-analysis.md) — phân tích giá thành & margin theo gói
