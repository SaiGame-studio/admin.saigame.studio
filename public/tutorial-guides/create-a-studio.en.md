Create a Studio, a Team and your first Game in the Sai Server admin. This is the first step before you connect a Unity project to the Sai Server backend. It takes about five minutes.

**In this guide you will:**
- create your Studio (your main workspace),
- check the Team that is created for you,
- create your first Game and copy its **Game ID** for Unity.

## Before you start

- A Sai Server account with a **verified email**.
- **Two-factor authentication (2FA)** enabled on your account. The Studios page asks you to turn on 2FA before you create a studio.
- Enough **sCoin** if this is not your first studio (see "How much does it cost?" below).

## Step 1: Create a Studio

A Studio is your main workspace. Every Team, Game and member belongs to a Studio.

1. Open the **Studios** page.
2. Enter a studio name and click **Create**.

![Create a new studio in the Sai Server admin](/tutorial-guides/create-a-studio/step-01.png)

## Step 2: Check your Team

When you create a studio, Sai Server creates a default team (**Team #1**) and adds you as its owner.

![The default team inside a studio](/tutorial-guides/create-a-studio/step-02.png)

- **Working alone?** You do not need to add anyone.
- **Working with others?** Ask each teammate to register a Sai Server account and send you their **User ID**, then add them to your team.

![Add a member to your team with their User ID](/tutorial-guides/create-a-studio/step-03.png)

## Step 3: Create your first Game

1. Create a new game from the [new game page](https://server.saigame.studio/games/new).
2. Assign the game to your team so every team member can work on it.

![Create a game](/tutorial-guides/create-a-studio/step-04.png)

![Add the game to the team](/tutorial-guides/create-a-studio/step-05.png)

**Expected result:** the game appears in your studio. Open its **Game Detail** page and copy the **Game ID**. You will paste it into Unity in the next lesson.

## How much does it cost?

Studios, Teams and Games use **one-time sCoin payments**, not monthly fees.

| Item | Default | Extra cost |
|---|---|---|
| Studio | Your first studio is free | 50 sCoin for each additional studio |
| Games per studio | 2 | 5 sCoin per extra game slot |
| Teams per studio | 1 | 10 sCoin per extra team |
| Members per studio | 5 | 50 sCoin for 50 more member slots |

Some in-game features (for example Leaderboards) need a monthly subscription for the game. Those lessons say so when it applies.

## Common problems

- **I cannot create a studio.** Check that your email is verified and that 2FA is enabled on your account.
- **Not enough sCoin.** Only your first studio is free. Top up sCoin before creating another studio or buying extra slots.
- **I want to remove a studio.** The owner can delete a studio that has no games left. If your account uses 2FA, you are asked for a 2FA code.

## FAQ

### Is Sai Server free to start?
Yes. Your first studio is free and it includes 2 game slots, 1 team and 5 members.

### What is the difference between a Studio, a Team and a Game?
A **Studio** is the workspace and billing owner. A **Team** groups the people who work together. A **Game** is one project, with its own players, items and settings. The hierarchy is Studio > Team > Game > Player.

### Do I pay every month for studios or games?
No. Studios, teams, games and slots are one-time sCoin purchases.

## Next steps

- [#1b - Import the Unity package and connect to Sai Server](/tutorials/guides/import-unity-package)
- [#1c - Add Google login to your Unity game](/tutorials/guides/unity-google-login)
