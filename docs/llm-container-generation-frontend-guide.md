# LLM Container Generation — Front-End Integration Guide

**Container generation** là tính năng dùng AI để tạo **ItemContainerDefinition** — các template định nghĩa kho lưu trữ dạng lưới (chest, bag, vault, inventory, shulker box, equipment) mà studio thiết kế sẵn cho game.

---

## Tổng quan API

| Method | Path | Auth | Protocol |
|--------|------|------|----------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/container-generation` | JWT (studio member) | SSE streaming |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | JWT (studio member) | SSE streaming |
| `POST` | `/api/v1/games/{game_id}/container-definitions` | JWT (studio member, quyền `container_definitions:create`) | JSON (lưu kết quả) |
| `GET`  | `/api/v1/games/{game_id}/container-definitions` | JWT (studio member, quyền `container_definitions:read`) | JSON |

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

## 1. Gọi endpoint `container-generation`

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/container-generation`

#### Request body

```jsonc
{
  "user_prompt":         "string",   // bắt buộc — mô tả container cần tạo
  "language":            "string",   // tuỳ chọn — BCP-47, ví dụ: "vi", "en" (mặc định: "en")
  "entity_type":         "string",   // tuỳ chọn — loại container mặc định khi LLM không tự suy luận được
  "goals":              ["string"],   // tuỳ chọn — hướng dẫn bổ sung, ví dụ: ["create 3 chests of different sizes"]
  "lore_entry_ids":     ["uuid"],    // tuỳ chọn — lore tham chiếu (để LLM đặt tên/mô tả nhất quán với thế giới)
  "item_definition_ids":["uuid"],    // tuỳ chọn — item definition tham chiếu (để LLM suy luận kích thước grid hợp lý)
  "generated_items":    [{}]         // tuỳ chọn — dùng cho luồng edit/regenerate (xem phần 4)
}
```

**Giá trị hợp lệ cho `entity_type`:**

| Giá trị | Ý nghĩa |
|---------|---------|
| `chest` | Rương đặt trong thế giới (mặc định khi không rõ) |
| `bag` | Túi xách người chơi mang theo |
| `inventory` | Inventory chính được quản lý tự động bởi hệ thống |
| `vault` | Kho lưu trữ cố định dung lượng lớn |
| `shulker_box` | Container di động, bản thân cũng là một item |
| `equipment` | Slot trang bị của nhân vật |

#### Ví dụ request

```jsonc
{
  "user_prompt": "Tạo 3 loại rương lưu trữ: rương gỗ nhỏ, rương sắt vừa, và rương vàng lớn",
  "language": "vi",
  "entity_type": "chest",
  "goals": ["sizes should scale from small to large"]
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
data: {"type":"done","request_id":"...","conversation_id":"...","detected_request_type":"container_generation","status":"completed"}

```
Kết thúc stream — lúc này parse chuỗi đã tích luỹ.

### 2.4. Error (terminal)
```
data: {"type":"error","message":"..."}

```
Stream kết thúc sớm do lỗi. Hiển thị `message` cho người dùng.

---

## 3. Parse kết quả — định dạng output

LLM xuất ra **một block per container definition**, mỗi block theo cấu trúc:

```
## <Tên container>
- **Name**: <tên hiển thị>
- **Container Type**: <loại>
- **Grid**: <grid_cols>×<grid_rows>
- **Is Portable**: <true|false>
- **Description**: <mô tả một câu>
- ...các metadata fields khác...

```json
{ ...JSON object của định nghĩa này... }
```

---
```

> **Quan trọng**: Output là **nhiều block riêng biệt** (mỗi block kết thúc bằng `---`), **không phải một JSON array**. Frontend phải tự extract từng JSON block.

### Cấu trúc JSON mỗi container definition

```jsonc
{
  "name":           "Wooden Chest",    // tên hiển thị, không rỗng
  "container_type": "chest",           // một trong 6 loại hợp lệ
  "grid_cols":      9,                 // số cột >= 1
  "grid_rows":      3,                 // số hàng >= 1; grid_cols * grid_rows <= 1000
  "is_portable":    false,             // người chơi có thể mang theo không
  "metadata": {
    "description": "Rương gỗ 27 ô đặt trong thế giới để lưu trữ vật phẩm.",
    "icon":        "icons/containers/wooden_chest.png",
    "ui_label":    "Chest",
    "ui_color":    "#8B4513"
    // ...các key tuỳ chỉnh khác...
  }
}
```

**Ràng buộc cứng từ backend khi lưu:**

| Trường | Ràng buộc |
|--------|-----------|
| `name` | Không được rỗng |
| `container_type` | Phải là một trong: `chest`, `bag`, `inventory`, `vault`, `shulker_box`, `equipment` |
| `grid_cols` | >= 1 |
| `grid_rows` | >= 1 |
| `grid_cols × grid_rows` | <= 1000 |
| `is_portable` | `true` hoặc `false` |
| `metadata` | Tối đa 50 key (kể cả nested); mỗi key ≤ 500 ký tự |

---

## 4. Luồng edit / regenerate

Khi người dùng muốn chỉnh sửa các container đã tạo trước đó, truyền chúng vào `generated_items`:

```jsonc
{
  "user_prompt": "Tăng kích thước rương gỗ lên 9×6 và đổi màu UI sang màu xanh",
  "entity_type": "chest",
  "generated_items": [
    {
      "name": "Wooden Chest",
      "container_type": "chest",
      "grid_cols": 9,
      "grid_rows": 3,
      "is_portable": false,
      "metadata": { "description": "..." }
    }
  ]
}
```

LLM sẽ xuất ra **số lượng block bằng số phần tử trong `generated_items`** — mỗi phần tử được chỉnh sửa và xuất lại.

---

## 5. Lưu kết quả vào backend

Sau khi parse xong, gọi `POST /api/v1/games/{game_id}/container-definitions` cho từng định nghĩa:

```jsonc
// POST /api/v1/games/{game_id}/container-definitions
{
  "name":           "Wooden Chest",
  "container_type": "chest",
  "grid_cols":      9,
  "grid_rows":      3,
  "is_portable":    false,
  "metadata": {
    "description": "Rương gỗ 27 ô đặt trong thế giới để lưu trữ vật phẩm.",
    "icon":        "icons/containers/wooden_chest.png",
    "ui_label":    "Chest",
    "ui_color":    "#8B4513"
  }
}
```

**Response `201 Created`:**

```jsonc
{
  "container_definition": {
    "id":             "01960000-0000-7000-0000-000000000001",
    "game_id":        "01960000-0000-7000-0000-000000000002",
    "name":           "Wooden Chest",
    "container_type": "chest",
    "grid_cols":      9,
    "grid_rows":      3,
    "is_portable":    false,
    "instanced_per_item": false,
    "metadata": { ... },
    "created_at":     "2026-06-02T10:00:00Z",
    "updated_at":     "2026-06-02T10:00:00Z"
  }
}
```

> **Lưu ý**: Response được bọc trong key `"container_definition"` — khác với preset definitions (không bọc). Nhớ unwrap khi lấy `id`.

---

## 6. Detect-intent (tuỳ chọn — cho luồng chat tự do)

Nếu frontend dùng luồng chat không có nút chọn explicit request type, gọi `detect-intent` trước:

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent`

```jsonc
{
  "user_prompt": "Tạo mấy cái rương để lưu đồ trong dungeon",
  "history": []
}
```

**Ví dụ kết quả trả về (SSE `done` event):**

```jsonc
{
  "language": "vi",
  "intents": [
    {
      "type":        "container_generation",
      "entity_type": "chest",
      "goal":        "Create storage chests for dungeon"
    }
  ],
  "clarification": ""
}
```

Dùng `intents[0].type` để chọn endpoint và `intents[0].entity_type` làm giá trị mặc định cho `entity_type` khi gọi `requests/container-generation`.

**Các giá trị `type` có thể trả về cho container:**

| `type` trả về | Ý nghĩa | `entity_type` điển hình |
|---|---|---|
| `container_generation` | Tạo container definition mới | `chest`, `bag`, `vault`, ... |

---

## 7. Xử lý lỗi

| HTTP status | `error` code | Ý nghĩa | Hành động |
|-------------|--------------|---------|-----------|
| `400` | `invalid_request` | Body sai, UUID không hợp lệ | Kiểm tra lại request |
| `400` | `validation_error` | `container_type` không hợp lệ, grid < 1, grid_cols × grid_rows > 1000 | Hiển thị lỗi cụ thể từ `message` |
| `402` | `quota_exceeded` | Hết LLM token | Hướng dẫn mua thêm token |
| `403` | `forbidden` | Thiếu quyền `container_definitions:create` | Kiểm tra role của studio member |
| `404` | `not_found` | Conversation không tồn tại | Tạo lại conversation |

---

## 8. Ví dụ TypeScript đầy đủ

```typescript
// ─── Types ────────────────────────────────────────────────────────────────────

export type ContainerType =
  | "chest"
  | "bag"
  | "inventory"
  | "vault"
  | "shulker_box"
  | "equipment";

export interface ContainerDefinitionJSON {
  name: string;
  container_type: ContainerType;
  grid_cols: number;
  grid_rows: number;
  is_portable: boolean;
  metadata: Record<string, string | number>;
}

export interface ContainerDefinitionResult {
  id: string;
  game_id: string;
  name: string;
  container_type: ContainerType;
  grid_cols: number;
  grid_rows: number;
  is_portable: boolean;
  instanced_per_item: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Step 1: Stream LLM output ────────────────────────────────────────────────

/**
 * Streams container generation from LLM and accumulates the raw markdown+json output.
 * Returns the full accumulated text (unparsed — pass to extractContainerBlocks).
 */
async function streamContainerGeneration(
  gameId: string,
  convId: string,
  userPrompt: string,
  options?: {
    language?: string;
    entityType?: ContainerType;
    goals?: string[];
    loreEntryIds?: string[];
    itemDefinitionIds?: string[];
    generatedItems?: ContainerDefinitionJSON[];
  }
): Promise<string> {
  const body: Record<string, unknown> = {
    user_prompt: userPrompt,
    language: options?.language ?? "en",
  };
  if (options?.entityType)               body["entity_type"]          = options.entityType;
  if (options?.goals?.length)            body["goals"]                = options.goals;
  if (options?.loreEntryIds?.length)     body["lore_entry_ids"]       = options.loreEntryIds;
  if (options?.itemDefinitionIds?.length) body["item_definition_ids"] = options.itemDefinitionIds;
  if (options?.generatedItems?.length)   body["generated_items"]      = options.generatedItems;

  const res = await fetch(
    `/api/v1/games/${gameId}/llm/conversations/${convId}/requests/container-generation`,
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
 * Extracts all container definition JSON objects from the LLM's fenced code blocks.
 * Each definition is emitted as a separate ```json ... ``` block in the output.
 */
function extractContainerBlocks(rawOutput: string): ContainerDefinitionJSON[] {
  const results: ContainerDefinitionJSON[] = [];
  const fenceRegex = /```json\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(rawOutput)) !== null) {
    try {
      const obj = JSON.parse(match[1].trim()) as ContainerDefinitionJSON;
      // Basic sanity check before including
      if (obj.name && obj.container_type) {
        results.push(obj);
      }
    } catch {
      console.warn("Could not parse container JSON block:", match[1]);
    }
  }

  return results;
}

// ─── Step 3: Validate before saving ─────────────────────────────────────────

const VALID_CONTAINER_TYPES: ContainerType[] = [
  "chest", "bag", "inventory", "vault", "shulker_box", "equipment",
];
const MAX_CONTAINER_CELLS = 1000;

function validateContainerDefinition(def: ContainerDefinitionJSON): string | null {
  if (!def.name?.trim()) return "name cannot be empty";
  if (!VALID_CONTAINER_TYPES.includes(def.container_type))
    return `invalid container_type: ${def.container_type}`;
  if (def.grid_cols < 1) return "grid_cols must be >= 1";
  if (def.grid_rows < 1) return "grid_rows must be >= 1";
  if (def.grid_cols * def.grid_rows > MAX_CONTAINER_CELLS)
    return `grid_cols × grid_rows must be <= ${MAX_CONTAINER_CELLS}`;
  return null;
}

// ─── Step 4: Save each definition ────────────────────────────────────────────

/** Saves a single container definition via POST /api/v1/games/{game_id}/container-definitions */
async function saveContainerDefinition(
  gameId: string,
  def: ContainerDefinitionJSON
): Promise<ContainerDefinitionResult> {
  const res = await fetch(`/api/v1/games/${gameId}/container-definitions`, {
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

  // Response is wrapped: { "container_definition": { ... } }
  const data = await res.json() as { container_definition: ContainerDefinitionResult };
  return data.container_definition;
}

// ─── Orchestration ────────────────────────────────────────────────────────────

/** Full flow: generate → parse → validate → save all definitions. */
async function generateAndSaveContainers(
  gameId: string,
  convId: string,
  userPrompt: string,
  options?: Parameters<typeof streamContainerGeneration>[3]
): Promise<ContainerDefinitionResult[]> {
  // 1. Stream LLM output
  const rawOutput = await streamContainerGeneration(gameId, convId, userPrompt, options);

  // 2. Parse all JSON blocks
  const blocks = extractContainerBlocks(rawOutput);
  if (blocks.length === 0) {
    throw new Error("LLM returned no parseable container definitions");
  }

  // 3. Validate locally before hitting the API
  for (const block of blocks) {
    const err = validateContainerDefinition(block);
    if (err) throw new Error(`Validation failed for "${block.name}": ${err}`);
  }

  // 4. Save all
  const saved: ContainerDefinitionResult[] = [];
  for (const block of blocks) {
    const result = await saveContainerDefinition(gameId, block);
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

## 9. Các container type — tham chiếu nhanh

| `container_type` | Ý nghĩa | Grid thường dùng | `is_portable` thường dùng |
|---|---|---|---|
| `chest` | Rương đặt trong thế giới | 9×3 (27 ô) hoặc 9×6 (54 ô) | `false` |
| `bag` | Túi xách người chơi mang theo | 9×2 đến 9×4 (18–36 ô) | `true` |
| `inventory` | Inventory chính (hệ thống tự tạo khi player join game) | 9×4 (36 ô) | `false` |
| `vault` | Kho lưu trữ cố định dung lượng lớn | 9×6 đến 10×10 (54–100 ô) | `false` |
| `shulker_box` | Container di động, bản thân là một item | 9×3 (27 ô) | `true` |
| `equipment` | Slot trang bị nhân vật (mỗi ô = một slot trang bị) | 1×6 đến 4×4 (6–16 ô) | `false` |

> **Giới hạn cứng:** `grid_cols × grid_rows` không được vượt quá **1000 ô**.

---

## 10. So sánh với Preset Generation

| | Preset Generation | Container Generation |
|---|---|---|
| Endpoint | `requests/preset-generation` | `requests/container-generation` |
| Lưu tại | `POST /preset-definitions` | `POST /container-definitions` |
| Response wrap | Không bọc (object trực tiếp) | Bọc trong `"container_definition"` |
| Trường định danh | `code_name` (slug unique) | `name` (tên hiển thị, không unique) |
| Tham số kích thước | `max_slots` (0–70) | `grid_cols × grid_rows` (≤ 1000) |
| Trường di động | — | `is_portable` (bool) |
