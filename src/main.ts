import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
// Services
import * as spotifyHandler from "./services/spotifyHandler.js";
import { agentMemory } from "./services/agentMemory.js";
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
} from "./services/agenticEngine.js";
import { parseEnhancedIntent, generateExplanation, suggestModifications } from "./services/intentEngine.js";
// Routes
import userAuthRoutes from "./routes/userAuth.js";
import adminRoutes from "./routes/adminRoutes.js";
import collabRoutes from "./routes/collabRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import spotifyOAuthRoutes from "./routes/spotifyOAuthRoutes.js";
import spotifyLibraryRoutes from "./routes/spotifyLibraryRoutes.js";
import authRoutes from "./auth.js";
// Utils
import { parsePlaylistIntent } from "./utils/nlpHelper.js";
import { RateLimiter } from "./utils/rateLimiter.js";
// Types & Database
import { MCPRequest, MCPResponse, FeedbackAction } from "./types.js";
import { incrementPlaylistCount, getLeaderboard, getUserStats, getUserById } from "./database.js";
import db from "./database.js";

const app = express();
// Use Apify container port for Standby mode, fallback to PORT or 3001
const PORT = process.env.APIFY_CONTAINER_PORT || process.env.PORT || 3001;
const ENABLE_NLP = process.env.ENABLE_NLP !== 'false';

// Rate limiter: 100 requests per minute
const globalRateLimiter = new RateLimiter(100, 100 / 60);

// Default user ID for demo (in production, use real auth)
const DEFAULT_USER_ID = 'demo-user';

// CORS configuration to allow frontend-backend communication
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:3001', 'http://localhost:3001'],
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));  // Allow larger payloads for audio

// Mount API routes
app.use("/api/payment", paymentRoutes);
app.use("/api/spotify", spotifyOAuthRoutes);
app.use("/api/spotify/library", spotifyLibraryRoutes);
app.use("/auth", authRoutes);

// Static files - index.html (landing page) will auto-serve at /
app.use(express.static("public"));

// =========================================================================
// SPEECH-TO-TEXT using OpenRouter + Gemini (via existing API key)
// =========================================================================
app.post("/api/speech-to-text", async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;

    if (!audioData) {
      res.status(400).json({ success: false, error: 'No audio data provided' });
      return;
    }

    console.log('[Speech-to-Text] Processing audio, mimeType:', mimeType);

    // Use OpenRouter API with Gemini model (same as aiService)
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

    if (!OPENROUTER_API_KEY) {
      console.error('[Speech-to-Text] No OpenRouter API key found');
      res.status(500).json({ success: false, error: 'API key not configured' });
      return;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://playlistify-ai.app',
        'X-Title': 'Playlistify AI Voice',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcribe this audio exactly. Return ONLY the transcribed text, nothing else. No quotes, no explanation, just the words spoken.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${audioData}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Speech-to-Text] OpenRouter error:', response.status, errorText);
      res.status(500).json({ success: false, error: `API error: ${response.status}` });
      return;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    console.log('[Speech-to-Text] Transcribed:', text);

    res.json({
      success: true,
      text: text,
      message: 'Audio transcribed successfully'
    });

  } catch (error: any) {
    console.error('[Speech-to-Text] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Transcription failed'
    });
  }
});

// Mount user authentication routes
app.use("/api/auth", userAuthRoutes);

// Mount admin routes
app.use("/api/admin", adminRoutes);

// Mount collab routes
app.use("/api/collab", collabRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "healthy" });
});

// Public leaderboard endpoint - supports ?all=true for full list
// Also supports ?includeZero=true to include users with 0 playlists
// Always fetches fresh data from database
app.get("/api/leaderboard", (req: Request, res: Response) => {
  try {
    const showAll = req.query.all === 'true';
    const includeZero = req.query.includeZero === 'true';
    const limit = showAll ? 1000 : 20; // 1000 is effectively "all"
    
    // Always query fresh data from database
    let leaderboard;
    if (includeZero) {
      // Get all users including those with 0 playlists
      const stmt = db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.display_name,
          u.profile_picture,
          COALESCE(us.total_playlists, 0) as playlist_count,
          u.created_at
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
        ORDER BY COALESCE(us.total_playlists, 0) DESC, u.created_at ASC
        LIMIT ?
      `);
      leaderboard = stmt.all(limit);
    } else {
      // Default: only users with playlists > 0, but ensure we get fresh data
      const stmt = db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.display_name,
          u.profile_picture,
          COALESCE(us.total_playlists, 0) as playlist_count,
          u.created_at
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
        WHERE COALESCE(us.total_playlists, 0) > 0
        ORDER BY COALESCE(us.total_playlists, 0) DESC, u.created_at ASC
        LIMIT ?
      `);
      leaderboard = stmt.all(limit);
    }
    
    console.log(`[API] Leaderboard fetched: ${leaderboard.length} users`);
    
    res.json({
      success: true,
      data: leaderboard,
      total: leaderboard.length
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
  const { prompt, options, dbUserId } = req.body;
  let userId = req.body.userId || DEFAULT_USER_ID;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ status: 'error', message: 'Prompt is required' });
    return;
  }

  if (!globalRateLimiter.consume()) {
    res.status(429).json({ status: 'error', message: 'Rate limit exceeded' });
    return;
  }

  try {
    // If dbUserId is provided but userId is default, try to get username from database
    if (dbUserId && userId === DEFAULT_USER_ID) {
      try {
        const user = getUserById(dbUserId);
        if (user && user.username) {
          userId = user.username;
          console.log('[API] Using username from database:', userId);
        }
      } catch (e) {
        console.log('[API] Could not get username from dbUserId:', e);
      }
    }

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

/**
 * Get timeline playlists for a user
 * Also checks database userId to find correct username if needed
 */
app.get("/api/timeline-playlists", (req: Request, res: Response) => {
  let userId = (req.query.userId as string) || DEFAULT_USER_ID;
  const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;

  try {
    // If dbUserId is provided, always use the username from database
    if (dbUserId) {
      try {
        const user = getUserById(dbUserId);
        if (user && user.username) {
          userId = user.username;
          console.log(`[API] Using username ${userId} from database for timeline`);
        }
      } catch (e) {
        console.log('[API] Could not get username from dbUserId:', e);
      }
    }

    const userData = agentMemory.exportUserData(userId);
    const playlists = userData?.recentPlaylists || [];
    
    console.log(`[API] Timeline playlists for userId ${userId}: ${playlists.length} playlists found`);
    
    console.log(`[API] Timeline playlists for userId ${userId}: ${playlists.length} playlists found`);

    // Format playlists for timeline display
    const timelinePlaylists = playlists.map(p => {
      const date = new Date(p.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      let dateStr = '';
      if (diffDays === 0) {
        dateStr = `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      } else if (diffDays === 1) {
        dateStr = `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      } else if (diffDays < 7) {
        dateStr = `${diffDays} days ago`;
      } else {
        dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      const mood = p.intent?.parsedMood || p.characteristics?.dominantMood || 'neutral';
      const genres = p.characteristics?.genres || [];
      const genreStr = genres.length > 0 ? genres[0] : 'Unknown';

      // Map mood to emoji
      const moodEmojiMap: Record<string, string> = {
        'happy': '😊', 'energetic': '🔥', 'calm': '😌', 'sad': '😢',
        'focused': '🧘', 'romantic': '💜', 'excited': '✨', 'chill': '🌙',
        'party': '🎉', 'workout': '💪', 'sleep': '😴', 'neutral': '😐',
        'relaxed': '☕', 'intense': '💪'
      };
      const moodEmoji = moodEmojiMap[mood.toLowerCase()] || '😐';

      return {
        id: p.id,
        date: dateStr,
        title: p.playlistName,
        description: p.intent?.rawPrompt || `A ${mood} playlist with ${p.trackCount} tracks`,
        mood: mood,
        moodEmoji: moodEmoji,
        genre: genreStr,
        trackCount: p.trackCount,
        timestamp: p.timestamp
      };
    }).sort((a, b) => b.timestamp - a.timestamp); // Most recent first

    res.json({
      status: 'success',
      data: { playlists: timelinePlaylists }
    });
  } catch (err: any) {
    console.error('[API] Timeline playlists error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get personalized user stats for timeline page
 * Returns playlist count, track count, top genre, and top mood
 * Also syncs with database stats if user is logged in
 */
app.get("/api/user-stats", (req: Request, res: Response) => {
  let userId = (req.query.userId as string) || DEFAULT_USER_ID;
  const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;

  try {
    // Get stats from agentMemory
    let stats = agentMemory.getUserStats(userId);
    let userData = agentMemory.exportUserData(userId);
    
    // If user is logged in, also get stats from database and merge
    let dbPlaylistCount = 0;
    if (dbUserId) {
      try {
        const dbStats = getUserStats(dbUserId) as any;
        dbPlaylistCount = dbStats?.total_playlists || dbStats?.playlist_count || 0;
        console.log(`[API] Database stats for user ${dbUserId}: ${dbPlaylistCount} playlists`);
        
        // Also try to get username from dbUserId to check agentMemory with correct userId
        const user = getUserById(dbUserId);
        if (user && user.username) {
          // If userId doesn't match username, try to get data with correct username
          if (user.username !== userId) {
            const correctStats = agentMemory.getUserStats(user.username);
            const correctData = agentMemory.exportUserData(user.username);
            if (correctStats.totalPlaylistsGenerated > 0 || (correctData?.recentPlaylists?.length || 0) > 0) {
              console.log(`[API] Found agentMemory data for username: ${user.username}, using that instead`);
              // Use the correct user data
              stats = correctStats;
              userData = correctData;
              userId = user.username; // Update userId for consistency
            }
          }
        }
      } catch (e) {
        console.log('[API] Could not get DB stats:', e);
      }
    }

    // Get top genre from genreAffinities
    let topGenre = 'None yet';
    let topMood = 'None yet';

    if (userData && userData.tasteProfile) {
      // Find top genre
      const genreAffinities = userData.tasteProfile.genreAffinities || {};
      const genres = Object.entries(genreAffinities)
        .filter(([_, score]) => (score as number) > 0)
        .sort((a, b) => (b[1] as number) - (a[1] as number));

      if (genres.length > 0) {
        // Capitalize first letter
        topGenre = genres[0][0].charAt(0).toUpperCase() + genres[0][0].slice(1);
      }

      // Find top mood from moodAffinities
      const moodAffinities = userData.tasteProfile.moodAffinities || {};
      const moods = Object.entries(moodAffinities)
        .filter(([_, score]) => (score as number) > 0)
        .sort((a, b) => (b[1] as number) - (a[1] as number));

      if (moods.length > 0) {
        // Capitalize first letter
        topMood = moods[0][0].charAt(0).toUpperCase() + moods[0][0].slice(1);
      }
    }

    // Calculate total tracks from recent playlists
    let totalTracks = 0;
    if (userData && userData.recentPlaylists) {
      userData.recentPlaylists.forEach(playlist => {
        totalTracks += playlist.trackCount || 0;
      });
    }

    // Use database count if available and higher, otherwise use agentMemory count
    // This ensures we show the correct count even if agentMemory hasn't synced yet
    const finalPlaylistCount = Math.max(stats.totalPlaylistsGenerated || 0, dbPlaylistCount);
    
    // If database has more playlists but agentMemory has no data, use database count
    // This handles the case where playlists exist in DB but not in agentMemory yet
    if (dbPlaylistCount > 0 && (stats.totalPlaylistsGenerated || 0) === 0) {
      console.log(`[API] Using database playlist count (${dbPlaylistCount}) for user ${userId}`);
    }

    res.json({
      status: 'success',
      data: {
        totalPlaylistsGenerated: finalPlaylistCount,
        totalTracksLiked: stats.totalTracksLiked || 0,
        totalTracksSkipped: stats.totalTracksSkipped || 0,
        totalTracksDiscovered: totalTracks,
        averagePlaylistRating: stats.averagePlaylistRating || 0,
        topGenre,
        topMood,
        daysSinceFirstUse: stats.daysSinceFirstUse || 0,
        preferredTimeOfDay: stats.preferredTimeOfDay || null
      }
    });
  } catch (err: any) {
    console.error('[API] User stats error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get weekly activity data for the last 4 weeks
 */
app.get("/api/weekly-activity", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;

  try {
    const userData = agentMemory.exportUserData(userId);
    const playlists = userData?.recentPlaylists || [];

    // Calculate playlists per week for last 4 weeks
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeks = [0, 0, 0, 0]; // W1, W2, W3, W4 (W4 is most recent)

    playlists.forEach(playlist => {
      const age = now - playlist.timestamp;
      if (age < weekMs) weeks[3]++; // This week
      else if (age < weekMs * 2) weeks[2]++; // Last week
      else if (age < weekMs * 3) weeks[1]++; // 2 weeks ago
      else if (age < weekMs * 4) weeks[0]++; // 3 weeks ago
    });

    // Calculate percentages (max is the highest week count, or 1 to avoid division by zero)
    const maxCount = Math.max(...weeks, 1);
    const percentages = weeks.map(count => Math.round((count / maxCount) * 100));

    res.json({
      status: 'success',
      data: {
        weeks: [
          { label: 'W1', count: weeks[0], percentage: percentages[0] },
          { label: 'W2', count: weeks[1], percentage: percentages[1] },
          { label: 'W3', count: weeks[2], percentage: percentages[2] },
          { label: 'W4', count: weeks[3], percentage: percentages[3] }
        ]
      }
    });
  } catch (err: any) {
    console.error('[API] Weekly activity error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get genre breakdown with percentages
 */
app.get("/api/genre-breakdown", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;

  try {
    const userData = agentMemory.exportUserData(userId);
    const genreAffinities = userData?.tasteProfile?.genreAffinities || {};

    if (Object.keys(genreAffinities).length === 0) {
      res.json({
        status: 'success',
        data: { genres: [] }
      });
      return;
    }

    // Convert to array and sort by affinity
    const genres = Object.entries(genreAffinities)
      .filter(([_, score]) => (score as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10); // Top 10 genres

    // Calculate percentages based on total affinity (sum of all scores)
    const totalScore = genres.reduce((sum, [_, score]) => sum + (score as number), 0);
    const genreData = genres.map(([genre, score]) => {
      const scoreNum = score as number;
      const percentage = totalScore > 0 ? Math.round((scoreNum / totalScore) * 100) : 0;
      return {
        name: genre.charAt(0).toUpperCase() + genre.slice(1),
        percentage: percentage,
        score: scoreNum
      };
    });

    res.json({
      status: 'success',
      data: { genres: genreData }
    });
  } catch (err: any) {
    console.error('[API] Genre breakdown error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get mood journey for the current month
 */
app.get("/api/mood-journey", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;

  try {
    const userData = agentMemory.exportUserData(userId);
    const playlists = userData?.recentPlaylists || [];

    if (playlists.length === 0) {
      res.json({
        status: 'success',
        data: { moods: [] }
      });
      return;
    }

    // Group playlists by week for current month
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeks: { mood: string; emoji: string }[] = [];

    // Get mood for each of the last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekStart = now - (i + 1) * weekMs;
      const weekEnd = now - i * weekMs;

      const weekPlaylists = playlists.filter(p => 
        p.timestamp >= weekStart && p.timestamp < weekEnd
      );

      let mood = 'neutral';
      let emoji = '😐';

      if (weekPlaylists.length > 0) {
        // Get most common mood from this week's playlists
        const moods = weekPlaylists
          .map(p => p.intent?.parsedMood || p.characteristics?.dominantMood)
          .filter(Boolean);
        
        if (moods.length > 0) {
          // Count mood occurrences
          const moodCounts: Record<string, number> = {};
          moods.forEach(m => {
            moodCounts[m] = (moodCounts[m] || 0) + 1;
          });
          
          mood = Object.entries(moodCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
        }
      }

      // Map mood to emoji
      const moodEmojiMap: Record<string, string> = {
        'happy': '😊', 'energetic': '🔥', 'calm': '😌', 'sad': '😢',
        'focused': '🧘', 'romantic': '💜', 'excited': '✨', 'chill': '🌙',
        'party': '🎉', 'workout': '💪', 'sleep': '😴', 'neutral': '😐'
      };
      emoji = moodEmojiMap[mood.toLowerCase()] || '😐';

      weeks.push({ mood, emoji });
    }

    res.json({
      status: 'success',
      data: { moods: weeks }
    });
  } catch (err: any) {
    console.error('[API] Mood journey error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get discovery score (how adventurous the user is)
 */
app.get("/api/discovery-score", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;

  try {
    const userData = agentMemory.exportUserData(userId);
    const playlists = userData?.recentPlaylists || [];
    const genreAffinities = userData?.tasteProfile?.genreAffinities || {};

    if (playlists.length === 0) {
      res.json({
        status: 'success',
        data: {
          score: 0,
          level: 'New Explorer',
          percentile: 0,
          message: 'Create your first playlist to discover your music taste!'
        }
      });
      return;
    }

    // Calculate discovery score based on:
    // 1. Number of unique genres explored
    // 2. Genre diversity (not just sticking to one genre)
    // 3. Number of playlists created
    const uniqueGenres = Object.keys(genreAffinities).length;
    const totalPlaylists = playlists.length;
    
    // Score calculation (0-100)
    // - Genre diversity: up to 50 points (more genres = higher score)
    // - Activity: up to 30 points (more playlists = higher score)
    // - Variety bonus: up to 20 points (if user explores different moods/energies)
    
    const genreScore = Math.min(uniqueGenres * 5, 50); // 10 genres = 50 points
    const activityScore = Math.min(totalPlaylists * 2, 30); // 15 playlists = 30 points
    
    // Check for variety in moods/energies
    const uniqueMoods = new Set(playlists.map(p => 
      p.intent?.parsedMood || p.characteristics?.dominantMood
    ).filter(Boolean));
    const varietyScore = Math.min(uniqueMoods.size * 5, 20);
    
    const score = Math.round(genreScore + activityScore + varietyScore);
    
    // Determine level and percentile (mock percentile for now)
    let level = 'New Explorer';
    let percentile = 0;
    if (score >= 80) { level = '🚀 Top Explorer'; percentile = 15; }
    else if (score >= 60) { level = '🌟 Explorer'; percentile = 35; }
    else if (score >= 40) { level = '🎵 Curious Listener'; percentile = 60; }
    else if (score >= 20) { level = '🎧 Getting Started'; percentile = 80; }
    else { level = '🌱 New Explorer'; percentile = 95; }

    res.json({
      status: 'success',
      data: {
        score,
        level,
        percentile,
        message: `You've explored ${uniqueGenres} genres across ${totalPlaylists} playlists!`
      }
    });
  } catch (err: any) {
    console.error('[API] Discovery score error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ============================================================================
// DJ MODE ENDPOINTS
// ============================================================================

/**
 * Get user's playlist history for DJ mode selection
 */
app.get("/api/dj/playlists", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;

  try {
    const userData = agentMemory.exportUserData(userId);

    if (!userData || !userData.recentPlaylists || userData.recentPlaylists.length === 0) {
      res.json({
        status: 'success',
        data: { playlists: [] },
        message: 'No playlists found. Create some playlists first!'
      });
      return;
    }

    // Return playlist info from memory
    const playlists = userData.recentPlaylists.map(p => ({
      id: p.id,
      playlistId: p.playlistId,
      name: p.playlistName,
      trackCount: p.trackCount,
      createdAt: p.timestamp,
      mood: p.intent?.parsedMood || p.characteristics?.dominantMood || 'Unknown',
      energy: p.intent?.parsedEnergy || p.characteristics?.averageEnergy || 'medium',
      genres: p.characteristics?.genres || [],
      bpmRange: p.characteristics?.bpmRange || { min: 90, max: 140 }
    })).reverse(); // Most recent first

    res.json({
      status: 'success',
      data: { playlists }
    });
  } catch (err: any) {
    console.error('[API] DJ playlists error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get tracks from Spotify playlists and audio features for DJ mixing
 */
app.post("/api/dj/mix", async (req: Request, res: Response) => {
  const { playlistIds } = req.body;

  if (!playlistIds || !Array.isArray(playlistIds) || playlistIds.length === 0) {
    res.status(400).json({ status: 'error', message: 'At least one playlist ID is required' });
    return;
  }

  if (playlistIds.length > 2) {
    res.status(400).json({ status: 'error', message: 'Maximum 2 playlists allowed for mixing' });
    return;
  }

  try {
    console.log('[DJ Mode] Fetching tracks for playlists:', playlistIds);

    // Fetch tracks from all playlists
    const allTracks: any[] = [];

    for (const playlistId of playlistIds) {
      const result = await spotifyHandler.getPlaylistTracks(playlistId);
      if (result.status === 'success' && result.data?.tracks) {
        allTracks.push(...result.data.tracks.map((t: any) => ({
          ...t,
          sourcePlaylist: playlistId
        })));
      }
    }

    if (allTracks.length === 0) {
      res.json({
        status: 'success',
        data: { tracks: [], message: 'No tracks found in selected playlists' }
      });
      return;
    }

    // Include all tracks, but mark those with preview URLs as playable
    // Spotify often doesn't return preview_url for many tracks
    const tracksWithPlayability = allTracks.filter(t => t.id).map(t => ({
      ...t,
      hasPreview: !!t.preview_url
    }));

    // Get audio features for BPM/energy matching
    const trackIds = tracksWithPlayability.map(t => t.id).filter(Boolean);
    const featuresResult = await spotifyHandler.getAudioFeatures(trackIds);

    let audioFeatures: any[] = [];
    if (featuresResult.status === 'success' && featuresResult.data?.audioFeatures) {
      audioFeatures = featuresResult.data.audioFeatures;
    }

    // Merge audio features with tracks
    const tracksWithFeatures = tracksWithPlayability.map(track => {
      const features = audioFeatures.find(f => f?.id === track.id);
      return {
        ...track,
        audioFeatures: features ? {
          tempo: features.tempo,
          energy: features.energy,
          danceability: features.danceability,
          valence: features.valence,
          key: features.key,
          mode: features.mode,
          loudness: features.loudness
        } : null
      };
    });

    // Sort tracks for optimal DJ mixing (by tempo and energy)
    const sortedTracks = sortTracksForDJMix(tracksWithFeatures);

    console.log('[DJ Mode] Prepared mix with', sortedTracks.length, 'tracks');

    res.json({
      status: 'success',
      data: {
        tracks: sortedTracks,
        totalTracks: sortedTracks.length,
        mixStrategy: 'tempo-energy-flow'
      }
    });

  } catch (err: any) {
    console.error('[API] DJ mix error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Sort tracks for optimal DJ mixing based on tempo, energy, and flow
 */
function sortTracksForDJMix(tracks: any[]): any[] {
  // Separate tracks with and without features
  const withFeatures = tracks.filter(t => t.audioFeatures);
  const withoutFeatures = tracks.filter(t => !t.audioFeatures);

  if (withFeatures.length === 0) {
    // No audio features, just shuffle
    return shuffleArray([...tracks]);
  }

  // Group tracks by tempo ranges
  const slowTracks = withFeatures.filter(t => t.audioFeatures.tempo < 100);
  const mediumTracks = withFeatures.filter(t => t.audioFeatures.tempo >= 100 && t.audioFeatures.tempo < 130);
  const fastTracks = withFeatures.filter(t => t.audioFeatures.tempo >= 130);

  // Sort each group by energy (ascending for a gradual build)
  const sortByEnergy = (a: any, b: any) => a.audioFeatures.energy - b.audioFeatures.energy;
  slowTracks.sort(sortByEnergy);
  mediumTracks.sort(sortByEnergy);
  fastTracks.sort(sortByEnergy);

  // Create a DJ-style flow: start slow, build up, peak, cool down
  const result: any[] = [];

  // Phase 1: Warm up - some slow/medium tracks
  const warmup = [...slowTracks.slice(0, Math.ceil(slowTracks.length / 2))];
  warmup.forEach((t, i) => { t.djPhase = 'warmup'; t.djOrder = i; });
  result.push(...warmup);

  // Phase 2: Build - medium tracks with increasing energy
  const build = [...mediumTracks];
  build.forEach((t, i) => { t.djPhase = 'build'; t.djOrder = i; });
  result.push(...build);

  // Phase 3: Peak - fast high-energy tracks
  const peak = [...fastTracks.reverse()]; // Highest energy first
  peak.forEach((t, i) => { t.djPhase = 'peak'; t.djOrder = i; });
  result.push(...peak);

  // Phase 4: Cool down - remaining slow tracks
  const cooldown = [...slowTracks.slice(Math.ceil(slowTracks.length / 2))];
  cooldown.forEach((t, i) => { t.djPhase = 'cooldown'; t.djOrder = i; });
  result.push(...cooldown);

  // Add tracks without features at the end
  withoutFeatures.forEach((t, i) => { t.djPhase = 'bonus'; t.djOrder = i; });
  result.push(...withoutFeatures);

  return result;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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

// ============================================================================
// JIOSAAVN DOWNLOAD ENDPOINTS - For downloading playlists as MP3s
// ============================================================================

import * as jiosaavnService from "./services/jiosaavnService.js";

/**
 * Search songs on JioSaavn
 */
app.get("/api/jiosaavn/search", async (req: Request, res: Response) => {
  const query = req.query.query as string;
  const limit = parseInt(req.query.limit as string) || 10;

  if (!query) {
    res.status(400).json({ status: 'error', message: 'Query is required' });
    return;
  }

  try {
    const result = await jiosaavnService.searchSongs(query, limit);
    if (result && result.status === 'SUCCESS') {
      res.json({ status: 'success', data: result.data });
    } else {
      res.status(500).json({ status: 'error', message: 'Failed to search JioSaavn' });
    }
  } catch (err: any) {
    console.error('[API] JioSaavn search error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get song details by ID
 */
app.get("/api/jiosaavn/song/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await jiosaavnService.getSongById(id);
    if (result && result.data.length > 0) {
      const song = result.data[0];
      res.json({
        status: 'success',
        data: {
          ...song,
          downloadUrl: jiosaavnService.getDownloadUrl(song),
          imageUrl: jiosaavnService.getImageUrl(song)
        }
      });
    } else {
      res.status(404).json({ status: 'error', message: 'Song not found' });
    }
  } catch (err: any) {
    console.error('[API] JioSaavn song error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Match Spotify tracks to JioSaavn and get download info
 */
app.post("/api/jiosaavn/match", async (req: Request, res: Response) => {
  const { tracks } = req.body;

  if (!tracks || !Array.isArray(tracks)) {
    res.status(400).json({ status: 'error', message: 'Tracks array is required' });
    return;
  }

  try {
    const matchedTracks = [];

    for (const track of tracks) {
      const { name, artist } = track;
      if (!name) continue;

      const match = await jiosaavnService.matchSpotifyTrack(name, artist || '');

      if (match) {
        matchedTracks.push({
          spotifyTrack: track,
          jiosaavnMatch: {
            id: match.id,
            name: match.name,
            artist: match.artists?.primary?.[0]?.name || 'Unknown',
            album: match.album?.name || 'Unknown',
            duration: match.duration,
            downloadUrl: jiosaavnService.getDownloadUrl(match),
            imageUrl: jiosaavnService.getImageUrl(match)
          }
        });
      } else {
        matchedTracks.push({
          spotifyTrack: track,
          jiosaavnMatch: null
        });
      }
    }

    res.json({
      status: 'success',
      data: {
        total: tracks.length,
        matched: matchedTracks.filter(t => t.jiosaavnMatch).length,
        tracks: matchedTracks
      }
    });
  } catch (err: any) {
    console.error('[API] JioSaavn match error:', err);
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
