# 🚂 Railway Deployment Guide - Playlistify AI

This guide will help you deploy Playlistify AI to [Railway](https://railway.app/), a modern app deployment platform.

## 📋 Prerequisites

- A GitHub account (where your code is hosted)
- A [Railway](https://railway.app/) account (you can sign up with GitHub)

## 🚀 Deployment Steps

### Option 1: One-Click Deployment (Recommended)

1.  **Login to Railway**: Go to [railway.app](https://railway.app/) and log in.
2.  **New Project**: Click **+ New Project** > **Deploy from GitHub repo**.
3.  **Select Repository**: Search for and select `Playlistify-AI`.
4.  **Deploy Now**: Click **Deploy Now**.

Railway will automatically detect the `Dockerfile` in your repository and start building.

### Option 2: Manual Configuration

If you want more control or if the automatic detection fails:

1.  Create a new project on Railway.
2.  Connect your GitHub repository `Playlistify-AI`.
3.  Go to **Settings** > **Build**.
    *   **Builder**: Select `Dockerfile`.
    *   **DockerfilePath**: `Dockerfile` (default).
4.  Go to **Variables** (Optional but Recommended).
    *   Add your Spotify credentials if you want to override the defaults:
        *   `SPOTIFY_CLIENT_ID`
        *   `SPOTIFY_CLIENT_SECRET`
        *   `SPOTIFY_REFRESH_TOKEN`
    *   `ENABLE_NLP`: `true`
    *   `PORT`: Railway sets this automatically (usually `80` or `3000`), your app is configured to listen on it.

## 🌐 Accessing Your App

1.  Once the deployment shows "Active" (green), click on the project card.
2.  Go to the **Settings** tab.
3.  Under **Networking**, click **Generate Domain**.
4.  Railway will assign a public URL (e.g., `playlistify-ai-production.up.railway.app`).
5.  Click the link to open your live application!

## 🔍 Troubleshooting

-   **Build Failed?** Check the "Build Logs". Ensure `npm install` and `npm run build` are executing correctly.
-   **App Crashing?** Check the "Deploy Logs". Look for errors related to missing credentials or port binding.
-   **Health Check**: Your app has a health check endpoint at `/health`.

## 📝 Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SPOTIFY_CLIENT_ID` | Your Spotify Client ID | (Embedded Default) |
| `SPOTIFY_CLIENT_SECRET` | Your Spotify Client Secret | (Embedded Default) |
| `SPOTIFY_REFRESH_TOKEN` | Your Spotify Refresh Token | (Embedded Default) |
| `ENABLE_NLP` | Enable natural language processing | `true` |
| `PORT` | Port to listen on | Provided by Railway |

---
**Happy Streaming! 🎵**
