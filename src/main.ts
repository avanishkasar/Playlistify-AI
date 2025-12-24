import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import * as spotifyHandler from "./spotifyHandler.js";
import { parsePlaylistIntent } from "./nlpHelper.js";
import { RateLimiter } from "./rateLimiter.js";
import { MCPRequest, MCPResponse, FeedbackAction } from "./types.js";
import { agentMemory } from "./agentMemory.js";
import { 
  getProactiveSuggestion, 
  generateAgenticPlaylist, 
  processTrackFeedback, 
  processPlaylistRating,
  getTasteFingerprint,
  evolvePlaylist,
  getWeeklyRefreshSuggestions,
  refinePlaylistWithChat,
  getAISuggestion,
  getAIMemorySummary,
  getAICoverPrompt
} from "./agenticEngine.js";
import { parseEnhancedIntent, generateExplanation, suggestModifications } from "./intentEngine.js";
import userAuthRoutes from "./userAuth.js";
import adminRoutes from "./adminRoutes.js";
import { incrementPlaylistCount, getLeaderboard } from "./database.js";

const app = express();
const PORT = process.env.PORT || 3001;
const ENABLE_NLP = process.env.ENABLE_NLP !== 'false';

// Rate limiter: 100 requests per minute
const globalRateLimiter = new RateLimiter(100, 100/60);

// Default user ID for demo (in production, use real auth)
const DEFAULT_USER_ID = 'demo-user';

// CORS configuration to allow frontend-backend communication
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:3001', 'http://localhost:3001'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.static("public"));

// Mount user authentication routes
app.use("/api/auth", userAuthRoutes);

// Mount admin routes
app.use("/api/admin", adminRoutes);

// Health check
app.get("/", (_req, res) => {
  res.sendFile("index.html", { root: "public" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "healthy" });
});

// Public leaderboard endpoint - Top 20 users by playlist count
app.get("/api/leaderboard", (_req: Request, res: Response) => {
  try {
    const leaderboard = getLeaderboard(20);
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error: any) {
    console.error('[API] Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get("/stats", (_req, res) => {
    res.json({
        status: "running",
        uptime: process.uptime(),
        rateLimitTokens: globalRateLimiter.getTokens()
    });
});

// ============================================================================
// AGENTIC ENDPOINTS - What makes Playlistify AI "feel human"
// ============================================================================

/**
 * Get proactive suggestion for the user
 * Called on page load to check if we should suggest a playlist
 */
app.get("/api/proactive-suggestion", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  
  try {
    const suggestion = getProactiveSuggestion(userId);
    
    if (suggestion) {
      res.json({
        status: 'success',
        hasSuggestion: true,
        suggestion,
      });
    } else {
      res.json({
        status: 'success',
        hasSuggestion: false,
      });
    }
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Generate a playlist with full agentic intelligence
 * This is the main endpoint that uses memory, intent understanding, and explanation
 */
app.post("/api/generate-playlist", async (req: Request, res: Response) => {
  const { prompt, userId = DEFAULT_USER_ID, options, dbUserId } = req.body;
  
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ status: 'error', message: 'Prompt is required' });
    return;
  }
  
  if (!globalRateLimiter.consume()) {
    res.status(429).json({ status: 'error', message: 'Rate limit exceeded' });
    return;
  }
  
  try {
    console.log('[API] Generating agentic playlist:', { prompt, userId, dbUserId });
    
    const result = await generateAgenticPlaylist(userId, prompt, options);
    
    if ('error' in result) {
      res.status(500).json({ status: 'error', message: result.error });
      return;
    }
    
    // Track playlist generation count for logged-in users
    if (dbUserId && typeof dbUserId === 'number') {
      try {
        incrementPlaylistCount(dbUserId);
        console.log('[API] Incremented playlist count for user:', dbUserId);
      } catch (e) {
        console.error('[API] Failed to increment playlist count:', e);
      }
    }
    
    res.json({
      status: 'success',
      data: result,
    });
    
  } catch (err: any) {
    console.error('[API] Generate playlist error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Parse intent and get explanation without creating a playlist
 * Useful for preview/validation
 */
app.post("/api/parse-intent", (req: Request, res: Response) => {
  const { prompt, userId = DEFAULT_USER_ID } = req.body;
  
  if (!prompt) {
    res.status(400).json({ status: 'error', message: 'Prompt is required' });
    return;
  }
  
  try {
    const userContext = agentMemory.getPersonalizedContext(userId);
    const intent = parseEnhancedIntent(prompt, {
      timeOfDay: userContext.timeOfDay,
      previousMood: userContext.recentMoodTrend,
      preferredGenres: userContext.suggestedGenres,
    });
    
    const explanation = generateExplanation(intent, {
      timeOfDay: userContext.timeOfDay,
      preferenceNote: userContext.explanation,
    });
    
    const modifications = suggestModifications(intent);
    
    res.json({
      status: 'success',
      data: {
        intent,
        explanation,
        modifications,
        userContext: {
          timeOfDay: userContext.timeOfDay,
          suggestedEnergy: userContext.suggestedEnergy,
        },
      },
    });
    
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Record track feedback (like/skip)
 */
app.post("/api/feedback/track", (req: Request, res: Response) => {
  const { memoryId, trackUri, action, userId = DEFAULT_USER_ID } = req.body;
  
  if (!memoryId || !trackUri || !action) {
    res.status(400).json({ status: 'error', message: 'memoryId, trackUri, and action are required' });
    return;
  }
  
  if (!['like', 'skip'].includes(action)) {
    res.status(400).json({ status: 'error', message: 'Action must be "like" or "skip"' });
    return;
  }
  
  try {
    const result = processTrackFeedback(userId, memoryId, trackUri, action);
    res.json({ status: result.success ? 'success' : 'error', message: result.message });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Record playlist rating
 */
app.post("/api/feedback/playlist", (req: Request, res: Response) => {
  const { memoryId, rating, userId = DEFAULT_USER_ID } = req.body;
  
  if (!memoryId || !rating) {
    res.status(400).json({ status: 'error', message: 'memoryId and rating are required' });
    return;
  }
  
  if (!['loved', 'liked', 'neutral', 'disliked'].includes(rating)) {
    res.status(400).json({ status: 'error', message: 'Invalid rating' });
    return;
  }
  
  try {
    const result = processPlaylistRating(userId, memoryId, rating);
    res.json({ 
      status: result.success ? 'success' : 'error', 
      message: result.message,
      suggestion: result.suggestion,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get user's taste fingerprint
 */
app.get("/api/taste-profile", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  
  try {
    const profile = getTasteFingerprint(userId);
    res.json({ status: 'success', data: profile });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Evolve a playlist based on feedback
 */
app.post("/api/evolve-playlist", async (req: Request, res: Response) => {
  const { playlistId, memoryId, evolutionType = 'refresh', userId = DEFAULT_USER_ID } = req.body;
  
  if (!playlistId || !memoryId) {
    res.status(400).json({ status: 'error', message: 'playlistId and memoryId are required' });
    return;
  }
  
  try {
    const result = await evolvePlaylist(userId, {
      playlistId,
      memoryId,
      evolutionType,
      keepLikedTracks: true,
      removeSkippedTracks: true,
    });
    
    res.json({ 
      status: result.success ? 'success' : 'error', 
      message: result.message,
      newTracks: result.newTracks,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Refine playlist through conversational commands
 * Handles natural language refinement like "add more upbeat songs"
 */
app.post("/api/refine-playlist", async (req: Request, res: Response) => {
  const { originalPrompt, refinement, currentTracks, playlistId, userId = DEFAULT_USER_ID } = req.body;
  
  if (!refinement || !playlistId) {
    res.status(400).json({ status: 'error', message: 'refinement and playlistId are required' });
    return;
  }
  
  try {
    const result = await refinePlaylistWithChat(userId, {
      originalPrompt,
      refinement,
      currentTrackUris: currentTracks,
      playlistId,
    });
    
    res.json({
      status: 'success',
      message: result.message,
      tracks: result.tracks,
      action: result.action,
    });
  } catch (err: any) {
    console.error('[API] Refine playlist error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get weekly refresh suggestions
 */
app.get("/api/weekly-refresh", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  
  try {
    const suggestions = getWeeklyRefreshSuggestions(userId);
    res.json({ status: 'success', data: suggestions });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get AI-powered personalized suggestion
 */
app.get("/api/ai-suggestion", async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  
  try {
    const suggestion = await getAISuggestion(userId);
    if (suggestion) {
      res.json({ status: 'success', data: suggestion });
    } else {
      res.json({ status: 'success', data: null, message: 'Not enough data for personalized suggestions' });
    }
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get AI-generated memory summary
 */
app.get("/api/ai-memory-summary", async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  
  try {
    const summary = await getAIMemorySummary(userId);
    res.json({ status: 'success', data: { summary } });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get AI-enhanced cover image prompt
 */
app.post("/api/ai-cover-prompt", async (req: Request, res: Response) => {
  const { playlistName, mood, genres, userPrompt } = req.body;
  
  try {
    const prompt = await getAICoverPrompt(
      playlistName || 'My Playlist',
      mood || 'energetic',
      genres || ['pop'],
      userPrompt || 'music playlist'
    );
    res.json({ status: 'success', data: { prompt } });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Clear user memory (privacy feature)
 */
app.delete("/api/memory", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  
  try {
    agentMemory.clearUserMemory(userId);
    res.json({ status: 'success', message: 'Memory cleared successfully' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Export user data (GDPR compliance)
 */
app.get("/api/export-data", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  
  try {
    const data = agentMemory.exportUserData(userId);
    res.json({ status: 'success', data });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ============================================================================
// ORIGINAL MCP ENDPOINT (preserved for backward compatibility)
// ============================================================================

// MCP Endpoint
app.post("/mcp", async (req: Request, res: Response) => {
  const body = req.body as MCPRequest;
  
  if (!globalRateLimiter.consume()) {
      res.status(429).json({ status: 'error', message: 'Rate limit exceeded' });
      return;
  }

  console.log('MCP Request:', body);

  try {
      let result;
      switch (body.tool) {
          case 'search-track':
              result = await spotifyHandler.searchTracks(body.input.query, body.input.limit);
              break;
          case 'recommend':
              result = await spotifyHandler.getRecommendations(
                  body.input.seedArtists,
                  body.input.seedGenres,
                  body.input.seedTracks,
                  body.input.limit
              );
              break;
          case 'create-playlist':
              let playlistName = body.input.name;
              let description = body.input.description;
              
              result = await spotifyHandler.createPlaylist(
                  body.input.userId,
                  playlistName,
                  description || '',
                  body.input.trackUris || [],
                  body.input.public
              );
              break;
          default:
              res.status(400).json({ status: 'error', message: 'Unknown tool' });
              return;
      }
      res.json(result);
  } catch (error: any) {
      console.error('Error processing request:', error);
      res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * Set playlist cover image from URL
 * Uses Pollinations.ai generated images
 */
app.post("/api/set-playlist-cover", async (req: Request, res: Response) => {
  const { playlistId, imageUrl } = req.body;
  
  if (!playlistId || !imageUrl) {
    res.status(400).json({ status: 'error', message: 'playlistId and imageUrl are required' });
    return;
  }
  
  try {
    const result = await spotifyHandler.setPlaylistCover(playlistId, imageUrl);
    res.json(result);
  } catch (err: any) {
    console.error('[API] Set playlist cover error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

async function start() {
    // Load credentials
    const clientId = process.env.SPOTIFY_CLIENT_ID || 'f6b396ecab7646afab201c9eecaa7dd3';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || 'fd407d0f8a0c49eebb0591ee77139544';
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN || 'AQDs2gFJ-PcVZtSriscGAJuSQq34UMO8IHagDrToHQW1JnKKkayj8vyTj2iExt2M2ZjkKx9mXHYR9YZUK-f-W6kGWSEVEBebm17TwC7VXSHNf5CjYTbICCjrfioHvwBSSlc';

    if (clientId && clientSecret && refreshToken) {
        spotifyHandler.initializeSpotify(clientId, clientSecret, refreshToken);
    } else {
        console.error("Missing Spotify credentials!");
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

start();
