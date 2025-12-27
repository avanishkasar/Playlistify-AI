# Playlistify AI - Railway Deployment

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/playlistify-ai)

## Railway-Optimized Project Structure

```
Playlistify/
├── src/              # TypeScript source files
├── public/           # Static web interface
├── dist/             # Compiled JavaScript (generated)
├── package.json      # Dependencies
├── tsconfig.json     # TypeScript config
├── Dockerfile        # Docker config (optional)
├── railway.json      # Railway configuration
└── README.md         # This file
```

## Quick Deploy to Railway

### Option 1: One-Click Deploy (Recommended)

Click the button above or visit: https://railway.app/new/template/playlistify-ai

### Option 2: Deploy from GitHub

1. **Fork this repository**
2. **Go to [Railway](https://railway.app)**
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your fork**
6. **Railway auto-deploys!** ✨

### Option 3: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

## Configuration

Railway automatically detects the Node.js build:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Port**: Auto-detected (Railway sets PORT env var)

## Environment Variables

No environment variables needed! The app comes pre-configured with Spotify credentials.

### Optional Overrides

If you want to customize:

```bash
PORT=3001                    # Railway sets this automatically
ENABLE_NLP=false            # Disable natural language processing
ENABLE_CACHE=true           # Enable response caching (recommended)
ENABLE_RATE_LIMITING=true   # Enable rate limiting (recommended)
```

## Post-Deployment

After deployment, Railway provides:
- 🌐 **Public URL**: `https://your-app.railway.app`
- 📊 **Metrics**: CPU, Memory, Network usage
- 📝 **Logs**: Real-time application logs
- 🔄 **Auto-Redeploy**: On every git push

## Testing Your Deployment

```bash
# Health check
curl https://your-app.railway.app/health

# Stats
curl https://your-app.railway.app/stats

# Create a playlist (via API)
curl -X POST https://your-app.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search-track",
    "input": { "query": "daft punk", "limit": 10 }
  }'
```

## Monitoring

Railway provides built-in monitoring:
- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: CPU, memory, and bandwidth usage
- **Deployments**: Track deployment history
- **Health Checks**: Automatic health monitoring

## Custom Domain

1. Go to Railway dashboard
2. Click on your service
3. Go to **Settings** → **Domains**
4. Add your custom domain
5. Update DNS records as instructed

## Scaling

Railway automatically scales based on:
- **Memory**: Up to 8GB
- **CPU**: Shared vCPU with burst capability
- **Network**: Unlimited bandwidth on Pro plan

## Troubleshooting

### Build Fails
- Check Railway logs for error messages
- Ensure `package.json` has correct dependencies
- Verify Node.js version (20+)

### Deployment Fails
- Check start command: `npm start`
- Ensure build completes successfully
- Verify `dist/` folder is created

### App Crashes
- Check Railway logs
- Verify environment variables
- Test locally first with `npm run dev`

## Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Support

- 📖 [Full Documentation](./README.md)
- 🚀 [Quick Start Guide](./QUICKSTART.md)
- 🐛 [GitHub Issues](https://github.com/avanishkasar/Playlistify-AI/issues)
- 💬 [Railway Community](https://discord.gg/railway)

---

**Powered by Railway** 🚂
