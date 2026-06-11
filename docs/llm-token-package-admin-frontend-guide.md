# LLM Token Package Admin - Front-End Integration Guide

Trang này dành cho **Super admin** để xem và chỉnh giá mua **premium LLM token package**.

Backend hiện lưu catalog này trong DB qua repository riêng, không còn hardcoded trong code nữa:
- Model/package repo: [`internal/domain/llm_token_package.go`](../../internal/domain/llm_token_package.go#L12-L32)
- Repository SQL: [`internal/repository/llm_token_package_repository.go`](../../internal/repository/llm_token_package_repository.go#L43-L94)
- Super admin handler: [`internal/handler/admin_llm_token_package_handler.go`](../../internal/handler/admin_llm_token_package_handler.go#L14-L87)
- Route registration: [`internal/handler/route_definitions.go`](../../internal/handler/route_definitions.go#L4655-L4676)

> **Phạm vi UI hiện tại**
> - Super admin có thể xem danh sách package.
> - Super admin có thể xem chi tiết một package.
> - Super admin có thể sửa `package_key`, `tokens`, `sgem_cost`, `is_active`, `sort_order`.

---

## Tổng quan API

| Method | Path | Auth | Mục đích |
|--------|------|------|----------|
| `GET` | `/api/v1/admin/llm-token-packages` | JWT (Super admin) | Danh sách tất cả token packages |
| `GET` | `/api/v1/admin/llm-token-packages/{id}` | JWT (Super admin) | Chi tiết một package |
| `PATCH` | `/api/v1/admin/llm-token-packages/{id}` | JWT (Super admin) | Cập nhật package fields |

Header:
```http
Authorization: Bearer <super_admin_jwt>
```

---

## 1. Danh sách package

### `GET /api/v1/admin/llm-token-packages`

#### Response 200

```jsonc
{
  "packages": [
    {
      "id": "019768ab-0000-7000-8000-000000000011",
      "package_key": "trial",
      "tokens": 50000,
      "sgem_cost": 50,
      "is_active": true,
      "sort_order": 10,
      "created_at": "2026-06-11T00:00:00Z",
      "updated_at": "2026-06-11T00:00:00Z"
    }
  ]
}
```

#### Gợi ý render UI

- Dùng bảng với các cột:
  - `package_key`
  - `tokens`
  - `sgem_cost`
  - `is_active`
  - `sort_order`
  - `updated_at`
- Nên format `tokens` bằng dấu phân tách hàng nghìn.
- Nên highlight package đang `is_active = false` để admin biết đây là gói ẩn/tạm tắt.

---

## 2. Chi tiết package

### `GET /api/v1/admin/llm-token-packages/{id}`

#### Response 200

```jsonc
{
  "package": {
    "id": "019768ab-0000-7000-8000-000000000011",
    "package_key": "trial",
    "tokens": 50000,
    "sgem_cost": 50,
    "is_active": true,
    "sort_order": 10,
    "created_at": "2026-06-11T00:00:00Z",
    "updated_at": "2026-06-11T00:00:00Z"
  }
}
```

#### Response 404

```jsonc
{
  "error": "package not found",
  "message": ""
}
```

#### Khi nào dùng

- Mở modal chỉnh sửa từ danh sách.
- Preload dữ liệu hiện tại trước khi cho admin sửa.

---

## 3. Cập nhật giá package

### `PATCH /api/v1/admin/llm-token-packages/{id}`

#### Request body

```jsonc
{
  "package_key": "trial_plus",
  "tokens": 75000,
  "sgem_cost": 75,
  "is_active": true,
  "sort_order": 15
}
```

#### Quy tắc UI

- `package_key`:
  - Trim khoảng trắng trước khi gửi.
  - Không được rỗng.
- `tokens`:
  - Chỉ gửi số nguyên dương.
  - Không cho gửi `0` hoặc số âm.
- `sgem_cost`:
  - Chỉ gửi số nguyên dương.
  - Không cho gửi `0` hoặc số âm.
- `is_active`:
  - `true` = gói đang bán.
  - `false` = gói tạm ẩn.
- `sort_order`:
  - Dùng để sắp xếp hiển thị trong danh sách.
- Sau khi lưu thành công, reload lại danh sách hoặc update local row bằng response trả về.

#### Response 200

```jsonc
{
  "id": "019768ab-0000-7000-8000-000000000011",
  "package_key": "trial_plus",
  "tokens": 75000,
  "sgem_cost": 75,
  "is_active": true,
  "sort_order": 15,
  "created_at": "2026-06-11T00:00:00Z",
  "updated_at": "2026-06-11T00:05:00Z"
}
```

#### Response 400

```jsonc
{
  "error": "invalid request",
  "message": "package_key must not be empty"
}
```

#### Response 404

```jsonc
{
  "error": "package not found",
  "message": ""
}
```

---

## 4. Gợi ý bố cục trang

### Layout đề xuất

```
┌──────────────────────────────────────────────────────────────┐
│ LLM Token Packages                                           │
│ Manage premium token bundle pricing for studio members.      │
├──────────────────────────────────────────────────────────────┤
│ Search [ trial / growth / ... ]      [Refresh]               │
├──────────────────────────────────────────────────────────────┤
│ Package Key   Tokens       sGem Cost   Active   Updated At   │
│ trial         50,000       50          Yes      ...          │
│ starter       200,000      200         Yes      ...          │
│ growth        1,000,000    1,000       Yes      ...          │
│ ...                                                        ...│
├──────────────────────────────────────────────────────────────┤
│ [Edit selected package]                                       │
└──────────────────────────────────────────────────────────────┘
```

### Edit modal

- Hiển thị:
  - `package_key` editable
  - `tokens` editable
  - `sgem_cost` editable
  - `is_active` editable
  - `sort_order` editable
- Nút action:
  - `Cancel`
  - `Save`

### Loading / error state

- Khi load list:
  - show skeleton table hoặc spinner
- Khi save:
  - disable nút `Save`
  - show loading state trên modal
- Khi lỗi:
  - show message từ API
  - nếu `404`, báo “package not found or removed”

---

## 5. Luồng API gợi ý cho frontend

```ts
const BASE = '/api/v1/admin/llm-token-packages'

export interface LLMTokenPackage {
  id: string
  package_key: string
  tokens: number
  sgem_cost: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export async function listPackages(): Promise<LLMTokenPackage[]> {
  const res = await fetch(BASE, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  return json.packages
}

export async function updatePackage(
  id: string,
  payload: {
    package_key?: string
    tokens?: number
    sgem_cost?: number
    is_active?: boolean
    sort_order?: number
  },
): Promise<LLMTokenPackage> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw await res.json()
  return res.json()
}
```

---

## 6. Lưu ý nghiệp vụ

- Đây là **sGem cost** của gói token, không phải số token nhận được.
- Số token `tokens` là giá trị sản phẩm, còn `sgem_cost` là giá bán cho studio member.
- Flow mua token của studio member vẫn dùng API cũ: [`internal/handler/llm_token_purchase_handler.go`](../../internal/handler/llm_token_purchase_handler.go#L32-L73).
- Nếu admin đổi giá, purchase flow sẽ tự đọc giá mới từ DB ở lần mua tiếp theo.
