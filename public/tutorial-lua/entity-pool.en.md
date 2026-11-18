This guide covers system limits, weighted randomization, and Gacha integration, helping you transition from basic entity calls to advanced Lua scripting logic.

## 1. Overview
While Battle Scripts can interact directly with an Enemy (Entity) using the `game.get_entity_def_by_key(key_string)` function, utilizing **Entity Pools** is the industry standard for creating dynamic and scalable battle systems. This guide outlines the mechanics, constraints, and configuration steps for Entity Pools.

Entity Pools act as containers that allow Lua Scripts to manage groups of enemies efficiently. They are particularly powerful for implementing randomized encounters, wave-based logic, and reward systems without hard-coding every entity interaction.

---

## 2. Technical Constraints
* **Global Pool Limit:** Each game is restricted to **1,000 pools**. This limit is non-expandable.
* **Entry Limit:** Each individual pool can contain a maximum of **200 entries**.
* **Definition Usage:** Creating or using pools **does not consume** your Entity Definitions limit, making them resource-efficient for large-scale content.
![alt](/tutorial-lua/entity-pool/step-01.png)

---

## 3. Configuration Workflow

### a. Assigning Weights
Every entity added to a pool must be assigned a **Weight**.  When the battle starts, the script queries the pool. If using random selection, the engine calculates the sum of all weights in the pool to determine the outcome.

| Parameter | Requirement | Description |
| :--- | :--- | :--- |
| **Weight** | Required (Integer) | Determines the probability of an entity being selected during a random pick. |

![alt](/tutorial-lua/entity-pool/step-02.png)

> **Note** > If your Battle Script logic does not use weighted randomization (e.g., you are selecting enemies by index), the weight value is elective. You may enter any placeholder value.

### b. Gacha Pack Integration
Entity Pools are not limited to combat logic. You can link a pool to specific **Gacha Packs** to serve as reward distributions within your battle scripts. This automates the transition from "Enemy Defeated" to "Loot Granted."
![alt](/tutorial-lua/entity-pool/step-03.png)

---

## 4. Get ready for battle
1. Add your predefined enemies to the pool.
2. Configure weights if randomization is required for your encounter.

