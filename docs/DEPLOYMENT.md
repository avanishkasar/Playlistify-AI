# 🚀 Deployment Guide - Playlistify AI

This guide covers deploying Playlistify AI to various cloud platforms.

## 📋 Prerequisites

- Node.js 20+ installed locally
- Git repository with your code
- The application comes with pre-configured Spotify credentials

## 🐳 Docker Deployment

### Build and Run Locally

```bash
# Build the Docker image
docker build -t playlistify-ai .

# Run the container
docker run -p 3001:3001 playlistify-ai

# Access the application
open http://localhost:3001
```

## ☁️ Cloud Platform Deployment

### 1. **Vercel** (Recommended for Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts and deploy
```

Configuration in `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/main.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/main.js"
    }
  ]
}
```

### 2. **Railway** (Recommended for Backend)

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Node.js and builds automatically
5. Your app is live!

### 3. **Render**

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Click "Create Web Service"

### 4. **Fly.io**

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Deploy
fly deploy
```

### 5. **DigitalOcean App Platform**

1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect GitHub repository
4. Select branch
5. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm start`
6. Deploy

### 6. **Heroku**

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create playlistify-ai

# Deploy
git push heroku main

# Open app
heroku open
```

## 🔧 Environment Variables (Optional)

While the app has hardcoded credentials, you can override them:

```bash
PORT=3001
ENABLE_NLP=false
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true
```

## 🌐 Custom Domain Setup

### Railway
1. Go to Settings → Domains
2. Add custom domain
3. Update DNS records

### Vercel
1. Go to Settings → Domains
2. Add domain
3. Configure DNS

### Render
1. Go to Settings → Custom Domains
2. Add domain
3. Update DNS records

## 📊 Monitoring

### Health Check Endpoint
```bash
curl https://your-domain.com/health
```

### Stats Endpoint
```bash
curl https://your-domain.com/stats
```

## 🔒 Security Notes

⚠️ **IMPORTANT**: The Spotify credentials are currently hardcoded for demo purposes. For production:

1. Move credentials to environment variables
2. Use a secrets management service
3. Implement proper authentication
4. Add rate limiting at the infrastructure level

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear node_modules and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Port Issues
```bash
# Check if port is in use
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Docker Issues
```bash
# Remove old containers
docker rm -f $(docker ps -a -q)

# Remove old images
docker rmi -f playlistify-ai

# Rebuild
docker build -t playlistify-ai .
```

## 📚 Additional Resources

- [Node.js Deployment Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Docker Documentation](https://docs.docker.com/)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)

---

**Need help?** Open an issue on [GitHub](https://github.com/avanishkasar/Playlistify-AI/issues)
