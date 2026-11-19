Let players sign in to your Unity game with their Google account through Sai Server. The `GoogleBackendLogin` component opens the Google sign-in page in the browser. It then waits for Sai Server to finish the login and hands the tokens to `SaiAuth`. You do not need a Google SDK in your Unity project.

**In this guide you will:**
- start a Google login from the Unity Inspector,
- call the same login from your own code,
- handle cancel, timeout and denied results.

## Before you start

- A Unity project connected to Sai Server with a valid Game ID (see [#1b - Import the Unity package](/tutorials/guides/import-unity-package)).
- A browser on the device. The sign-in page opens in the system browser.

## How Google login works

1. Unity asks Sai Server to create a **login session** for your game.
2. Sai Server returns a sign-in URL and Unity opens it in the browser.
3. The player signs in with Google in the browser. If the account uses two-factor authentication, the browser page asks for the 2FA code too.

![Sai Server browser page requesting an Authenticator code](/tutorial-guides/unity-google-login/2fa-browser-page.png =520x)

4. Unity checks the session every few seconds. When the login is complete, Unity receives the access and refresh tokens.
5. The tokens are passed to `SaiAuth`, so every other Sai Server call works as if the player had logged in with a password.

Sai Server matches the Google account by email. It signs in to the existing account with that email, or creates a new account on the first sign-in.

## Step 1: Test Google login in the Inspector

1. Enter **Play Mode**.
2. Select the `GoogleBackendLogin` component on the `SaiServer` object.
3. Click **Start Login**. The browser opens the Google sign-in page.
4. Sign in with Google in the browser. If Sai Server asks for an Authenticator code, complete verification there.
5. When the browser shows **SIGN-IN COMPLETE**, return to Unity.

![GoogleBackendLogin in Unity Play Mode with the Start Login button](/tutorial-guides/unity-google-login/google-login-inspector.png =1085x)

![Google account chooser opened from Unity; account details hidden](/tutorial-guides/unity-google-login/google-signin-page.png =1060x)

![Browser confirmation that Google sign-in and two-factor verification are complete](/tutorial-guides/unity-google-login/browser-login-success.png =520x)


**Expected result:** the component shows the access token and user data, and `SaiAuth` is logged in. Click **Get Me** on `SaiAuth` to confirm the user.

![GoogleBackendLogin after successful sign-in; tokens hidden](/tutorial-guides/unity-google-login/login-success.png =808x)

![SaiAuth showing Is Login enabled after Google sign-in; tokens hidden](/tutorial-guides/unity-google-login/saiauth-login-success.png =808x)

Account details and tokens are hidden in these screenshots.


Other buttons:
- **Cancel Login** – stop waiting for the current login.
- **Open Auth URL** – open the sign-in page again if the browser did not open.
- **Set Token To SaiAuth** – copy the stored tokens to `SaiAuth` again.
- **Clear Auth Data** – clear the tokens stored on this component.

## Step 2: Start Google login from code

```csharp
using SaiGame.Services;
using UnityEngine;

public class GoogleLoginButton : MonoBehaviour
{
    public void OnClickGoogleLogin()
    {
        SaiServer.Instance.GoogleBackendLogin.StartLogin(
            response => Debug.Log($"Google login OK: {response.user.username}"),
            error => Debug.LogWarning($"Google login failed: {error}"));
    }
}
```

After a successful login, continue as usual. For example, load or create the player's progress with [Gamer Progress](/tutorials/guides/create-gamer-progress).

You can also subscribe to the `OnLoginSuccess`, `OnLoginFailure` and `OnSessionCreated` events of `GoogleBackendLogin`.

## Step 3: Handle login results

The error callback returns one of these values:

| Error | Meaning | What to do |
|---|---|---|
| `cancelled` | `CancelLogin()` was called. | Show the login options again. |
| `user_denied:...` | The player declined the Google sign-in. | Offer another login method. |
| `session_expired` | The login session expired before the player finished. | Start a new login. |
| `timeout` | Unity stopped waiting. The default limit is 300 seconds (**Max Login Duration Seconds**). | Start a new login. |
| `create_session_failed: ...` | Unity could not create a session, usually a network or Game ID problem. | Check the connection and Game ID. |
| `server_error:...` | The server could not complete the Google login. | Retry, then contact support if it continues. |

Only one login can run at a time. Calling `StartLogin` again during a login returns `Login already in progress!`.

## Common problems

- **The browser does not open.** Click **Open Auth URL**, or read `AuthUrl` from code and open it yourself.
- **The login always times out.** Make sure the player finishes sign-in within the time limit, and that the device can reach the Sai Server API.
- **Logged in with Google but no game data.** Google login only signs the user in. Call `GamerProgress.GetProgress` or `CreateProgress` to load the player's save.

## FAQ

### Do I need the Google Sign-In SDK for Unity?
No. The sign-in happens in the browser, and Unity only talks to Sai Server.

### Is a Google account the same player as a password account?
Sai Server matches Google sign-ins by **email**. If a Sai Server account already uses the same email, the player signs in to that account and keeps its progress. If not, a new account is created on the first Google sign-in.

### Does Google login work with two-factor authentication?
Yes. If the account has 2FA enabled, the browser page asks for the code before the login completes.

## Next steps

- [#2a - Create Gamer Progress](/tutorials/guides/create-gamer-progress)
- [#2b - Cross-platform cloud save](/tutorials/guides/cross-platform-save)
