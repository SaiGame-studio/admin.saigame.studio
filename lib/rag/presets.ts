/**
 * RAG chunk: Preset definition generation.
 * Injected when the user asks about presets, decks, party builds, loadouts.
 */

export const KEYWORDS = [
  'preset', 'deck', 'party', 'loadout', 'relic bag', 'run deck', 'defense layout',
  'preset definition', 'preset_generation', 'template', 'slot-based',
  'bộ trang bị', 'deck bài', 'party nhân vật', 'tạo preset', 'template nhân vật',
]

export const INTENT_TYPES = ['preset_generation']

export const DOC = `
# Preset Definition Generation

## What Is a Preset Definition?
A PresetDefinition is a slot-based template that players use to organize items — a card deck, a party lineup, a gear loadout, a relic bag, etc. It defines how many slots are available and what can go in each slot.

> Note: The \`preset-generation\` backend route may be in preview. Check with your backend team if requests return 404.

## Preset Types (entity_type)
| Type | Description |
|---|---|
| \`deck\` | Card deck (default when unclear) |
| \`party\` | Character party lineup |
| \`loadout\` | Gear/equipment set |
| \`relic_bag\` | Relic/passive item bag |
| \`run_deck\` | Roguelike run deck |
| \`defense_layout\` | Tower defense / strategy layout |

## How to Generate Presets
1. In a conversation, optionally link item definitions the presets should reference.
2. Type: "Create 3 PvP deck templates: an aggressive rush deck, a control deck, and a combo deck. Each should have 30 slots".
3. The AI detects \`preset_generation\` and generates the definitions.
4. Review and save via "Create Records".

## Generated Fields
- **name** — preset display name
- **description** — what this preset is designed for
- **preset_type** — deck / party / loadout / relic_bag / run_deck / defense_layout
- **max_slots** — total number of item slots
- **slot_definitions** — optional: specific slot types with constraints
- **tags** — optional categorization tags

## Using Goals for Precision
Specify goals to control the output:
- \`["max_slots should be exactly 30"]\`
- \`["include both attack and utility slots"]\`
- \`["party should have exactly 1 tank, 2 DPS, 1 healer"]\`
`
