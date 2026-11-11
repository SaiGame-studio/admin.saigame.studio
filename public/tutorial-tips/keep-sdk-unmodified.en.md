The Sai Server Unity SDK lives in `Assets/SaiGame` in your project. **Do not edit the files in that folder.**

## Why

We release new versions of the Sai Game SDK regularly, with fixes and new features. Updating the SDK replaces the files in `Assets/SaiGame`, so:

- any change you made there is **overwritten** by the update, or
- the update **conflicts** with your changes, and your game may stop compiling.

When the SDK stays unmodified, you can update to every new release at any time.

## What to do instead

- Put your own scripts in **your own folder**, outside `Assets/SaiGame`.
- Call the SDK from your scripts through its public methods and events, for example `SaiAuth.OnLoginSuccess`.
- Get new SDK versions from the [Unity Package releases](https://github.com/SaiGame-studio/ss-unity/releases).

## Need something the SDK does not do?

If you run into any problem, or the SDK is missing something you need, contact us rather than changing the SDK. We can fix it in the next release so everyone benefits. You can also reach us on [Discord](https://discord.gg/UU3YarmVde).
