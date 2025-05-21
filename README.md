# Admin SaiGame

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/simonsais-projects/v0-next-js-admin-manager)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/CSkO42Ou5YY)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/simonsais-projects/v0-next-js-admin-manager](https://vercel.com/simonsais-projects/v0-next-js-admin-manager)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/CSkO42Ou5YY](https://v0.dev/chat/projects/CSkO42Ou5YY)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Running Locally with Custom Domain

To run the application under the domain `local-admin.saigame.studio`:

1. **Update your hosts file**:
   - On Windows: Edit `C:\Windows\System32\drivers\etc\hosts` as administrator
   - On macOS/Linux: Edit `/etc/hosts` with sudo
   - Add this line: `127.0.0.1 local-admin.saigame.studio`

2. **Start the development server**:
   ```bash
   yarn dev
   # or
   npm run dev
   # or
   pnpm dev
   ```

3. **Create a .env.local file**:
   - Create a file named `.env.local` in the root directory with the following content:
   ```
   NEXT_PUBLIC_API_URL=http://local-admin.saigame.studio:3000
   ```

4. **Access the application**:
   - Open your browser and navigate to `http://local-admin.saigame.studio:3000`

Note: If you encounter certificate warnings in your browser, you can safely proceed as this is expected for local development with custom domains.
