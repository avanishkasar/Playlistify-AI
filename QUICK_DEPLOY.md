# 🚀 QUICK DEPLOY - Option B Strategy

Everything is ready! Follow these steps in order:

---

## ⏱️ Time Estimate: 15-20 minutes total

---

## 1️⃣ Deploy Frontend (Vercel) - 5 min

### Steps:
1. Go to **https://vercel.com/new**
2. Click "Import Git Repository"
3. Select **avanishkasar/Playlistify-AI**
4. Configure:
   - **Root Directory**: `ai-groove-lab`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. **Environment Variables** (click "Add"):
   ```
   VITE_SUPABASE_PROJECT_ID=rubxxcptjfslfzqtubtr
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1Ynh4Y3B0amZzbGZ6cXR1YnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NTQ2ODEsImV4cCI6MjA3ODIzMDY4MX0.XX0BuXNJkzrgCQLrLbEsa75LCa5MRkQcF6Xjn_EBKD8
   VITE_SUPABASE_URL=https://rubxxcptjfslfzqtubtr.supabase.co
   VITE_SPOTIFY_CLIENT_ID=e7b084553d51471fbc32cb2e8a90936d
   VITE_SPOTIFY_CLIENT_SECRET=5db1a269182b45c5ba59406192bfa704
   VITE_SPOTIFY_REFRESH_TOKEN=AQDJ1d_74Td9rg8aiCadUkl6EJm1E9ewEk58ALOzBHRSrbZsOrnDnfr3lCxYkWg33XDjo2Y2HNGbR2p6O0XFseCDrW5KER6A1sOv4rCZYEHZ4NisDsnCYshwcVEmO2ITQDs
   VITE_BACKEND_URL=http://localhost:3001
   ```
   (⚠️ We'll update `VITE_BACKEND_URL` after backend is deployed)

6. Click **"Deploy"**
7. Wait ~3 minutes for build
8. **✅ Copy your Vercel URL**: `https://playlistify-ai-XXXXX.vercel.app`

---

## 2️⃣ Deploy Backend (Railway) - 5 min

### Steps:
1. Go to **https://railway.app/new**
2. Click "Deploy from GitHub repo"
3. Authorize Railway
4. Select **avanishkasar/Playlistify-AI**
5. Click "Deploy Now"

6. **Configure Service**:
   - Click on your deployment
   - Go to "Settings" tab
   - **Root Directory**: `/Playlistify`
   - **Start Command**: `npm run dev`

7. **Environment Variables** (click "Variables"):
   ```
   SPOTIFY_CLIENT_ID=e7b084553d51471fbc32cb2e8a90936d
   SPOTIFY_CLIENT_SECRET=5db1a269182b45c5ba59406192bfa704
   SPOTIFY_REFRESH_TOKEN=AQDJ1d_74Td9rg8aiCadUkl6EJm1E9ewEk58ALOzBHRSrbZsOrnDnfr3lCxYkWg33XDjo2Y2HNGbR2p6O0XFseCDrW5KER6A1sOv4rCZYEHZ4NisDsnCYshwcVEmO2ITQDs
   FRONTEND_URL=https://playlistify-ai-XXXXX.vercel.app
   PORT=3001
   ```
   (Update `FRONTEND_URL` with your Vercel URL from step 1)

8. Click "Deploy"
9. **Generate Domain**:
   - Settings → Networking
   - Click "Generate Domain"
   - **✅ Copy Railway URL**: `https://playlistify-production.up.railway.app`

10. **Test it**:
    - Open `https://your-backend.railway.app/health`
    - Should see: `{"status":"ok","server":"dev-server"}`

---

## 3️⃣ Connect Frontend to Backend - 2 min

1. Go back to **Vercel Dashboard**
2. Click your project → Settings → Environment Variables
3. **Update** `VITE_BACKEND_URL`:
   - Delete old value
   - Add new: `https://your-backend.railway.app`
4. Go to "Deployments" tab
5. Click "..." on latest deployment → **"Redeploy"**
6. Wait ~2 minutes

---

## 4️⃣ Test Everything - 3 min

1. **Open your Vercel website**
2. Sign in with Supabase
3. Try creating a playlist
4. Check Spotify app - playlist should appear!

✅ **If it works, you're done!**

---

## 5️⃣ (Optional) Deploy Apify Actor - 5 min

For hackathon submission only:

1. Go to **https://console.apify.com/actors**
2. Click "Create new" → "Import from Git"
3. Configure:
   ```
   Git URL: https://github.com/avanishkasar/Playlistify-AI.git
   Branch: main
   Build folder: Playlistify
   ```

4. **Environment Variables** (as secrets):
   ```
   SPOTIFY_CLIENT_ID=e7b084553d51471fbc32cb2e8a90936d
   SPOTIFY_CLIENT_SECRET=5db1a269182b45c5ba59406192bfa704
   SPOTIFY_REFRESH_TOKEN=AQDJ1d_74Td9rg8aiCadUkl6EJm1E9ewEk58ALOzBHRSrbZsOrnDnfr3lCxYkWg33XDjo2Y2HNGbR2p6O0XFseCDrW5KER6A1sOv4rCZYEHZ4NisDsnCYshwcVEmO2ITQDs
   ```

5. Click "Build"
6. Click "Publish" (set to Public)
7. **✅ Copy Actor URL**

---

## 📝 Final Steps

### Update README
Edit `README.md` and add your live links:

```markdown
| Platform | URL |
|----------|-----|
| **🌐 Website** | https://your-vercel-url.vercel.app |
| **📡 API** | https://your-backend.railway.app |
| **🤖 Apify** | https://console.apify.com/actors/your-id |
```

### Submit to Devfolio
1. Add project title: **Playlistify AI**
2. Add tagline
3. Paste live links
4. Select tracks:
   - ✅ Apify $1M Challenge
   - ✅ GitHub - Most Creative Use
   - ✅ Main Hackathon
5. Submit!

---

## 🎉 YOU'RE DONE!

Your project is now:
- ✅ Live on the web (Vercel)
- ✅ Backend always running (Railway)
- ✅ MCP server for AI agents (Apify)
- ✅ Eligible for 3+ prizes
- ✅ Always accessible via link

---

## 🐛 Troubleshooting

### Vercel build fails
- Check package.json in ai-groove-lab
- Verify all env vars are set
- Check build logs

### Railway deploy fails
- Verify root directory is `/Playlistify`
- Check start command is `npm run dev`
- Look at deployment logs

### CORS errors
- Update `FRONTEND_URL` in Railway
- Redeploy both frontend and backend
- Clear browser cache

### Can't create playlists
- Test backend `/health` endpoint first
- Check Spotify token is valid
- Verify all env vars match

---

## 📞 Need Help?

Check these files:
- **Full Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **README**: [README.md](./README.md)

---

**⏱️ Total Time**: ~15-20 minutes  
**💰 Total Cost**: $0 (all free tiers)  
**🏆 Prize Eligibility**: 3+ tracks  

Let's win this! 🚀
