# 🧹 Project Cleanup & Organization

## Files to Remove Manually

The following Apify-specific files should be deleted as they're no longer needed for Railway deployment:

### Directories
- [ ] `.actor/` - Apify Actor configuration
- [ ] `Playlistify/` - Duplicate nested folder
- [ ] `scripts/` - Apify auth helper scripts

### Documentation Files (Apify-specific)
- [ ] `APIFY_DEPLOYMENT.md` - Replaced with RAILWAY.md
- [ ] `SPOTIFY_AUTH_FIX.md` - Credentials now hardcoded
- [ ] `TESTING_CHECKLIST.md` - Apify-specific testing
- [ ] `SUBMISSION_PACKAGE.md` - Hackathon submission docs
- [ ] `ACTION_PLAN.md` - Old development plan
- [ ] `DEMO_SCRIPT.md` - Apify demo script
- [ ] `FINAL_CHECKLIST.md` - Apify checklist
- [ ] `REDIRECT_GUIDE.md` - Apify redirect setup

### Configuration Files
- [ ] `INPUT_SCHEMA.json` - Apify input schema
- [ ] `.credentials.txt` - Temporary credentials file

## Run Cleanup Script

```powershell
# PowerShell - Run from project root
.\cleanup-apify-files.ps1
```

Or manually:

```powershell
# Remove directories
Remove-Item -Recurse -Force .actor, Playlistify, scripts -ErrorAction SilentlyContinue

# Remove files
Remove-Item -Force INPUT_SCHEMA.json, APIFY_DEPLOYMENT.md, SPOTIFY_AUTH_FIX.md, TESTING_CHECKLIST.md, SUBMISSION_PACKAGE.md, ACTION_PLAN.md, DEMO_SCRIPT.md, FINAL_CHECKLIST.md, REDIRECT_GUIDE.md, .credentials.txt -ErrorAction SilentlyContinue
```

## Final Project Structure

After cleanup, your project should look like:

```
Playlistify/
├── src/                    # Source code
│   ├── main.ts
│   ├── config.ts
│   ├── spotifyHandler.ts
│   ├── cache.ts
│   ├── rateLimiter.ts
│   ├── nlpHelper.ts
│   ├── playlistBuilder.ts
│   ├── billing.ts
│   └── types.ts
├── public/                 # Static files
│   ├── index.html
│   └── style.css
├── dist/                   # Build output (gitignored)
├── node_modules/           # Dependencies (gitignored)
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── Dockerfile
├── railway.json            # Railway config
├── README.md               # Main documentation
├── RAILWAY.md             # Railway deployment guide
├── DEPLOYMENT.md          # General deployment guide
├── QUICKSTART.md          # Quick start guide
├── MIGRATION_SUMMARY.md   # Migration notes
├── LICENSE
├── test-installation.js   # Health check script
└── cleanup-apify-files.ps1  # This cleanup script
```

## Commit Changes

After cleanup:

```bash
git add .
git commit -m "Clean up Apify files, optimize for Railway deployment"
git push origin main
```

## Railway Deployment

Once cleaned up, deploy to Railway:

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Deploy on Railway**
   - Visit [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway auto-deploys! 🚀

3. **Verify Deployment**
   ```bash
   curl https://your-app.railway.app/health
   ```

## What's Kept

### Essential Files
- ✅ `src/` - All source code
- ✅ `public/` - Web interface
- ✅ `package.json` - Dependencies
- ✅ `tsconfig.json` - TypeScript config
- ✅ `Dockerfile` - Docker support
- ✅ `railway.json` - Railway config

### Documentation
- ✅ `README.md` - Main docs
- ✅ `RAILWAY.md` - Railway guide
- ✅ `DEPLOYMENT.md` - General deployment
- ✅ `QUICKSTART.md` - Quick start
- ✅ `MIGRATION_SUMMARY.md` - Migration notes
- ✅ `LICENSE` - MIT License

### Utility
- ✅ `.gitignore` - Git ignore rules
- ✅ `test-installation.js` - Health check
- ✅ `cleanup-apify-files.ps1` - This script

## Benefits After Cleanup

1. **Cleaner Codebase** - Only Railway-relevant files
2. **Faster Builds** - Less files to process
3. **Better Organization** - Clear project structure
4. **Easier Maintenance** - No confusing legacy files
5. **Smaller Repository** - Faster cloning and deployments

## Verification

After cleanup, verify:

```bash
# Should NOT exist
Test-Path .actor           # Should be False
Test-Path INPUT_SCHEMA.json # Should be False
Test-Path APIFY_DEPLOYMENT.md # Should be False

# Should exist
Test-Path src/             # Should be True
Test-Path public/          # Should be True
Test-Path railway.json     # Should be True
```

---

**✨ Clean project, ready for Railway deployment!**
