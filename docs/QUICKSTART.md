# 🎵 Playlistify AI - Quick Start Guide

## 🚂 Deploy to Railway (Fastest!)

### 1-Click Deployment
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/playlistify-ai)

Click the button above and your app will be live in ~2 minutes! ✨

---

## 💻 Local Development

### 🚀 Get Started in 3 Steps

### 1️⃣ Install Dependencies
```bash
cd Playlistify
npm install
```

### 2️⃣ Run the Application
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

### 3️⃣ Access the Application
Open your browser and go to: **http://localhost:3001**

That's it! 🎉

---

## 🎯 What You Can Do

### Via Web Interface
1. Open http://localhost:3001
2. Enter a mood or activity (e.g., "Late night coding in Tokyo")
3. Click the send button
4. Your playlist is created instantly!

### Via API

#### Search for Tracks
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search-track",
    "input": {
      "query": "daft punk",
      "limit": 10
    }
  }'
```

#### Get Recommendations
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "recommend",
    "input": {
      "seedGenres": ["electronic", "rock"],
      "limit": 20
    }
  }'
```

#### Create a Playlist
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "create-playlist",
    "input": {
      "name": "My Awesome Playlist",
      "description": "Created via API",
      "trackUris": [
        "spotify:track:6rqhFgbbKwnb9MLmUQDhG6",
        "spotify:track:0DiWol3AO6WpXZgp0goxAV"
      ],
      "isPublic": true
    }
  }'
```

---

## 📊 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Landing page (web interface) |
| `/mcp` | POST | Main API endpoint for all operations |
| `/health` | GET | Health check |
| `/stats` | GET | View cache and usage statistics |

---

## 🔧 Configuration

The app comes pre-configured with Spotify credentials. No setup required!

### Optional Environment Variables
```bash
# Port (default: 3001)
PORT=3001

# Enable/disable features
ENABLE_NLP=false
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true
```

---

## 🐳 Docker

```bash
# Build
docker build -t playlistify-ai .

# Run
docker run -p 3001:3001 playlistify-ai

# Access
open http://localhost:3001
```

---

## 📦 Project Structure

```
Playlistify/
├── src/
│   ├── main.ts           # Main server entry point
│   ├── config.ts         # Configuration with credentials
│   ├── spotifyHandler.ts # Spotify API integration
│   ├── cache.ts          # Caching layer
│   ├── rateLimiter.ts    # Rate limiting
│   ├── nlpHelper.ts      # Natural language processing
│   └── types.ts          # TypeScript types
├── public/
│   ├── index.html        # Web interface
│   └── style.css         # Styles
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── Dockerfile           # Docker configuration
```

---

## 🎓 Examples

### Example 1: Workout Playlist
```javascript
const response = await fetch('http://localhost:3001/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tool: 'recommend',
    input: {
      seedGenres: ['rock', 'metal', 'electronic'],
      limit: 25
    }
  })
});

const data = await response.json();
console.log(data.data.tracks);
```

### Example 2: Create Custom Playlist
```javascript
// First, search for tracks
const searchRes = await fetch('http://localhost:3001/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tool: 'search-track',
    input: {
      query: 'chill lofi',
      limit: 20
    }
  })
});

const tracks = (await searchRes.json()).data.tracks;
const trackUris = tracks.map(t => t.uri);

// Then, create playlist
const createRes = await fetch('http://localhost:3001/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tool: 'create-playlist',
    input: {
      name: 'Chill Lofi Vibes',
      description: 'Perfect for studying',
      trackUris: trackUris
    }
  })
});

const playlist = (await createRes.json()).data.playlist;
console.log(`Playlist created: ${playlist.external_urls.spotify}`);
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3002 npm start
```

### Build Errors
```bash
# Clean install
rm -rf node_modules dist
npm install
npm run build
```

---

## 📚 Learn More

- [Full Documentation](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Migration Summary](./MIGRATION_SUMMARY.md)
- [Spotify Web API Docs](https://developer.spotify.com/documentation/web-api/)

---

## 💡 Tips

- Use the web interface for quick playlist creation
- Use the API for programmatic access
- Check `/stats` endpoint to monitor cache performance
- The app caches search results for 5 minutes
- Rate limiting is enabled by default (100 requests/second)

---

**Enjoy creating amazing playlists! 🎶**
