# Generator Collect — API Change Notice

**Feature:** Item Generator — Collect Destination  
**Date:** 2026-04-13  
**Endpoint affected:** `POST /api/v1/games/{game_id}/generators/{item_id}/collect`

---

## Tóm tắt

Response của collect endpoint có thêm 1 field mới: **`delivered_to`**.  
Field này cho biết items được giao qua **mailbox** hay thẳng vào **inventory**.  
Không có thay đổi nào khác — tất cả field cũ vẫn còn nguyên.

---

## Response Schema

```typescript
interface CollectResult {
  units_collected:    number;                      // số ticks đã collect
  dropped_items:      Record<string, number>;      // { "GOLD": 10, "GEM": 2 }
  delivered_to:       "mailbox" | "inventory";     // ← FIELD MỚI
  mailbox_message_id?: string;                     // UUID — chỉ có khi delivered_to = "mailbox"
  new_checkpoint_at:  string;                      // ISO 8601, dùng để reset timer
}
```

---

## Ví dụ response

### Trường hợp 1 — Delivered to mailbox (default, giống như cũ)

```json
{
  "units_collected": 10,
  "dropped_items": {
    "GOLD": 500,
    "GEM": 2
  },
  "delivered_to": "mailbox",
  "mailbox_message_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "new_checkpoint_at": "2026-04-13T10:00:00Z"
}
```

> Player phải vào mailbox để claim — giống hành vi hiện tại.

---

### Trường hợp 2 — Delivered to inventory (generator mới)

```json
{
  "units_collected": 10,
  "dropped_items": {
    "GOLD": 500,
    "GEM": 2
  },
  "delivered_to": "inventory",
  "new_checkpoint_at": "2026-04-13T10:00:00Z"
}
```

> Items được giao thẳng vào inventory của player — **không cần claim mailbox**.  
> `mailbox_message_id` **vắng mặt** trong response này.

---

## Hướng dẫn xử lý

```typescript
async function collectGenerator(gameId: string, itemId: string) {
  const result: CollectResult = await api.post(
    `/api/v1/games/${gameId}/generators/${itemId}/collect`
  );

  // Reset production timer (luôn làm, không phân biệt delivered_to)
  resetGeneratorTimer(itemId, result.new_checkpoint_at);

  if (result.delivered_to === "inventory") {
    // Items đã vào inventory ngay — refresh inventory UI
    await refreshInventory();
    showToast(`Nhận được: ${formatDrops(result.dropped_items)}`);
  } else {
    // delivered_to = "mailbox"
    // Giữ nguyên logic hiện tại — thông báo kiểm tra mailbox
    showToast("Phần thưởng đã gửi vào hòm thư!");
    showMailboxBadge();
  }
}
```

---

## Backward Compatibility

| Generator | `delivered_to` | `mailbox_message_id` | Hành động |
|-----------|----------------|----------------------|-----------|
| Generator **cũ** (đã có trên production) | `"mailbox"` | Có | Không đổi gì |
| Generator **mới** cấu hình `"inventory"` | `"inventory"` | Vắng mặt | Refresh inventory |

- Generator cũ **không thay đổi hành vi** — luôn trả về `delivered_to: "mailbox"`
- Không cần force update, không có breaking change
- Chỉ cần handle thêm case `"inventory"` là đủ

---

## Error Codes

Không có thay đổi về error codes:

| HTTP | Khi nào |
|------|---------|
| `400` | `item_id` không phải UUID hợp lệ |
| `404` | Generator không tồn tại hoặc không thuộc player |
| `409` | Generator chưa có gì để collect (pending = 0) |
| `403` | Player bị ban khỏi game |
| `500` | Lỗi server |
