Connect a Unity project to the Sai Server backend. You import the SaiGame Unity SDK, add the `SaiServer` prefab, set your Game ID, test the connection and log in. At the end, Unity talks to your game on Sai Server.

**In this guide you will:**
- import the SaiGame Unity package,
- configure the `SaiServer` prefab with your Game ID,
- optionally load settings from a `.env` file,
- test the connection and log in with `SaiAuth`.

## Before you start

- A game created in Sai Server, and its **Game ID** (see [#1a - Create a Studio](/tutorials/guides/create-a-studio)).
- **Unity 6.x or newer** (recommended). If you use an older version and run into problems, [ask Sai on Discord](https://discord.gg/UU3YarmVde).

## Step 1: Import the SaiGame Unity package

1. Download the latest Unity package from the [SaiGame SDK releases page](https://github.com/SaiGame-studio/ss-unity/releases).
2. Import the package into your Unity project.
3. Drag the `SaiServer` prefab from `Assets/SaiGame/Prefabs` into your scene. Every service (authentication, cloud save, items, quests, battle and more) is already wired inside it.

![Download the SaiGame Unity package](/tutorial-guides/import-unity-package/step-01.png)

![The SaiServer prefab in the scene](/tutorial-guides/import-unity-package/step-02.png)

The package name and version appear at the top of the `SaiServer` Inspector. Mention this version when you ask for support.

## Step 2: Set the Server Endpoint and Game ID

Select the `SaiServer` object in the Hierarchy.

1. **Server Endpoint:** keep the default, **Production API (HTTPS) - api.saigame.studio**.
2. **Game ID:** open your game's **Game Detail** page in the admin, copy the Game ID and paste it into the **Game ID** field.

When the Game ID is valid, the read-only **Game Name** field shows your game's name. Click **Refresh** next to it to load the name again.

![Server Endpoint setting](/tutorial-guides/import-unity-package/step-03.png)

![Copy the Game ID from the Game Detail page](/tutorial-guides/import-unity-package/step-04.png)

![Paste the Game ID into the SaiServer component](/tutorial-guides/import-unity-package/step-05.png)

## Step 3 (optional): Keep settings in a .env file

A `.env` file keeps your Game ID and test credentials out of the scene file.

1. In the **Environment** section of the `SaiServer` Inspector, click **Create .env**. Unity copies `Assets/SaiGame/env.example.txt` to a `.env` file at the project root (next to the `Assets` folder). The button is disabled when `.env` already exists.
2. Open `.env` and fill in the keys you need:

```ini
GAME_ID=your-game-id-here
USERNAME=your-username-here
PASSWORD=your-password-here
# Optional. Leave empty to keep the Server Endpoint option.
SERVER_ENDPOINT=
```

3. Enable **Load .env on Play**. Three toggles control what is applied when you enter Play Mode. All three are on by default:
   - **Override server endpoint** – uses `SERVER_ENDPOINT` for this play session only.
   - **Override game id** – uses `GAME_ID`.
   - **Override credentials** – sends `USERNAME` and `PASSWORD` to `SaiAuth`.

![Load .env on Play settings](/tutorial-guides/import-unity-package/step-06.jpg)

> **Security:** never commit `.env` to source control. Credentials from it are stored in PlayerPrefs only, never in the scene file.

**For builds:** the **Load .env.build on build** section works the same way. Click **Create .env.build** and set `GAME_ID`. With **Override game id** checked, the Game ID goes into the built player only. Your scene asset is not changed.

## Step 4: Test the connection

Click **Test Connection** in the `SaiServer` Inspector.

**Expected result:** the Console shows `✓ Connection test passed!`. **Show Service Info** prints the current base URL and login state.

If you see `✗ Connection test failed!`, see "Common problems" below.

## Step 5: Log in with SaiAuth

Enter **Play Mode**, then use the `SaiAuth` component:

- **Register** – create a new account (email, username, password).
- **Login (Check 2FA)** – log in with your username and password.
- **2FA Login** – if the account uses two-factor authentication, the Console warns that a code is required. Enter the 6-digit code in **2FA Code** and click **2FA Login**.
- **Get Me** – load the current user. **Refresh Token** – renew the access token. **Logout** – end the session.

![SaiAuth login and register buttons](/tutorial-guides/import-unity-package/step-07.png)

The same calls are available from code:

```csharp
using SaiGame.Services;

SaiServer.Instance.SaiAuth.Login(
    "username", "password",
    response => Debug.Log($"Logged in as {response.user.username}"),
    error => Debug.LogError(error));
```

**Expected result:** the Console logs `Login successful.` and **Get Me** prints your username.

Players can also sign in with Google. See [#1c - Add Google login to your Unity game](/tutorials/guides/unity-google-login).

## Use the Inspector logs to find the code

Every test button writes a **colored log** to the Console. Click a log entry to open the function that handles it. Use these functions as a reference for your own game scripts.

![Colored logs link to the source code](/tutorial-guides/import-unity-package/step-09.png)

## Common problems

- **Connection test failed.** Check the Server Endpoint. If **Override server endpoint** is on, check `SERVER_ENDPOINT` in `.env`, or leave it empty.
- **Game Name stays empty.** The Game ID is wrong or belongs to another game. Copy it again from the Game Detail page.
- **The .env values are ignored.** Make sure `.env` sits at the project root (not inside `Assets`) and that **Load .env on Play** is enabled.
- **Login asks for a 2FA code.** Your account has 2FA enabled. Use **2FA Code** and **2FA Login**.

## FAQ

### Which Unity version does the Sai Server SDK support?
Unity 6.x or newer is recommended.

### Is logging in the same as becoming a player of my game?
No. Logging in creates or loads a Sai Server user. The user becomes a **player** of your game when you create their Gamer Progress. That is the next lesson.

### Can I point Unity at a different server for testing?
Yes. Set `SERVER_ENDPOINT` in `.env` and keep **Override server endpoint** enabled. The override lasts for the play session only.

## Next steps

- [#1c - Add Google login to your Unity game](/tutorials/guides/unity-google-login)
- [#2a - Create Gamer Progress](/tutorials/guides/create-gamer-progress)
