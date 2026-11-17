The **Item Definition** is the most foundational and versatile concept within the system architecture. While it is the most complex element, mastering it is essential as it serves as the "Blueprint" or "Core" for nearly every interaction in the game engine.

---

## 1. Concept Overview

At its surface, an Item Definition represents a physical object. However, to streamline game logic, the system treats various entities, both tangible and abstract, as "Items."

### Physical Items
These are traditional objects players interact with:
* **Equipment:** Weapons, Armor, Bows.
* **Consumables:** Health potions, Mana elixirs.

### Abstract & Logic Items
To simplify coding, you can define non-physical entities as Items to track progress or trigger events:
* **Characters/Units:** Playable characters.
* **Storage:** Chests or inventory bags.
* **Logic Triggers:** Monster kill counts, crafting recipes, or items used specifically to unlock quest lines.
![alt](/tutorial-guides/what-is-item-definition/step-01.png)

---

## 2. Key Attributes & Logic

### Category vs. Rarity
You can define the **Rarity** of an item (e.g., Common, Rare, Legendary). In this system, Rarity is treated as a specialized **Category**.

> [IMPORTANT]
> Defining a rarity level here is for UI purposes only. It does **not** influence the drop probability in Gacha Packs.
> 
> Drop rates are handled separately within the Gacha logic.

### Grid Size
The **Grid Size** property defines the spatial footprint of an item. It determines how many slots an item occupies within an **Item Container**. This becomes critical when designing inventory management systems.
![alt](/tutorial-guides/what-is-item-definition/step-02.png)


### Item Code: The Logic Key
While the system generates a unique **Item ID**, you should primarily interact with the **Item Code**.

* **Custom Definition:** You define the Item Code yourself (e.g., `wpn_fire_sword_01`).
* **Usage:** Use the Item Code to link to game assets (images/sprites) and within your code logic (e.g., `if/else` statements).
* **Best Practice:** Avoid using the auto-generated Item ID for game logic; always rely on your predefined Item Codes for better maintainability.

