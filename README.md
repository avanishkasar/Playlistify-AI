# Playlistify AI

> **Most playlist tools react. Playlistify learns.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-brightgreen?style=for-the-badge)](https://playlistify.up.railway.app)
[![Apify Actor](https://img.shields.io/badge/Apify-Pro%20Version-orange?style=for-the-badge&logo=apify&logoColor=white)](https://apify.com/viverun/playlistfy)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

**Playlistify AI** is not a playlist generator. It's a personal music agent that learns your emotional patterns and intent over time, then proactively creates and evolves Spotify playlists to support focus, mood, and daily routines.

**Live Application:** [playlistify.up.railway.app](https://playlistify.up.railway.app)

**Pro Version (Apify):** [apify.com/viverun/playlistfy](https://apify.com/viverun/playlistfy)

---

## Overview

Playlistify AI transforms natural language descriptions into perfectly curated Spotify playlists. Unlike traditional recommendation engines, Playlistify understands your real-time mood, learns your evolving taste through agentic memory, supports multiple languages (English, Hindi, Tamil, Telugu), and creates playlists directly in your Spotify account—all in under 10 seconds.

### What Makes Playlistify AI Different

| Traditional Playlist Generators | Playlistify AI |
|--------------------------------|----------------|
| Enter mood → get playlist | Understands emotional **intent** behind your words |
| Forgets you after each use | **Remembers** your preferences and evolves |
| Waits for commands | **Proactively suggests** based on patterns |
| Dumps raw tracks | **Explains why** it chose each track |
| Static output | Playlists that **evolve** based on feedback |

---

## Features

### Current Features

1. **AI-Powered Playlist Generation** - Create personalized Spotify playlists instantly using natural language descriptions in multiple languages (English, Hindi, Tamil, Telugu).

2. **Spotify Library Integration** - Connect your Spotify account to create, view, manage, and delete playlists directly in your Spotify library.

3. **Music Timeline & Analytics** - Track your music evolution with weekly activity charts, genre breakdown, mood journey, and discovery score metrics.

4. **Collaborative Playlists** - Create real-time collaborative playlist sessions with friends using unique session codes (max 3 users per session).

5. **Curated Picks** - Explore handpicked playlists curated by music enthusiasts and generate similar vibes with AI.

6. **Top Creators Leaderboard** - Compete with other users and see rankings based on playlist creation activity with "View All" functionality.

### Future Features

1. **Downloadable Playlists** - Export your playlists as downloadable files (MP3, M4A) for offline listening and backup purposes.

2. **Apple Music Integration** - Connect and sync playlists with Apple Music, bringing the same powerful AI playlist generation to Apple Music users.

3. **YouTube Music Integration** - Seamlessly integrate with YouTube Music to create and manage playlists across multiple streaming platforms.

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js 20+ |
| **Language** | TypeScript |
| **Backend** | Express.js |
| **Frontend** | Vanilla HTML/CSS/JS with iOS Liquid Glass Theme |
| **Database** | SQLite (better-sqlite3) |
| **API Integration** | Spotify Web API (OAuth 2.0 with PKCE) |
| **AI Services** | Google Generative AI (Gemini) |
| **NLP** | Custom intent engine with 50+ emotional concepts |
| **Memory** | JSON-based persistent storage + SQLite |
| **Containerization** | Docker |
| **Hosting** | Railway |
| **Pro Version** | Apify Actor with MCP Tools |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PLAYLISTIFY AI                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │   Frontend   │───▶│  Express.js  │───▶│   Agentic Engine     │   │
│  │  (HTML/CSS)  │    │     API      │    │  (Brain of the app)  │   │
│  └──────────────┘    └──────────────┘    └──────────────────────┘   │
│                              │                       │               │
│                              ▼                       ▼               │
│                    ┌──────────────┐    ┌──────────────────────┐     │
│                    │   Spotify    │    │    Intent Engine     │     │
│                    │   Handler    │    │  (NLP Understanding) │     │
│                    └──────────────┘    └──────────────────────┘     │
│                              │                       │               │
│                              ▼                       ▼               │
│                    ┌──────────────┐    ┌──────────────────────┐     │
│                    │   Spotify    │    │    Agent Memory      │     │
│                    │   Web API     │    │  (Learning System)   │     │
│                    └──────────────┘    └──────────────────────┘     │
│                                                      │               │
│                                                      ▼               │
│                                        ┌──────────────────────┐     │
│                                        │   SQLite + JSON     │     │
│                                        │   (Data Storage)     │     │
│                                        └──────────────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **Agent Memory** | `src/services/agentMemory.ts` | Persistent learning system |
| **Intent Engine** | `src/services/intentEngine.ts` | Natural language understanding |
| **Agentic Engine** | `src/services/agenticEngine.ts` | Proactive behavior & orchestration |
| **Spotify Handler** | `src/services/spotifyHandler.ts` | Spotify API integration |
| **Main API** | `src/main.ts` | Express server & endpoints |
| **Database** | `src/database.ts` | SQLite database management |

---

## Installation

### Prerequisites

- Node.js 20.0.0 or higher
- npm or yarn
- Spotify Developer Account (for Spotify integration)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/avanishkasar/Playlistify-AI.git
   cd Playlistify-AI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables (optional):**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=3001
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3001/api/spotify/oauth/callback
   FRONTEND_URL=http://localhost:5500
   ENABLE_NLP=true
   ```

   Note: The app includes default credentials for quick testing. For production, use your own Spotify app credentials.

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   Or for production:
   ```bash
   npm run build
   npm start
   ```

5. **Open your browser:**
   
   Navigate to `http://localhost:3001` to access the application.

---

## Usage

### Web Interface

1. Open the application in your browser
2. Enter a mood or activity description (e.g., "Late night coding session, low stress")
3. Click generate
4. Your playlist is created instantly in your Spotify account

### Example Prompts

**Emotional Context:**
- "I need to survive a 2am debugging session"
- "Music that feels like quiet confidence before a presentation"
- "Background vibes that won't distract me while I write"

**Traditional Prompts:**
- "Energetic workout songs from the 2000s"
- "Relaxing acoustic guitar for Sunday morning"
- "Dark electronic music for late night coding"

**Multi-Language Support:**
- "खुश गाने सुबह के लिए" (Happy songs for morning - Hindi)
- "இரவு நேரத்திற்கான மெதுவான பாடல்கள்" (Slow songs for night - Tamil)
- "నా జిమ్ వర్కౌట్ కోసం ఎనర్జెటిక్ పాటలు" (Energetic songs for gym - Telugu)

---

## API Reference

### Authentication Endpoints

#### Register User
**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "username": "user123",
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Login
**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Forgot Password
**Endpoint:** `POST /api/auth/forgot-password`

**Request:**
```json
{
  "email": "user@example.com"
}
```

### Playlist Generation

#### Generate Playlist (Agentic)
**Endpoint:** `POST /api/generate-playlist`

**Request:**
```json
{
  "prompt": "I need focus music for a late night coding session",
  "userId": 1
}
```

**Response:**
```json
{
  "success": true,
  "playlist": {
    "id": "playlist_id",
    "name": "Late Night Coding Focus",
    "uri": "spotify:playlist:...",
    "url": "https://open.spotify.com/playlist/..."
  },
  "tracks": [
    {
      "name": "Track Name",
      "artist": "Artist Name",
      "uri": "spotify:track:...",
      "album": "Album Name"
    }
  ],
  "explanation": {
    "summary": "I picked tracks that match your 'focused' mood...",
    "factors": [
      {
        "factor": "Emotional State",
        "value": "focused, calm",
        "reasoning": "..."
      }
    ]
  }
}
```

### Spotify Integration

#### Connect Spotify Account
**Endpoint:** `GET /api/spotify/login?userId=1&returnUrl=app.html`

Initiates OAuth 2.0 flow to connect user's Spotify account.

#### Get User Playlists
**Endpoint:** `GET /api/spotify/user-playlists?userId=1`

Returns all playlists from user's Spotify account.

#### Create Playlist
**Endpoint:** `POST /api/spotify/create-playlist`

**Request:**
```json
{
  "userId": 1,
  "name": "My Playlist",
  "description": "Playlist description",
  "isPublic": true,
  "trackUris": ["spotify:track:...", "spotify:track:..."]
}
```

#### Delete Playlist
**Endpoint:** `DELETE /api/spotify/delete-playlist`

**Request:**
```json
{
  "userId": 1,
  "playlistId": "playlist_id"
}
```

### Analytics & Statistics

#### Get User Stats
**Endpoint:** `GET /api/user-stats?userId=1`

Returns user statistics including total playlists, weekly activity, genre breakdown, etc.

#### Get Timeline Playlists
**Endpoint:** `GET /api/timeline-playlists?userId=1&dbUserId=1`

Returns recent playlists for timeline view.

#### Get Weekly Activity
**Endpoint:** `GET /api/weekly-activity?userId=1`

Returns weekly playlist creation activity.

#### Get Genre Breakdown
**Endpoint:** `GET /api/genre-breakdown?userId=1`

Returns genre distribution statistics.

#### Get Mood Journey
**Endpoint:** `GET /api/mood-journey?userId=1`

Returns mood evolution over time.

#### Get Discovery Score
**Endpoint:** `GET /api/discovery-score?userId=1`

Returns discovery score and explorer level.

### Leaderboard

#### Get Leaderboard
**Endpoint:** `GET /api/leaderboard?includeZero=false`

Returns top playlist creators. Use `includeZero=true` to include users with 0 playlists.

### Collaborative Playlists

#### Create Session
**Endpoint:** `POST /api/collab/create-session`

**Request:**
```json
{
  "userId": 1,
  "playlistName": "Collaborative Playlist"
}
```

#### Join Session
**Endpoint:** `POST /api/collab/join-session`

**Request:**
```json
{
  "userId": 2,
  "sessionCode": "ABC123"
}
```

#### Get Live Sessions
**Endpoint:** `GET /api/collab/live-sessions`

Returns all active collaborative sessions.

---

## Project Structure

```
Playlistify-AI/
├── src/
│   ├── main.ts                    # Main Express server
│   ├── database.ts                # SQLite database operations
│   ├── auth.ts                    # Authentication routes
│   ├── config.ts                  # Configuration management
│   ├── types.ts                   # TypeScript type definitions
│   ├── routes/
│   │   ├── userAuth.ts            # User authentication routes
│   │   ├── spotifyOAuthRoutes.ts  # Spotify OAuth routes
│   │   ├── spotifyLibraryRoutes.ts # Spotify library management
│   │   ├── collabRoutes.ts        # Collaborative playlist routes
│   │   ├── paymentRoutes.ts       # Payment processing routes
│   │   └── adminRoutes.ts         # Admin routes
│   ├── services/
│   │   ├── agenticEngine.ts       # Agentic AI engine
│   │   ├── agentMemory.ts         # Persistent memory system
│   │   ├── aiService.ts           # AI service integration
│   │   ├── intentEngine.ts        # Natural language understanding
│   │   ├── playlistBuilder.ts     # Playlist construction logic
│   │   ├── spotifyHandler.ts      # Spotify API wrapper
│   │   └── jiosaavnService.ts     # JioSaavn integration
│   └── utils/
│       ├── cache.ts                # Caching utilities
│       ├── nlpHelper.ts            # NLP helper functions
│       └── rateLimiter.ts          # Rate limiting
├── public/
│   ├── index.html                  # Landing page
│   ├── app.html                    # Main application page
│   ├── timeline.html               # Timeline & analytics page
│   ├── curated.html                # Curated picks page
│   ├── collab.html                 # Collaborative playlists page
│   ├── profile.html                # User profile page
│   ├── spotify-library.html        # Spotify library management
│   ├── apify.html                  # Pro version page
│   ├── style.css                   # Main stylesheet
│   ├── pages.css                   # Page-specific styles
│   ├── auth.css                    # Authentication styles
│   ├── page-transitions.js         # Page transition animations
│   ├── spotify-connect.js          # Spotify connection handler
│   ├── spotify-popup.js            # Spotify connection popup
│   ├── auth-button.js              # Authentication button component
│   └── images/                     # Static images
├── data/
│   ├── agent-memory.json           # Agent memory storage
│   └── playlistify.db             # SQLite database
├── scripts/
│   ├── spotify-auth-helper.js      # Spotify auth helper script
│   └── test-spotify-auth.js        # Spotify auth testing
├── docs/                           # Documentation
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── Dockerfile                      # Docker configuration
└── README.md                       # This file
```

---

## Deployment

### Railway Deployment

1. **Fork this repository**
2. **Sign up at [Railway](https://railway.app/)**
3. **Create New Project** → **Deploy from GitHub**
4. **Select your forked repo**
5. **Railway auto-detects the Dockerfile and deploys**

Railway provides:
- Automatic HTTPS
- Environment variable management
- Auto-deploy on git push
- Free tier available

### Docker Deployment

```bash
# Build the Docker image
docker build -t playlistify-ai .

# Run the container
docker run -p 3001:3001 playlistify-ai
```

### Environment Variables

For production deployment, set these environment variables:

```env
PORT=3001
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://your-domain.com/api/spotify/oauth/callback
FRONTEND_URL=https://your-domain.com
ENABLE_NLP=true
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true
```

---

## How the Agent Learns

### The Feedback Loop

1. You generate a playlist
2. Agent stores the intent + characteristics
3. You interact (like/skip tracks, rate playlist)
4. Agent updates your taste profile
5. Next time: more personalized recommendations

### What Gets Stored (Privacy-First)

**We store:**
- Derived preferences (e.g., "prefers lo-fi at night")
- Aggregated feedback patterns
- Time-based listening tendencies
- User statistics and analytics

**We never store:**
- Raw listening history
- Personal information beyond what's necessary
- Track-by-track logs

### Your Taste Fingerprint

Over time, the agent builds a profile like:

```json
{
  "dominantMoods": ["focused", "calm"],
  "genreAffinities": {
    "lo-fi": 0.8,
    "electronic": 0.6,
    "indie": 0.5
  },
  "timePreferences": {
    "night": {
      "mood": "calm",
      "genre": "ambient"
    },
    "morning": {
      "mood": "energetic",
      "genre": "pop"
    }
  }
}
```

---

## Pro Version (Apify)

For developers and power users, we offer a **Pro version on Apify** with MCP (Model Context Protocol) tools:

[![Try on Apify](https://img.shields.io/badge/Try%20on%20Apify-Pro%20Version-orange?style=for-the-badge&logo=apify)](https://apify.com/viverun/playlistfy)

**MCP Tools Available:**
- `search-track` - Search Spotify tracks by query
- `recommend` - Get AI-powered track recommendations
- `create-playlist` - Create playlists directly on Spotify

**Pricing:** Pay per event (API call) - perfect for automation and integrations!

---

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts the server with `tsx` for hot-reloading TypeScript files.

### Building for Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

Note: Test suite is currently under development.

---

## Contributing

Contributions are welcome! Feel free to:

- Report bugs via [GitHub Issues](https://github.com/avanishkasar/Playlistify-AI/issues)
- Suggest new features via [GitHub Issues](https://github.com/avanishkasar/Playlistify-AI/issues)
- Submit pull requests

### Development Guidelines

1. Follow TypeScript best practices
2. Maintain code style consistency
3. Add comments for complex logic
4. Update documentation for new features
5. Test your changes thoroughly

---

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- Powered by [Google Generative AI](https://ai.google.dev/)
- Deployed on [Railway](https://railway.app/)
- Pro Version on [Apify](https://apify.com/)
- Built for Hack This Fall 2025

---

## Team

**Team DDoxer**

- **Avanish Kasar** - Lead Developer
  - [X (Twitter)](https://x.com/only_avanish)
  - [LinkedIn](https://linkedin.com/in/avanishkasar)
  - [GitHub](https://github.com/avanishkasar)

- **Jamil** - Co-Developer

---

## Support

- **Live Application:** [playlistify.up.railway.app](https://playlistify.up.railway.app)
- **Pro Version:** [apify.com/viverun/playlistfy](https://apify.com/viverun/playlistfy)
- **Report Issues:** [GitHub Issues](https://github.com/avanishkasar/Playlistify-AI/issues)
- **Request Features:** [GitHub Issues](https://github.com/avanishkasar/Playlistify-AI/issues)

---

**Made with dedication by Team DDoxer**

*"Music is not trivial. Music is memory, emotion, routine, identity."*
