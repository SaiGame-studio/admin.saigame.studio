# LLM Tag Suggestion — Front-End Integration Guide

**Tag suggestion** là tính năng dùng AI để gợi ý **game tags** phù hợp từ danh sách tag cố định của platform.  
Studio member nhập mô tả game (hoặc tiêu đề, từ khoá), hệ thống trả về danh sách tag phù hợp và lý do chọn.

---

## Tổng quan API

| Method | Path | Auth | Protocol |
|--------|------|------|----------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/tag-suggestion` | JWT (studio member) | SSE streaming |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | JWT (studio member) | SSE streaming |

Yêu cầu header:
```
Authorization: Bearer <studio_member_jwt>
Content-Type: application/json
```

---

## Điều kiện trước

1. **Conversation đang tồn tại** — tạo conversation trước qua `POST /api/v1/games/{game_id}/llm/conversations`.
2. **Token quota còn đủ** — nếu hết token, API trả `402 Payment Required`.

---

## 1. Gọi trực tiếp endpoint `tag-suggestion`

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/tag-suggestion`

#### Request body

```jsonc
{
  "user_prompt": "string",  // bắt buộc — mô tả game, tiêu đề, từ khoá
  "language":   "string",   // tuỳ chọn — BCP-47, ví dụ: "vi", "en" (mặc định: "en")
  "goals":     ["string"]   // tuỳ chọn — hướng dẫn bổ sung, ví dụ: ["focus on combat mechanics"]
}
```

> Các trường `entity_type`, `lore_entry_ids`, `item_definition_ids`, `generated_items` được chấp nhận nhưng không có tác dụng với request type này — bỏ qua.

#### Ví dụ request

```jsonc
{
  "user_prompt": "Đây là game nhập vai theo lượt, chiến đấu 1 người chơi, đồ hoạ pixel 16-bit, cốt truyện fantasy.",
  "language": "vi"
}
```

---

## 2. Nhận stream SSE

Response có `Content-Type: text/event-stream`. Đọc từng event theo thứ tự:

### 2.1. Ping kết nối

```
: connected

```

Comment line đầu tiên — không cần xử lý, chỉ xác nhận stream mở.

### 2.2. Chunk (partial text)

```
data: {"type":"chunk","text":"..."}

```

Mỗi `chunk` là một phần nhỏ của JSON output từ LLM. Tích luỹ tất cả `text` để lắp thành JSON đầy đủ.

### 2.3. Done

```
data: {"type":"done","request_id":"...","conversation_id":"...","detected_request_type":"tag_suggestion","status":"completed"}

```

Signal kết thúc stream. Lúc này parse chuỗi đã tích luỹ.

### 2.4. Error (terminal)

```
data: {"type":"error","message":"..."}

```

Stream kết thúc sớm do lỗi. Hiển thị `message` cho người dùng.

---

## 3. Parse kết quả

Sau khi nhận `done`, parse toàn bộ text tích luỹ thành JSON:

```jsonc
{
  "tags": ["rpg", "turn-base", "solo", "pixel", "retro"],
  "reasoning": "Game nhập vai theo lượt, đồ hoạ pixel đơn người chơi với phong cách retro fantasy."
}
```

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `tags` | `string[]` | Danh sách tag được đề xuất (1–10 tag). Tất cả đều nằm trong vocabulary. |
| `reasoning` | `string` | Giải thích ngắn (1–2 câu) tại sao chọn các tag này. |

> **Trường hợp mô tả quá ngắn / mơ hồ**: LLM trả `{"tags":[],"reasoning":"Insufficient information..."}`.  
> Frontend nên kiểm tra `tags.length === 0` và hiển thị thông báo yêu cầu mô tả rõ hơn.

---

## 4. Ví dụ TypeScript đầy đủ

```typescript
interface TagSuggestionResult {
  tags: string[];
  reasoning: string;
}

async function suggestGameTags(
  gameId: string,
  convId: string,
  prompt: string,
  language = "en"
): Promise<TagSuggestionResult> {
  const res = await fetch(
    `/api/v1/games/${gameId}/llm/conversations/${convId}/requests/tag-suggestion`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getJwt()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_prompt: prompt, language }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = JSON.parse(line.slice(6));

      if (payload.type === "chunk") {
        accumulated += payload.text;
      } else if (payload.type === "done") {
        return JSON.parse(accumulated) as TagSuggestionResult;
      } else if (payload.type === "error") {
        throw new Error(payload.message);
      }
    }
  }

  throw new Error("Stream ended without done event");
}
```

---

## 5. Tag vocabulary (nguồn sự thật)

Đây là danh sách **đầy đủ** và **cố định** của platform. LLM chỉ trả tag trong danh sách này.

### Genre (thể loại)

| Tag | Mô tả |
|-----|-------|
| `action` | Game hành động |
| `adventure` | Game phiêu lưu |
| `card` | Game thẻ bài |
| `idle` | Game nhàn rỗi |
| `clicker` | Game nhấp chuột |
| `platformer` | Game nhảy platform |
| `puzzle` | Game giải đố |
| `racing` | Game đua xe |
| `rpg` | Nhập vai |
| `shooter` | Bắn súng |
| `simulation` | Mô phỏng |
| `sports` | Thể thao |
| `strategy` | Chiến thuật |
| `tower-defense` | Phòng thủ tháp |
| `visual-novel` | Visual novel |
| `horror` | Kinh dị |
| `sandbox` | Thế giới mở tự do |
| `roguelike` | Roguelike / Roguelite |
| `moba` | MOBA |
| `battle-royale` | Battle royale |

### Mode (chế độ)

| Tag | Mô tả |
|-----|-------|
| `multiplayer` | Nhiều người chơi |
| `pvp` | Người chơi đấu người chơi |
| `pve` | Người chơi đấu môi trường |
| `co-op` | Hợp tác |
| `solo` | Đơn người chơi |
| `turn-base` | Theo lượt |
| `real-time` | Thời gian thực |
| `open-world` | Thế giới mở |

### Style (phong cách đồ hoạ)

| Tag | Mô tả |
|-----|-------|
| `anime` | Phong cách anime |
| `pixel` | Đồ hoạ pixel |
| `2d` | 2D |
| `3d` | 3D |
| `retro` | Retro cổ điển |

### Mechanic (cơ chế)

| Tag | Mô tả |
|-----|-------|
| `gacha` | Gacha |
| `battle-pass` | Battle pass |
| `crafting` | Chế tạo đồ |
| `farming` | Trồng trọt / thu thập |

---

## 6. Tích hợp với detect-intent

Thay vì gọi `tag-suggestion` trực tiếp, có thể dùng `detect-intent` để tự động nhận dạng loại request từ câu tự nhiên.

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent`

#### Request body

```jsonc
{
  "user_prompt": "Hãy gợi ý tag cho game của tôi: game nhập vai pixel đơn người chơi.",
  "history": []
}
```

#### SSE done event

```jsonc
{
  "type": "done",
  "language": "vi",
  "intents": [
    {
      "type": "tag_suggestion",
      "entity_type": "game",
      "goal": "suggest tags for the user's game"
    }
  ],
  "clarification": null
}
```

Khi `intents[0].type === "tag_suggestion"`, front-end chuyển sang gọi endpoint `requests/tag-suggestion` với cùng `user_prompt`.

---

## 7. Xử lý lỗi

| HTTP Status | SSE `type` | Nguyên nhân | Xử lý |
|-------------|------------|-------------|-------|
| `400` | — | Request body không hợp lệ | Kiểm tra `user_prompt` không rỗng |
| `402` | — | Hết token quota | Redirect đến trang mua thêm token |
| `404` | — | Conversation không tồn tại | Tạo conversation mới |
| `403` | — | Không có quyền truy cập game | Kiểm tra studio membership |
| — | `error` | LLM gặp lỗi trong quá trình stream | Hiển thị message, cho phép retry |

---

## 8. Gợi ý UI

```
┌─────────────────────────────────────────────────────┐
│  🏷️ AI Tag Suggestion                               │
├─────────────────────────────────────────────────────┤
│  Mô tả game của bạn                                 │
│  ┌───────────────────────────────────────────────┐  │
│  │ Game nhập vai turn-based pixel art, đơn người │  │
│  │ chơi, cốt truyện fantasy...                   │  │
│  └───────────────────────────────────────────────┘  │
│                              [Gợi ý tags ✨]         │
├─────────────────────────────────────────────────────┤
│  Tags được đề xuất:                                 │
│                                                     │
│  [rpg ✓] [turn-base ✓] [solo ✓] [pixel ✓] [retro ✓]│
│                                                     │
│  💡 Game nhập vai theo lượt đơn người chơi với      │
│     đồ hoạ pixel phong cách retro fantasy.          │
│                                                     │
│                        [Áp dụng tất cả] [Tuỳ chọn] │
└─────────────────────────────────────────────────────┘
```

**Lưu ý triển khai:**
- Cho phép user **chọn / bỏ chọn** từng tag trước khi áp dụng.
- Hiển thị `reasoning` như tooltip hoặc info text.
- Sau khi áp dụng, gọi `PUT /api/v1/games/{id}` với mảng `tags` đã chọn (tối đa 10 tag).
- Nếu `tags` trả về rỗng, hiển thị prompt yêu cầu mô tả chi tiết hơn.
