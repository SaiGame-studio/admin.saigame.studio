Item Generators control resource flow via timed intervals and caps to prevent game economy inflation.

## Overview
An **Item Generator** is a specialized extension of the **Item Definition** system designed to manage resource flow and prevent economic inflation within the game environment. While it shares core properties with standard items, its operational complexity requires a dedicated management interface to control how resources enter the game loop.

In practical application, if your game features a mining or farming mechanic, the Item Generator serves as the underlying logic for the resource node (e.g., an Iron Ore Mine).

---

## Core Logic and Generation Mechanics

The generation process is governed by a time-based accumulation system. Understanding the relationship between intervals and caps is critical for balancing gameplay.

### Accumulation Parameters
The system uses two primary variables to determine when and how many "ticks" of resources are available for collection:

* **Interval (seconds):** The specific duration required to generate one "tick" of resources.
* **Tick Capacity (Tick Cap):** The maximum number of ticks the generator can store before production halts.
![alt](/tutorial-guides/what-is-item-generator/step-01.png)

### How Item Generation Works

To keep it simple: the system converts **time** into **resource turns** (called Ticks).

* **The Logic:** Every time the **Interval** (e.g., 3600s) passes, you earn 1 Tick.
* **The Limit:** You can only store up to the **Tick Cap** (e.g., 50). Once you hit this limit, the generator stops working until you collect your items.
* **The Result:** When the player collects, **every tick rolls every output item once**. An item is produced in that tick only if its **Drop Rate** roll succeeds; when it does, the quantity is a random number between its **Min** and **Max**.

**Conclusion:**
- If you are offline for 60 hours but the Cap is 50, you only receive 50 hours worth of resources.
- Once the **Tick Cap** is reached, no further items will be generated until the player collects the current balance, resetting the elapsed time.

---

## Output Pool

Each generator has an **Output Pool**: a list of items it can produce. Every item in the pool has its own settings:

| Setting | Description |
| :--- | :--- |
| **Drop Rate** | Chance (from `0` to `1`) that the item is produced in each tick. `1` = always (guaranteed), `0.5` = 50% of ticks, `0.01` = 1% of ticks. |
| **Min / Max Quantity** | Amount produced when the item drops. Set both to the same value for a fixed amount. |
| **Collect Cap** | Maximum total quantity of this item a player may own after collecting. `0` = unlimited. See below. |

![alt](/tutorial-guides/what-is-item-generator/step-02.jpg)

### Independent Drop Rates
Items are rolled **independently**, so several items can drop in the same tick.

*Example:* a generator with **Gold (Drop Rate 1)**, **Diamond (0.5)** and **Ultra Rare Gem (0.01)**:
* Every tick always produces Gold.
* About half of the ticks also produce Diamonds.
* About 1 tick in 100 also produces an Ultra Rare Gem.
* All three can drop in the same tick (0.5% chance: 100% × 50% × 1%).

> **Tip:** Use Drop Rate `1` for the main resource of a node (a mine always yields ore) and low Drop Rates for rare bonuses.

### Collect Cap
**Collect Cap** stops a single resource from piling up without limit.
* It applies when the generator delivers rewards **directly to the inventory** (see the next lesson). With Mailbox delivery it is not applied.
* When the player collects, the system counts how many of that item the player already owns. Only enough to reach the cap is granted; any extra is discarded.
* If the player is already at the cap, that item is skipped for this collection. The ticks are still consumed, so the player should spend the resource before collecting again.

*Example:* Collect Cap is `100`, the player owns `90` Gold and the generator rolled `25` Gold. The player receives `10` Gold, bringing the total to `100`.

---

## Configuration Example

Below is a standard configuration for a high-yield resource node:

| Parameter | Value | Description |
| :--- | :--- | :--- |
| **Interval** | 3600 | Generates 1 tick every hour. |
| **Tick Cap** | 50 | Stops producing after 50 hours of inactivity. |
| **Drop Rate** | 1 | The item is produced in every tick. |
| **Min Quantity** | 1 | Minimum items produced per tick. |
| **Max Quantity** | 5 | Maximum items produced per tick. |
| **Collect Cap** | 0 | No limit on the total amount owned. |

---

## Multi-Item Output Logic
A single Item Generator can be configured to produce multiple types of items simultaneously. Each item in the Output Pool follows its own **Drop Rate** and **Min/Max** rule per tick.

### Workflow:
1.  **Tick Calculation:** The system determines how many ticks have passed (e.g., 5 ticks), up to the Tick Cap.
2.  **Drop Roll:** For every tick, each item in the Output Pool rolls against its **Drop Rate**.
3.  **Quantity Roll:** For every successful drop, the system rolls a random integer between the item's **Min** and **Max** values.
4.  **Aggregation:** The quantities are summed per item, limited by **Collect Cap** when delivering directly to the inventory, and presented to the player upon collection.

