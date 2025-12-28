# Prompt for Nakin: Playlistify AI - Complete Tech Stack

---

**Subject: Playlistify AI - Technical Architecture and Technology Stack**

Hi Nakin,

Here's a comprehensive overview of the technology stack powering Playlistify AI, a conversational music agent that transforms natural language into personalized Spotify playlists.

---

## 🏗️ Architecture Overview

Playlistify AI follows a **full-stack TypeScript architecture** with a Node.js/Express backend and vanilla JavaScript frontend, designed for scalability, maintainability, and real-time performance.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Client-Side)                   │
│  HTML5 + CSS3 + Vanilla JavaScript (ES6+)                   │
│  - Responsive UI with gradient animations                   │
│  - Real-time playlist preview                               │
│  - Voice input (Web Speech API)                             │
│  - Page transitions with interactive backgrounds            │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Express     │  │  TypeScript │  │   SQLite     │      │
│  │   Server      │→ │  Services   │→ │   Database   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
│         ↓                   ↓                  ↓             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Spotify    │  │  Agent       │  │   OpenRouter  │      │
│  │   Web API    │  │  Memory      │  │   (Gemini)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Backend Technology Stack

### **Core Runtime & Framework**

| Technology | Version | Purpose |
|:-----------|:--------|:--------|
| **Node.js** | 20.0.0+ | JavaScript runtime environment |
| **Express.js** | 5.1.0 | Web application framework |
| **TypeScript** | 5.9.3 | Type-safe JavaScript with static typing |
| **tsx** | 4.20.3 | TypeScript execution engine (dev) |

**Why this stack:**
- **Node.js 20+**: Modern async/await support, improved performance
- **Express 5**: Latest version with better TypeScript support
- **TypeScript**: Type safety, better IDE support, reduced runtime errors
- **tsx**: Fast development with hot-reload capabilities

### **Database & Storage**

| Technology | Version | Purpose |
|:-----------|:--------|:--------|
| **better-sqlite3** | 11.8.1 | SQLite database driver (synchronous, fast) |
| **SQLite** | Embedded | Lightweight relational database |

**Database Schema:**
- `users` - User accounts and authentication
- `playlists` - Generated playlist metadata
- `user_stats` - User statistics and analytics
- `spotify_tokens` - Per-user Spotify OAuth tokens
- `spotify_library` - User's saved Spotify playlists
- `collaborative_sessions` - Real-time collaborative playlist sessions

**Why SQLite:**
- **Zero configuration**: No separate database server needed
- **Fast reads**: Synchronous queries perfect for read-heavy workloads
- **Portable**: Single file database, easy backups
- **ACID compliant**: Reliable transactions
- **Lightweight**: Perfect for deployment on Railway/containers

### **Authentication & Security**

| Technology | Purpose |
|:-----------|:--------|
| **bcrypt** (via custom hashing) | Password hashing and verification |
| **Session-based auth** | User session management |
| **OAuth 2.0 (PKCE)** | Spotify authentication flow |
| **JWT tokens** (Spotify) | Secure token storage |

**Security Features:**
- Password hashing with bcrypt
- OAuth 2.0 with PKCE for Spotify
- Per-user token isolation
- SQL injection prevention (parameterized queries)
- CORS protection

### **AI & Natural Language Processing**

| Technology | Purpose |
|:-----------|:--------|
| **OpenRouter API** | AI model routing and access |
| **Google Gemini** | Intent parsing, playlist naming, cover art prompts |
| **Custom NLP Engine** | 50+ emotional concepts, multi-language support |
| **Zod** | Schema validation for AI responses |

**AI Integration Flow:**
```
User Prompt → Intent Engine → Google Gemini → Structured Intent
                                    ↓
                          Agent Memory (Context)
                                    ↓
                          Playlist Generation
                                    ↓
                          Spotify API (Creation)
```

**Why OpenRouter + Gemini:**
- **OpenRouter**: Unified API for multiple AI models
- **Gemini**: Fast, cost-effective, excellent for structured outputs
- **Custom NLP**: Domain-specific understanding (music, emotions, activities)

### **External API Integrations**

| Service | Purpose | Authentication |
|:--------|:--------|:----------------|
| **Spotify Web API** | Playlist creation, user data, OAuth | OAuth 2.0 (PKCE) |
| **OpenRouter API** | AI model access | API Key |
| **JioSaavn API** | Song matching for downloads | (Future) |

**Spotify API Scopes:**
- `user-read-email`, `user-read-private`
- `playlist-modify-public`, `playlist-modify-private`
- `playlist-read-private`, `playlist-read-collaborative`
- `user-top-read` (top artists/tracks)
- `user-read-recently-played` (listening history)

### **Key Backend Libraries**

| Library | Purpose |
|:--------|:--------|
| **body-parser** | Request body parsing |
| **cors** | Cross-origin resource sharing |
| **spotify-web-api-node** | Spotify API wrapper (legacy, transitioning to native fetch) |
| **zod** | Runtime type validation |

---

## 🎨 Frontend Technology Stack

### **Core Technologies**

| Technology | Purpose |
|:-----------|:--------|
| **HTML5** | Semantic markup, modern features |
| **CSS3** | Styling, animations, gradients |
| **Vanilla JavaScript (ES6+)** | No frameworks - pure JavaScript |
| **Font Awesome 6** | Icon library |
| **Google Fonts** | Typography (Inter, Space Grotesk) |

**Why Vanilla JavaScript:**
- **Performance**: No framework overhead
- **Bundle size**: Minimal JavaScript footprint
- **Flexibility**: Full control over DOM manipulation
- **Learning**: Easier for contributors to understand

### **Frontend Features**

| Feature | Technology |
|:--------|:-----------|
| **Voice Input** | Web Speech API (Chrome/Edge native) |
| **Page Transitions** | Custom CSS animations + JavaScript |
| **Real-time Updates** | Custom events, DOM manipulation |
| **Responsive Design** | CSS Grid, Flexbox, Media Queries |
| **Gradient Backgrounds** | CSS animations, blob effects |
| **Local Storage** | Session management, user preferences |

### **UI/UX Libraries**

| Library | Purpose |
|:--------|:--------|
| **Font Awesome** | Icons (replacing emojis) |
| **Google Fonts** | Typography |
| **Custom CSS** | Liquid glass effects, gradients, animations |

---

## 🗂️ Project Structure

```
Playlistify-AI/
├── src/                          # Backend TypeScript source
│   ├── main.ts                   # Express server & API routes
│   ├── database.ts               # SQLite database operations
│   ├── routes/                   # API route handlers
│   │   ├── spotifyOAuthRoutes.ts # Spotify OAuth & user data
│   │   ├── spotifyLibraryRoutes.ts # Spotify library management
│   │   └── userAuth.ts           # Authentication routes
│   └── services/                 # Core business logic
│       ├── agentMemory.ts        # Agent learning system
│       ├── intentEngine.ts       # NLP & intent parsing
│       ├── agenticEngine.ts      # Proactive behavior
│       └── spotifyHandler.ts    # Spotify API wrapper
├── public/                       # Frontend static files
│   ├── *.html                    # Page templates
│   ├── style.css                 # Global styles
│   ├── pages.css                 # Page-specific styles
│   ├── auth.css                  # Authentication styles
│   └── *.js                      # Frontend JavaScript
├── scripts/                      # Utility scripts
│   └── spotify-auth-helper.js    # OAuth token generator
├── dist/                         # Compiled TypeScript (production)
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
└── Dockerfile                    # Container configuration
```

---

## 🚀 Development & Build Tools

### **Development Tools**

| Tool | Purpose |
|:-----|:--------|
| **tsx** | TypeScript execution (dev mode) |
| **TypeScript Compiler** | Production builds |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |

### **Build Process**

```bash
# Development
npm run dev          # Start with tsx (hot reload)
npm run start:dev    # Same as above

# Production
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled JavaScript
```

**Build Output:**
- TypeScript (`src/`) → JavaScript (`dist/`)
- Static files (`public/`) → Served as-is
- No frontend bundling (vanilla JS)

---

## 🐳 Deployment & Infrastructure

### **Deployment Platform**

| Platform | Purpose |
|:---------|:--------|
| **Railway** | Production hosting |
| **Docker** | Containerization |
| **Node.js 20 Alpine** | Lightweight container base |

### **Docker Configuration**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

**Why Docker:**
- Consistent environments
- Easy deployment to Railway
- Isolated dependencies
- Scalable containerization

### **Environment Variables**

| Variable | Purpose | Default |
|:---------|:--------|:--------|
| `PORT` | Server port | 3001 |
| `SPOTIFY_CLIENT_ID` | Spotify app ID | (from config) |
| `SPOTIFY_CLIENT_SECRET` | Spotify app secret | (from config) |
| `SPOTIFY_REDIRECT_URI` | OAuth callback URL | (from config) |
| `FRONTEND_URL` | Frontend base URL | http://localhost:5500 |
| `OPENROUTER_API_KEY` | AI API key | (from config) |

---

## 🔄 Data Flow Architecture

### **Playlist Generation Flow**

```
1. User Input (Frontend)
   ↓
2. POST /api/generate-playlist
   ↓
3. Intent Engine (NLP parsing)
   ↓
4. Agent Memory (Context retrieval)
   ↓
5. OpenRouter API (Gemini - playlist generation)
   ↓
6. Spotify API (Playlist creation)
   ↓
7. Agent Memory (Save preferences)
   ↓
8. Response to Frontend (Playlist data)
```

### **Spotify OAuth Flow**

```
1. User clicks "Connect Spotify"
   ↓
2. GET /api/spotify/login (Generate PKCE challenge)
   ↓
3. Redirect to Spotify OAuth
   ↓
4. User authorizes
   ↓
5. GET /api/spotify/oauth/callback (Exchange code for tokens)
   ↓
6. Save tokens to database (per-user)
   ↓
7. Redirect back to app
```

### **Agent Memory System**

```
User Action → Extract Preferences → Store in JSON
                                    ↓
                            Build Taste Fingerprint
                                    ↓
                            Use for Future Recommendations
```

**Storage Format:**
- JSON files per user
- Privacy-first (derived preferences, not raw data)
- Persistent across sessions

---

## 📊 Performance Characteristics

### **Backend Performance**

- **Response Time**: < 200ms for most API calls
- **Database Queries**: < 10ms (SQLite synchronous)
- **AI Processing**: 1-3 seconds (OpenRouter + Gemini)
- **Spotify API**: 200-500ms per call

### **Frontend Performance**

- **Initial Load**: < 1s (no framework overhead)
- **Page Transitions**: 600ms smooth animations
- **Voice Input**: Real-time (Web Speech API)
- **Playlist Preview**: Instant (client-side rendering)

### **Scalability Considerations**

- **SQLite**: Suitable for < 100K users (single file)
- **Stateless Backend**: Easy horizontal scaling
- **Agent Memory**: JSON files (can migrate to Redis/PostgreSQL)
- **Spotify API**: Rate limits (50 requests/second)

---

## 🔐 Security Architecture

### **Authentication Layers**

1. **User Authentication**
   - Session-based (Express sessions)
   - Password hashing (bcrypt)
   - Secure cookie storage

2. **Spotify OAuth**
   - OAuth 2.0 with PKCE
   - Per-user token isolation
   - Automatic token refresh

3. **API Security**
   - CORS protection
   - Input validation (Zod)
   - SQL injection prevention
   - Rate limiting (future)

---

## 🌐 API Architecture

### **RESTful Endpoints**

**Authentication:**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`

**Playlist Generation:**
- `POST /api/generate-playlist`
- `GET /api/timeline-playlists`
- `GET /api/user-stats`

**Spotify Integration:**
- `GET /api/spotify/login`
- `GET /api/spotify/oauth/callback`
- `GET /api/spotify/top-artists`
- `GET /api/spotify/top-tracks`
- `GET /api/spotify/recently-played`
- `GET /api/spotify/user-context`
- `POST /api/spotify/create-playlist`
- `DELETE /api/spotify/delete-playlist`

**Analytics:**
- `GET /api/leaderboard`
- `GET /api/weekly-activity`
- `GET /api/genre-breakdown`
- `GET /api/mood-journey`
- `GET /api/discovery-score`

---

## 🎯 Key Technical Decisions

### **Why TypeScript?**
- Type safety reduces bugs
- Better IDE autocomplete
- Easier refactoring
- Self-documenting code

### **Why SQLite?**
- Zero configuration
- Fast for read-heavy workloads
- Perfect for MVP/startup phase
- Easy migration path to PostgreSQL

### **Why Vanilla JavaScript?**
- No framework overhead
- Smaller bundle size
- Full control
- Easier for contributors

### **Why OpenRouter + Gemini?**
- Cost-effective AI access
- Fast response times
- Easy model switching
- Structured output support

### **Why Express 5?**
- Latest features
- Better TypeScript support
- Improved async handling
- Modern middleware

---

## 🔮 Future Technical Roadmap

### **Short-term (Next 3 months)**
- [ ] Migrate to PostgreSQL (scale beyond SQLite limits)
- [ ] Add Redis for caching
- [ ] Implement rate limiting
- [ ] Add WebSocket support (real-time collaboration)

### **Medium-term (6 months)**
- [ ] Frontend framework migration (React/Vue) - if needed
- [ ] Microservices architecture (if scaling)
- [ ] CDN for static assets
- [ ] Advanced analytics pipeline

### **Long-term (12 months)**
- [ ] Multi-region deployment
- [ ] GraphQL API (optional)
- [ ] Mobile app (React Native)
- [ ] Edge computing for AI inference

---

## 📈 Technology Metrics

| Metric | Value |
|:-------|:------|
| **Total Dependencies** | 6 production, 8 dev |
| **Bundle Size** | ~50KB (frontend, no framework) |
| **Build Time** | < 10 seconds |
| **Cold Start** | < 2 seconds (Railway) |
| **Database Size** | < 100MB (SQLite) |
| **Memory Usage** | ~150MB (production) |

---

## 🛠️ Development Workflow

### **Local Development**

```bash
# Install dependencies
npm install

# Start dev server (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### **Code Quality**

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier
- **Type Checking**: TypeScript compiler
- **Testing**: (To be implemented)

---

## 📚 Technology Learning Resources

For developers new to this stack:

1. **TypeScript**: [TypeScript Handbook](https://www.typescriptlang.org/docs/)
2. **Express 5**: [Express.js Guide](https://expressjs.com/)
3. **SQLite**: [SQLite Tutorial](https://www.sqlitetutorial.net/)
4. **Spotify API**: [Spotify Web API Docs](https://developer.spotify.com/documentation/web-api)
5. **OpenRouter**: [OpenRouter API Docs](https://openrouter.ai/docs)

---

## 🎓 Summary

**Playlistify AI** is built on a modern, type-safe, full-stack TypeScript architecture:

- **Backend**: Node.js + Express 5 + TypeScript + SQLite
- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **AI**: OpenRouter + Google Gemini
- **Integration**: Spotify Web API (OAuth 2.0)
- **Deployment**: Railway + Docker
- **Architecture**: Monolithic (scalable to microservices)

The stack prioritizes:
- ✅ **Developer Experience**: TypeScript, hot reload, clear structure
- ✅ **Performance**: Fast queries, minimal overhead
- ✅ **Maintainability**: Type safety, clean code, documentation
- ✅ **Scalability**: Easy migration path to PostgreSQL, horizontal scaling ready

This architecture supports Playlistify AI's core mission: being an intelligent music agent that learns, adapts, and proactively serves users' musical needs.

---

**Questions?** Feel free to ask about any specific technology or architectural decision!

