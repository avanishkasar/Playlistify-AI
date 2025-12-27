# 🚀 APIFY DEPLOYMENT GUIDE - Playlistify AI

## 📋 Prerequisites Checklist
- ✅ Apify account: `jubilant_pheasant`
- ✅ Apify CLI installed and logged in
- ✅ Project ready at: `C:\Users\khanj\projects\Apify-Project`
- ✅ GitHub repo: https://github.com/avanishkasar/Apify-Project

---

## 🎯 DEPLOYMENT METHOD: GitHub Integration (RECOMMENDED)

Since your code is already on GitHub, the easiest way is to use Apify's GitHub integration!

### Step 1: Create Actor via Apify Console

1. **Go to Apify Console:**
   - Visit: https://console.apify.com/actors
   - Click "Create new" → "Create empty Actor"

2. **Fill in Actor Details:**
   - **Name:** `playlistify-ai`
   - **Title:** `Playlistify AI`
   - **Description:** `AI-powered Spotify playlist generator with natural language processing`
   - **Categories:** `Entertainment`, `AI`
   - **README:** Auto-generated (or paste from your repo)

3. **Click "Create"**

### Step 2: Connect GitHub Repository

1. **In your new Actor, go to "Source" tab**

2. **Select "Git repository"**

3. **Fill in GitHub details:**
   - **Git URL:** `https://github.com/avanishkasar/Apify-Project`
   - **Branch:** `main`
   - **Dockerfile:** `./Dockerfile`
   - **Build tag:** `latest`

4. **Click "Build"**

This will automatically:
- Clone your GitHub repo
- Build the Docker image
- Create your Actor

### Step 3: Configure Input Schema

1. **Go to "Input" tab**

2. **Your `INPUT_SCHEMA.json` will be automatically loaded**

3. **Or manually add these fields:**
   ```json
   {
     "spotifyClientId": "e7b084553d51471fbc32cb2e8a90936d",
     "spotifyClientSecret": "5db1a269182b45c5ba59406192bfa704",
     "spotifyRefreshToken": "AQABIaUQQGPcd6NgTugriwiPPXibmRRQFfWqZQYnIxTFWhHwbH17HX_42zjrSuc6yBeOZhl_Ys4jj36S8sqOkbLXddso4LQ2jsD2agsr9IMgriOMidnZRgsRgbfSaqCdMQ4",
     "enableNLP": true,
     "port": 3001
   }
   ```

### Step 4: Enable Standby Mode

1. **Go to "Settings" tab**

2. **Scroll to "Standby Mode"**

3. **Enable it and configure:**
   - ✅ **Enable Standby Mode**
   - **Memory:** `2048 MB`
   - **Timeout:** `3600 seconds` (1 hour)
   - **Desired Requests Per Actor Run:** `1000`

4. **Click "Save"**

### Step 5: Start Your Actor

1. **Go to "Console" tab**

2. **Click "Start"**

3. **Wait for build to complete** (~2-5 minutes)

4. **Once running, you'll get a Container URL:**
   - Format: `https://xxxxx.runs.apify.net/`
   - This is your public endpoint!

### Step 6: Test Your Deployment

```powershell
# Replace with your actual Container URL
$containerUrl = "https://xxxxx.runs.apify.net"

# Test health
Invoke-RestMethod "$containerUrl/api"

# Test playlist creation page
Start-Process "$containerUrl/create-playlist.html"
```

---

## 🔄 ALTERNATIVE METHOD: Manual Push via CLI

If you prefer using CLI:

### Step 1: Create Actor via Console First
1. Go to https://console.apify.com/actors
2. Create empty Actor named `playlistify-ai`
3. Note the Actor ID from the URL

### Step 2: Create .apify.json File

```powershell
cd C:\Users\khanj\projects\Apify-Project

# Create .apify.json with your Actor ID
@"
{
  "actorId": "YOUR_ACTOR_ID_HERE",
  "versionNumber": "0.1"
}
"@ | Out-File -FilePath .apify.json -Encoding utf8
```

### Step 3: Push from CLI

```powershell
cd C:\Users\khanj\projects\Apify-Project
apify push
```

---

## 📝 POST-DEPLOYMENT CHECKLIST

### Test All Endpoints

```powershell
# Set your Container URL
$url = "https://xxxxx.runs.apify.net"

# 1. Health Check
Invoke-RestMethod "$url/api"

# 2. Test Search
Invoke-RestMethod -Uri "$url/mcp" -Method Post -ContentType 'application/json' -Body '{"tool":"search-track","input":{"query":"happy","limit":5}}'

# 3. Test Playlist Creation
Invoke-RestMethod -Uri "$url/mcp" -Method Post -ContentType 'application/json' -Body '{"tool":"create-playlist","input":{"name":"Test Playlist","description":"Test","trackUris":["spotify:track:5H0Yfo3acNXU278LqN47pA"],"isPublic":true}}'

# 4. Open Web Interface
Start-Process "$url/create-playlist.html"
```

### Verify Spotify Integration

1. Visit `[CONTAINER_URL]/create-playlist.html`
2. Enter: "energetic workout music"
3. Click "Create My Playlist"
4. Check your Spotify account for new playlist

---

## 🎬 UPDATE YOUR DEVPOST SUBMISSION

Once deployed, update your submission with:

**Live Demo URL:** `https://xxxxx.runs.apify.net/create-playlist.html`

**API Endpoint:** `https://xxxxx.runs.apify.net/mcp`

**Actor Link:** `https://console.apify.com/actors/jubilant_pheasant~playlistify-ai`

---

## 🔧 TROUBLESHOOTING

### Build Fails
- Check Dockerfile syntax
- Ensure all dependencies in package.json
- Check build logs in Apify Console

### Container Won't Start
- Verify port 3001 is used (APIFY_CONTAINER_PORT)
- Check environment variables are set
- Review Actor logs

### Spotify Auth Fails
- Verify credentials in Input configuration
- Check refresh token hasn't expired
- Test credentials locally first

### Can't Access Container URL
- Ensure Standby mode is enabled
- Wait 1-2 minutes after start
- Check Actor status is "Running"

---

## 💡 BEST PRACTICES

1. **Use GitHub Integration:**
   - Automatic builds on push
   - Version control
   - Easy rollbacks

2. **Enable Standby Mode:**
   - Persistent HTTP server
   - Instant responses
   - No cold starts

3. **Monitor Usage:**
   - Check Actor runs
   - Monitor compute units
   - Set up alerts

4. **Keep Credentials Secure:**
   - Use input schema (encrypted)
   - Don't commit .env to Git
   - Rotate tokens regularly

---

## 📊 EXPECTED COSTS

**Standby Mode:**
- ~$0.50 - $2.00 per day (depending on usage)
- 2GB memory, persistent container

**Per Request:**
- ~$0.0001 per API call
- Negligible for hackathon demo

**Free Tier:**
- $5 free credits monthly
- Enough for testing & demo!

---

## 🚀 QUICK START (FASTEST METHOD)

1. **Visit:** https://console.apify.com/actors
2. **Click:** "Create new" → "Create empty Actor"
3. **Name:** `playlistify-ai`
4. **Go to "Source" tab**
5. **Select:** "Git repository"
6. **Enter:** `https://github.com/avanishkasar/Apify-Project`
7. **Branch:** `main`
8. **Click:** "Build"
9. **Wait 2-5 minutes**
10. **Get your Container URL!**

---

## ✅ SUCCESS INDICATORS

You'll know it's working when:
- ✅ Build status shows "Succeeded"
- ✅ Actor status shows "Running"
- ✅ Container URL returns JSON at `/api`
- ✅ Web interface loads at `/create-playlist.html`
- ✅ Playlist creation works end-to-end
- ✅ New playlists appear in Spotify

---

## 📱 NEXT STEPS AFTER DEPLOYMENT

1. **Get Container URL** from Apify Console
2. **Test the web interface** thoroughly
3. **Update Devpost submission** with live link
4. **Capture screenshots** of:
   - Apify Console (Actor running)
   - Container URL web interface
   - Spotify with created playlist
5. **Record demo video** showing live deployment
6. **Submit to Devpost!** 🎉

---

## 🏆 DEPLOYMENT TIME

**Estimated:** 10-15 minutes
- Console setup: 5 min
- Build time: 3-5 min
- Testing: 5 min

**You're almost there!** 🚀

---

## 📞 SUPPORT

**Apify Documentation:** https://docs.apify.com/
**Apify Discord:** https://discord.gg/jyEM2PRvMU
**GitHub Issues:** https://github.com/avanishkasar/Apify-Project/issues

---

## 🎯 CURRENT STATUS

- ✅ Code ready
- ✅ GitHub repo public
- ✅ Apify CLI configured
- ✅ Credentials tested
- ⏳ Waiting for Apify deployment
- ⏳ Container URL needed
- ⏳ Devpost submission update

**NOW:** Follow "QUICK START" above! 🚀
