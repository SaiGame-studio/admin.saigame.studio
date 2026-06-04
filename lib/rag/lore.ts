/**
 * RAG chunk: Lore creation and management.
 * Injected when the user asks about lore, world-building, characters, factions, locations.
 */

export const KEYWORDS = [
  'lore', 'world', 'world-building', 'character', 'faction', 'location', 'story',
  'lore entry', 'create lore', 'write lore', 'analyze lore', 'update lore',
  'lore_creating', 'lore_analyzing', 'lore_updating', 'lore type',
  'tạo lore', 'thế giới game', 'nhân vật', 'phe phái', 'địa điểm', 'câu chuyện',
]

export const INTENT_TYPES = ['lore_creating', 'lore_analyzing', 'lore_updating']

export const DOC = `
# Lore Creation & Management

## What Is a Lore Entry?
A LoreEntry is a piece of world-building content — a character biography, a faction description, a location detail, a historical event, etc. Lore entries are stored per game and can be referenced by other AI operations to ensure consistent naming and themes.

Fields of a lore entry:
- **lore_type** — category (character, faction, location, event, artifact, etc.)
- **title** — the name of the entity
- **summary** — a short synopsis
- **content** — the full lore text

## How to Create Lore
1. Open a conversation and set a goal like "Build the lore for the Iron Kingdom".
2. Type: "Write a detailed lore entry for the Iron King, a tyrant who rules with an iron fist".
3. The system detects \`lore_creating\` and streams the content.
4. After reviewing, click "Create Lore Records" to save to the game's lore database.

## Lore Types Available
| Type | Examples |
|---|---|
| character | Heroes, villains, NPCs |
| faction | Guilds, kingdoms, enemy factions |
| location | Cities, dungeons, realms |
| event | Wars, disasters, founding events |
| artifact | Legendary weapons, relics, cursed objects |
| creature | Monsters, races, wildlife |

## Lore Analyzing (\`lore_analyzing\`)
Use this when you want the AI to:
- Summarize existing lore for a quick overview
- Find inconsistencies across lore entries
- Extract themes or inspirations from a piece of lore

Example: "Analyze the Dragon Empire lore entries and identify the major conflicts"

## Lore Updating (\`lore_updating\`)
When you want to modify existing lore without rewriting from scratch.
Example: "Update the Iron King's biography to mention his betrayal by his son"

## Using Lore as Item Context
When generating items, link relevant lore entries to the conversation. The AI will:
- Use character names for item naming ("Iron King's Scepter" instead of generic "Royal Scepter")
- Scale item power appropriate to the lore world's tone
- Add lore-consistent flavor text to item descriptions
`
