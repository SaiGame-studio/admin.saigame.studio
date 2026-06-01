# LLM System — Flow Documentation

> Source references reflect the actual code in this repository.

---

## 1. Architecture Overview

```
HTTP Client
    │  SSE (text/event-stream)
    ▼
LLMConversationHandler         (internal/handler/llm_conversation_handler.go)
    │
    ▼
LLMConversationUseCase         (internal/usecase/llm_conversation_usecase.go)
    ├── IntentDetector          (internal/services/implementations/llm_intent_detector.go)
    ├── SystemPromptResolver    (domain interface)
    ├── ConversationSummaryBuilder (domain interface)
    ├── GameLLMQuotaRepository  (quota check & deduction)
    └── LLMContentRepository    (request records & provider logs)
             │
             ▼
         loggingProvider        (internal/infrastructure/llm/logging_provider.go)
             │  wraps
             ▼
         domain.LLMProvider     (internal/infrastructure/llm/provider.go)
             │  one of:
             ├── geminiProvider   (internal/infrastructure/llm/gemini.go)
             ├── openaiProvider   (internal/infrastructure/llm/openai.go)
             └── claudeProvider   (internal/infrastructure/llm/claude.go)
```

---

## 2. Startup Wiring

[`cmd/game/main.go`](../cmd/game/main.go#L39-L48)

```
infrallm.LoadConfig()           ← reads env vars (LLM_PROVIDER, GEMINI_API_KEY, ...)
    │
    ▼
infrallm.NewLLMProvider(cfg)    ← selects gemini / openai / anthropic, validates API key
    │  returns domain.LLMProvider
    ▼
infrallm.NewLoggingProvider(inner, contentRepo)
    │  decorates every Stream call with DB logging
    ▼
injected into LLMConversationUseCase, LLMIntentDetector
```

**Provider selection** ([provider.go](../internal/infrastructure/llm/provider.go#L11-L31)):

| `LLM_PROVIDER` | Implementation | Required env vars |
|---|---|---|
| `gemini` (default) | `geminiProvider` | `GEMINI_API_KEY_FREE` and/or `GEMINI_API_KEY_PAID` |
| `openai` | `openaiProvider` | `OPENAI_API_KEY` |
| `anthropic` | `claudeProvider` | `ANTHROPIC_API_KEY` |

**Token profiles** — Gemini is the only provider that uses two key/model pairs based on the caller's quota tier ([config.go](../internal/infrastructure/llm/config.go#L30-L65)):

| Profile | Gemini key / model env vars |
|---|---|
| `TokenProfilePremium` | `GEMINI_API_KEY_PAID` / `GEMINI_MODEL_PAID` (default: `gemini-2.5-flash`) |
| `TokenProfileFree` | `GEMINI_API_KEY_FREE` / `GEMINI_MODEL_FREE` (default: `gemini-2.0-flash-lite`) |

---

## 3. Token Quota — Profile Resolution

Before every LLM call the use-case reads the game's two quota pools and picks a profile
([game_llm_quota.go](../internal/domain/game_llm_quota.go#L84-L94)):

```
quotaRepo.GetPremiumQuota(gameID)  →  premiumRemaining
quotaRepo.GetFreeQuota(gameID)     →  freeRemaining

TokenProfileFor(premiumRemaining, freeRemaining):
    premiumRemaining > 0  →  TokenProfilePremium  (paid key + best model)
    freeRemaining    > 0  →  TokenProfileFree     (free key + cheaper model)
    both exhausted        →  TokenProfileNone     →  ErrLLMTokenQuotaExceeded (HTTP 402)
```

After a successful call, actual `inputTokens + outputTokens` are deducted from the selected pool
([llm_conversation_usecase.go](../internal/usecase/llm_conversation_usecase.go#L487-L494)).

---

## 4. Intent Detection Flow

Used when the client does **not** supply an explicit `request_type`, or when the
`POST /detect-intent` endpoint is called directly.

[`LLMIntentDetector`](../internal/services/implementations/llm_intent_detector.go)

```
classifyPrompt(typeList, userPrompt, history, loreEntryCount)
    │  builds system message (classifier instructions + valid type list)
    │  builds user message (history turns + current prompt)
    ▼
domain.LLMRequest{
    MaxTokens:   300,
    Temperature: 0.0,      ← deterministic
    JSONMode:    false,
    Profile:     <from quota check>,
}
    ▼
provider.Stream(ctx, req)  →  channel of LLMStreamChunk
    │  accumulates content
    ▼
parseClassifyResult(rawJSON) → []DetectedIntent{Type, EntityType, Goal}, detectedLanguage
    │  on "unknown" type → IntentUndetectableError (carries LLM clarification message)
    ▼
returns ([]DetectedIntent, lang, inputTokens, outputTokens, error)
```

Each `DetectedIntent` carries:
- `Type` — one of the known `LLMRequestType` values
- `EntityType` — inferred entity category (e.g. `weapon`, `character`)
- `Goal` — short verb phrase describing the user's intent

---

## 5. Main Request Flow — `StreamRequest`

**Entry point:** `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/{type}` (SSE)

[`llm_conversation_usecase.go#StreamRequest`](../internal/usecase/llm_conversation_usecase.go#L279)

```
Step 1 — Load conversation
    convRepo.FindConversation(studioID, gameID, convID)
    → ErrLLMConversationNotFound if missing / deleted

Step 2 — Resolve request type
    if RequestType == nil (auto-detect):
        quota check → select intentProfile
        contentRepo.CreateRequest(intentRecord, status=pending)
        LLMIntentDetector.DetectIntent(...)   ← pre-flight LLM call
        contentRepo.CompleteRequest / FailRequest
        primary intent's Type → reqType
        detected language → input.Language (if not already set)
        detected entityType → input.EntityType (if not already set)
    else:
        validate known type → reqType = *RequestType

Step 3 — Resolve system prompt
    promptResolver.Resolve(ctx, gameID, string(reqType))
    → returns *SystemPrompt (custom) or FallbackSystemPrompt (built-in)
    replace {{ENTITY_TYPE}} and {{LANGUAGE}} placeholders in system content

Step 4 — Build enriched user prompt
    assemble parts in order:
        [Goals]                  (from input.Goals)
        [Lore Content]           (from input.MainContent — lore-analyzing only)
        [Lore References]        (fetched from loreRepo by LoreEntryIDs)
        [Item References]        (fetched from itemDefRepo by ItemDefinitionIDs)
        [Generated Items]        (from input.GeneratedItems — edit/regen workflows)
        [Session Summary]        (conv.Summary — LLM-generated rolling summary)
        [Current Data]           (conv.AccumulatedContent as JSON)
        [User Request]           (raw user prompt)

Step 5 — Persist LLM request record
    contentRepo.CreateRequest(record{status: pending})

Step 6 — Quota check
    TokenProfileFor(premiumRemaining, freeRemaining)
    → TokenProfileNone → FailRequest → ErrLLMTokenQuotaExceeded (HTTP 402)

Step 6b — Call LLM provider (streaming)
    llmProvider.Stream(ctx, LLMRequest{
        Messages:    [{system, systemContent}, {user, enrichedPrompt}],
        MaxTokens:   4096,
        Temperature: 0.7,
        Profile:     <selected profile>,
    })
    → for each chunk: call onChunk(chunk.Content) → SSE data event to client
    → final Done chunk carries inputTokens, outputTokens

    deduct actualTokens (main + intent) from quota pool

Step 7 — Complete request record
    contentRepo.CompleteRequest(record.ID, rawContent, inputTokens, outputTokens, providerName)

Step 7 (background goroutine) — Post-processing (non-fatal, best-effort)
    parseRawContent(raw)              → newContent map
    mergeAccumulated(existing, type, newContent)
    summaryBuilder.BuildSummary(...)  ← optional LLM call for rolling summary
    convRepo.UpdateConversationContext(convID, newSummary, mergedContent)

Return SubmitConversationRequestOutput{RequestID, ConversationID, DetectedRequestType, Status}
```

---

## 6. SSE Event Protocol

All streaming endpoints respond with `Content-Type: text/event-stream`.

```
: connected\n\n                         ← initial ping on connection

data: {"type":"chunk","text":"..."}\n\n ← one per LLM chunk (0-N events)

data: {"type":"error","message":"..."}\n\n  ← on failure (terminal)

data: {"type":"done",
       "request_id":"...",
       "conversation_id":"...",
       "detected_request_type":"...",
       "status":"completed"}\n\n        ← final event on success
```

For `detect-intent` the `done` event carries:
```json
{ "type": "done", "detected_language": "en", "detected_intents": [...] }
```

---

## 7. Logging Provider Decorator

[`logging_provider.go`](../internal/infrastructure/llm/logging_provider.go)

Every `Stream` call is instrumented transparently:

```
Stream(ctx, req):
    1. Marshal req → requestPayload JSON
    2. Extract LLMRequestID, RequestType, CallerID from context
    3. contentRepo.CreateProviderLog(entry{status: pending})
    4. inner.Stream(ctx, req)
       → on error: contentRepo.FailProviderLog(entry.ID, errMsg)
    5. launch goroutine to drain innerCh:
       → forward every chunk to outCh
       → on chunk.Err: FailProviderLog
       → on chunk.Done: CompleteProviderLog(entry.ID, fullContent, tokens, model)
    6. return outCh to caller
```

The log record (`llm_provider_logs`) links back to `llm_requests` via `llm_request_id`
and stores the raw request payload, provider name, model, and final token counts.

---

## 8. HTTP Endpoints Summary

| Method | Path | Handler | Auth |
|---|---|---|---|
| `POST` | `/api/v1/games/{game_id}/llm/conversations` | `Create` | JWT |
| `GET` | `/api/v1/games/{game_id}/llm/conversations` | `List` | JWT |
| `GET` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}` | `Get` | JWT |
| `PATCH` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}` | `Update` | JWT |
| `DELETE` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}` | `Delete` | JWT |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/item-generation` | `StreamItemGeneration` | JWT — SSE |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/item-modify` | `StreamItemModify` | JWT — SSE |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/lore-creating` | `StreamLoreCreating` | JWT — SSE |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/lore-analyzing` | `StreamLoreAnalyzing` | JWT — SSE |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | `DetectIntent` | JWT — SSE |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/archive` | `Archive` | JWT |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/unarchive` | `Unarchive` | JWT |

---

## 9. Domain Types Reference

| Type | File | Description |
|---|---|---|
| `LLMProvider` | [`domain/llm.go`](../internal/domain/llm.go#L132) | Single interface for all provider calls (`Stream`, `Name`, `Model`, `ModelForProfile`) |
| `LLMRequest` | [`domain/llm.go`](../internal/domain/llm.go#L86) | Normalized input: messages, max tokens, temperature, JSON mode, profile |
| `LLMStreamChunk` | [`domain/llm.go`](../internal/domain/llm.go#L115) | Incremental chunk; final chunk has `Done=true` and carries token counts |
| `TokenProfile` | [`domain/game_llm_quota.go`](../internal/domain/game_llm_quota.go#L72) | `Premium` / `Free` / `None` — selects which key+model pair to use |
| `LLMConversation` | [`domain/llm_conversation.go`](../internal/domain/llm_conversation.go#L52) | Stateful session with rolling summary and accumulated content |
| `DetectedIntent` | [`domain/llm_conversation.go`](../internal/domain/llm_conversation.go#L107) | Single classified intent: type, entity type, goal |
| `IntentDetector` | [`domain/llm_conversation.go`](../internal/domain/llm_conversation.go#L124) | Interface for intent detection (blocking + streaming variants) |
| `SystemPromptResolver` | [`domain/llm_conversation.go`](../internal/domain/llm_conversation.go#L131) | Resolves the best system prompt for a game + request type |
