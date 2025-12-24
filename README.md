# Playlistify AI 🎵

> **Most playlist tools react. Playlistify learns.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-brightgreen?style=for-the-badge)](https://playlistify.up.railway.app)
[![Apify Actor](https://img.shields.io/badge/Apify-Pro%20Version-orange?style=for-the-badge&logo=apify&logoColor=white)](https://apify.com/viverun/playlistfy)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Spotify](https://img.shields.io/badge/Spotify-1DB954?style=for-the-badge&logo=spotify&logoColor=white)](https://developer.spotify.com/)

**Playlistify AI is not a playlist generator. It's a personal music agent that learns your emotional patterns and intent over time, then proactively creates and evolves Spotify playlists to support focus, mood, and daily routines.**

**🔗 Live Application:** [playlistify.up.railway.app](https://playlistify.up.railway.app)

**🚀 Pro Version (Apify):** [apify.com/viverun/playlistfy](https://apify.com/viverun/playlistfy)

---

## 🧠 What Makes Playlistify AI Different

| Traditional Playlist Generators | Playlistify AI |
|--------------------------------|----------------|
| Enter mood → get playlist | Understands emotional **intent** behind your words |
| Forgets you after each use | **Remembers** your preferences and evolves |
| Waits for commands | **Proactively suggests** based on patterns |
| Dumps raw tracks | **Explains why** it chose each track |
| Static output | Playlists that **evolve** based on feedback |

> *"This week you've been stressed. I kept energy low and vocals minimal."*

---

## 🏆 Built for Hack This Fall 2025

### The Vision

Music is not trivial. Music is memory, emotion, routine, identity.

We built Playlistify AI to be **emotionally intelligent** — a system that doesn't just respond to "play happy music," but understands:
- "I need something to survive a 2am debugging session"
- "Music that feels like quiet confidence before a presentation"
- "Background vibes that won't distract me while I write"

### Core Pillars

| Pillar | Description |
|--------|-------------|
| **🎯 Intent > Mood** | We parse emotional context, not just keywords |
| **🧠 Agent Memory** | Learns what you like at different times and adapts |
| **⚡ Agentic Behavior** | Suggests playlists without being asked |
| **💬 Explainability** | Every playlist comes with reasoning |
| **🔄 Evolution** | Playlists improve based on your feedback |
| **🔒 Privacy-First** | We store derived preferences, never raw data |

---

## 👥 Team DDoxer

| Team Member | Role | Connect |
|-------------|------|---------|
| **Avanish Kasar** | Lead Developer | [![X](https://img.shields.io/badge/X-000000?style=flat-square&logo=x&logoColor=white)](https://x.com/only_avanish) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/avanishkasar) |
| **Jamil** | Co-Developer | |

---

## ✨ Features in Detail

### 1. 🎯 Natural Language Intent Understanding

Not just "happy music" — we understand **context**:

```
Input: "Late night coding session, low stress"

Parsed Intent:
├── Emotional State: focused, calm
├── Activity: coding
├── Time Context: late-night
├── Target Energy: medium
├── BPM Range: 100-130
├── Vocal Preference: instrumental
└── Suggested Genres: electronic, lo-fi, ambient
```

### 2. 🧠 Agent Memory System

Playlistify AI remembers you:
- **What worked**: Tracks you liked, playlists you loved
- **What didn't**: Songs you skipped, vibes that missed
- **When you listen**: Morning vs. late-night preferences
- **How you evolve**: Your taste fingerprint develops over time

```typescript
// Every interaction teaches the agent
"Last time you liked lo-fi + low BPM at night. I kept that energy."
```

### 3. ⚡ Proactive Suggestions

The agent acts without being asked:

> *"You usually listen around this time. Want a fresh focus playlist?"*

Based on:
- Habitual listening times
- Day-of-week patterns
- Recent mood trends

### 4. 💬 Explainability Layer

Every playlist explains **why**:

> *"I picked tracks that match your 'focused' mood for coding, at late-night. I kept the energy medium and chose low-vocal tracks based on your past preferences."*

### 5. 🔄 Playlist Evolution

Playlists are systems, not outputs:
- Like/Skip buttons on every track
- Feedback influences future generations
- Weekly refresh suggestions
- One-click modifications ("more energy", "less vocals")

### 6. 🔒 Privacy-First Design

- **We store only derived preferences**, never raw listening history
- Local JSON storage (no external DB required)
- One-click data export (GDPR compliance)
- Clear all data anytime

---

## 📸 Screenshots

<div align="center">

### 🏠 Home Page
<img src="https://github.com/avanishkasar/Playlistify-AI/blob/main/home%20page.png" alt="Playlistify AI Home Page" width="800"/>

### 👥 About Us
<img src="https://github.com/avanishkasar/Playlistify-AI/blob/main/about.png" alt="About Team DDoxer" width="800"/>

### ⚙️ How It Works
<img src="https://github.com/avanishkasar/Playlistify-AI/blob/main/How%20It%20Works.png" alt="How Playlistify Works" width="800"/>

### 🎵 Curated Picks
<img src="https://github.com/avanishkasar/Playlistify-AI/blob/main/Curated%20picks.png" alt="Curated Playlist Picks" width="800"/>

### 🚀 Pro Version (Apify)
<img src="https://github.com/avanishkasar/Playlistify-AI/blob/main/pro%20page.png" alt="Apify Pro Version" width="800"/>

</div>

---

## 🎥 Video Demo

<div align="center">

[![Watch Demo](https://img.shields.io/badge/▶️_Watch-Video_Demo-red?style=for-the-badge&logo=youtube)](https://youtu.be/Fg-mkwssghQ?si=bbtIR842XICER1be)

*Click above to watch a complete walkthrough of Playlistify AI*

</div>

---

## 🛠️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PLAYLISTIFY AI                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │   Frontend   │───▶│  Express.js  │───▶│   Agentic Engine     │   │
│  │  (Liquid UI) │    │     API      │    │  (Brain of the app)  │   │
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
│                    │   Web API    │    │  (Learning System)   │     │
│                    └──────────────┘    └──────────────────────┘     │
│                                                      │               │
│                                                      ▼               │
│                                        ┌──────────────────────┐     │
│                                        │   Local JSON Store   │     │
│                                        │   (Privacy-First)    │     │
│                                        └──────────────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **Agent Memory** | `src/agentMemory.ts` | Persistent learning system |
| **Intent Engine** | `src/intentEngine.ts` | Natural language understanding |
| **Agentic Engine** | `src/agenticEngine.ts` | Proactive behavior & orchestration |
| **Spotify Handler** | `src/spotifyHandler.ts` | Spotify API integration |
| **Main API** | `src/main.ts` | Express server & endpoints |

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js 20+ |
| **Language** | TypeScript |
| **Backend** | Express.js |
| **Frontend** | Vanilla HTML/CSS/JS with iOS Liquid Glass Theme |
| **API Integration** | Spotify Web API |
| **NLP** | Custom intent engine with 50+ emotional concepts |
| **Memory** | JSON-based persistent storage |
| **Containerization** | Docker |
| **Hosting** | Railway |
| **Pro Version** | Apify Actor with MCP Tools |

---

## 🎯 How It Works

1. **Input:** Describe your ideal playlist in natural language
2. **Analysis:** NLP engine extracts mood, genre, tempo, and era
3. **Search:** Dual-strategy approach finds the perfect tracks
4. **Curation:** Smart filtering removes duplicates and optimizes flow
5. **Output:** Get a polished playlist ready to enjoy

---

## 🚀 Quick Start

### Try It Now
Visit [playlistify.up.railway.app](https://playlistify.up.railway.app) and start creating playlists instantly!

### Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/avanishkasar/Playlistify-AI.git
   cd Playlistify-AI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment (optional for testing):**
   
   The app includes default credentials for quick testing. For production, create a `.env` file:
   ```env
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   SPOTIFY_REFRESH_TOKEN=your_refresh_token
   PORT=3001
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   Open `http://localhost:3001` in your browser.

---

## 🔌 API Reference

### 🧠 Agentic Endpoints (New!)

#### Generate Playlist (Agentic)

**Endpoint:** `POST /api/generate-playlist`

The brain of the operation. Parses intent, generates recommendations, creates playlist, explains choices, and updates memory.

**Request:**
```json
{
  "prompt": "I need focus music for a late night coding session",
  "userId": "user-123"
}
```

**Response:**
```json
{
  "playlist": {
    "id": "...",
    "name": "Late Night Coding Focus",
    "uri": "spotify:playlist:..."
  },
  "tracks": [...],
  "explanation": {
    "summary": "I picked tracks that match your 'focused' mood for coding...",
    "factors": [
      { "factor": "Emotional State", "value": "focused, calm", "reasoning": "..." }
    ],
    "personalizations": ["Based on your preference for lo-fi at night..."]
  },
  "modifications": [
    { "action": "increase_energy", "label": "More energy" },
    { "action": "decrease_vocals", "label": "Less vocals" }
  ],
  "memoryId": "playlist-uuid"
}
```

#### Proactive Suggestion

**Endpoint:** `GET /api/proactive-suggestion?userId=user-123`

Check if the agent has a proactive suggestion based on user patterns.

**Response:**
```json
{
  "hasSuggestion": true,
  "suggestion": {
    "type": "habitual_time",
    "message": "You usually listen around this time. Want a fresh focus playlist?",
    "suggestedPrompt": "focus music",
    "confidence": 0.85
  }
}
```

#### Parse Intent (Preview)

**Endpoint:** `POST /api/parse-intent`

Preview how the system understands your input before generating.

**Request:**
```json
{
  "prompt": "melancholic indie for a rainy evening",
  "userId": "user-123"
}
```

**Response:**
```json
{
  "emotionalState": {
    "primary": "melancholic",
    "secondary": ["nostalgic", "reflective"],
    "intensity": 0.7
  },
  "audioParams": {
    "energy": 0.4,
    "bpmRange": [70, 100],
    "preferredGenres": ["indie", "folk"],
    "vocalPreference": "soft-vocals"
  },
  "reasoning": [...]
}
```

#### Track Feedback

**Endpoint:** `POST /api/feedback/track`

Record like/skip actions on individual tracks.

**Request:**
```json
{
  "userId": "user-123",
  "memoryId": "playlist-uuid",
  "trackId": "spotify:track:...",
  "action": "like"
}
```

#### Playlist Rating

**Endpoint:** `POST /api/feedback/playlist`

Rate an entire playlist (1-5 stars).

**Request:**
```json
{
  "userId": "user-123",
  "memoryId": "playlist-uuid",
  "rating": 4,
  "keepFavorites": ["track1", "track2"]
}
```

#### Get Taste Profile

**Endpoint:** `GET /api/taste-profile?userId=user-123`

Get the user's learned taste fingerprint.

**Response:**
```json
{
  "profile": {
    "dominantMoods": ["focused", "calm", "energetic"],
    "genreAffinities": {
      "lo-fi": 0.8,
      "electronic": 0.6,
      "indie": 0.5
    },
    "timePreferences": {
      "morning": { "mood": "energetic", "genre": "pop" },
      "night": { "mood": "calm", "genre": "lo-fi" }
    }
  }
}
```

#### Evolve Playlist

**Endpoint:** `POST /api/evolve-playlist`

Refresh/evolve a playlist based on feedback and new preferences.

**Request:**
```json
{
  "userId": "user-123",
  "memoryId": "playlist-uuid",
  "keepFavorites": true,
  "direction": "more_energy"
}
```

#### Clear Memory (Privacy)

**Endpoint:** `DELETE /api/memory?userId=user-123`

Delete all stored preferences for a user.

#### Export Data (GDPR)

**Endpoint:** `GET /api/export-data?userId=user-123`

Export all user data in JSON format.

---

### 🎵 Legacy Endpoints

#### Generate Playlist (Simple)

**Endpoint:** `POST /mcp`

**Request:**
```json
{
  "prompt": "Upbeat jazz for cooking"
}
```

**Response:**
```json
{
  "tracks": [
    {
      "name": "Track Name",
      "artist": "Artist Name",
      "uri": "spotify:track:..."
    }
  ]
}
```

---

## 🌐 Deployment

### Deploy Your Own Instance

This project is optimized for Railway deployment:

1. **Fork this repository**
2. **Sign up at [Railway](https://railway.app/)**
3. **Create New Project** → **Deploy from GitHub**
4. **Select your forked repo**
5. **Railway auto-detects the Dockerfile and deploys**

Railway provides:
- ✅ Automatic HTTPS
- ✅ Environment variable management
- ✅ Auto-deploy on git push
- ✅ Free tier available

---

## 📝 Example Prompts

### Emotional Context (What Sets Us Apart)

The agent understands **intent**, not just keywords:

| What You Say | What We Understand |
|--------------|-------------------|
| *"I need to survive a 2am debugging session"* | Late-night + focus + low energy + instrumental |
| *"Music that feels like quiet confidence"* | Calm assertiveness + medium tempo + minimal lyrics |
| *"Background vibes that won't distract me"* | Ambient + low vocals + steady rhythm |
| *"Getting pumped for my presentation"* | Pre-performance energy + motivational + building intensity |

### Traditional Prompts (Still Work Great)

- *"Energetic workout songs from the 2000s"*
- *"Relaxing acoustic guitar for Sunday morning"*
- *"Dark electronic music for late night coding"*
- *"Happy pop songs for a road trip"*
- *"Melancholic indie rock for introspection"*

### Multi-Language Support

- *"खुश गाने सुबह के लिए"* (Happy songs for morning - Hindi)
- *"இரவு நேரத்திற்கான மெதுவான பாடல்கள்"* (Slow songs for night - Tamil)
- *"నా జిమ్ వర్కౌట్ కోసం ఎనర్జెటిక్ పాటలు"* (Energetic songs for gym - Telugu)

---

## 🧠 How the Agent Learns

### The Feedback Loop

```
1. You generate a playlist
   ↓
2. Agent stores the intent + characteristics
   ↓
3. You interact (like/skip tracks, rate playlist)
   ↓
4. Agent updates your taste profile
   ↓
5. Next time: more personalized recommendations
```

### What Gets Stored (Privacy-First)

✅ **We store:**
- Derived preferences (e.g., "prefers lo-fi at night")
- Aggregated feedback patterns
- Time-based listening tendencies

❌ **We never store:**
- Raw listening history
- Personal information
- Track-by-track logs

### Your Taste Fingerprint

Over time, the agent builds a profile like:

```json
{
  "dominantMoods": ["focused", "calm"],
  "genreAffinities": { "lo-fi": 0.8, "electronic": 0.6 },
  "timePreferences": {
    "night": { "mood": "calm", "genre": "ambient" },
    "morning": { "mood": "energetic", "genre": "pop" }
  },
  "avoidPatterns": ["heavy-metal", "aggressive-vocals"]
}
```

---

## 🚀 Pro Version (Apify)

For developers and power users, we offer a **Pro version on Apify** with MCP (Model Context Protocol) tools:

[![Try on Apify](https://img.shields.io/badge/Try%20on%20Apify-Pro%20Version-orange?style=for-the-badge&logo=apify)](https://apify.com/viverun/playlistfy)

**MCP Tools Available:**
- `search-track` - Search Spotify tracks by query
- `recommend` - Get AI-powered track recommendations  
- `create-playlist` - Create playlists directly on Spotify

**Pricing:** Pay per event (API call) - perfect for automation and integrations!

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

- 🐛 Report bugs
- 💡 Suggest new features
- 🔧 Submit pull requests

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- Deployed on [Railway](https://railway.app/)
- Pro Version on [Apify](https://apify.com/)
- Powered by TypeScript and Node.js
- **Built for Hack This Fall 2025** 🏆

---

## 🏆 Why Playlistify AI Should Win

> *"Most AI tools react. This one learns. This one remembers. This one feels human."*

| Criteria | Our Answer |
|----------|-----------|
| **Innovation** | First playlist tool that combines agent memory + emotional intent + proactive behavior |
| **Technical Depth** | 3 new cognitive modules, 50+ emotional concepts, persistent learning |
| **User Impact** | Music that matches your emotional state, not just keywords |
| **Privacy** | Derived preferences only, full data export, one-click deletion |
| **Scalability** | JSON storage = no DB required, works anywhere |

---

<div align="center">

**Made with ❤️ by Team DDoxer**

*"Music is not trivial. Music is memory, emotion, routine, identity."*

[Try it Now](https://playlistify.up.railway.app) | [Pro Version](https://apify.com/viverun/playlistfy) | [Report Issue](https://github.com/avanishkasar/Playlistify-AI/issues) | [Request Feature](https://github.com/avanishkasar/Playlistify-AI/issues)

[![X](https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/only_avanish)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/avanishkasar)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/avanishkasar)


...
