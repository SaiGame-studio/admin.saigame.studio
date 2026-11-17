This guide details Gacha Pack setup, covering Key Requirements.

## Overview
A **Gacha Pack** (commonly referred to as a **Lootbox**) is a randomized reward mechanism that utilizes Random Number Generation (RNG) to distribute items to players. This system provides a flexible way to manage player progression, monetization, and item distribution.

---

## Core Components
A Gacha Pack consists of two primary functional segments: Key Requirements and the Item Pool.

### 1. Reward Destination
This component defines where the rewarded items are sent once the Gacha logic is successfully executed.

* **Mailbox (Default)**: Items are sent as attachments to the player's in-game mail.
    * **Manual Claim**: Players must open the mail and click "Claim" to receive items.
    * **Customization**: Supports optional **Email Title** and **Email Body** overrides for personalized messaging.
![alt](/tutorial-guides/what-is-gacha-pack/step-01.png)

* **Direct Inventory**: Items are injected immediately into the player's **Main Inventory Instance**.
    * **Automation**: Removes the need for manual player intervention.
    * **Validation**: Requires the system to verify inventory space availability before finalizing the transaction.
![alt](/tutorial-guides/what-is-gacha-pack/step-02.png)

### 2. Key Requirements
The Key Requirements section defines the cost or prerequisites needed to initiate the opening process.

* **Functionality**: Acts as one or multiple "keys" required to unlock the pack.
* **Security Note**: If no keys are specified, the pack can be opened freely. This is generally discouraged for economy-balancing reasons.
* **Monetization**: By setting a specific currency as a Key Requirement, the pack effectively functions as a purchasable Lootbox within the game economy.
![alt](/tutorial-guides/what-is-gacha-pack/step-03.png)

### 3. Item Pool
The Item Pool is the collection of potential rewards available to the player upon opening a pack.

* **Weight**: Determines the probability of an item being selected.
* **Quantity Range (Min/Max)**: Defines the volume of the item rewarded.
    * This functions as an "RNG within RNG."
    * To ensure a fixed amount, set both the **Min** and **Max** values to the same number.
![alt](/tutorial-guides/what-is-gacha-pack/step-04.png)

---

## Logic and Mechanics

### Randomization Logic (Weight-Based)
The system employs a **Weighted Random** algorithm to determine the outcome. This is more flexible than simple percentages because it allows for easy scaling without needing the total to equal 100.

**How it works:**
1.  The system calculates the **Sum of all Weights** in the pool.
2.  A random number is generated between 1 and the Total Sum.
3.  The system iterates through the list, accumulating weights until it reaches or exceeds the random number.

> **Note**: An item with a weight of 10 is twice as likely to drop as an item with a weight of 5.

### Workflow Example
| Item | Weight | Chance (%) | Calculation Formula |
| :------- | :--- | :--- | :--- |
| **Common Sword** | 70 | 70% | $70 / 100$ |
| **Rare Shield** | 25 | 25% | $25 / 100$ |
| **Epic Armor** | 5 | 5% | $5 / 100$ |
| **Final Sum** | **100** | **100%** | **Total Weight** |

---

## Implementation Constraints
* **Key Validation**: The system must verify that the player possesses all required keys before executing the RNG logic.
* **Atomic Transactions**: The subtraction of keys and the addition of items must happen simultaneously to prevent "item duplication" or "key loss" during network interruptions.
* **Pool Integrity**: Every Gacha Pack must contain at least one item in the Item Pool to prevent execution errors.

