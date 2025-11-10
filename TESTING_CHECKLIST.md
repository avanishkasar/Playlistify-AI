# Playlistify AI - Complete Testing & Submission Checklist

## ✅ PRE-SUBMISSION CHECKLIST

### Server Status
- [ ] Local server running on http://localhost:3001
- [ ] `/api` endpoint returns healthy status
- [ ] `/stats` endpoint returns metrics
- [ ] Frontend loads without errors

### Apify Deployment  
- [ ] Logged into Apify CLI (`apify login`)
- [ ] Actor pushed to platform (`apify push`)
- [ ] Container URL obtained from Apify Console
- [ ] Standby mode enabled
- [ ] Input schema configured with credentials

### Functionality Tests
- [ ] Search works via `/mcp` endpoint
- [ ] Recommendations work with seed genres
- [ ] NLP parses "workout" → rock/electronic
- [ ] Playlist creation succeeds
- [ ] New playlist visible in Spotify app

### Documentation
- [ ] README.md complete
- [ ] DEVPOST_SUBMISSION.md ready
- [ ] PROBLEM_IT_SOLVES.md ready
- [ ] DEMO_SCRIPT.md created
- [ ] GitHub repo public and clean

### Media Assets
- [ ] 10 screenshots captured
- [ ] 2-minute video recorded
- [ ] Architecture diagram created
- [ ] Code snippets highlighted

### Devpost Submission
- [ ] Form filled with prepared content
- [ ] All links verified (GitHub, Live Demo)
- [ ] Screenshots uploaded (10)
- [ ] Video uploaded
- [ ] Tracks selected (Apify, AI/ML, Best Overall)
- [ ] Submission confirmed

---

## 🧪 TESTING SCRIPT

Run these commands to verify everything works:

### Test 1: Health Check
```powershell
Invoke-RestMethod http://localhost:3001/api | ConvertTo-Json
```
**Expected:** 
```json
{
  "status": "healthy",
  "service": "Playlistify",
  "version": "0.1.0"
}
```

### Test 2: Search Tracks
```powershell
$body = @{
    tool = "search-track"
    input = @{
        query = "happy"
        limit = 5
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/mcp -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 5
```
**Expected:** List of 5 tracks with names, artists, URIs

### Test 3: Get Recommendations
```powershell
$body = @{
    tool = "recommend"
    input = @{
        seedGenres = @("pop", "indie")
        limit = 10
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/mcp -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 5
```
**Expected:** List of 10 recommended tracks

### Test 4: NLP Processing (Check Logs)
The server should log NLP parsing. Look for:
```
INFO Parsed playlist intent { intent: { ... } }
```

### Test 5: Create Playlist (CRITICAL)
```powershell
$body = @{
    tool = "create-playlist"
    input = @{
        name = "Test Hackathon Playlist"
        description = "Testing Playlistify AI"
        trackUris = @(
            "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
            "spotify:track:1301WleyT98MSxVHPZCA6M"
        )
        isPublic = $true
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri http://localhost:3001/mcp -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 5
```
**Expected:** Playlist ID returned, playlist visible in Spotify

---

## 📊 APIFY DEPLOYMENT GUIDE

### Step 1: Verify Actor Configuration
```powershell
cd C:\Users\khanj\projects\Apify-Project
Get-Content .actor\actor.json
```

### Step 2: Login to Apify
```powershell
apify login
```

### Step 3: Push Actor
```powershell
apify push
```

### Step 4: Configure Input in Apify Console
1. Go to https://console.apify.com/actors
2. Find `wealthy_rhinoceros/playlistify-ai`
3. Click "Input" tab
4. Set:
   - spotifyClientId: `e7b084553d51471fbc32cb2e8a90936d`
   - spotifyClientSecret: `5db1a269182b45c5ba59406192bfa704`
   - spotifyRefreshToken: `AQABIaUQQGPcd6NgTugriwiPPXibmRRQFfWqZQYnIxTFWhHwbH17HX_42zjrSuc6yBeOZhl_Ys4jj36S8sqOkbLXddso4LQ2jsD2agsr9IMgriOMidnZRgsRgbfSaqCdMQ4`
   - enableNLP: `true`
   - port: `3001`

### Step 5: Enable Standby Mode
1. Go to Settings tab
2. Enable "Standby mode"
3. Set memory: 2048 MB
4. Save

### Step 6: Start Actor
1. Click "Start" button
2. Wait for Container URL
3. Copy URL (format: https://xxxxx.runs.apify.net/)

### Step 7: Test Container
```powershell
# Replace with your actual Container URL
$containerUrl = "https://xxxxx.runs.apify.net"
Invoke-RestMethod "$containerUrl/api" | ConvertTo-Json
```

---

## 🎥 VIDEO RECORDING CHECKLIST

### Setup (Before Recording)
- [ ] Close unnecessary browser tabs
- [ ] Clear Spotify queue
- [ ] Have test prompt ready: "energetic workout music"
- [ ] Start screen recording (OBS/Windows Game Bar)
- [ ] Audio test (check microphone)

### Recording Flow
1. [0:00-0:15] Show problem (Spotify scrolling)
2. [0:15-0:30] Open Playlistify AI homepage
3. [0:30-0:45] Enter credentials (show wizard briefly)
4. [0:45-1:00] Type prompt & click create
5. [1:00-1:15] Show success message
6. [1:15-1:35] Open Spotify → show new playlist → play track
7. [1:35-1:50] Show Apify dashboard (Actor running)
8. [1:50-2:00] Show GitHub repo & closing

### Post-Production
- [ ] Trim to exactly 2 minutes
- [ ] Add captions/subtitles (optional)
- [ ] Export in 1080p
- [ ] Upload to YouTube (unlisted)
- [ ] Copy link for Devpost

---

## 📸 SCREENSHOT GUIDE

### Tools
- Windows: `Win + Shift + S` (Snipping Tool)
- Save to: `C:\Users\khanj\projects\Apify-Project\screenshots\`

### Naming Convention
- `01-homepage.png`
- `02-credentials-step1.png`
- `03-credentials-step2.png`
- `04-credentials-step3.png`
- `05-prompt-input.png`
- `06-loading-state.png`
- `07-success-message.png`
- `08-spotify-playlist-list.png` ⭐
- `09-spotify-playlist-tracks.png` ⭐
- `10-apify-dashboard.png`
- `11-github-repo.png`
- `12-code-snippet.png`

---

## 📝 DEVPOST FORM - QUICK FILL

### Basic Info
**Project Name:** Playlistify AI
**Tagline:** Your mood in words. Your music in seconds.
**Built With:** Node.js, TypeScript, Apify, Express.js, Docker, Spotify Web API

### Description (copy from DEVPOST_SUBMISSION.md)
Paste the "What it does" section

### Inspiration
"Ever spend endless minutes scrolling through Spotify playlists trying to find the perfect vibe? We built Playlistify AI to turn your mood into music instantly."

### What it does (copy from DEVPOST_SUBMISSION.md)
Paste the detailed description

### How we built it
"Built as an Apify Actor using Node.js/TypeScript/Express, integrated with Spotify Web API, deployed on Apify's serverless platform with Docker containerization."

### Challenges (copy from DEVPOST_FORM_CONTENT.md)
Paste the challenges section

### Accomplishments
"Built a production-ready Apify Actor with full Spotify integration, zero downtime deployment, and instant playlist creation - all in a hackathon timeline!"

### What we learned
"Deep dive into Apify platform, OAuth 2.0 flows, serverless architecture, and building privacy-first applications."

### What's next
"Mobile app, Spotify Desktop Extension, collaborative playlists, and integration with more music platforms."

### Links
- **GitHub:** https://github.com/avanishkasar/Playlistify-AI
- **Demo:** [CONTAINER_URL from Apify Console]

### Prizes
✅ Best Use of Apify
✅ Best AI/ML Hack  
✅ Best Overall Hack

---

## ⏰ TIMELINE

**Right Now:**
1. Test all endpoints (15 min)
2. Capture screenshots (15 min)
3. Record video (20 min)
4. Fill Devpost form (15 min)
5. Upload & submit (10 min)

**Total:** 75 minutes

**DEADLINE:** TODAY

---

## 🆘 TROUBLESHOOTING

### Server Won't Start
```powershell
Get-Process node | Stop-Process -Force
cd C:\Users\khanj\projects\Apify-Project
npm run build
npm start
```

### Port Already in Use
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

### Spotify Authentication Fails
- Check credentials in `.env`
- Verify refresh token hasn't expired
- Re-authorize at https://developer.spotify.com/dashboard

### Apify Push Fails
- Check `.actor/actor.json` exists
- Verify `apify login` completed
- Try `apify push --force`

---

## 🏆 WINNING STRATEGY

### Why We'll Win "Best Use of Apify"
1. **Only working Apify Actor** in competition
2. **Full platform integration:** Standby mode, billing, MCP
3. **Production-ready:** Error handling, caching, rate limiting
4. **Clean implementation:** Professional code structure
5. **Real use case:** Solves actual user problem

### Competitive Edge
- DONNA (6 likes): Slides, no working demo
- Us: Working code, live deployment, Spotify integration

### Key Messaging
"Playlistify AI is the only production-ready Apify Actor in this competition, demonstrating deep platform integration and solving a real problem."

---

## ✅ FINAL CHECKS

Before submitting:
- [ ] Test every link in submission
- [ ] All 10 screenshots uploaded
- [ ] Video plays correctly
- [ ] GitHub repo public
- [ ] Container URL accessible
- [ ] All required fields filled
- [ ] Preview submission
- [ ] SUBMIT!

---

🚀 **NOW GO WIN THIS HACKATHON!** 🏆
