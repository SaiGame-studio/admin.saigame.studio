Getting Started with Lua Scripting

Every game includes **7 script slots** by default, so you can try Lua Scripting in your project right away. The usage counter at the top of the **Scripts** page shows how many slots you have used; plugins can raise this limit. Follow these steps to create and run your first script.

![alt](/tutorial-lua/hello-world/step-00.png)

---

## 1. Creating and Editing Your Script
* **Initialization:** Click **New Script** and enter a name. The name must start with a letter and may contain only lowercase letters, digits, and underscores (for example, `hello_world`). This name is the unique **trigger key** your game client uses to call the script.
![alt](/tutorial-lua/hello-world/step-01.png)
  
* **Access the Editor:** Click the **Edit** (pencil) icon in the script list to open the integrated web-based Lua editor.
![alt](/tutorial-lua/hello-world/step-02.png)

> **Note:** Keep the **Active** switch turned on. Inactive scripts cannot be run.

## 2. Using the Editor Interface
The editor is divided into two primary sections:
* **Script Body:** The main area for writing logic. Syntax errors are highlighted as you type, and the size bar shows how much of the **250 KB** script limit you have used.
* **Sample Scripts:** Located on the right. Open the **Core** tab and select `#1 tut_hello_output` to load the sample code. Use the **Replace / Append** switch to choose whether a sample replaces your code or is added to the end of it.
![alt](/tutorial-lua/hello-world/step-03.png)

> **Important:** Always press **Ctrl+S** or click the **Save** icon in the editor toolbar after modifying your code.

---

## 3. Execution and Testing
Once saved, scroll down to the **Run Script** section to test your logic.

* **Player Profile:** Scripts run as your own account, so you need a player profile in this game. Check the status badge next to the **Run** button: if it shows **No profile**, click **Create profile**. The **Run** button is enabled when the badge shows **Profile ready**.
![alt](/tutorial-lua/hello-world/step-04-profile.png)
* **Payload Input:** Enter a JSON payload. Your input values go inside the `payload` object:
```json
{
  "payload": {
    "player_name": "Alice"
  }
}
```
* **Execution:** Click **Run**.
* **Analysis:** The **Run Result** pane displays the JSON response and the execution time in milliseconds (ms). For the sample above, the output contains `greeting = "Hello, Alice!"` and `processed = true`. If you leave out `player_name`, the greeting becomes `"Hello, stranger!"`.
![alt](/tutorial-lua/hello-world/step-04.png)

> **Tip:** Press **Ctrl+S** inside the payload editor (or click its **Save** icon) to keep the payload for your next visit.

---

## 4. Limits
To ensure server stability and optimal performance, all Lua scripts are subject to the following rules:
- **Maximum Execution Time**: 500ms
- **Maximum Script Size**: 250 KB

> **Note:** If your script exceeds the **500ms** limit, it will be terminated. You must optimize your logic to stay within this performance window.

---

## 5. Executing Scripts in Unity
Once you have verified your script in the Web Editor, you can implement it within your game client:

* **Implementation:** Navigate to the `BattleScript` class in your Unity project.
* **Verification:** Run the logic within the Unity environment. You will find that the output and behavior remain consistent with the results seen in the Web Editor.
![alt](/tutorial-lua/hello-world/step-05.png)
