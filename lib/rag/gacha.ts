/**
 * RAG chunk: Gacha pack generation.
 * Injected when the user asks about gacha, loot boxes, reward pools, drop rates, keys.
 */
export const KEYWORDS = [
    'gacha', 'loot box', 'lootbox', 'gacha pack', 'drop rate', 'reward pool',
    'pull', 'banner', 'key', 'gacha_pack_creating', 'item pool', 'weight',
    'hộp gacha', 'tạo gacha', 'xác suất rơi', 'pool phần thưởng', 'mở hộp',
];
export const INTENT_TYPES = ['gacha_pack_creating'];
export const DOC = `
# Gacha Pack Generation

## What Is a Gacha Pack?
A GachaPack definition is a configuration for a loot box � it defines what items can drop, their weights (probabilities), what key/currency is needed to open it, and where the player receives rewards.

## Prerequisites
Before generating a gacha pack, you need **item definitions already saved** in your game. The pack references items by their IDs in the item pool.

## Pack Types (entity_type)
| Type | Description |
|---|---|
| `standard` | Regular everyday pack (default) |
| `event` | Limited-time event pack |
| `seasonal` | Seasonal pack (holiday, festival) |
| `daily` | Opened once per day |
| `premium` | High-end pack with rarer rewards |
| `limited` | Limited quantity pack |

## How to Generate a Gacha Pack
1. Make sure item definitions exist in your game (generate them first if needed).
2. In a conversation, link the relevant item definitions.
3. Type: "Create a premium fire-themed gacha pack with a 1% chance for legendary items".
4. The AI detects `gacha_pack_creating` and generates the pack definition with weighted pools.
5. Review drop rates and save via "Create Records".

## Generated Fields
- **name** � pack display name
- **description** � marketing text
- **pack_type** � standard / event / seasonal / daily / premium / limited
- **item_pool** � array of items with weights (higher weight = higher drop chance)
- **key_requirements** � what currency/key is needed to open (item_definition_id + count)
- **reward_delivery** � which container definition receives the rewards
- **open_limit** � optional max opens per player
- **available_from / available_until** � optional date range for limited packs

## Understanding Weights
Weights are relative, not percentages. Example:
- Legendary sword: weight 1
- Rare armor: weight 10
- Common potion: weight 89
→ Total weight = 100 → 1% legendary, 10% rare, 89% common.

## Tips for Better Results
- Link existing item definitions so the AI can reference real items.
- Link lore entries to get thematically named packs.
- Use `goals` to specify exact drop rate targets: `["legendary items must be under 1%", "include at least 5 items"]`.
`;
