# 🎬 Playlistify AI - Demo Script

## Video Recording Guide (2 minutes)

### Opening (0:00-0:15)
**Show:** Spotify app with endless scrolling
**Say:** "Ever spend 20 minutes scrolling through Spotify trying to find the perfect playlist? We built Playlistify AI to solve this."

### Problem Demo (0:15-0:30)
**Show:** Cluttered Spotify interface
**Say:** "The problem: Too many playlists, but none match your exact mood. Manual curation takes forever."

### Solution Demo (0:30-1:15)
**Show:** Playlistify AI Homepage at http://localhost:3001/
**Do:**
1. Enter credentials (show get-credentials wizard briefly)
2. Type: "energetic workout music"
3. Click "Create Playlist"
4. Show loading state
5. Success message appears

**Say:** "With Playlistify AI, just describe your mood in plain English. Our AI powered by Apify Actors instantly creates a personalized playlist."

### Spotify Verification (1:15-1:35)
**Show:** Open Spotify app
**Do:**
1. Refresh Spotify
2. Show new playlist "energetic workout music" 
3. Click into playlist
4. Show 20 tracks
5. Play one track (3-5 seconds)

**Say:** "The playlist appears instantly in your Spotify account. Perfect tracks, zero scrolling."

### Technical Showcase (1:35-1:50)
**Show:** Apify Dashboard
**Do:**
1. Show Actor running
2. Show Container URL
3. Show standby mode active

**Say:** "Built entirely on Apify Actors - serverless, scalable, and production-ready. This is the only working Apify integration in the competition."

### Closing (1:50-2:00)
**Show:** GitHub repo (clean structure)
**Say:** "From mood to music in 30 seconds. Playlistify AI - your soundtrack, instantly. Check out our code on GitHub."

---

## Screenshot Checklist

### 1. Homepage UI
- URL: http://localhost:3001/
- Focus: Clean interface, feature cards, status indicator
- Capture: Full page with "Server Online" green dot

### 2. Credential Wizard (Step 1)
- URL: http://localhost:3001/get-credentials.html
- Focus: Instructions for getting Spotify Client ID
- Capture: Step 1 panel

### 3. Credential Wizard (Step 2)
- Focus: Getting Client Secret instructions
- Capture: Step 2 panel

### 4. Credential Wizard (Step 3)
- Focus: Refresh token instructions
- Capture: Step 3 panel with authorization flow

### 5. Prompt Input
- URL: http://localhost:3001/
- Action: Type "energetic workout music" in input field
- Capture: Input field filled, before clicking button

### 6. Loading State
- Action: Click "Create Playlist"
- Capture: Loading spinner/animation

### 7. Success Message
- Capture: Success notification with playlist details

### 8. Spotify App - New Playlist ⭐ CRITICAL
- Open: Spotify desktop/web app
- Navigate: Your Library → Playlists
- Capture: New playlist "energetic workout music" in list

### 9. Spotify App - Playlist Contents ⭐ CRITICAL
- Open: The new playlist
- Capture: Track list (20 songs) with play button

### 10. Apify Dashboard
- URL: https://console.apify.com/actors/
- Navigate: wealthy_rhinoceros/playlistify-ai
- Capture: Actor details, last run status, standby mode

### 11. GitHub Repository
- URL: https://github.com/avanishkasar/Playlistify-AI
- Capture: Clean repo structure, README preview, commit history

### 12. Code Snippet - Playlist Creation
- File: src/main.ts lines 300-360
- Capture: `createPlaylist` function implementation
- Highlight: Spotify API integration, error handling

### 13. Architecture Diagram
- Create diagram showing:
  - User → Frontend (HTML/JS)
  - Frontend → Apify Actor (Express API)
  - Actor → Spotify API
  - Spotify → User's Account

---

## Testing Commands

### Local Testing
```powershell
# Test health endpoint
Invoke-RestMethod http://localhost:3001/api

# Test MCP search
Invoke-RestMethod -Uri http://localhost:3001/mcp -Method Post -ContentType 'application/json' -Body '{"tool":"search-track","input":{"query":"happy","limit":5}}'

# Test MCP recommend
Invoke-RestMethod -Uri http://localhost:3001/mcp -Method Post -ContentType 'application/json' -Body '{"tool":"recommend","input":{"seedGenres":["pop","indie"],"limit":10}}'
```

### Apify Container Testing
```powershell
# Replace [CONTAINER_URL] with actual URL
Invoke-RestMethod https://[CONTAINER_URL]/api
```

---

## Devpost Submission Data

### Links
- **GitHub:** https://github.com/avanishkasar/Playlistify-AI
- **Live Demo:** [CONTAINER_URL] (get from Apify Console)
- **Video:** [Upload to YouTube/Vimeo]

### Built With
- Node.js
- TypeScript
- Express.js
- Apify Actors
- Docker
- Spotify Web API
- HTML/CSS/JavaScript

### Prizes
✅ Best Use of Apify (Primary track)
✅ Best AI/ML Hack
✅ Best Overall Hack

---

## Competitive Advantages

### vs DONNA (Current Leader - 6 likes)
1. ✅ **Working Demo** - They have slides, we have code
2. ✅ **Deep Apify Integration** - Actor + Standby + Billing
3. ✅ **Production Ready** - Error handling, caching, rate limiting
4. ✅ **Privacy First** - No data storage (vs their data collection)
5. ✅ **Clean Code** - Professional structure, documented

### Key Selling Points
- "Only production-ready Apify Actor in the competition"
- "Built with Apify's entire platform (not just storage)"
- "Works NOW - not a concept"
- "Privacy-first architecture"
- "Instant playlist creation (30 seconds from mood to music)"

---

## Time Management

**Now → +30 min:** Capture all screenshots
**+30 min → +45 min:** Record 2-minute video
**+45 min → +60 min:** Fill Devpost form
**+60 min → +75 min:** Upload media
**+75 min → +90 min:** Final review & submit

**Deadline:** TODAY before midnight

---

## Emergency Contacts

- Avanish Kasar (Backend Lead)
- Team DDoxers
- Hack This Fall Organizers

🚀 **GO WIN THIS!**
