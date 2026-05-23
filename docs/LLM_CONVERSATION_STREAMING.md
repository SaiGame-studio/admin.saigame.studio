# LLM Conversation — Streaming Endpoints

Frontend guide for consuming the SSE (Server-Sent Events) endpoints that stream LLM responses in real time.

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | Detect intent from a user prompt (SSE) |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/item-generation` | Stream an item generation response |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/lore-building` | Stream a lore building response |

Both endpoints behave identically — only the request type differs.

**Auth:** JWT required (`Authorization: Bearer <token>`)

---

## Detect Intent Endpoint

### Request

```http
POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_prompt": "I want to create a legendary fire sword"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_prompt` | string | ✅ | The user's message to classify |

### SSE Events

**`chunk`** — raw LLM output fragments (very short, MaxTokens=20):
```json
{"type": "chunk", "text": "item_gen"}
```
```json
{"type": "chunk", "text": "eration"}
```

**`done`** — classification result:
```json
{"type": "done", "detected_request_type": "item_generation"}
```

**`error`** — when the LLM cannot confidently classify:
```json
{"type": "error", "message": "intent undetectable"}
```

Possible values for `detected_request_type`: `item_generation`, `lore_building`.

---

## Request Endpoints

```http
POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/item-generation
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_prompt": "Create a legendary fire sword with unique abilities",
  "lore_entry_ids": []
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_prompt` | string | ✅ | The user's message to the LLM |
| `lore_entry_ids` | string[] | ❌ | UUIDs of lore entries to inject as context |

---

## Response — SSE Stream

The server responds with `Content-Type: text/event-stream`. Each event is a single line:

```
data: <json>\n\n
```

There are three event types, distinguished by the `type` field in the JSON payload.

### 1. `chunk` — Text fragment

Arrives continuously as the LLM generates text. Append each chunk to the display buffer.

```json
{"type": "chunk", "text": "Here is your legendary fire sword"}
```

```json
{"type": "chunk", "text": ", imbued with ancient flames..."}
```

### 2. `done` — Stream complete

Sent once after all chunks have been delivered. Contains metadata about the completed request.

```json
{
  "type": "done",
  "request_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "conversation_id": "94a28da1-bf82-431e-bbf7-bbbadfc5dc00",
  "detected_request_type": "item_generation",
  "status": "completed"
}
```

### 3. `error` — Stream failed

Sent if the LLM call fails mid-stream. Close the connection after receiving this.

```json
{"type": "error", "message": "llm stream: context deadline exceeded"}
```

---

## JavaScript Example

### Using `fetch` + `ReadableStream`

```javascript
async function streamLLMRequest(gameId, conversationId, userPrompt) {
  const url = `/api/v1/games/${gameId}/llm/conversations/${conversationId}/requests/item-generation`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_prompt: userPrompt, lore_entry_ids: [] }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE lines are separated by \n\n
    const lines = buffer.split('\n\n');
    buffer = lines.pop(); // keep incomplete last chunk

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      const payload = JSON.parse(line.slice(6));

      if (payload.type === 'chunk') {
        fullText += payload.text;
        renderChunk(payload.text);          // append to UI
      } else if (payload.type === 'done') {
        onStreamComplete(payload);          // update request_id, status, etc.
        return;
      } else if (payload.type === 'error') {
        throw new Error(payload.message);
      }
    }
  }
}
```

### Using `EventSource` (GET only — not applicable here)

`EventSource` only supports `GET`. Because these endpoints require a `POST` body, use `fetch` as shown above.

---

## React Hook Example

```typescript
import { useState, useCallback } from 'react';

interface StreamState {
  text: string;
  loading: boolean;
  error: string | null;
  requestId: string | null;
}

function useLLMStream(gameId: string, conversationId: string) {
  const [state, setState] = useState<StreamState>({
    text: '',
    loading: false,
    error: null,
    requestId: null,
  });

  const submit = useCallback(async (userPrompt: string, type: 'item-generation' | 'lore-building') => {
    setState({ text: '', loading: true, error: null, requestId: null });

    try {
      const res = await fetch(
        `/api/v1/games/${gameId}/llm/conversations/${conversationId}/requests/${type}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_prompt: userPrompt, lore_entry_ids: [] }),
        }
      );

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop()!;

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          const evt = JSON.parse(part.slice(6));

          if (evt.type === 'chunk') {
            setState(s => ({ ...s, text: s.text + evt.text }));
          } else if (evt.type === 'done') {
            setState(s => ({ ...s, loading: false, requestId: evt.request_id }));
            return;
          } else if (evt.type === 'error') {
            setState(s => ({ ...s, loading: false, error: evt.message }));
            return;
          }
        }
      }
    } catch (err: any) {
      setState(s => ({ ...s, loading: false, error: err.message }));
    }
  }, [gameId, conversationId]);

  return { ...state, submit };
}
```

---

## Rendering Pattern

```tsx
function LLMResponsePanel({ gameId, conversationId }) {
  const { text, loading, error, submit } = useLLMStream(gameId, conversationId);
  const [prompt, setPrompt] = useState('');

  return (
    <div>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} />

      <button onClick={() => submit(prompt, 'item-generation')} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Item'}
      </button>
      <button onClick={() => submit(prompt, 'lore-building')} disabled={loading}>
        {loading ? 'Generating...' : 'Build Lore'}
      </button>

      {error && <p className="error">{error}</p>}

      {/* text streams in character by character — render as-is or pass through a markdown renderer */}
      <pre style={{ whiteSpace: 'pre-wrap' }}>{text}</pre>
    </div>
  );
}
```

---

## Error Handling

| Scenario | What arrives | Recommended action |
|----------|-------------|-------------------|
| Invalid `conversation_id` | HTTP 400 before stream opens | Show error message |
| Conversation is deleted/archived | HTTP 422 before stream opens | Show error message |
| LLM provider fails mid-stream | `{"type":"error","message":"..."}` event | Show error, keep partial text if useful |
| Network drops | `reader.read()` throws | Retry or show reconnect prompt |

---

## Notes

- The connection closes automatically after the `done` or `error` event — no need to manually abort.
- The raw LLM text is saved to the database server-side. After the stream finishes, the full response can also be retrieved via `GET /api/v1/games/{game_id}/llm/conversations/{conversation_id}`.
- `lore_entry_ids` can be omitted or sent as an empty array if no lore context is needed.
