# ✅ Deployment Checklist

Use this checklist to deploy all three platforms systematically.

---

## 📋 Pre-Deployment

- [ ] All code committed to GitHub
- [ ] `.env` files excluded from git
- [ ] Spotify credentials ready
- [ ] Supabase project created
- [ ] All tests passing locally

---

## 🌐 1. Frontend (Vercel)

### Account Setup
- [ ] Signed up at [vercel.com](https://vercel.com)
- [ ] Connected GitHub account

### Deployment
- [ ] Import `avanishkasar/Playlistify-AI` repo
- [ ] Set root directory: `ai-groove-lab`
- [ ] Framework preset: **Vite**
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`

### Environment Variables
Copy these to Vercel:
- [ ] `VITE_SUPABASE_PROJECT_ID`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SPOTIFY_CLIENT_ID`
- [ ] `VITE_SPOTIFY_CLIENT_SECRET`
- [ ] `VITE_SPOTIFY_REFRESH_TOKEN`
- [ ] `VITE_BACKEND_URL` (update after Railway)

### Verify
- [ ] Build succeeded
- [ ] Website loads
- [ ] No console errors
- [ ] Copy Vercel URL: `________________`

---

## 🚂 2. Backend (Railway)

### Account Setup
- [ ] Signed up at [railway.app](https://railway.app)
- [ ] Connected GitHub account

### Deployment
- [ ] Create new project
- [ ] Deploy from GitHub: `avanishkasar/Playlistify-AI`
- [ ] Set root directory: `Playlistify`
- [ ] Start command: `npm run dev`

### Environment Variables
Copy these to Railway:
- [ ] `SPOTIFY_CLIENT_ID`
- [ ] `SPOTIFY_CLIENT_SECRET`
- [ ] `SPOTIFY_REFRESH_TOKEN`
- [ ] `FRONTEND_URL` (your Vercel URL)
- [ ] `PORT=3001`

### Networking
- [ ] Generate domain
- [ ] Copy Railway URL: `________________`
- [ ] Test `/health` endpoint

### Update Frontend
- [ ] Go back to Vercel
- [ ] Update `VITE_BACKEND_URL` to Railway URL
- [ ] Trigger redeploy

### Verify
- [ ] `/health` returns OK
- [ ] `/api/search` works
- [ ] CORS allows Vercel domain

---

## 🤖 3. Apify Actor

### Account Setup
- [ ] Signed up at [apify.com](https://apify.com)
- [ ] Registered for $1M Challenge: [apify.it/1M-htf](https://apify.it/1M-htf)

### Create Actor
- [ ] Go to [console.apify.com/actors](https://console.apify.com/actors)
- [ ] Click "Create new"
- [ ] Source type: **Git repository**

### Git Configuration
- [ ] Git URL: `https://github.com/avanishkasar/Playlistify-AI.git`
- [ ] Branch: `main`
- [ ] Build folder: `Playlistify`
- [ ] Base Docker image: `apify/actor-node:20`

### Environment Variables
Set as **secrets**:
- [ ] `SPOTIFY_CLIENT_ID`
- [ ] `SPOTIFY_CLIENT_SECRET`
- [ ] `SPOTIFY_REFRESH_TOKEN`

### Build & Publish
- [ ] Click "Build"
- [ ] Wait for build (~5 min)
- [ ] Test with sample input
- [ ] Click "Publish"
- [ ] Set visibility: **Public**
- [ ] Copy Actor URL: `________________`

### Verify
- [ ] Actor runs successfully
- [ ] MCP tools respond
- [ ] Playlist creation works

---

## 📝 4. Documentation

### Update README
- [ ] Add Vercel URL
- [ ] Add Railway URL
- [ ] Add Apify URL
- [ ] Update screenshots

### Devfolio Submission
- [ ] Project title: **Playlistify AI**
- [ ] Tagline: *AI-powered Spotify playlist generator*
- [ ] Add all live links
- [ ] Upload demo video
- [ ] Select tracks:
  - [ ] Apify $1M Challenge
  - [ ] GitHub - Most Creative Use
  - [ ] Main Hackathon

### Social Proof
- [ ] Tweet about launch
- [ ] Post on LinkedIn
- [ ] Share in Discord

---

## ✅ Final Verification

### End-to-End Test
- [ ] Open Vercel website
- [ ] Sign in with Supabase
- [ ] Generate a playlist
- [ ] Verify it appears in Spotify
- [ ] Share link works

### Performance
- [ ] Lighthouse score > 90
- [ ] First load < 3s
- [ ] No broken links
- [ ] Mobile responsive

### Security
- [ ] No secrets in frontend code
- [ ] HTTPS everywhere
- [ ] CORS properly configured
- [ ] Auth works correctly

---

## 🎉 Post-Deployment

- [ ] Submit to Devfolio
- [ ] Share with team
- [ ] Monitor error logs
- [ ] Prepare for demo
- [ ] Practice pitch

---

## 📊 Live Links (Fill these in)

```
Frontend (Vercel):   https://________________
Backend (Railway):   https://________________
Apify Actor:         https://________________
GitHub Repo:         https://github.com/avanishkasar/Playlistify-AI
```

---

## 🐛 Troubleshooting

### Vercel build fails
- Check `package.json` in `ai-groove-lab`
- Verify all dependencies installed
- Check build logs for errors

### Railway deploy fails
- Check Dockerfile
- Verify `npm run dev` works locally
- Check environment variables

### Apify build fails
- Check `.actor/actor.json`
- Verify Dockerfile exists
- Check build logs in Apify Console

---

**Last Updated**: November 14, 2025  
**Status**: Ready for deployment 🚀
