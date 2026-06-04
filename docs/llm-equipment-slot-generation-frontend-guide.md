# LLM Equipment Slot Generation — Front-End Integration Guide

**Equipment slot generation** là tính năng dùng AI để tạo **EquipmentSlotDefinition** — blueprint định nghĩa vị trí trang bị trên nhân vật người chơi (ví dụ: `main_hand`, `helmet`, `ring_1`). Studio khai báo các slot một lần; người chơi sau đó equip inventory item vào các slot đã được định nghĩa.

---

## Tổng quan API

| Method | Path | Auth | Protocol |
|--------|------|------|----------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/equipment-slot-generation` | JWT (studio member) | SSE streaming |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | JWT (studio member) | SSE streaming |
| `POST` | `/api/v1/games/{game_id}/equipment-slots` | JWT (studio member, `items:manage`) | JSON (lưu kết quả) |
| `GET`  | `/api/v1/games/{game_id}/equipment-slots` | JWT (studio member, `items:read`) | JSON |
| `GET`  | `/api/v1/games/{game_id}/equipment-slots/{slot_key}` | JWT (studio member, `items:read`) | JSON |
| `PUT`  | `/api/v1/games/{game_id}/equipment-slots/{slot_key}` | JWT (studio member, `items:manage`) | JSON |
| `DELETE` | `/api/v1/games/{game_id}/equipment-slots/{slot_key}` | JWT (studio member, `items:manage`) | JSON |

Headers bắt buộc:
```
Authorization: Bearer <studio_member_jwt>
Content-Type: application/json
```

---

## Điều kiện trước

1. **Conversation đang tồn tại** — tạo conversation trước qua `POST /api/v1/games/{game_id}/llm/conversations`.
2. **Token quota còn đủ** — nếu hết token, API trả `402 Payment Required`.
3. **Item definitions (tuỳ chọn)** — nếu muốn LLM giới hạn slot chỉ nhận item cụ thể (`allowed_item_definition_ids`), truyền `item_definition_ids` vào request. LLM sẽ dùng `item_code` từ các item này để tạo ref placeholder `__REF:ITEM_CODE` — frontend phải resolve về UUID thật trước khi lưu (xem phần 5).

---

## 1. Gọi endpoint `equipment-slot-generation`

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/equipment-slot-generation`

#### Request body

```jsonc
{
  "user_prompt":          "string",   // bắt buộc — mô tả slot cần tạo
  "language":             "string",   // tuỳ chọn — BCP-47, ví dụ: "vi", "en" (mặc định: "en")
  "entity_type":          "string",   // tuỳ chọn — semantic purpose của slot (xem bảng bên dưới)
  "goals":               ["string"],  // tuỳ chọn — hướng dẫn bổ sung cho LLM
  "lore_entry_ids":      ["uuid"],    // tuỳ chọn — lore tham chiếu (chủ đề, naming)
  "item_definition_ids": ["uuid"],    // tuỳ chọn — item tham chiếu để giới hạn allowed_item_definition_ids
  "generated_items":     [{}]         // tuỳ chọn — dùng cho luồng edit/regenerate (xem phần 4)
}
```

**Giá trị hợp lệ cho `entity_type`:**

| Giá trị | Ý nghĩa | `allowed_categories` điển hình |
|---------|---------|-------------------------------|
| `weapon` | Vũ khí chính tay | `["weapon"]` |
| `armor` | Giáp, mũ, ủng, găng tay | `["armor"]` |
| `accessory` | Phụ kiện tổng quát | `["material", "decoration", "other"]` |
| `ring` | Nhẫn | `["material", "decoration", "other"]` |
| `neck` | Vòng cổ / dây chuyền | `["material", "decoration", "other"]` |
| `card` | Thẻ bài / skill card | `["card"]` |
| `character` | Nhân vật có thể trang bị | `["character"]` |
| `relic` | Cổ vật / relic | `["material", "decoration", "other"]` |
| `generic` | Slot đa dụng (không giới hạn) | `[]` (all categories) |

Nếu không truyền `entity_type`, LLM sẽ tự suy diễn từ `user_prompt`. Dùng giá trị từ `detect-intent` khi có (xem phần 6).

#### Ví dụ request

```jsonc
{
  "user_prompt": "Tạo 3 slot trang bị: main hand, off hand và helmet cho game nhập vai",
  "language": "vi",
  "entity_type": "weapon",
  "goals": [
    "Create slot: main_hand (weapon)",
    "Create slot: off_hand (weapon/armor)",
    "Create slot: helmet (armor)"
  ]
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
Tích luỹ tất cả `text` để ghép thành output đầy đủ của LLM.

### 2.3. Done
```
data: {"type":"done","request_id":"...","conversation_id":"...","detected_request_type":"equipment_slot_generation","status":"completed"}

```
Kết thúc stream — lúc này parse chuỗi đã tích luỹ.

### 2.4. Error (terminal)
```
data: {"type":"error","message":"..."}

```
Stream kết thúc sớm do lỗi. Hiển thị `message` cho người dùng.

---

## 3. Parse kết quả — định dạng output

LLM xuất ra **một block per slot definition**, mỗi block theo cấu trúc:

```
## Main Hand

- **Slot Key**: main_hand
- **Name**: Main Hand
- **Description**: Primary weapon slot — equip your main offensive weapon here.
- **Allowed Categories**: weapon
- **Is Active**: true
- **Icon**: icons/slots/main_hand.png
- **Slot Type**: weapon

```json
{ ...JSON object của slot này... }
```

---
```

> **Quan trọng**: Output là **nhiều block riêng biệt** (mỗi block kết thúc bằng `---`), **không phải một JSON array**. Frontend phải tự extract từng JSON block từ fenced code block.

### Cấu trúc JSON mỗi slot definition

```jsonc
{
  "_v": "v20260604.2",
  "slot_key":   "main_hand",
  "name":       "Main Hand",
  "description": "Primary weapon slot — equip your main offensive weapon here.",
  "allowed_categories": ["weapon"],
  "is_active":  true,
  "metadata": {
    "description": "Primary weapon slot — equip your main offensive weapon here.",
    "icon":        "icons/slots/main_hand.png",
    "slot_type":   "weapon"
  }
}
```

**Ví dụ với `allowed_item_definition_ids` (khi truyền `item_definition_ids` vào request):**

```jsonc
{
  "_v": "v20260604.2",
  "slot_key":   "legendary_sword_slot",
  "name":       "Legendary Sword Slot",
  "description": "Exclusive slot for legendary sword-class weapons only.",
  "allowed_categories": ["weapon"],
  "allowed_item_definition_ids": ["__REF:EXCALIBUR", "__REF:IRON_SWORD"],
  "is_active":  true,
  "metadata": {
    "description": "Exclusive slot for legendary sword-class weapons only.",
    "icon":        "icons/slots/legendary_sword.png",
    "slot_type":   "weapon"
  }
}
```

> ⚠️ **`__REF:ITEM_CODE` là placeholder** — chưa phải UUID thật. Frontend **bắt buộc phải resolve** về `item_definition_id` thật trước khi lưu (xem phần 5.1).

### Các trường trong JSON

| Trường | Type | Ghi chú |
|--------|------|---------|
| `_v` | string | Version tag — bỏ qua khi gửi lên backend |
| `slot_key` | string | `^[a-z0-9_]{1,100}$` — unique trong game |
| `name` | string | Tên hiển thị trên UI |
| `description` | string \| omitted | Tooltip của slot — nếu có thì giống `metadata.description` |
| `allowed_categories` | string[] | `[]` = tất cả categories; non-empty = chỉ các categories trong list |
| `allowed_item_definition_ids` | string[] \| omitted | Chỉ xuất hiện khi LLM muốn whitelist item cụ thể; dùng `__REF:CODE` format |
| `is_active` | bool | Mặc định `true` |
| `metadata` | object | Tối đa 50 key (kể cả nested); mỗi key ≤ 500 ký tự |

**`allowed_categories` hợp lệ:**

`weapon` | `armor` | `consumable` | `currency` | `material` | `card` | `container` | `decoration` | `gacha_pack` | `key` | `generator` | `quest` | `recipe` | `character` | `other`

---

## 4. Luồng edit / regenerate

Khi người dùng muốn chỉnh sửa các slot đã tạo trước đó, truyền chúng vào `generated_items`:

```jsonc
{
  "user_prompt": "Đổi helmet thành off_hand và cho phép cả weapon lẫn armor",
  "entity_type": "armor",
  "generated_items": [
    {
      "slot_key":           "helmet",
      "name":               "Helmet",
      "description":        "Head armor slot.",
      "allowed_categories": ["armor"],
      "is_active":          true,
      "metadata": { "description": "Head armor slot.", "icon": "icons/slots/helmet.png", "slot_type": "head" }
    }
  ]
}
```

LLM sẽ xuất ra **số lượng block bằng số phần tử trong `generated_items`** — mỗi phần tử được chỉnh sửa và xuất lại.

---

## 5. Lưu kết quả vào backend

### 5.1. Resolve `__REF:ITEM_CODE` → UUID thật

Trước khi lưu, nếu JSON có `allowed_item_definition_ids` chứa `__REF:*`, frontend phải:

1. Lấy danh sách item definitions đã truyền vào `item_definition_ids` của bước 1.
2. Với mỗi `"__REF:SOME_CODE"`, tìm item có `item_code === "SOME_CODE"` và lấy `id` của nó.
3. Thay thế toàn bộ `__REF:*` bằng UUID thật trước khi gọi API lưu.
4. Nếu không resolve được một `__REF`, **bỏ item đó ra** hoặc hiển thị cảnh báo cho người dùng chọn thủ công.

```typescript
function resolveItemRefs(
  refs: string[],
  itemMap: Map<string, string> // item_code → item_definition_id (UUID)
): string[] {
  const resolved: string[] = [];
  for (const ref of refs) {
    const match = ref.match(/^__REF:(.+)$/);
    if (match) {
      const uuid = itemMap.get(match[1]);
      if (uuid) resolved.push(uuid);
      // else: bỏ qua hoặc warn người dùng
    } else {
      resolved.push(ref); // UUID thật — giữ nguyên
    }
  }
  return resolved;
}
```

### 5.2. Gọi `POST /api/v1/games/{game_id}/equipment-slots`

```jsonc
// POST /api/v1/games/{game_id}/equipment-slots
{
  "slot_key":                   "main_hand",
  "name":                       "Main Hand",
  "description":                "Primary weapon slot — equip your main offensive weapon here.",
  "allowed_categories":         ["weapon"],
  "allowed_item_definition_ids": [],          // [] = no whitelist; hoặc array UUID thật
  "is_active":                  true,
  "metadata": {
    "description": "Primary weapon slot — equip your main offensive weapon here.",
    "icon":        "icons/slots/main_hand.png",
    "slot_type":   "weapon"
  }
}
```

**Response `201 Created`:**

```jsonc
{
  "id":                         "01960000-0000-7000-0000-000000000010",
  "game_id":                    "01960000-0000-7000-0000-000000000002",
  "slot_key":                   "main_hand",
  "name":                       "Main Hand",
  "description":                "Primary weapon slot — equip your main offensive weapon here.",
  "allowed_categories":         ["weapon"],
  "allowed_item_definition_ids": [],
  "is_active":                  true,
  "metadata": {
    "description": "Primary weapon slot — equip your main offensive weapon here.",
    "icon":        "icons/slots/main_hand.png",
    "slot_type":   "weapon"
  },
  "created_by": "01960000-0000-7000-0000-000000000099",
  "created_at": "2026-06-04T10:00:00Z",
  "updated_at": "2026-06-04T10:00:00Z"
}
```

**Ràng buộc cứng từ backend khi lưu:**

| Trường | Ràng buộc |
|--------|-----------|
| `slot_key` | `^[a-z0-9_]{1,100}$` — chữ thường, chỉ alphanumeric + underscore, tối đa 100 ký tự |
| `name` | Không được rỗng |
| `allowed_categories` | Mỗi giá trị phải là ItemCategory hợp lệ |
| `allowed_item_definition_ids` | Mỗi phần tử phải là UUID hợp lệ của item definition thuộc game |
| `metadata` | Tối đa 50 key (kể cả nested); mỗi key ≤ 500 ký tự |

> **Lưu ý về `_v`**: Trường `"_v"` trong JSON output của LLM là version tag nội bộ — **không gửi lên backend**, backend sẽ từ chối nếu nhận field lạ.

---

## 6. Detect-intent (tuỳ chọn — cho luồng chat tự do)

Nếu frontend dùng luồng chat không có nút chọn explicit request type, gọi `detect-intent` trước:

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent`

```jsonc
{
  "user_prompt": "Tạo các slot trang bị cơ bản: tay chính, tay phụ và mũ bảo vệ",
  "history": []
}
```

**Ví dụ kết quả trả về (SSE `done` event):**

```jsonc
{
  "language": "vi",
  "intents": [
    {
      "type":        "equipment_slot_generation",
      "entity_type": "weapon",
      "goal":        "Create main hand, off hand, and helmet equipment slot definitions"
    }
  ],
  "clarification": ""
}
```

Dùng `intents[0].type` để chọn endpoint và `intents[0].entity_type` làm giá trị mặc định cho `entity_type` khi gọi `requests/equipment-slot-generation`.

**Các giá trị `type` có thể trả về cho equipment slot:**

| `type` trả về | Ý nghĩa | `entity_type` điển hình |
|---|---|---|
| `equipment_slot_generation` | Tạo equipment slot definition mới | `weapon`, `armor`, `accessory`, `ring`, `neck`, `card`, `character`, `relic`, `generic` |

---

## 7. Xử lý lỗi

| HTTP status | `error` code | Ý nghĩa | Hành động |
|-------------|--------------|---------|-----------|
| `400` | `invalid_request` | Body sai, UUID không hợp lệ | Kiểm tra lại request |
| `400` | `validation_error` | `slot_key` không hợp lệ, `allowed_categories` chứa giá trị không tồn tại | Hiển thị `message` cụ thể |
| `402` | `quota_exceeded` | Hết LLM token | Hướng dẫn mua thêm token |
| `403` | `forbidden` | Thiếu quyền `items:manage` | Kiểm tra role của studio member |
| `404` | `not_found` | Conversation không tồn tại | Kiểm tra lại `conversation_id` |
| `409` | `conflict` | `slot_key` đã tồn tại trong game | Đổi `slot_key` rồi lưu lại |

---

## 8. Ví dụ TypeScript đầy đủ

```typescript
// ─── Types ────────────────────────────────────────────────────────────────────

export type EquipmentSlotEntityType =
  | "weapon"
  | "armor"
  | "accessory"
  | "ring"
  | "neck"
  | "card"
  | "character"
  | "relic"
  | "generic";

export interface EquipmentSlotJSON {
  slot_key: string;
  name: string;
  description?: string;
  allowed_categories: string[];
  allowed_item_definition_ids?: string[]; // "__REF:CODE" từ LLM — cần resolve trước khi lưu
  is_active: boolean;
  metadata: Record<string, string | number>;
}

export interface EquipmentSlotResult extends Omit<EquipmentSlotJSON, "allowed_item_definition_ids"> {
  id: string;
  game_id: string;
  allowed_item_definition_ids: string[]; // UUID thật
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Step 1: Stream LLM output ────────────────────────────────────────────────

async function streamEquipmentSlotGeneration(
  gameId: string,
  convId: string,
  userPrompt: string,
  options?: {
    language?: string;
    entityType?: EquipmentSlotEntityType;
    goals?: string[];
    loreEntryIds?: string[];
    itemDefinitionIds?: string[];
    generatedItems?: EquipmentSlotJSON[];
  }
): Promise<string> {
  const body: Record<string, unknown> = { user_prompt: userPrompt };
  if (options?.language)          body.language           = options.language;
  if (options?.entityType)        body.entity_type        = options.entityType;
  if (options?.goals?.length)     body.goals              = options.goals;
  if (options?.loreEntryIds?.length)     body.lore_entry_ids     = options.loreEntryIds;
  if (options?.itemDefinitionIds?.length) body.item_definition_ids = options.itemDefinitionIds;
  if (options?.generatedItems?.length)   body.generated_items    = options.generatedItems;

  const res = await fetch(
    `/api/v1/games/${gameId}/llm/conversations/${convId}/requests/equipment-slot-generation`,
    { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) }
  );
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value, { stream: true }).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6));
      if (event.type === "chunk") accumulated += event.text;
      if (event.type === "error") throw new Error(event.message);
      if (event.type === "done")  break;
    }
  }
  return accumulated;
}

// ─── Step 2: Extract JSON blocks from LLM output ─────────────────────────────

function extractSlotBlocks(raw: string): EquipmentSlotJSON[] {
  const results: EquipmentSlotJSON[] = [];
  const fenceRe = /```json\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      // Strip internal version tag before using
      const { _v: _ignored, ...slotDef } = parsed as { _v?: string } & EquipmentSlotJSON;
      results.push(slotDef);
    } catch {
      console.warn("Failed to parse slot JSON block:", match[1]);
    }
  }
  return results;
}

// ─── Step 3: Resolve __REF:CODE → real UUID ───────────────────────────────────

function resolveItemRefs(
  refs: string[] | undefined,
  itemCodeToUUID: Map<string, string>
): string[] {
  if (!refs?.length) return [];
  return refs.reduce<string[]>((acc, ref) => {
    const match = ref.match(/^__REF:(.+)$/);
    if (match) {
      const uuid = itemCodeToUUID.get(match[1]);
      if (uuid) acc.push(uuid);
      // else: unresolvable ref — skip or surface warning to user
    } else {
      acc.push(ref); // already a real UUID
    }
    return acc;
  }, []);
}

// ─── Step 4: Save to backend ──────────────────────────────────────────────────

async function saveEquipmentSlot(
  gameId: string,
  slot: EquipmentSlotJSON,
  itemCodeToUUID: Map<string, string>
): Promise<EquipmentSlotResult> {
  const body = {
    slot_key:                    slot.slot_key,
    name:                        slot.name,
    ...(slot.description ? { description: slot.description } : {}),
    allowed_categories:          slot.allowed_categories,
    allowed_item_definition_ids: resolveItemRefs(slot.allowed_item_definition_ids, itemCodeToUUID),
    is_active:                   slot.is_active ?? true,
    metadata:                    slot.metadata,
  };
  const res = await fetch(`/api/v1/games/${gameId}/equipment-slots`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

async function generateAndSaveEquipmentSlots(
  gameId: string,
  convId: string,
  userPrompt: string,
  options?: {
    language?: string;
    entityType?: EquipmentSlotEntityType;
    goals?: string[];
    itemDefinitionIds?: string[];
    /** item_code → UUID map, built from the items you passed in itemDefinitionIds */
    itemCodeToUUID?: Map<string, string>;
  }
): Promise<EquipmentSlotResult[]> {
  const raw = await streamEquipmentSlotGeneration(gameId, convId, userPrompt, options);
  const slots = extractSlotBlocks(raw);
  const itemMap = options?.itemCodeToUUID ?? new Map<string, string>();
  return Promise.all(slots.map((slot) => saveEquipmentSlot(gameId, slot, itemMap)));
}
```

---

## 9. Lưu ý quan trọng

### `allowed_categories` — `[]` nghĩa là tất cả
Khi LLM trả `"allowed_categories": []`, slot đó **chấp nhận mọi item category** — không phải "không cho phép gì". Đây là hành vi "generic / unrestricted". Hiển thị trong UI nên là `"All categories"` thay vì danh sách rỗng.

### `allowed_item_definition_ids` — secondary filter
Ngay cả khi `allowed_item_definition_ids` có giá trị, item vẫn phải **pass `allowed_categories` trước**. Hai điều kiện là AND, không phải OR.

### Player equip flow
Đây là guide cho **studio tạo slot definition**. Để hiểu player equip/unequip flow, xem:
- `POST /api/v1/games/{game_id}/inventory/equip`
- `POST /api/v1/games/{game_id}/inventory/unequip`
- `GET  /api/v1/games/{game_id}/inventory/equipment-slots` (player view)
