# LLM Preset Generation — Front-End Integration Guide

**Preset generation** là tính năng dùng AI để tạo **PresetDefinition** — các template slot-based mà studio thiết kế để player dùng làm deck bài, party nhân vật, loadout trang bị, v.v.

> ⚠️ **Trạng thái backend**: Route `requests/preset-generation` chưa được thêm vào handler. Backend cần bổ sung `StreamPresetGeneration` tương tự `StreamItemGeneration` (xem phần [Yêu cầu backend](#yêu-cầu-backend) cuối tài liệu). Tài liệu này mô tả giao diện **đầy đủ sau khi route được thêm**.

---

## Tổng quan API

| Method | Path | Auth | Protocol |
|--------|------|------|----------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/preset-generation` | JWT (studio member) | SSE streaming |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | JWT (studio member) | SSE streaming |
| `POST` | `/api/v1/games/{game_id}/preset-definitions` | JWT (studio member) | JSON (lưu kết quả) |
| `GET`  | `/api/v1/games/{game_id}/preset-definitions` | JWT (studio member) | JSON |

Headers bắt buộc:
```
Authorization: Bearer <studio_member_jwt>
Content-Type: application/json
```

---

## Điều kiện trước

1. **Conversation đang tồn tại** — tạo conversation trước qua `POST /api/v1/games/{game_id}/llm/conversations`.
2. **Token quota còn đủ** — nếu hết token, API trả `402 Payment Required`.

---

## 1. Gọi endpoint `preset-generation`

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/preset-generation`

#### Request body

```jsonc
{
  "user_prompt":         "string",   // bắt buộc — mô tả preset cần tạo
  "language":            "string",   // tuỳ chọn — BCP-47, ví dụ: "vi", "en" (mặc định: "en")
  "entity_type":         "string",   // tuỳ chọn — loại preset mặc định khi LLM không tự suy luận được
  "goals":              ["string"],   // tuỳ chọn — hướng dẫn bổ sung, ví dụ: ["create 3 decks for PvP"]
  "lore_entry_ids":     ["uuid"],    // tuỳ chọn — lore tham chiếu (để LLM đặt tên/mô tả nhất quán với thế giới)
  "item_definition_ids":["uuid"],    // tuỳ chọn — item definition tham chiếu (để LLM suy luận max_slots hợp lý)
  "generated_items":    [{}]         // tuỳ chọn — dùng cho luồng edit/regenerate (xem phần 4)
}
```

**Giá trị hợp lệ cho `entity_type`:**

| Giá trị | Ý nghĩa |
|---------|---------|
| `deck` | Deck bài (mặc định khi không rõ) |
| `party` | Party nhân vật |
| `loadout` | Bộ trang bị |
| `relic_bag` | Túi relic |
| `run_deck` | Deck cho run roguelike |
| `defense_layout` | Bố trận phòng thủ |

#### Ví dụ request

```jsonc
{
  "user_prompt": "Tạo 3 template deck cho game card PvP: một deck tấn công nhanh, một deck kiểm soát, một deck combo",
  "language": "vi",
  "entity_type": "deck",
  "goals": ["max_slots should be 30 for each deck"]
}
```

---

## 2. Nhận stream SSE

Response có `Content-Type: text/event-stream`. Đọc từng event:

### 2.1. Ping kết nối

```
: connected

```

Comment line đầu tiên — xác nhận stream đã mở, không cần xử lý.

### 2.2. Chunk (partial text)

```
data: {"type":"chunk","text":"..."}

```

Tích luỹ tất cả `text` để lắp thành output đầy đủ của LLM.

### 2.3. Done

```
data: {"type":"done","request_id":"...","conversation_id":"...","detected_request_type":"preset_generation","status":"completed"}

```

Kết thúc stream — lúc này parse chuỗi đã tích luỹ.

### 2.4. Error (terminal)

```
data: {"type":"error","message":"..."}

```

Stream kết thúc sớm do lỗi. Hiển thị `message` cho người dùng.

---

## 3. Parse kết quả — định dạng output

LLM xuất ra **một block per preset definition**, mỗi block theo cấu trúc:

```
## <Tên preset>
- **Code Name**: <slug>
- **Preset Type**: <loại>
- **Display Name**: <tên hiển thị>
- **Max Slots**: <số>
- **Description**: <mô tả một câu>
- ...các metadata fields khác...

```json
{ ...JSON object của định nghĩa này... }
```

---
```

> **Quan trọng**: Output là **nhiều block riêng biệt** (mỗi block kết thúc bằng `---`), **không phải một JSON array**. Frontend phải tự extract từng JSON block.

### Cấu trúc JSON mỗi preset definition

```jsonc
{
  "code_name":   "pvp_aggro_deck",          // slug: ^[a-z][a-z0-9_]{0,63}$
  "preset_type": "deck",                    // một trong 6 loại hợp lệ
  "name":        "PvP Aggro Deck",          // tên hiển thị
  "max_slots":   30,                        // 0 = không giới hạn, 1–70
  "metadata": {
    "description": "Deck tấn công nhanh 30 lá, ưu tiên tốc độ...",
    "icon":        "icons/presets/pvp_aggro.png",
    "ui_label":    "Aggro",
    "min_slots_to_activate": "30"
    // ...các key tuỳ chỉnh khác...
  }
}
```

**Ràng buộc cứng từ backend khi lưu:**

| Trường | Ràng buộc |
|--------|-----------|
| `code_name` | `^[a-z][a-z0-9_]{0,63}$` — bắt đầu bằng chữ thường, chỉ chứa `a-z`, `0-9`, `_` |
| `preset_type` | Phải là một trong: `deck`, `party`, `loadout`, `relic_bag`, `run_deck`, `defense_layout` |
| `max_slots` | 0–70 (inclusive) |
| `metadata` | Tối đa 50 key (kể cả nested); mỗi key ≤ 500 ký tự |

---

## 4. Luồng edit / regenerate

Khi người dùng muốn chỉnh sửa các preset đã tạo trước đó, truyền chúng vào `generated_items`:

```jsonc
{
  "user_prompt": "Đổi tên deck Aggro thành 'Rush Deck' và tăng max_slots lên 40",
  "entity_type": "deck",
  "generated_items": [
    { "code_name": "pvp_aggro_deck", "preset_type": "deck", "name": "PvP Aggro Deck", "max_slots": 30, "metadata": {} },
    { "code_name": "pvp_control_deck", "preset_type": "deck", "name": "PvP Control Deck", "max_slots": 30, "metadata": {} }
  ]
}
```

LLM sẽ xuất ra **số lượng block bằng số phần tử trong `generated_items`** — mỗi phần tử được chỉnh sửa và xuất lại.

---

## 5. Lưu kết quả vào backend

Sau khi parse xong, gọi `POST /api/v1/games/{game_id}/preset-definitions` cho từng định nghĩa:

```jsonc
// POST /api/v1/games/{game_id}/preset-definitions
{
  "code_name":   "pvp_aggro_deck",
  "preset_type": "deck",
  "name":        "PvP Aggro Deck",
  "max_slots":   30,
  "metadata": {
    "description": "Deck tấn công nhanh 30 lá...",
    "icon":        "icons/presets/pvp_aggro.png",
    "ui_label":    "Aggro"
  }
}
```

**Response `201 Created`:**

```jsonc
{
  "id":          "01960000-0000-7000-0000-000000000001",
  "code_name":   "pvp_aggro_deck",
  "preset_type": "deck",
  "name":        "PvP Aggro Deck",
  "max_slots":   30,
  "metadata": { ... },
  "created_at":  "2026-06-02T10:00:00Z",
  "updated_at":  "2026-06-02T10:00:00Z"
}
```

---

## 6. Detect-intent (tuỳ chọn — cho luồng chat tự do)

Nếu frontend dùng luồng chat không có nút chọn explicit request type, gọi `detect-intent` trước:

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent`

```jsonc
{
  "user_prompt": "Tạo template deck PvP cho game bài",
  "history": []    // tuỳ chọn — các turn trước của conversation
}
```

**Ví dụ kết quả trả về (SSE `done` event):**

```jsonc
{
  "language": "vi",
  "intents": [
    {
      "type":        "preset_generation",
      "entity_type": "deck",
      "goal":        "Create a PvP deck template"
    }
  ],
  "clarification": ""
}
```

Dùng `intents[0].type` để chọn endpoint và `intents[0].entity_type` làm giá trị mặc định cho `entity_type` khi gọi `requests/preset-generation`.

**Các giá trị `type` có thể trả về cho preset:**

| `type` trả về | Ý nghĩa | `entity_type` điển hình |
|---|---|---|
| `preset_generation` | Tạo preset definition mới | `deck`, `party`, `loadout`, ... |

---

## 7. Xử lý lỗi

| HTTP status | `error` code | Ý nghĩa | Hành động |
|-------------|--------------|---------|-----------|
| `400` | `invalid_request` | Body sai, UUID không hợp lệ | Kiểm tra lại request |
| `402` | `quota_exceeded` | Hết LLM token | Hướng dẫn mua thêm token |
| `404` | `not_found` | Conversation không tồn tại | Tạo lại conversation |
| `409` | `conflict` | `code_name` đã tồn tại trong game | Yêu cầu người dùng đổi tên |
| `422` | `validation_error` | `code_name` sai format, `max_slots` vượt 70, metadata vượt 50 keys | Hiển thị lỗi cụ thể từ `message` |

---

## 8. Ví dụ TypeScript đầy đủ

```typescript
// ─── Types ────────────────────────────────────────────────────────────────────

export type PresetType =
  | "deck"
  | "party"
  | "loadout"
  | "relic_bag"
  | "run_deck"
  | "defense_layout";

export interface PresetDefinitionJSON {
  code_name: string;
  preset_type: PresetType;
  name: string;
  max_slots: number;
  metadata: Record<string, string | number>;
}

export interface PresetDefinitionResult {
  id: string;
  code_name: string;
  preset_type: PresetType;
  name: string;
  max_slots: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Step 1: Stream LLM output ────────────────────────────────────────────────

/**
 * Streams preset generation from LLM and accumulates the raw markdown+json output.
 * Returns the full accumulated text (unparsed — pass to extractPresetBlocks).
 */
async function streamPresetGeneration(
  gameId: string,
  convId: string,
  userPrompt: string,
  options?: {
    language?: string;
    entityType?: PresetType;
    goals?: string[];
    loreEntryIds?: string[];
    itemDefinitionIds?: string[];
    generatedItems?: PresetDefinitionJSON[];
  }
): Promise<string> {
  const body: Record<string, unknown> = {
    user_prompt: userPrompt,
    language: options?.language ?? "en",
  };
  if (options?.entityType)        body["entity_type"]          = options.entityType;
  if (options?.goals?.length)     body["goals"]                = options.goals;
  if (options?.loreEntryIds?.length)      body["lore_entry_ids"]      = options.loreEntryIds;
  if (options?.itemDefinitionIds?.length) body["item_definition_ids"] = options.itemDefinitionIds;
  if (options?.generatedItems?.length)    body["generated_items"]     = options.generatedItems;

  const res = await fetch(
    `/api/v1/games/${gameId}/llm/conversations/${convId}/requests/preset-generation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getJwt()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
        return accumulated;
      } else if (payload.type === "error") {
        throw new Error(payload.message);
      }
    }
  }

  throw new Error("Stream ended without done event");
}

// ─── Step 2: Extract JSON blocks from LLM output ─────────────────────────────

/**
 * Extracts all JSON objects from the LLM's fenced code blocks.
 * Each definition is emitted as a separate ```json ... ``` block in the output.
 */
function extractPresetBlocks(rawOutput: string): PresetDefinitionJSON[] {
  const results: PresetDefinitionJSON[] = [];
  // Match every ```json ... ``` fence in the output
  const fenceRegex = /```json\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(rawOutput)) !== null) {
    try {
      const obj = JSON.parse(match[1].trim()) as PresetDefinitionJSON;
      // Basic sanity check before including
      if (obj.code_name && obj.preset_type) {
        results.push(obj);
      }
    } catch {
      // Malformed block — skip, show warning in UI
      console.warn("Could not parse preset JSON block:", match[1]);
    }
  }

  return results;
}

// ─── Step 3: Save each definition ────────────────────────────────────────────

/** Saves a single preset definition via POST /api/v1/games/{game_id}/preset-definitions */
async function savePresetDefinition(
  gameId: string,
  def: PresetDefinitionJSON
): Promise<PresetDefinitionResult> {
  const res = await fetch(`/api/v1/games/${gameId}/preset-definitions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getJwt()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(def),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<PresetDefinitionResult>;
}

// ─── Orchestration ────────────────────────────────────────────────────────────

/** Full flow: generate → parse → save all definitions. */
async function generateAndSavePresets(
  gameId: string,
  convId: string,
  userPrompt: string,
  options?: Parameters<typeof streamPresetGeneration>[3]
): Promise<PresetDefinitionResult[]> {
  // 1. Stream LLM output
  const rawOutput = await streamPresetGeneration(gameId, convId, userPrompt, options);

  // 2. Parse all JSON blocks
  const blocks = extractPresetBlocks(rawOutput);
  if (blocks.length === 0) {
    throw new Error("LLM returned no parseable preset definitions");
  }

  // 3. Save all — stop on first 409 conflict (duplicate code_name)
  const saved: PresetDefinitionResult[] = [];
  for (const block of blocks) {
    const result = await savePresetDefinition(gameId, block);
    saved.push(result);
  }

  return saved;
}

// Helper — replace with your actual JWT source
function getJwt(): string {
  return localStorage.getItem("access_token") ?? "";
}
```

---

## 9. Các preset type — tham chiếu nhanh

| `preset_type` | Ý nghĩa | `max_slots` thường dùng |
|---|---|---|
| `deck` | Deck bài | 20–60 (điển hình: 30) |
| `party` | Party nhân vật | 3–6 (điển hình: 4) |
| `loadout` | Bộ trang bị | 6–12 (điển hình: 8) |
| `relic_bag` | Túi relic | 5–15 (điển hình: 6) |
| `run_deck` | Deck roguelike run | 10–40 (điển hình: 20) |
| `defense_layout` | Bố trận phòng thủ | 5–20 (điển hình: 10) |

---

## Yêu cầu backend (chưa implement)

Backend cần bổ sung **2 thay đổi nhỏ** vào `internal/handler/llm_conversation_handler.go`:

```go
// 1. Thêm handler method
func (h *LLMConversationHandler) StreamPresetGeneration(w http.ResponseWriter, r *http.Request) {
    h.handleStreamRequest(domain.LLMRequestTypePresetGeneration, w, r)
}

// 2. Thêm vào DefineLLMConversationRoutes()
{
    Method:      POST,
    Path:        "/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/preset-generation",
    Handler:     h.StreamPresetGeneration,
    Middlewares: mws,
    Description: "Studio member",
    IsPublic:    false,
},
```

Ngoài ra, cần thêm case cho `preset_generation` trong `accumulatedRootKey()` tại `internal/usecase/llm_conversation_usecase.go`:

```go
case domain.LLMRequestTypePresetGeneration:
    return "presets"
```
