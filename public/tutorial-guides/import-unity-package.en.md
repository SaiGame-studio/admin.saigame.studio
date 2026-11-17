This guide outlines the initial setup for integrating the SaiGame SDK into your Unity project.

### 1. Prerequisites & Installation

* **Game Registration:** Ensure your game is already created in the SaiGame system.
* **Unity Version:**
    * Recommended: **Unity 6.x** or newer.
    * Legacy Versions: If you are using an older version and encounter issues, please [contact **Sai** for support](https://discord.gg/UU3YarmVde).
* **SDK Setup:**
  1. Download the latest **Unity Package** from [this link](https://github.com/SaiGame-studio/ss-unity/releases).
![alt](/tutorial-guides/import-unity-package/step-01.png)

  2. Import the package into your project.
  3. Drag the `SaiServer` prefab from `Assets/SaiGame/Prefabs` into your scene. All services (authentication, items, quests, battle…) are already wired inside it.
![alt](/tutorial-guides/import-unity-package/step-02.png)

---

### 2. Configuration

Select the `SaiServer` object in the Hierarchy. Its Inspector contains everything needed to connect your project to the backend.

#### Server Endpoint
Set **Server Endpoint** to `Production API (HTTPS) - api.saigame.studio` so you are interacting with live data. This is the default value.
![alt](/tutorial-guides/import-unity-package/step-03.png)

#### Game Identity
1. Go to your **Game Detail** page on the dashboard and copy the **Game ID**.
![alt](/tutorial-guides/import-unity-package/step-04.png)
2. In the Unity Inspector, select the `SaiServer` component.
3. Paste the ID into the **Game ID** field.
![alt](/tutorial-guides/import-unity-package/step-05.png)

#### Optional: Use a `.env` File
Instead of typing the Game ID and test credentials into the Inspector, you can keep them in a `.env` file:
1. In the `SaiServer` Inspector, click **Create .env**. This copies `Assets/SaiGame/env.txt` to a `.env` file at your project root.
2. Open `.env` and fill in `GAME_ID`, `USERNAME` and `PASSWORD`.
3. Enable **Load .env on Play**. When you enter Play Mode, the Game ID is applied to `SaiServer` and the credentials to `SaiAuth`.

> **Note:** `.env` must never be committed to source control. Credentials loaded from it are stored in PlayerPrefs only, not in the scene file.

![alt](/tutorial-guides/import-unity-package/step-06.jpg)

#### Verify the Connection
Click **Test Connection** in the `SaiServer` Inspector. A `✓ Connection test passed!` message in the Console confirms that Unity can reach the server. **Show Service Info** prints the current base URL and login state.

---

### 3. Authentication & Testing

Switch Unity to **Play Mode** to begin testing the integration.

#### User Authentication
Use the `SaiAuth` component to perform the following actions:
* **Register** a new account.
* **Login** with existing credentials.
* **Get Me** to load the current user, **Refresh Token** and **Logout**.
![alt](/tutorial-guides/import-unity-package/step-07.png)

#### Google Login (Optional)
Players can also sign in with Google through the `GoogleBackendLogin` component:
1. Click **Start Login**. A browser window opens the Google sign-in page.
2. Complete the sign-in in the browser. Unity polls the server and, once the login succeeds, passes the tokens to `SaiAuth` automatically.
3. Use **Cancel Login** to abort, or **Open Auth URL** if the browser did not open.

![alt](/tutorial-guides/import-unity-package/step-08.jpg)

#### Debugging & Implementation
The Inspector includes helper buttons for rapid testing.
* **Console Shortcuts:** Every time you click a test button, a **Color Log** will appear in the Console.
* **Code Navigation:** Clicking the log entry will take you directly to the function responsible for that logic. You can use these functions as a reference when writing your custom game scripts.
![alt](/tutorial-guides/import-unity-package/step-09.png)
---

### 4. Next Steps
* Successfully logging in or creating an account creates a system user, but it does not automatically register them as a "Player" within your specific game.
* We will cover the logic for converting a user into an active Player in the **next tutorial**.
* There is much more to discover within the `SaiServer` and `SaiAuth` components, feel free to explore them at your own pace.
