# System Overview — Agentic AI Content Generation Platform

### What it is

A web-based platform that enables users to generate and manage structured content through natural language conversation. It combines real-time LLM streaming, automatic intent routing, and persistent conversation memory into a unified workflow.

---

### High-Level Architecture

```mermaid
graph TD
    User["User (Browser)"] -->|natural language prompt| FE["Frontend\nNext.js"]
    FE -->|REST| API["Backend API\nGo"]
    FE -->|SSE streaming| API
    API -->|select provider| LLM["LLM Provider\nGemini / OpenAI / Claude"]
    API -->|read/write| DB[(Database)]
    LLM -->|token-by-token chunks| API
    API -->|stream events| FE
```

---

### Request Pipeline

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant LLM as LLM Provider
    participant DB as Database

    U->>FE: Submit prompt
    FE->>BE: POST /conversations (REST)
    BE-->>FE: conversation_id

    FE->>BE: POST /detect-intent (SSE)
    BE->>LLM: classify prompt (temp=0)
    LLM-->>BE: intent type(s)
    BE-->>FE: stream chunks → done

    loop For each detected intent
        FE->>BE: POST /requests/{type} (SSE)
        BE->>LLM: enriched prompt + context
        LLM-->>BE: content chunks
        BE-->>FE: stream chunks → done
    end

    BE-)DB: background — merge content + rebuild summary
```

---

### Memory Model

```mermaid
graph LR
    subgraph Conversation State
        S["Rolling Summary\n(LLM-generated)"]
        A["Accumulated Content\n(structured JSON)"]
    end

    subgraph Context Injection
        G[Goals]
        R[References]
        H[History]
    end

    S --> Prompt["Enriched Prompt"]
    A --> Prompt
    G --> Prompt
    R --> Prompt
    H --> Prompt
    Prompt --> LLM["LLM Call"]
    LLM -->|response| Update["Background Update"]
    Update --> S
    Update --> A
```

---

### Token Quota Flow

```mermaid
flowchart TD
    Start([New Request]) --> Check{Check Quota}
    Check -->|Premium pool > 0| P["Use Premium\nbest model"]
    Check -->|Free pool > 0| F["Use Free\nlighter model"]
    Check -->|Both exhausted| E["HTTP 402\nQuota Exceeded"]
    P --> Call[LLM Call]
    F --> Call
    Call --> Deduct[Deduct actual tokens used]
    Deduct --> Done([Complete])
```

---

### Why Agentic, Not a Full Agent

| Characteristic | Present |
|---|---|
| LLM-driven intent classification | ✅ |
| Multi-tool dispatch from one prompt | ✅ |
| Persistent cross-session memory | ✅ |
| Autonomous background post-processing | ✅ |
| Self-evaluating ReAct loop | ❌ |
| Autonomous planning without user input | ❌ |

The system operates as a **human-in-the-loop agentic pipeline** — each execution is triggered by a user turn and routes through multiple LLM calls automatically, but does not self-direct toward open-ended goals without human involvement.
