/**
 * RAG chunk: Container definition generation.
 * Injected when the user asks about containers, chests, bags, inventory, vaults, equipment slots.
 */

export const KEYWORDS = [
  'container', 'chest', 'bag', 'inventory', 'vault', 'shulker', 'equipment slot',
  'container definition', 'grid', 'storage', 'slots', 'container_creating', 'code name', 'code_name',
  'itemcontainerdefinition', 'create container', 'slot setup', 'equipment panel',
]

export const INTENT_TYPES = ['container_creating']

export const DOC = `
# Container Definition Generation

## What Is a Container Definition?
An ItemContainerDefinition is a template for a storage container in the game - a grid-based chest, bag, inventory slot, vault, or equipment panel. It defines the container's size, type, and properties, NOT actual items inside it.

## Container Types (entity_type)
| Type | Description |
|---|---|
| \`chest\` | A chest placed in the world (default when unclear) |
| \`bag\` | A bag the player carries |
| \`inventory\` | The player's main auto-managed inventory |
| \`vault\` | Fixed large-capacity storage |
| \`shulker_box\` | A portable container that is itself an item |
| \`equipment\` | Character equipment slots |

## How to Generate Containers
1. In a conversation, type: "Create 3 chest containers: a small wooden chest, a medium iron chest, and a large gold chest".
2. The AI detects \`container_creating\` intent.
3. It generates container definitions with appropriate grid sizes (rows x columns).
4. Review and save via "Create Records".

## Linking Item Definitions for Better Results
When you link item definitions to the conversation, the AI uses them to infer appropriate grid sizes. For example, if your items are large weapons, the AI may generate a wider equipment slot grid.

## Generated Fields
- **name** - container display name
- **code_name** - stable lowercase snake_case identifier
- **description** - flavor text
- **container_type** - chest / bag / inventory / vault / shulker_box / equipment
- **rows** x **columns** - grid dimensions
- **max_weight** - optional weight limit
- **allowed_item_tags** - optional filter (e.g. only weapons)

## Required Format
Every generated container definition must include a non-empty \`code_name\` in lowercase snake_case. If the user does not provide one explicitly, derive a stable code name from the display name.

## Example Prompt
"Create an equipment panel for a warrior class with 6 slots: head, chest, hands, legs, main weapon, off-hand"
`
