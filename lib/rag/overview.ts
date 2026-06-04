/**
 * RAG chunk: Platform overview.
 * Injected when the user asks general "what is", "how does it work", "what can I do" questions.
 */

export const KEYWORDS = [
  'what is', 'how does', 'overview', 'platform', 'explain', 'introduce',
  'saigame', 'studio', 'admin', 'system', 'features', 'capabilities',
  'hệ thống', 'là gì', 'giới thiệu', 'tổng quan', 'làm được gì',
]

export const INTENT_TYPES: string[] = []

export const DOC = `
# SaiGame Studio Admin Platform — Overview

## What It Is
A web-based admin platform for game studios to create and manage game content (items, lore, quests, gacha packs, containers, presets) using AI-assisted generation via natural language conversation.

## Core Concepts
- **Studio** — an organization that owns one or more games.
- **Game** — the project scope. All content (items, lore, conversations) is scoped to a game.
- **Conversation** — a persistent AI chat session tied to a game. The AI remembers context within a conversation across turns via a rolling summary and accumulated content.
- **Request type** — the kind of AI task (e.g. item_generation, lore_creating, gacha_pack_creating). The system auto-detects the type from your prompt, or you can specify it explicitly.

## Main AI Features
| Feature | Request Type | What It Creates |
|---|---|---|
| Item generation | item_generation | ItemDefinition records |
| Item edit | item_modify | Updated item definitions |
| Lore creation | lore_creating | LoreEntry records |
| Lore analysis | lore_analyzing | Analysis / insights |
| Lore update | lore_updating | Updated lore entries |
| Container creation | container_creating | ItemContainerDefinition |
| Gacha pack creation | gacha_pack_creating | GachaPack definition |
| Preset generation | preset_generation | PresetDefinition |

## How a Typical Workflow Looks
1. Create a conversation with a goal (e.g. "Build items for a Knight character class").
2. Type a natural language prompt.
3. The AI auto-detects what you want and routes to the right generation endpoint.
4. The AI streams the generated content back in real time.
5. Review the content in the conversation panel.
6. Click "Create Records" to save the generated content to the game database.

## Token System
Every LLM call consumes tokens. Each game has:
- **Free pool** — provided by the platform on game creation.
- **Premium pool** — purchased by the studio.
Premium tokens are used first. When both pools are exhausted, AI calls return HTTP 402.
`
