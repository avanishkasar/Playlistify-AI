# 🚀 Deployment Guide - Multi-Platform Strategy

This project uses a **multi-platform deployment strategy** to maximize hackathon prizes and ensure always-online availability.

## 📦 Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (Vercel)                      │
│  - React + Vite                         │
│  - Public website                       │
│  - https://playlistify-ai.vercel.app    │
└─────────────────┬───────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────▼─────────┐  ┌───▼──────────────┐
    │ Backend      │  │ Apify Actor      │
    │ (Railway)    │  │ (MCP Server)     │
    │ - Express    │  │ - For judges     │
    └──────────────┘  └──────────────────┘
```

---

## 🌐 Frontend Deployment (Vercel)

### Prerequisites
- GitHub account
- Vercel account (sign up at https://vercel.com)

### Steps

1. **Connect GitHub to Vercel**
   - Go to https://vercel.com/new
   - Import `avanishkasar/Playlistify-AI`
   - Select the `ai-groove-lab` folder as root directory

2. **Configure Build Settings**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables**
   ```bash
   VITE_SUPABASE_PROJECT_ID=rubxxcptjfslfzqtubtr
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_SUPABASE_URL=https://rubxxcptjfslfzqtubtr.supabase.co
   VITE_SPOTIFY_CLIENT_ID=e7b084553d51471fbc32cb2e8a90936d
   VITE_SPOTIFY_CLIENT_SECRET=5db1a269182b45c5ba59406192bfa704
   VITE_SPOTIFY_REFRESH_TOKEN=AQDJ1d_74Td9rg8aiCadUkl6EJm1E9ewEk58ALOzBHRSrbZsOrnDnfr3lCxYkWg33XDjo2Y2HNGbR2p6O0XFseCDrW5KER6A1sOv4rCZYEHZ4NisDsnCYshwcVEmO2ITQDs
   VITE_BACKEND_URL=https://your-backend.railway.app
   ```
   ⚠️ **Note**: Update `VITE_BACKEND_URL` after deploying backend

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Get your live URL: `https://playlistify-ai.vercel.app`

---

## 🚂 Backend Deployment (Railway)

### Prerequisites
- GitHub account
- Railway account (sign up at https://railway.app)

### Steps

1. **Create New Project**
   - Go to https://railway.app/new
   - Select "Deploy from GitHub repo"
   - Choose `avanishkasar/Playlistify-AI`
   - Set root directory: `Playlistify`

2. **Configure Service**
   - Railway will auto-detect Node.js
   - Start Command: `npm run dev`
   - No build command needed (uses tsx directly)

3. **Set Environment Variables**
   ```bash
   SPOTIFY_CLIENT_ID=e7b084553d51471fbc32cb2e8a90936d
   SPOTIFY_CLIENT_SECRET=5db1a269182b45c5ba59406192bfa704
   SPOTIFY_REFRESH_TOKEN=AQDJ1d_74Td9rg8aiCadUkl6EJm1E9ewEk58ALOzBHRSrbZsOrnDnfr3lCxYkWg33XDjo2Y2HNGbR2p6O0XFseCDrW5KER6A1sOv4rCZYEHZ4NisDsnCYshwcVEmO2ITQDs
   FRONTEND_URL=https://playlistify-ai.vercel.app
   PORT=3001
   ```

4. **Generate Domain**
   - Click "Settings" → "Networking"
   - Click "Generate Domain"
   - Copy the URL (e.g., `https://playlistify-backend-production.up.railway.app`)

5. **Update Frontend**
   - Go back to Vercel
   - Update environment variable:
     ```bash
     VITE_BACKEND_URL=https://your-backend.railway.app
     ```
   - Redeploy frontend

---

## 🤖 Apify Actor Deployment (For Hackathon)

### Prerequisites
- Apify account (sign up at https://apify.com)
- Registered for Apify $1M Challenge

### Steps

1. **Create New Actor**
   - Go to https://console.apify.com/actors
   - Click "Create new"
   - Select "Create from Git repository"

2. **Configure Git Integration**
   ```
   Git URL: https://github.com/avanishkasar/Playlistify-AI.git
   Branch: main
   Build folder: Playlistify
   ```

3. **Set Environment Variables**
   Go to "Environment" tab:
   ```bash
   SPOTIFY_CLIENT_ID=e7b084553d51471fbc32cb2e8a90936d
   SPOTIFY_CLIENT_SECRET=5db1a269182b45c5ba59406192bfa704
   SPOTIFY_REFRESH_TOKEN=AQDJ1d_74Td9rg8aiCadUkl6EJm1E9ewEk58ALOzBHRSrbZsOrnDnfr3lCxYkWg33XDjo2Y2HNGbR2p6O0XFseCDrW5KER6A1sOv4rCZYEHZ4NisDsnCYshwcVEmO2ITQDs
   ```

4. **Build & Publish**
   - Click "Build"
   - Once built, click "Publish"
   - Set to "Public" for hackathon submission

5. **Test the Actor**
   - Click "Try for free"
   - Test with sample input
   - Verify it creates playlists

---

## ✅ Verification Checklist

### Frontend (Vercel)
- [ ] Website loads at custom URL
- [ ] All pages render correctly
- [ ] No console errors
- [ ] Supabase auth works
- [ ] Can connect to backend

### Backend (Railway)
- [ ] Health endpoint responds: `GET /health`
- [ ] Search works: `POST /api/search`
- [ ] Recommendations work: `POST /api/recommend`
- [ ] Playlist creation works: `POST /api/create-playlist`
- [ ] CORS allows frontend domain

### Apify Actor
- [ ] Actor builds successfully
- [ ] Can run from Apify Console
- [ ] MCP tools respond correctly
- [ ] Published to marketplace

---

## 🏆 Hackathon Submission Links

Include these in your **Devfolio submission**:

```markdown
## 🔗 Live Demo
- **Website**: https://playlistify-ai.vercel.app
- **API Backend**: https://playlistify-backend.railway.app/health
- **Apify Actor**: https://console.apify.com/actors/YOUR_ACTOR_ID

## 📦 Repositories
- **Main Repo**: https://github.com/avanishkasar/Playlistify-AI
- **Frontend**: https://github.com/avanishkasar/ai-groove-lab

## 🎯 Prize Tracks
✅ GitHub - Most Creative Use of GitHub
✅ Apify - $1M Challenge
✅ Main Hackathon - Overall Winner
```

---

## 🐛 Troubleshooting

### Frontend doesn't load
- Check Vercel build logs
- Verify all environment variables are set
- Check browser console for errors

### Backend 502/503 errors
- Railway service may be sleeping (free tier)
- Check Railway logs
- Verify environment variables

### CORS errors
- Verify `FRONTEND_URL` is set in Railway
- Check frontend is using correct `VITE_BACKEND_URL`
- Clear browser cache

### Spotify API errors
- Verify refresh token is valid
- Check client ID and secret are correct
- Test with local `test-create-playlist.js` first

---

## 📞 Support

If deployment issues persist:
1. Check Railway logs: `Settings → Observability`
2. Check Vercel logs: `Deployments → [Latest] → Logs`
3. Test locally first: `npm run dev` (both frontend & backend)

---

**Last Updated**: November 14, 2025
**Maintained by**: @avanishkasar
