A guide to Unity Shop testing and secure purchasing via Idempotency Keys

---

## 1. Preparation & Setup
To begin testing, please complete the following steps:
1.  **Configure the Shop**: Set up a shop in the Web UI to match the configuration shown in the reference image (wi)
2.  **Fund the Test Account**: Ensure your test account has sufficient currency. You can send the required items/currency via the **Mailbox** system or any other administrative tool available to you.
![alt](/tutorial-guides/buy-an-item/step-01.png)

---

## 2. Unity Client Integration
You can interact with the shop system through the Unity Inspector:

* **Locating the Shop Class**: Navigate to the **Item** object in the hierarchy. You will find the **Shop** class as a child component.
* **Fetching Shops**: Click the **Get Shops** button. This will retrieve and display a list of all currently **Active** shops.
* **Loading Items**: Within each individual shop entry, click **Get Items** to load the list of active products available for that specific shop.
![alt](/tutorial-guides/buy-an-item/step-02.png)

---

## 3. Performing a Purchase
When you trigger a purchase, you must manage the **Idempotency Key**. You can either enable the **Auto Idempotency Key** feature or enter one manually.
![alt](/tutorial-guides/buy-an-item/step-03.png)

### What is an Idempotency Key?
An Idempotency Key is a unique string used to ensure that a purchase request is processed exactly once. It is a critical safeguard against accidental duplicate transactions.

* **How it works**: If a network timeout occurs or the player accidentally double-clicks the "Buy" button, the client might send the same request twice. 
* **The Server's Role**: By providing an Idempotency Key, the server recognizes the second request as a duplicate of the first. Instead of charging the player twice, the server simply returns the result of the original successful transaction.
* **Usage**: 
    * **Auto**: The system generates a unique UUID for every new transaction attempt.
    * **Manual**: Useful for specific debugging scenarios where you want to test how the server handles a specific key value.

---

> **Note**: Always use unique keys for different purchase intents. Reusing a key from a *successful* previous purchase for a *new* item will result in the server ignoring the new request.
