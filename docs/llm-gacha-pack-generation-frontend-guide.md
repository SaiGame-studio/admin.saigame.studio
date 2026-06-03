# LLM Gacha Pack Generation — Front-End Integration Guide

**Gacha pack generation** là tính năng dùng AI để tạo **GachaPack definition** — cấu hình định nghĩa hộp gacha (loot box) bao gồm bảng phần thưởng ngẫu nhiên, điều kiện mở, và nơi nhận thưởng cho người chơi.

---

## Tổng quan API

| Method | Path | Auth | Protocol |
|--------|------|------|----------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/gacha-pack-creating` | JWT (studio member) | SSE streaming |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | JWT (studio member) | SSE streaming |
| `POST` | `/api/v1/games/{game_id}/gacha/packs` | JWT (studio member) | JSON (lưu kết quả) |
| `GET`  | `/api/v1/games/{game_id}/gacha/packs` | JWT (studio member) | JSON |

Headers bắt buộc:
```
Authorization: Bearer <studio_member_jwt>
Content-Type: application/json
```

---

## Điều kiện trước

1. **Conversation đang tồn tại** — tạo conversation trước qua `POST /api/v1/games/{game_id}/llm/conversations`.
2. **Token quota còn đủ** — nếu hết token, API trả `402 Payment Required`.
3. **Item definitions đã tồn tại** — gacha pack cần `item_definition_id` hợp lệ cho từng mục trong `item_pool` và `key_requirements`. Tạo trước qua `POST /api/v1/games/{game_id}/item-definitions` nếu cần.

---

## 1. Gọi endpoint `gacha-pack-creating`

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/gacha-pack-creating`

#### Request body

```jsonc
{
  "user_prompt":          "string",   // bắt buộc — mô tả gacha pack cần tạo
  "language":             "string",   // tuỳ chọn — BCP-47, ví dụ: "vi", "en" (mặc định: "en")
  "entity_type":          "string",   // tuỳ chọn — loại pack, dùng làm gợi ý cho LLM
  "goals":               ["string"],  // tuỳ chọn — hướng dẫn bổ sung
  "lore_entry_ids":      ["uuid"],    // tuỳ chọn — lore tham chiếu (đặt tên, chủ đề)
  "item_definition_ids": ["uuid"],    // tuỳ chọn — item tham chiếu để đưa vào item_pool
  "generated_items":     [{}]         // tuỳ chọn — dùng cho luồng edit/regenerate (xem phần 4)
}
```

**Giá trị hợp lệ cho `entity_type`:**

| Giá trị | Ý nghĩa |
|---------|---------|
| `standard` | Pack chuẩn thường ngày (mặc định khi không rõ) |
| `event` | Pack sự kiện giới hạn thời gian |
| `seasonal` | Pack theo mùa (lễ hội, Tết, v.v.) |
| `daily` | Pack mở hàng ngày |
| `premium` | Pack cao cấp, phần thưởng hiếm hơn |
| `limited` | Pack số lượng giới hạn |

#### Ví dụ request

```jsonc
{
  "user_prompt": "Tạo một gacha pack hỏa thuật với cơ hội rơi vật phẩm huyền thoại hiếm",
  "language": "vi",
  "entity_type": "premium",
  "item_definition_ids": [
    "01900000-0000-7000-0000-000000000001",
    "01900000-0000-7000-0000-000000000002",
    "01900000-0000-7000-0000-000000000003"
  ],
  "goals": ["include at least one legendary item with very low weight"]
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
data: {"type":"done","request_id":"...","conversation_id":"...","detected_request_type":"gacha_pack_creating","status":"completed"}

```
Kết thúc stream — lúc này parse chuỗi đã tích luỹ.

### 2.4. Error (terminal)
```
data: {"type":"error","message":"..."}

```
Stream kết thúc sớm do lỗi. Hiển thị `message` cho người dùng.

---

## 3. Parse kết quả — định dạng output

LLM xuất ra **một block per gacha pack definition**, mỗi block theo cấu trúc:

```
## <Tên pack>
- **Code Name**: <slug>
- **Name**: <tên hiển thị>
- **Collect Destination**: <mailbox|inventory>
- **Is Enabled**: <true|false>
- **Description**: <mô tả một câu>
- ...các metadata fields khác...
- **Key Requirement**: <tên item> (id: <uuid>, quantity: <n>)  ← chỉ có nếu cần key
- **Drop**: <tên item> (id: <uuid>) — weight: <n>, qty: <min>–<max>
- ...

```json
{ ...JSON object của định nghĩa này... }
```

---
```

> **Quan trọng**: Output là **nhiều block riêng biệt** (mỗi block kết thúc bằng `---`), **không phải một JSON array**. Frontend phải tự extract từng JSON block từ fenced code block.

### Cấu trúc JSON mỗi gacha pack definition

```jsonc
{
  "code_name":           "fire_premium_pack",  // slug duy nhất trong game
  "name":                "Fire Premium Pack",   // tên hiển thị
  "collect_destination": "mailbox",             // "mailbox" hoặc "inventory"
  "is_enabled":          true,
  "item_pool": [
    {
      "item_definition_id": "01900000-0000-7000-0000-000000000001",
      "weight":             7000,   // weight >= 1; tỉ lệ tương đối
      "quantity_min":       1,      // >= 1
      "quantity_max":       3       // >= quantity_min
    },
    {
      "item_definition_id": "01900000-0000-7000-0000-000000000002",
      "weight":             50,
      "quantity_min":       1,
      "quantity_max":       1
    }
  ],
  "key_requirements": [             // [] nếu mở miễn phí
    {
      "item_definition_id": "01900000-0000-7000-0000-000000000099",
      "quantity":           1
    }
  ],
  "metadata": {
    "description": "Pack cao cấp với cơ hội nhận vật phẩm hỏa thuật huyền thoại.",
    "icon":        "icons/gacha/fire_pack.png",
    "ui_color":    "#FF6B35",
    "rarity_tier": "Premium"
  }
}
```

**Ràng buộc cứng từ backend khi lưu:**

| Trường | Ràng buộc |
|--------|-----------|
| `code_name` | Phải khớp `^[a-z][a-z0-9_]{0,63}$` — chữ thường, bắt đầu bằng chữ cái, tối đa 64 ký tự |
| `name` | Không được rỗng |
| `collect_destination` | Phải là `"mailbox"` hoặc `"inventory"` |
| `item_pool` | Ít nhất 1 entry |
| `item_pool[].weight` | >= 1 |
| `item_pool[].quantity_min` | >= 1 |
| `item_pool[].quantity_max` | >= `quantity_min` |
| `key_requirements[].quantity` | >= 1 |
| `metadata` | Tối đa 50 key (kể cả nested); mỗi key ≤ 500 ký tự |

---

## 4. Luồng edit / regenerate

Khi người dùng muốn chỉnh sửa các gacha pack đã tạo trước đó, truyền chúng vào `generated_items`:

```jsonc
{
  "user_prompt": "Tăng weight của item huyền thoại lên gấp đôi và thêm một item mới vào pool",
  "entity_type": "premium",
  "generated_items": [
    {
      "code_name": "fire_premium_pack",
      "name": "Fire Premium Pack",
      "collect_destination": "mailbox",
      "is_enabled": true,
      "item_pool": [
        { "item_definition_id": "01900000-0000-7000-0000-000000000001", "weight": 7000, "quantity_min": 1, "quantity_max": 3 },
        { "item_definition_id": "01900000-0000-7000-0000-000000000002", "weight": 50,   "quantity_min": 1, "quantity_max": 1 }
      ],
      "key_requirements": [],
      "metadata": { "description": "..." }
    }
  ]
}
```

LLM sẽ xuất ra **số lượng block bằng số phần tử trong `generated_items`** — mỗi phần tử được chỉnh sửa và xuất lại.

---

## 5. Lưu kết quả vào backend

Sau khi parse xong, gọi `POST /api/v1/games/{game_id}/gacha/packs` cho từng định nghĩa:

```jsonc
// POST /api/v1/games/{game_id}/gacha/packs
{
  "code_name":           "fire_premium_pack",
  "name":                "Fire Premium Pack",
  "collect_destination": "mailbox",
  "is_enabled":          true,
  "item_pool": [
    { "item_definition_id": "01900000-0000-7000-0000-000000000001", "weight": 7000, "quantity_min": 1, "quantity_max": 3 },
    { "item_definition_id": "01900000-0000-7000-0000-000000000002", "weight": 50,   "quantity_min": 1, "quantity_max": 1 }
  ],
  "key_requirements": [],
  "metadata": {
    "description": "Pack cao cấp với cơ hội nhận vật phẩm hỏa thuật huyền thoại.",
    "icon":        "icons/gacha/fire_pack.png",
    "ui_color":    "#FF6B35",
    "rarity_tier": "Premium"
  }
}
```

**Response `201 Created`:**

```jsonc
{
  "id":                  "01960000-0000-7000-0000-000000000001",
  "game_id":             "01960000-0000-7000-0000-000000000002",
  "code_name":           "fire_premium_pack",
  "name":                "Fire Premium Pack",
  "collect_destination": "mailbox",
  "is_enabled":          true,
  "item_pool": [ ... ],
  "key_requirements":    [],
  "metadata":            { ... },
  "created_at":          "2026-06-02T10:00:00Z",
  "updated_at":          "2026-06-02T10:00:00Z"
}
```

> **Lưu ý**: Response **không** được bọc thêm key — object gacha pack trả về trực tiếp ở root (khác với container definitions được bọc trong `"container_definition"`).

---

## 6. Detect-intent (tuỳ chọn — cho luồng chat tự do)

Nếu frontend dùng luồng chat không có nút chọn explicit request type, gọi `detect-intent` trước:

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent`

```jsonc
{
  "user_prompt": "Tạo một hộp gacha theo chủ đề mùa hè với vật phẩm mùa hè",
  "history": []
}
```

**Ví dụ kết quả trả về (SSE `done` event):**

```jsonc
{
  "language": "vi",
  "intents": [
    {
      "type":        "gacha_pack_creating",
      "entity_type": "seasonal",
      "goal":        "Create a summer-themed gacha pack with seasonal items"
    }
  ],
  "clarification": ""
}
```

Dùng `intents[0].type` để chọn endpoint và `intents[0].entity_type` làm giá trị mặc định cho `entity_type` khi gọi `requests/gacha-pack-creating`.

**Các giá trị `type` có thể trả về cho gacha pack:**

| `type` trả về | Ý nghĩa | `entity_type` điển hình |
|---|---|---|
| `gacha_pack_creating` | Tạo gacha pack definition mới | `standard`, `event`, `seasonal`, `premium`, ... |

---

## 7. Xử lý lỗi

| HTTP status | `error` code | Ý nghĩa | Hành động |
|-------------|--------------|---------|-----------|
| `400` | `invalid_request` | Body sai, UUID không hợp lệ | Kiểm tra lại request |
| `400` | `validation_error` | `code_name` không hợp lệ, `weight` < 1, `quantity_min` < 1, v.v. | Hiển thị lỗi cụ thể từ `message` |
| `402` | `quota_exceeded` | Hết LLM token | Hướng dẫn mua thêm token |
| `403` | `forbidden` | Thiếu quyền tạo gacha pack | Kiểm tra role của studio member |
| `404` | `not_found` | Conversation hoặc item definition không tồn tại | Kiểm tra lại IDs |
| `409` | `conflict` | `code_name` đã tồn tại trong game | Đổi `code_name` rồi lưu lại |

---

## 8. Ví dụ TypeScript đầy đủ

```typescript
// ─── Types ────────────────────────────────────────────────────────────────────

export type GachaPackEntityType =
  | "standard"
  | "event"
  | "seasonal"
  | "daily"
  | "premium"
  | "limited";

export interface DropEntry {
  item_definition_id: string;
  weight: number;
  quantity_min: number;
  quantity_max: number;
}

export interface KeyRequirement {
  item_definition_id: string;
  quantity: number;
}

export interface GachaPackJSON {
  code_name: string;
  name: string;
  collect_destination: "mailbox" | "inventory";
  is_enabled: boolean;
  item_pool: DropEntry[];
  key_requirements: KeyRequirement[];
  metadata: Record<string, string | number>;
}

export interface GachaPackResult extends GachaPackJSON {
  id: string;
  game_id: string;
  created_at: string;
  updated_at: string;
}

// ─── Step 1: Stream LLM output ────────────────────────────────────────────────

/**
 * Streams gacha pack generation from LLM and accumulates the raw markdown+json output.
 * Returns the full accumulated text (unparsed — pass to extractGachaPackBlocks).
 */
async function streamGachaPackCreating(
  gameId: string,
  convId: string,
  userPrompt: string,
  options?: {
    language?: string;
    entityType?: GachaPackEntityType;
    goals?: string[];
    loreEntryIds?: string[];
    itemDefinitionIds?: string[];
    generatedItems?: GachaPackJSON[];
  }
): Promise<string> {
  const body: Record<string, unknown> = {
    user_prompt: userPrompt,
    language: options?.language ?? "en",
  };
  if (options?.entityType)                body["entity_type"]          = options.entityType;
  if (options?.goals?.length)             body["goals"]                = options.goals;
  if (options?.loreEntryIds?.length)      body["lore_entry_ids"]       = options.loreEntryIds;
  if (options?.itemDefinitionIds?.length) body["item_definition_ids"]  = options.itemDefinitionIds;
  if (options?.generatedItems?.length)    body["generated_items"]      = options.generatedItems;

  const res = await fetch(
    `/api/v1/games/${gameId}/llm/conversations/${convId}/requests/gacha-pack-creating`,
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
 * Extracts all gacha pack definition JSON objects from the LLM's fenced code blocks.
 * Each definition is emitted as a separate ```json ... ``` block in the output.
 */
function extractGachaPackBlocks(rawOutput: string): GachaPackJSON[] {
  const results: GachaPackJSON[] = [];
  const fenceRegex = /```json\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(rawOutput)) !== null) {
    try {
      const obj = JSON.parse(match[1].trim()) as GachaPackJSON;
      // Basic sanity check before including
      if (obj.code_name && obj.item_pool?.length > 0) {
        results.push(obj);
      }
    } catch {
      console.warn("Could not parse gacha pack JSON block:", match[1]);
    }
  }

  return results;
}

// ─── Step 3: Validate before saving ──────────────────────────────────────────

const CODE_NAME_REGEX = /^[a-z][a-z0-9_]{0,63}$/;

function validateGachaPack(pack: GachaPackJSON): string | null {
  if (!CODE_NAME_REGEX.test(pack.code_name))
    return `invalid code_name: "${pack.code_name}" — must match ^[a-z][a-z0-9_]{0,63}$`;
  if (!pack.name?.trim())
    return "name cannot be empty";
  if (pack.collect_destination !== "mailbox" && pack.collect_destination !== "inventory")
    return `invalid collect_destination: "${pack.collect_destination}"`;
  if (!pack.item_pool || pack.item_pool.length === 0)
    return "item_pool must have at least one entry";
  for (const entry of pack.item_pool) {
    if (entry.weight < 1)         return `weight must be >= 1 (got ${entry.weight})`;
    if (entry.quantity_min < 1)   return `quantity_min must be >= 1 (got ${entry.quantity_min})`;
    if (entry.quantity_max < entry.quantity_min)
      return `quantity_max (${entry.quantity_max}) must be >= quantity_min (${entry.quantity_min})`;
  }
  for (const key of pack.key_requirements ?? []) {
    if (key.quantity < 1) return `key_requirements quantity must be >= 1 (got ${key.quantity})`;
  }
  return null;
}

// ─── Step 4: Save each definition ────────────────────────────────────────────

/** Saves a single gacha pack definition via POST /api/v1/games/{game_id}/gacha/packs */
async function saveGachaPack(
  gameId: string,
  pack: GachaPackJSON
): Promise<GachaPackResult> {
  const res = await fetch(`/api/v1/games/${gameId}/gacha/packs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getJwt()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pack),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  // Response is the pack object directly (not wrapped in an extra key)
  return res.json() as Promise<GachaPackResult>;
}

// ─── Orchestration ────────────────────────────────────────────────────────────

/** Full flow: generate → parse → validate → save all gacha pack definitions. */
async function generateAndSaveGachaPacks(
  gameId: string,
  convId: string,
  userPrompt: string,
  options?: Parameters<typeof streamGachaPackCreating>[3]
): Promise<GachaPackResult[]> {
  // 1. Stream LLM output
  const rawOutput = await streamGachaPackCreating(gameId, convId, userPrompt, options);

  // 2. Parse all JSON blocks
  const blocks = extractGachaPackBlocks(rawOutput);
  if (blocks.length === 0) {
    throw new Error("LLM returned no parseable gacha pack definitions");
  }

  // 3. Validate locally before hitting the API
  for (const block of blocks) {
    const err = validateGachaPack(block);
    if (err) throw new Error(`Validation failed for "${block.code_name}": ${err}`);
  }

  // 4. Save all
  const saved: GachaPackResult[] = [];
  for (const block of blocks) {
    const result = await saveGachaPack(gameId, block);
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

## 9. Weight và tỉ lệ rơi — tham chiếu nhanh

Weight là số nguyên tương đối — hệ thống tính tỉ lệ bằng `weight / tổng_weight`. Ví dụ với pool: `[7000, 2000, 500, 50]` → tổng = 9550:

| Rarity | Weight gợi ý | Tỉ lệ ví dụ |
|--------|-------------|------------|
| Common | 5000–10000 | ~70–80% |
| Uncommon | 1000–4999 | ~15–25% |
| Rare | 100–999 | ~3–8% |
| Epic | 10–99 | ~0.5–2% |
| Legendary | 1–9 | ~0.01–0.5% |
| Mythic | 1 (tối thiểu) | < 0.01% |

> **Lưu ý**: LLM sẽ tự suy luận weight hợp lý dựa trên `rarity` của item trong `[Item References]` nếu truyền vào `item_definition_ids`.

---

## 10. So sánh với Container Generation

| | Container Generation | Gacha Pack Generation |
|---|---|---|
| Endpoint | `requests/container-creating` | `requests/gacha-pack-creating` |
| Lưu tại | `POST /container-definitions` | `POST /gacha/packs` |
| Response wrap | Bọc trong `"container_definition"` | Không bọc (object trực tiếp) |
| Trường định danh | `name` (tên hiển thị) | `code_name` (slug unique) + `name` |
| Tham số kích thước | `grid_cols × grid_rows` (≤ 1000) | `item_pool` (số lượng không giới hạn) |
| Tham số đặc thù | `container_type`, `is_portable` | `item_pool`, `key_requirements`, `collect_destination` |
| `entity_type` | Loại container (chest, bag, ...) | Loại pack (standard, event, ...) |
