Write and run your first **server-side Lua script** on Sai Server, then call it from Unity. Lua scripts run your game rules on the server, where players cannot change them. Each script reads a `payload` from the client and returns an `output`.

**In this guide you will:**
- create a Lua script in the web editor,
- load the Hello World sample and run it with a test payload,
- run the same script from Unity with `BattleScript`,
- manage script files from Unity with `LuaScriptManager`.

## Before you start

- A game in Sai Server (see [Create a Studio](/tutorials/guides/create-a-studio)).
- For the Unity part: a connected Unity project with a logged-in player (see [Import Unity Package](/tutorials/guides/import-unity-package)).

Every game includes **7 script slots** by default. The usage counter at the top of the **Scripts** page shows how many you have used. Plugins can raise this limit.

![The Scripts page with the slot usage counter](/tutorial-lua/hello-world/step-00.png)

## Step 1: Create a script

1. Open **Scripts** in your game dashboard and click **New Script**.
2. Enter a name such as `hello_world`. The name must start with a letter and may contain only lowercase letters, digits and underscores. It is the **trigger key** your game client uses to run the script.

![Create a new Lua script](/tutorial-lua/hello-world/step-01.png)

3. Click the **Edit** (pencil) icon in the script list to open the web Lua editor.

![Open the Lua editor](/tutorial-lua/hello-world/step-02.png)

> **Note:** keep the **Active** switch on. Inactive scripts cannot be run.

## Step 2: Load the Hello World sample

The editor has two parts:
- **Script Body** – where you write the code. Syntax errors are highlighted as you type, and the size bar shows how much of the **250 KB** script limit you have used.
- **Sample Scripts** – on the right. Open the **Core** tab and select `#1 tut_hello_output`. The **Replace / Append** switch decides whether a sample replaces your code or is added to the end.

![Sample Scripts with tut_hello_output](/tutorial-lua/hello-world/step-03.png)

Press **Ctrl+S** or click the **Save** icon after every change.

The sample looks like this:

```lua
-- 'payload' is the input table sent by the client.
local player_name = payload.player_name or "stranger"

-- 'output' is returned to the client.
output.greeting  = "Hello, " .. player_name .. "!"
output.processed = true

-- game.log() writes to the script log.
game.log("tut_hello_output ran for: " .. player_name)
```

## Step 3: Run the script in the editor

1. Scroll to **Run Script**.
2. Check the badge next to the **Run** button. Scripts run as your own account, so you need a player profile in this game. If the badge shows **No profile**, click **Create profile**. **Run** is enabled when the badge shows **Profile ready**.

![Create a player profile before running](/tutorial-lua/hello-world/step-04-profile.png)

3. Enter this payload and click **Run**:

```json
{
  "payload": {
    "player_name": "Alice"
  }
}
```

**Expected result:** **Run Result** shows `"greeting": "Hello, Alice!"` and `"processed": true`, with the execution time in milliseconds. Remove `player_name` and run again to get `"Hello, stranger!"`.

![Run Result of the Hello World script](/tutorial-lua/hello-world/step-04.png)

> **Tip:** press **Ctrl+S** inside the payload editor (or click its **Save** icon) to keep the payload for your next visit.

## Step 4: Run the script from Unity

1. Enter **Play Mode** and log in.
2. Select the `BattleScript` component on the `SaiServer` object.
3. Set **Script Name** to `hello_world` and paste the same request body.
4. Click **Run Script**.

**Expected result:** the **JSON Response** matches the web editor. It contains `output`, `logs` and `duration_ms`.

![Run the Lua script from Unity](/tutorial-lua/hello-world/step-05.png)

From code:

```csharp
using SaiGame.Services;
using UnityEngine;

public class HelloLua : MonoBehaviour
{
    public void Run()
    {
        SaiServer.Instance.BattleScript.RunScript(
            "hello_world",
            "{\"payload\":{\"player_name\":\"Alice\"}}",
            json => Debug.Log(json),
            error => Debug.LogError(error));
    }
}
```

## Step 5 (optional): Manage scripts from Unity

The `LuaScriptManager` component keeps your scripts as `.lua` files in `Assets/SaiGame/LuaScript/Scripts`, so you can edit them in your code editor and keep them in version control.

- **Load Scripts** – list the scripts on the server and match them with local files.
- **Download** – save a server script to a local file.
- **Upload New** – create a server script from a local file.
- **Update** – push a local file to the existing server script.
- **Create BattleStart script**, **Create BattleEnd script**, **Create Custom script** – create a new script file. File names follow the same rule: `^[a-z][a-z0-9_]*$`.

## Lua runtime limits

| Limit | Value |
|---|---|
| Execution time | 500 ms per run |
| Script size | 250 KB |
| Scripts per game | 7 by default (plugins add more) |

A script that runs longer than 500 ms is stopped. See the [Lua API overview](/tutorials/lua-guides/overview) for every runtime limit and the available functions.

## Common problems

- **Script not found.** The name in Unity must match the script name exactly.
- **Script is inactive.** Turn the **Active** switch back on.
- **Run is disabled.** The badge shows **No profile**. Click **Create profile**.
- **The output is empty.** Check that the request body has a `payload` object and that you saved the script before running it.
- **The script is stopped.** It went over 500 ms. Move heavy work out of loops or split it across calls.

## FAQ

### Why run game logic in Lua on the server?
The server runs the rules, so players cannot change rewards, damage or drop rates by editing the client.

### How many Lua scripts can a game have?
7 by default. Plugins can add more.

### Can a Lua script give items to a player?
Yes. Use the inventory functions such as `grant_item` and `deduct_item`. See the [Lua inventory functions](/tutorials/lua-guides/inventory).

## Next steps

- [Enemy Definition](/tutorials/lua-guides/enemy-definition)
- [Execute Script](/tutorials/lua-guides/execute-script)
