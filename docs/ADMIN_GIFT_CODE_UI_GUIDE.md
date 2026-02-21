# Admin Gift Code Management — Frontend Build Guide

**Audience:** Frontend Agent  
**Platform:** SS-GO  
**Base URL:** `http://local-api.saigame.studio` (dev) — use env var `NEXT_PUBLIC_API_URL`  
**Authentication:** All admin endpoints require a super-admin JWT:
```
Authorization: Bearer <access_token>
```

---

## Overview of Screens to Build

| Screen | Route (suggested) | Description |
|--------|-------------------|-------------|
| Gift Code List | `/admin/gift-codes` | Table of all codes, search/filter |
| Create Gift Code | `/admin/gift-codes/new` | Form to create a new code |
| Gift Code Detail | `/admin/gift-codes/[id]` | View + edit + see who redeemed |
| Redemption List | inside Detail page | Paginated table of users who used the code |
| Top-Up User Coins | `/admin/coins/topup` | Give coins directly to a user by user ID |

---

## 1. Data Models

### `GiftCode`
```typescript
interface GiftCode {
  id: string;            // UUID
  code: string;          // The redeemable code string, e.g. "SUMMER2026"
  coins_amount: number;  // Coins granted on redemption (e.g. 100)
  max_uses: number;      // 1 = single-use | N = multi-use | -1 = unlimited
  used_count: number;    // Current redemption count (read-only)
  expires_at: string | null;  // ISO 8601 datetime or null (never expires)
  active_at: string | null;   // ISO 8601 datetime or null (null = draft/inactive)
  description: string;
  created_by: string;    // UUID of admin who created it
  created_at: string;    // ISO 8601 datetime
  updated_at: string;    // ISO 8601 datetime
}
```

**`active_at` logic:**
| Value | Meaning |
|-------|---------|
| `null` | Draft — code exists but CANNOT be redeemed |
| past datetime | Active NOW |
| future datetime | Scheduled — activates automatically at that time |

**`max_uses` logic:**
| Value | Meaning |
|-------|---------|
| `1` | Single-use: only 1 person can redeem |
| `N > 1` | Multi-use: up to N people |
| `-1` | Unlimited: everyone can redeem |

### `GiftCodeRedemption`
```typescript
interface GiftCodeRedemption {
  id: string;           // UUID
  gift_code_id: string; // UUID
  user_id: string;      // UUID of user who redeemed
  redeemed_at: string;  // ISO 8601 datetime
}
```

### `CoinTransaction`
```typescript
interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;         // positive = credit, negative = debit
  type: 'admin_topup' | 'gift_code' | 'payment_gateway' | 'action_reward' | 'spend';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  balance_before: number | null;  // null while pending
  balance_after: number | null;   // null while pending
  reference_id: string | null;
  reference_type: string | null;
  description: string;
  error_message: string | null;   // set when status = "failed"
  created_by: string | null;      // admin UUID (only for admin_topup)
  created_at: string;
  processed_at: string | null;    // set by worker on completion
}
```

---

## 2. API Reference

### 2.1 Gift Code CRUD (All require super-admin JWT)

#### `POST /api/v1/admin/gift-codes` — Create Gift Code

**Request body:**
```json
{
  "code": "SUMMER2026",
  "coins_amount": 100,
  "max_uses": 50,
  "description": "Summer promotion 2026",
  "active_at": "2026-06-01T00:00:00Z",
  "expires_at": "2026-08-31T23:59:59Z"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `code` | string | ✅ | Unique redemption code. Recommend uppercase alphanumeric |
| `coins_amount` | number | ✅ | Must be > 0 |
| `max_uses` | number | ✅ | 1 = single-use, N = multi-use, -1 = unlimited |
| `description` | string | ✅ | Admin memo |
| `active_at` | ISO datetime | optional | `null` / omit = draft |
| `expires_at` | ISO datetime | optional | `null` / omit = never expires |

**Response `201 Created`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "SUMMER2026",
  "coins_amount": 100,
  "max_uses": 50,
  "used_count": 0,
  "active_at": "2026-06-01T00:00:00Z",
  "expires_at": "2026-08-31T23:59:59Z",
  "description": "Summer promotion 2026",
  "created_by": "admin-uuid",
  "created_at": "2026-02-22T07:00:00Z",
  "updated_at": "2026-02-22T07:00:00Z"
}
```

**Error responses:**
| Status | When |
|--------|------|
| `400` | Validation error (missing fields, amount <= 0, etc.) |
| `401` | Missing / invalid JWT |
| `500` | Internal error |

---

#### `GET /api/v1/admin/gift-codes` — List Gift Codes

**Query params:**
| Param | Default | Notes |
|-------|---------|-------|
| `limit` | `20` | Max per page |
| `offset` | `0` | Pagination offset |

**Example:** `GET /api/v1/admin/gift-codes?limit=20&offset=0`

**Response `200 OK`:**
```json
{
  "gift_codes": [ /* GiftCode[] */ ],
  "total": 142,
  "limit": 20,
  "offset": 0
}
```

---

#### `GET /api/v1/admin/gift-codes/{id}` — Get Gift Code Detail

**Response `200 OK`:** Full `GiftCode` object  
**Error responses:**  `404` if not found

---

#### `GET /api/v1/admin/gift-codes/{id}/redemptions` — List Redemptions

**Query params:** `limit` (default 20), `offset` (default 0)

**Response `200 OK`:**
```json
{
  "gift_code_id": "550e8400-...",
  "redemptions": [ /* GiftCodeRedemption[] */ ],
  "total": 37,
  "limit": 20,
  "offset": 0
}
```

---

#### `PUT /api/v1/admin/gift-codes/{id}` — Update Gift Code

Only the fields you send are updated (partial update). All fields are optional.

**Request body:**
```json
{
  "description": "Updated description",
  "active_at": "2026-03-01T00:00:00Z",
  "expires_at": "2026-12-31T23:59:59Z",
  "max_uses": 200
}
```

| Field | Type | Notes |
|-------|------|-------|
| `description` | string | optional |
| `active_at` | ISO datetime | optional. Send `null` explicitly to deactivate (back to draft) |
| `expires_at` | ISO datetime | optional. Send `null` to remove expiry |
| `max_uses` | number | optional. Cannot be less than current `used_count` |

**Response `200 OK`:** Updated `GiftCode` object  
**Error responses:** `400` validation, `404` not found

---

#### `DELETE /api/v1/admin/gift-codes/{id}` — Delete Gift Code

**Response `200 OK`:**
```json
{ "message": "gift code deleted" }
```
**Error responses:** `404` not found

---

### 2.2 Admin Coin Top-Up (Super-admin JWT required)

#### `POST /api/v1/admin/coins/topup` — Credit Coins to User

**Request body:**
```json
{
  "user_id": "user-uuid-here",
  "amount": 500,
  "description": "Manual top-up for user support ticket #1234"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `user_id` | UUID | ✅ | Target user's UUID |
| `amount` | number | ✅ | Must be > 0 (coins to credit) |
| `description` | string | ✅ | Memo for audit trail |

**Response `201 Created`:** Full `CoinTransaction` object  
**Error responses:** `400` if amount ≤ 0 or user_id missing

---

## 3. Screen Specifications

### 3.1 Gift Code List Page — `/admin/gift-codes`

**Layout:** Full-width table with top toolbar.

**Toolbar:**
- Search input (client-side filter on `code` or `description`)
- **+ Create Gift Code** button → navigates to `/admin/gift-codes/new`

**Table columns:**

| Column | Field | Notes |
|--------|-------|-------|
| Code | `code` | Monospace font, copyable on click |
| Amount | `coins_amount` | Show as "💰 100 coins" |
| Max Uses | `max_uses` | Show `-1` as "∞ Unlimited" |
| Used | `used_count` | Show as "37 / 50" (used/max), or "37 / ∞" |
| Status | derived | see Status Badge logic below |
| Active At | `active_at` | formatted date |
| Expires At | `expires_at` | "Never" if null |
| Actions | — | Edit icon → detail page, Delete icon with confirm dialog |

**Status Badge logic** (derive from `active_at`, `expires_at`, `used_count`, `max_uses`):
```
if active_at == null                         → "Draft" (gray)
if active_at > now                           → "Scheduled" (blue)
if expires_at != null && expires_at < now    → "Expired" (red)
if max_uses != -1 && used_count >= max_uses  → "Exhausted" (orange)
else                                         → "Active" (green)
```

**Pagination:** Show `total` count, prev/next buttons. Use `limit=20`.

---

### 3.2 Create Gift Code Page — `/admin/gift-codes/new`

**Form fields:**

```
Code *              [text input]          e.g. SUMMER2026
                    helper: "Uppercase letters and numbers recommended"

Coins Amount *      [number input]        min=1
                    helper: "Coins granted to user on redemption"

Max Uses *          [radio or select]
                    ○ Single use (1)
                    ○ Limited (___) [number input, min=2]
                    ● Unlimited (-1)

Description *       [textarea]

Active At           [datetime-local]      placeholder: "Leave empty to save as draft"
                    helper: "Set to a future date to schedule activation"

Expires At          [datetime-local]      placeholder: "Leave empty for no expiry"
```

**Submit:** `POST /api/v1/admin/gift-codes`  
**On success:** Navigate to `/admin/gift-codes/[newId]` and show toast "Gift code created"  
**On error:** Show error message from response body

---

### 3.3 Gift Code Detail Page — `/admin/gift-codes/[id]`

**Two sections:**

#### Section A: Edit Gift Code

Show current values in a form. Fields editable:
- `description` (textarea)
- `active_at` (datetime-local, with a "Set to now" shortcut button and "Clear (set to draft)" button)
- `expires_at` (datetime-local, with "Never expires" checkbox)
- `max_uses` (number, with note: min = current `used_count`)

Read-only fields to display: `code`, `coins_amount`, `used_count`, `created_at`, `created_by`.

**Save button:** `PUT /api/v1/admin/gift-codes/{id}`  
**Delete button** (danger zone): confirmation dialog → `DELETE /api/v1/admin/gift-codes/{id}` → redirect to list

#### Section B: Redemptions Table

Heading: "Redemptions (`{total}`)"

| Column | Notes |
|--------|-------|
| User ID | UUID, monospace, copyable |
| Redeemed At | formatted datetime |

Pagination: `limit=20`, load via `GET /api/v1/admin/gift-codes/{id}/redemptions`

---

### 3.4 Admin Coin Top-Up Page — `/admin/coins/topup`

**Form:**
```
User ID *           [text input / UUID]
                    helper: "The UUID of the user's account"

Amount (coins) *    [number input]       min=1

Description *       [textarea]
                    placeholder: "Reason for manual top-up (e.g. support request #1234)"
```

**Submit:** `POST /api/v1/admin/coins/topup`

**On success:** Show result card:
```
✅ Top-up successful
   Transaction ID:  550e8400-...
   User:            {user_id}
   Amount:          +500 coins
   Status:          pending → completed (async, may take 1-2 seconds)
   Description:     "Support ticket #1234"
```

**On error `400`:** Show validation message (e.g., "amount must be positive")  
**On error `500`:** Show generic error toast

---

## 4. User-Side: Redeem Gift Code (for context)

The user-facing redeem is a simple form in the user's coin/wallet screen.

**Endpoint:** `POST /api/v1/coins/redeem` (JWT required, NOT super-admin)

**Request:**
```json
{ "code": "SUMMER2026" }
```

**Successful response `200 OK`:** `CoinTransaction` object  
**Show user:** "🎉 You received `{coins_amount}` coins!"

**Error codes:**

| HTTP | Error Condition | User-Friendly Message |
|------|-----------------|-----------------------|
| `404` | Code doesn't exist | "Invalid gift code. Check for typos." |
| `400` | Code not yet active (`active_at` in future) | "This code is not active yet." |
| `410` | Code has expired | "This code has expired." |
| `409` | Code fully used (`used_count >= max_uses`) | "This code has run out of uses." |
| `409` | User already redeemed this code | "You have already used this code." |

---

## 5. State Management Recommendations

```typescript
// Suggested API client functions
const giftCodeApi = {
  list:          (limit, offset)    => GET  /api/v1/admin/gift-codes?limit=X&offset=Y
  create:        (body)             => POST /api/v1/admin/gift-codes
  get:           (id)               => GET  /api/v1/admin/gift-codes/{id}
  update:        (id, body)         => PUT  /api/v1/admin/gift-codes/{id}
  delete:        (id)               => DELETE /api/v1/admin/gift-codes/{id}
  redemptions:   (id, limit, offset) => GET /api/v1/admin/gift-codes/{id}/redemptions
}

const coinApi = {
  adminTopUp: (body) => POST /api/v1/admin/coins/topup
}
```

Use `Authorization: Bearer {token}` header on all requests.  
Token stored in secure cookie or localStorage (depends on auth implementation).

---

## 6. Quick Reference — All Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/admin/gift-codes` | super-admin JWT | Create gift code |
| `GET` | `/api/v1/admin/gift-codes` | super-admin JWT | List gift codes |
| `GET` | `/api/v1/admin/gift-codes/{id}` | super-admin JWT | Get detail |
| `GET` | `/api/v1/admin/gift-codes/{id}/redemptions` | super-admin JWT | List redemptions |
| `PUT` | `/api/v1/admin/gift-codes/{id}` | super-admin JWT | Update gift code |
| `DELETE` | `/api/v1/admin/gift-codes/{id}` | super-admin JWT | Delete gift code |
| `POST` | `/api/v1/admin/coins/topup` | super-admin JWT | Top-up user wallet |
| `POST` | `/api/v1/coins/redeem` | user JWT | User: redeem code |
| `GET` | `/api/v1/coins/wallet` | user JWT | User: get wallet balance |
| `GET` | `/api/v1/coins/transactions` | user JWT | User: transaction history |

---

## 7. Error Response Shape

All errors from the backend follow this format:
```json
{
  "error": "gift code not found",
  "detail": "gift code not found"
}
```

Always read `error` for the primary message to display.
