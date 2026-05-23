# LLM Conversations — Floating Chat Panel

**For:** Frontend / Studio Dashboard team  
**Auth:** JWT (Bearer token) — all endpoints require a logged-in Studio member  
**Base URL:** `https://api.example.com`

---

## 1. Concept

The Conversations panel is a **persistent floating chat window** fixed to the right edge of the screen. It stays mounted across all page navigation — only the content inside changes as the user switches between conversations.

The panel is scoped to the **currently selected game** (`game_id`). When the user navigates to a different game, flush the panel state and reload conversations for the new game.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  Main page content                         │  ╔═══════════════════════════╗  │
│                                            │  ║  AI Conversations    [─][×]║  │
│                                            │  ╠═══════════════════════════╣  │
│                                            │  ║ > Knight Character World  ║  │
│                                            │  ║   Iron Kingdom Lore       ║  │
│                                            │  ╠═══════════════════════════╣  │
│                                            │  ║ [Goal] Build items for…   ║  │
│                                            │  ║                           ║  │
│                                            │  ║ AI: Here are 10 items for ║  │
│                                            │  ║ the Knight class…         ║  │
│                                            │  ║                           ║  │
│                                            │  ║ ┌─────────────────────┐  ║  │
│                                            │  ║ │ Type a message…    ▶ │  ║  │
│                                            │  ║ └─────────────────────┘  ║  │
│                                            │  ╚═══════════════════════════╝  │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Key UX behaviors

| Behavior | Detail |
|---|---|
| Always visible | Panel is rendered outside the main router outlet, persists across route changes |
| Collapsible | Can be minimized to a floating button; state saved in `localStorage` |
| Conversation list | Sidebar within the panel, shows active conversations by default |
| Active conversation | Clicking a conversation opens it and shows the message thread |
| New conversation | Button in panel header opens a "New conversation" form |
| Status tabs | Tabs for `active` / `archived` conversations |
| Create records | Once satisfied with accumulated content, one button materializes the data as item definitions |

---

## 2. Data Model (what the API returns)

### Conversation object

```jsonc
{
  "ID": "uuid",
  "StudioID": "uuid",
  "GameID": "uuid",
  "Title": "Knight Character World",
  "Goal": "Build lore for the Iron Kingdom, then create items for the Knight character class",
  "Summary": "Session has generated 10 items for the Knight class. Iron Kingdom lore established.",
  "AccumulatedContent": {
    "lore": [
      { "name": "The Iron Kingdom", "era": "Ancient", "description": "A militaristic empire..." }
    ],
    "items": [
      { "name": "Iron Sword", "rarity": "common", "description": "...", "attributes": { "attack": 10 } }
    ]
  },
  "CreatedBy": "user-uuid",
  "CreatedAt": "2026-05-22T10:00:00Z",
  "UpdatedAt": "2026-05-22T11:00:00Z",
  "ArchivedAt": null,   // non-null when archived
  "DeletedAt": null
}
```

> **Note:** JSON keys are PascalCase (Go default serialization). Map field names accordingly in your frontend models.

### Derived status

The conversation status is not a stored field — derive it from the timestamps:

```ts
function getStatus(conv: Conversation): 'active' | 'archived' | 'deleted' {
  if (conv.DeletedAt) return 'deleted';
  if (conv.ArchivedAt) return 'archived';
  return 'active';
}
```

### Submit request response

```jsonc
{
  "request_id": "uuid",
  "conversation_id": "uuid",
  "detected_request_type": "item_generation",   // or "lore_building"
  "resolved_system_prompt_id": "uuid",           // null = backend used built-in fallback
  "status": "processing"
}
```

> **Status is always `"processing"` at response time.** The LLM call is synchronous server-side (streams internally) but the HTTP response is `202 Accepted`. After receiving `202`, poll `GET /{conversation_id}` until `Summary` and `AccumulatedContent` are updated (typically 2–8 seconds).

---

## 3. API Reference

All endpoints require:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

Path prefix: `/api/v1/games/{game_id}/llm/conversations`

---

### 3.1 List Conversations

```
GET /api/v1/games/{game_id}/llm/conversations
```

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `status` | `active` \| `archived` \| `all` | `active` | Filter by lifecycle status. `all` returns active + archived, never returns deleted. |
| `limit` | integer | `20` | Max 100 |
| `offset` | integer | `0` | For pagination |

**Response 200**

```json
{
  "conversations": [
    {
      "ID": "uuid-1",
      "Title": "Knight Character World",
      "Goal": "Build items for Knight class",
      "Summary": "10 items generated so far.",
      "AccumulatedContent": { "items": [ ... ] },
      "CreatedAt": "2026-05-22T10:00:00Z",
      "UpdatedAt": "2026-05-22T11:00:00Z",
      "ArchivedAt": null,
      "DeletedAt": null
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0,
  "status": "active"
}
```

**Usage in panel:** Call this on mount and when the user switches the status tab. The `conversations` array is your sidebar list.

---

### 3.2 Create Conversation

```
POST /api/v1/games/{game_id}/llm/conversations
```

**Request body**

```json
{
  "title": "Knight Character World",
  "goal": "Build lore for the Iron Kingdom, then create items for the Knight character class"
}
```

| Field | Required | Description |
|---|---|---|
| `title` | Yes | Short display name shown in the sidebar |
| `goal` | Yes | The session objective — sent to the LLM as context on every request |

**Response 201**

```json
{
  "ID": "new-conv-uuid",
  "Title": "Knight Character World",
  "Goal": "Build lore for the Iron Kingdom, then create items for the Knight character class",
  "Summary": "",
  "AccumulatedContent": {},
  "CreatedBy": "user-uuid",
  "CreatedAt": "2026-05-23T10:00:00Z",
  "UpdatedAt": "2026-05-23T10:00:00Z",
  "ArchivedAt": null,
  "DeletedAt": null
}
```

**Usage in panel:** After `201`, prepend the new conversation to the sidebar list and automatically open it.

---

### 3.3 Get Conversation

```
GET /api/v1/games/{game_id}/llm/conversations/{conversation_id}
```

No request body.

**Response 200** — same shape as a single item from the list.

**Usage in panel:** Call when the user clicks a conversation in the sidebar, or after polling post-submit to refresh `Summary` and `AccumulatedContent`.

---

### 3.4 Update Conversation (title / goal)

```
PATCH /api/v1/games/{game_id}/llm/conversations/{conversation_id}
```

**Request body** — all fields optional, only provided fields are updated

```json
{
  "title": "Knight Class Build v2",
  "goal": "Focus only on equipment items, skip lore"
}
```

**Response 200** — updated conversation object.

**Usage in panel:** Inline editing of title or goal in the conversation header.

---

### 3.5 Submit Request (send a message)

```
POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests
```

**Request body**

```json
{
  "user_prompt": "Create 10 items for the Knight class based on the Iron Kingdom lore",
  "request_type": "item_generation",
  "lore_entry_ids": []
}
```

| Field | Required | Description |
|---|---|---|
| `user_prompt` | Yes | The user's message |
| `request_type` | No | `"item_generation"` or `"lore_building"`. If omitted, the backend auto-detects intent from the message. |
| `lore_entry_ids` | No | Array of lore entry UUIDs to inject as additional context. Pass `[]` or omit if unused. |

**When to include `request_type` explicitly:**
- User clicked a "Generate items" button → `"item_generation"`  
- User clicked a "Build lore" button → `"lore_building"`  
- Free-text chat with no intent button → omit (let the backend detect)

**Response 202**

```json
{
  "request_id": "req-uuid",
  "conversation_id": "conv-uuid",
  "detected_request_type": "item_generation",
  "resolved_system_prompt_id": "prompt-uuid",
  "status": "processing"
}
```

**Error — intent could not be detected (422)**

```json
{
  "error": "intent_undetectable",
  "message": "could not determine request type from message; please specify request_type explicitly"
}
```

On `422 intent_undetectable`: show a hint to the user such as *"Could not determine what you want to do. Please use the 'Generate items' or 'Build lore' button, or be more specific."* Then show action buttons for the user to retry with an explicit `request_type`.

**Polling after 202:**

```
while (true) {
  await sleep(2000);
  const conv = await GET /{conversation_id};
  if (conv.UpdatedAt > requestSentAt) break; // new content arrived
}
```

A simpler check: store the `UpdatedAt` before submitting. When `GET /{conversation_id}` returns a newer `UpdatedAt`, refresh the message display with the new `Summary` and `AccumulatedContent`.

---

### 3.6 Archive Conversation

```
POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/archive
```

No request body.

**Response 200** — updated conversation object with `ArchivedAt` set.

```json
{
  "ID": "conv-uuid",
  "Title": "Knight Character World",
  "ArchivedAt": "2026-05-23T12:00:00Z",
  "DeletedAt": null
}
```

**Errors**

| HTTP | Code | Cause |
|---|---|---|
| `400` | `validation_error` | Already archived or deleted |
| `404` | `not_found` | Conversation not found |

**Usage in panel:** "Archive" option in the conversation context menu (⋮). After success, remove the conversation from the `active` list and move it to `archived` tab.

---

### 3.7 Delete Conversation

```
DELETE /api/v1/games/{game_id}/llm/conversations/{conversation_id}
```

No request body.

**Response 204** — no body.

**Usage in panel:** "Delete" option in the conversation context menu. Show a confirmation dialog before calling. After `204`, remove from sidebar and navigate to the next available conversation (or empty state).

---

### 3.8 Create Records from Conversation

```
POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/create-records
```

No request body.

**Response 201**

```json
{
  "created_count": 8,
  "item_definition_ids": [
    "id-uuid-1",
    "id-uuid-2",
    "...",
    "id-uuid-8"
  ]
}
```

**Usage in panel:** A prominent "Save to game" or "Create items" button shown when `AccumulatedContent.items` is non-empty. After `201`, show a success toast with `created_count` and optionally a link to the item definitions page.

> **Important:** This is a one-way action. It creates real item definition records in the game. Show a confirmation: *"This will create 8 new item definitions. Continue?"*

---

## 4. Error Handling

All errors follow this shape:

```json
{
  "error": "error_code",
  "message": "human-readable description"
}
```

| HTTP | `error` | Meaning | Suggested UI |
|---|---|---|---|
| `400` | `invalid_request` | Malformed request body or invalid UUID | Show form validation error |
| `400` | `validation_error` | Business rule violated (e.g., archiving an already-archived conversation) | Toast with message |
| `401` | `unauthorized` | Missing or expired JWT | Redirect to login |
| `404` | `not_found` | Conversation not found | Show "Conversation not found" empty state |
| `422` | `intent_undetectable` | Auto-detection failed; user must supply `request_type` | Show retry UI with explicit type buttons |
| `500` | `internal_error` | Server error | Toast "Something went wrong, try again" |

---

## 5. Panel State Management

Recommended state shape (React / Vue / any framework):

```ts
interface ConversationPanelState {
  isOpen: boolean;
  isMinimized: boolean;
  activeGameId: string | null;

  // Sidebar
  statusTab: 'active' | 'archived';
  conversations: Conversation[];
  total: number;
  isLoadingList: boolean;

  // Active conversation
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  isLoadingConversation: boolean;

  // Submit
  isSubmitting: boolean;
  pollingRequestSentAt: string | null; // ISO timestamp, null when not polling
}
```

### Lifecycle

```
App mounts
  └─ Panel mounts (outside router)
       └─ Watch activeGameId change
            └─ Reset state, call LIST (status=active)

User opens a conversation
  └─ Call GET /{id}
  └─ Set activeConversation

User sends a message
  └─ Set isSubmitting = true
  └─ Call POST /{id}/requests
  └─ On 202: set pollingRequestSentAt = now, isSubmitting = false
  └─ Poll GET /{id} every 2s until UpdatedAt > pollingRequestSentAt
  └─ Update activeConversation, clear pollingRequestSentAt

User archives a conversation
  └─ Call POST /{id}/archive
  └─ Remove from active list, add to archived list (or refetch both)

User switches page
  └─ Panel stays mounted, no state reset (game_id unchanged)
```

---

## 6. Displaying the Accumulated Content

`AccumulatedContent` is a JSONB object keyed by request type. Use the structure below to display results and drive the "Create Records" button visibility:

```ts
const content = conv.AccumulatedContent;

// Items from item_generation requests
const items: ItemDraft[] = content?.items ?? [];

// Lore from lore_building requests
const loreEntries: LoreDraft[] = content?.lore ?? [];

// Show "Create items" button only when items exist
const canCreateItems = items.length > 0;
```

Each `items` entry shape (as generated by the LLM):

```jsonc
{
  "name": "Iron Sword",
  "rarity": "common",           // common | uncommon | rare | epic | legendary
  "description": "Forged in the Iron Kingdom.",
  "attributes": {
    "attack": 10
  }
}
```

---

## 7. Full Interaction Example

```
User opens panel for game "The Iron Card Game"
  → GET /api/v1/games/{game_id}/llm/conversations?status=active
  ← 200: [] (no conversations yet)

User clicks "New Conversation"
  → POST /api/v1/games/{game_id}/llm/conversations
     { "title": "Knight Build", "goal": "Create 10 items for the Knight class" }
  ← 201: { ID: "conv-1", ... }
  Panel opens "conv-1"

User types: "Generate some weapons for the Knight class"
  → POST /api/v1/games/{game_id}/llm/conversations/conv-1/requests
     { "user_prompt": "Generate some weapons for the Knight class" }
  ← 202: { detected_request_type: "item_generation", status: "processing" }
  Panel shows loading spinner

  (polling every 2s)
  → GET /api/v1/games/{game_id}/llm/conversations/conv-1
  ← 200: { UpdatedAt: "newer", Summary: "10 items generated...", AccumulatedContent: { items: [...] } }
  Panel shows summary, "Create Items" button appears

User types: "Make the sword more powerful"
  → POST .../conv-1/requests
     { "user_prompt": "Make the sword more powerful" }
  ← 202 → poll → updated items

User clicks "Create Items"
  → [Confirmation dialog: "Create 10 item definitions?"]
  → POST .../conv-1/create-records
  ← 201: { created_count: 10, item_definition_ids: [...] }
  Toast: "10 items created successfully"

User archives the conversation
  → POST .../conv-1/archive
  ← 200: { ArchivedAt: "2026-05-23T12:00:00Z" }
  Conversation moves to "Archived" tab
```

---

## 8. localStorage Keys (suggested)

```
ss_conv_panel_open          → "true" | "false"
ss_conv_panel_minimized     → "true" | "false"
ss_conv_active_{game_id}    → conversation_id (last opened per game)
ss_conv_status_tab          → "active" | "archived"
```

Restore these on panel mount so the user's session is preserved across page refreshes.
