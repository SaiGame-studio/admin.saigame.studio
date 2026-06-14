/**
 * RAG chunk: Conversations (chat sessions).
 * Injected when the user asks about creating, managing, or understanding conversations.
 */
export const KEYWORDS = [
    'conversation', 'chat', 'session', 'panel', 'new conversation', 'archive',
    'delete conversation', 'goal', 'summary', 'accumulated', 'history', 'context',
    'create conversation', 'floating panel', 'sidebar',
    'cuộc hội thoại', 'tạo conversation', 'lịch sử', 'mục tiêu',
];
export const INTENT_TYPES: string[] = [];
export const DOC = `
# Conversations

## What Is a Conversation?
A conversation is a persistent AI chat session scoped to a specific game. It has:
- **Title** � a short name you give it.
- **Goal** � the overall objective for this session (e.g. "Create items for the Knight class").
- **Summary** � an AI-generated rolling summary of what has been discussed and created, updated after each request.
- **AccumulatedContent** � structured JSON of all items/lore generated in this session, merged across turns.

## The Floating Chat Panel
The AI Conversations panel is a persistent floating window on the right side of every page. It stays open as you navigate between pages. It is scoped to the currently active game.

## Conversation Lifecycle
| State | Meaning |
|---|---|
| Active | Normal state, can send messages |
| Archived | Read-only, removed from default list. Use the Archived tab to view |
| Deleted | Soft-deleted, not recoverable from UI |

## Key Actions
- **New conversation** � click the "+" button in the panel header.
- **Archive** � hides the conversation without deleting it. Use when done with a project.
- **Unarchive** � restores an archived conversation to active.
- **Delete** � permanently removes the conversation (requires confirmation).
- **Create Records** � materializes the AccumulatedContent as real game records (item definitions, lore entries, etc.).

## Context Linking
You can link external entities to a conversation for additional context:
- **Lore entries** � the AI will use these as world-building references.
- **Item definitions** � the AI will consider existing items to avoid duplicates or scale numbers correctly.
- **Container definitions** � used as reference when creating gacha packs or presets.

## Why Does the AI "Remember" Things?
The AI uses a two-layer memory per conversation:
1. **Rolling Summary** � a short LLM-generated summary of the session so far, injected into every new request.
2. **Accumulated Content** � the merged JSON of everything generated, also injected as context.
This means you can reference "the sword I just created" or "the dragon lore we wrote" in follow-up prompts.
`;
