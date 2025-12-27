/**
 * Agentic Engine - The brain behind Playlistify AI's proactive intelligence
 * 
 * This module makes Playlistify AI feel like an intelligent agent, not just a tool.
 * It combines:
 * - Proactive suggestions (the agent acts without being asked)
 * - Playlist evolution (systems over outputs)
 * - Explainability (transparent reasoning)
 * 
 * "Most AI tools react. Playlistify learns."
 */

import { agentMemory, TimeOfDay, EnergyLevel, AudioCharacteristics, PlaylistMemoryEntry } from './agentMemory.js';
import { parseEnhancedIntent, generateExplanation, suggestModifications, EnhancedPlaylistIntent } from './intentEngine.js';
import { SpotifyTrack, ProactiveSuggestion, AgenticPlaylist, PlaylistEvolutionRequest } from '../types.js';
import * as spotifyHandler from './spotifyHandler.js';
import {
  generateCreativePlaylistName,
  generateCoverImagePrompt,
  parseRefinementRequest,
  generatePersonalizedSuggestion,
  generateMemorySummary,
  generateSmartSearchQueries as aiGenerateSearchQueries,
  parseComplexPrompt
} from './aiService.js';

// ============================================================================
// PROACTIVE SUGGESTION ENGINE
// ============================================================================

/**
 * Check if we should proactively suggest a playlist to the user
 * This is called on page load or periodically
 */
export function getProactiveSuggestion(userId: string): ProactiveSuggestion | null {
  try {
    const { shouldSuggest, reason, suggestedPrompt } = agentMemory.shouldSuggestProactively(userId);

    if (!shouldSuggest || !suggestedPrompt) {
      return null;
    }

    const context = agentMemory.getPersonalizedContext(userId);
    const now = Date.now();

    // Build a smart suggestion based on patterns
    const suggestion: ProactiveSuggestion = {
      id: `sug_${now}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'habitual',
      title: getTimeDependentTitle(context.timeOfDay),
      description: reason,
      suggestedPrompt,
      confidence: 0.75,
      reason: context.explanation || reason,
      createdAt: now,
      expiresAt: now + (2 * 60 * 60 * 1000), // 2 hours
    };

    console.log('[AgenticEngine] Generated proactive suggestion:', suggestion.title);
    return suggestion;

  } catch (err) {
    console.error('[AgenticEngine] Failed to generate proactive suggestion:', err);
    return null;
  }
}

/**
 * Generate time-appropriate suggestion titles
 */
function getTimeDependentTitle(timeOfDay: TimeOfDay): string {
  const titles: Record<TimeOfDay, string[]> = {
    'early-morning': ['Start your day right', 'Fresh morning energy'],
    'morning': ['Morning boost ready', 'Ready to start the day?'],
    'afternoon': ['Afternoon productivity', 'Keep the momentum going'],
    'evening': ['Wind down time', 'Evening vibes ready'],
    'night': ['Night mode activated', 'Ready for the night?'],
    'late-night': ['Late night companion', 'Burning the midnight oil?'],
  };

  const options = titles[timeOfDay] || ['Your music is ready'];
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================================================
// SMART PLAYLIST GENERATION
// ============================================================================

/**
 * Generate a playlist with full agentic intelligence
 * Uses AI to understand complex prompts and find diverse, accurate tracks
 */
export async function generateAgenticPlaylist(
  userId: string,
  rawPrompt: string,
  options?: {
    targetCount?: number;
    discoveryMode?: boolean;
    excludeGenres?: string[];
    eraPreference?: string;
  }
): Promise<AgenticPlaylist | { error: string }> {
  try {
    console.log('[AgenticEngine] Generating agentic playlist for:', rawPrompt);

    const targetCount = options?.targetCount || 25;

    // Step 1: Get personalized context from memory
    const userContext = agentMemory.getPersonalizedContext(userId);

    // Step 2: Use AI to deeply understand the prompt and generate smart search queries
    console.log('[AgenticEngine] Using AI to understand prompt...');
    const aiSearchResult = await aiGenerateSearchQueries(rawPrompt, targetCount);
    console.log('[AgenticEngine] AI understanding:', aiSearchResult.understanding);
    console.log('[AgenticEngine] AI generated queries:', aiSearchResult.queries);

    // Step 3: Also parse intent for local understanding (fallback + naming)
    const intent = parseEnhancedIntent(rawPrompt, {
      timeOfDay: userContext.timeOfDay,
      previousMood: userContext.recentMoodTrend,
      preferredGenres: userContext.suggestedGenres,
    });

    // Step 4: Get tracks using AI-generated search queries
    let tracks: SpotifyTrack[] = [];
    const tracksPerQuery = Math.ceil(targetCount / aiSearchResult.queries.length) + 10;

    for (const query of aiSearchResult.queries) {
      const searchResult = await spotifyHandler.searchTracks(query, tracksPerQuery);
      if (searchResult.status === 'success' && searchResult.data?.tracks) {
        tracks.push(...searchResult.data.tracks);
      }
    }

    // Fallback if AI queries returned nothing
    if (tracks.length < 5) {
      console.log('[AgenticEngine] AI queries insufficient, trying local queries...');
      const localQueries = buildSmartSearchQueries(intent, userContext, options, rawPrompt);
      for (const query of localQueries) {
        const searchResult = await spotifyHandler.searchTracks(query, 15);
        if (searchResult.status === 'success' && searchResult.data?.tracks) {
          tracks.push(...searchResult.data.tracks);
        }
      }
    }

    // Final fallback: direct prompt search
    if (tracks.length === 0) {
      const fallbackResult = await spotifyHandler.searchTracks(rawPrompt, targetCount);
      if (fallbackResult.status === 'success' && fallbackResult.data?.tracks) {
        tracks = fallbackResult.data.tracks;
      }
    }

    if (tracks.length === 0) {
      return { error: 'No tracks found for your request. Try a different description.' };
    }

    // Step 5: Deduplicate and apply diversity rules
    tracks = deduplicateTracks(tracks);

    // Apply AI-suggested max per artist (default 2)
    const maxPerArtist = aiSearchResult.filters.maxPerArtist || 2;
    tracks = applySmartDiversity(tracks, maxPerArtist);

    // Step 6: Shuffle for variety and limit to target
    tracks = shuffleArray(tracks);
    tracks = tracks.slice(0, targetCount);

    // Step 7: Generate explanation (combine AI understanding + local)
    const explanation = aiSearchResult.understanding || generateExplanation(intent, {
      timeOfDay: userContext.timeOfDay,
      preferenceNote: userContext.explanation,
    });

    // Step 8: Create the Spotify playlist (with AI-generated name)
    const playlistName = await generateSmartPlaylistName(rawPrompt, intent);
    const trackUris = tracks.map(t => t.uri);

    const createResult = await spotifyHandler.createPlaylist(
      undefined,
      playlistName,
      `${explanation} | Created by Playlistify AI`,
      trackUris,
      true
    );

    if (createResult.status !== 'success' || !createResult.data?.playlist) {
      return { error: 'Failed to create Spotify playlist' };
    }

    // Step 9: Record in agent memory
    const memoryId = agentMemory.recordPlaylistGeneration(userId, {
      intent: {
        rawPrompt,
        parsedMood: intent.mood,
        parsedActivity: intent.activity,
        parsedEnergy: intent.audioParams.targetEnergy,
      },
      playlistId: createResult.data.playlist.id,
      playlistName: createResult.data.playlist.name,
      trackCount: tracks.length,
      characteristics: inferAudioCharacteristics(intent, tracks),
    });

    // Step 10: Generate modification suggestions
    const modifications = suggestModifications(intent);

    console.log('[AgenticEngine] Playlist created successfully:', {
      playlistId: createResult.data.playlist.id,
      memoryId,
      trackCount: tracks.length,
    });

    return {
      playlist: createResult.data.playlist,
      tracks,
      memoryId,
      explanation,
      modifications,
      createdAt: Date.now(),
      canEvolve: true,
    };

  } catch (err: any) {
    console.error('[AgenticEngine] Playlist generation failed:', err);
    return { error: err.message || 'Unknown error during playlist generation' };
  }
}

/**
 * Extract specific terms from the raw prompt for more accurate searches
 */
function extractSpecificTerms(rawPrompt: string): {
  year?: string;
  yearRange?: { start: number; end: number };
  language?: string;
  style?: string;
  artistHints: string[];
  specificTerms: string[];
} {
  const lower = rawPrompt.toLowerCase();
  const result: ReturnType<typeof extractSpecificTerms> = {
    artistHints: [],
    specificTerms: [],
  };

  // Extract year (e.g., "2019", "90s", "2010s")
  const yearMatch = lower.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    result.year = yearMatch[0];
  }

  // Extract decade (e.g., "90s", "80s", "2010s")
  const decadeMatch = lower.match(/\b(\d{2})s\b|\b(20\d{2})s\b/);
  if (decadeMatch) {
    const decade = decadeMatch[1] || decadeMatch[2];
    if (decade.length === 2) {
      const start = parseInt(decade) < 30 ? 2000 + parseInt(decade) : 1900 + parseInt(decade);
      result.yearRange = { start, end: start + 9 };
    } else {
      result.yearRange = { start: parseInt(decade), end: parseInt(decade) + 9 };
    }
  }

  // Extract language/region
  const languages: Record<string, string> = {
    'hindi': 'bollywood hindi',
    'bollywood': 'bollywood hindi',
    'punjabi': 'punjabi',
    'tamil': 'tamil kollywood',
    'telugu': 'telugu tollywood',
    'kannada': 'kannada',
    'malayalam': 'malayalam',
    'bengali': 'bengali',
    'marathi': 'marathi',
    'korean': 'k-pop korean',
    'kpop': 'k-pop korean',
    'k-pop': 'k-pop korean',
    'japanese': 'j-pop japanese',
    'spanish': 'spanish latin',
    'latino': 'latin reggaeton',
    'french': 'french',
    'german': 'german',
    'arabic': 'arabic',
    'desi': 'bollywood hindi punjabi',
    'indian': 'bollywood hindi',
  };

  for (const [key, value] of Object.entries(languages)) {
    if (lower.includes(key)) {
      result.language = value;
      break;
    }
  }

  // Extract style/type
  const styles = ['mashup', 'remix', 'cover', 'acoustic', 'live', 'unplugged', 'lofi', 'lo-fi', 'slowed', 'reverb', 'bass boosted', 'extended', 'mix', 'medley'];
  for (const style of styles) {
    if (lower.includes(style)) {
      result.style = style;
      break;
    }
  }

  // Extract specific terms that should be in the search
  const importantTerms = rawPrompt.match(/["']([^"']+)["']/g);
  if (importantTerms) {
    result.specificTerms = importantTerms.map(t => t.replace(/["']/g, ''));
  }

  // Extract words that look like artist names (capitalized words)
  const capitalizedWords = rawPrompt.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (capitalizedWords) {
    result.artistHints = capitalizedWords.filter(w =>
      !['I', 'The', 'A', 'An', 'For', 'With', 'And', 'Or', 'But', 'Music', 'Songs', 'Playlist'].includes(w)
    );
  }

  return result;
}

/**
 * Build smart search queries based on intent + user history + options
 * Since Spotify Recommendations API is deprecated, we use multiple search queries
 */
function buildSmartSearchQueries(
  intent: EnhancedPlaylistIntent,
  _userContext: ReturnType<typeof agentMemory.getPersonalizedContext>,
  options?: { excludeGenres?: string[]; discoveryMode?: boolean; eraPreference?: string },
  rawPrompt?: string
): string[] {
  const queries: string[] = [];
  const genres = intent.suggestedSeeds?.genres || [];
  const mood = intent.mood || intent.emotionalState?.primary || '';
  const activity = intent.activity || '';

  // Extract specific terms from the raw prompt for precision
  const extracted = rawPrompt ? extractSpecificTerms(rawPrompt) : { artistHints: [], specificTerms: [] };

  // PRIORITY 1: Use extracted specific terms first (most accurate)
  if (extracted.language && extracted.year) {
    // e.g., "hindi 2019" -> "bollywood hindi 2019"
    queries.push(`${extracted.language} ${extracted.year}${extracted.style ? ' ' + extracted.style : ''}`);
    queries.push(`${extracted.language} songs ${extracted.year}`);
    queries.push(`best ${extracted.language} ${extracted.year}`);
  } else if (extracted.language && extracted.yearRange) {
    queries.push(`${extracted.language} ${extracted.yearRange.start}s hits`);
    queries.push(`best ${extracted.language} ${extracted.yearRange.start}s`);
  } else if (extracted.language) {
    queries.push(`${extracted.language} ${extracted.style || 'hits'}`);
    queries.push(`best ${extracted.language} songs`);
    queries.push(`${extracted.language} popular`);
  }

  // Add style-specific queries
  if (extracted.style) {
    if (extracted.language) {
      queries.push(`${extracted.language} ${extracted.style}`);
    }
    queries.push(`${extracted.style} songs ${extracted.year || ''}`.trim());
  }

  // Add year-specific queries
  if (extracted.year && !extracted.language) {
    queries.push(`top songs ${extracted.year}`);
    queries.push(`best hits ${extracted.year}`);
    if (genres.length > 0) {
      queries.push(`${genres[0]} ${extracted.year}`);
    }
  }

  // Add artist hints
  for (const artist of extracted.artistHints.slice(0, 2)) {
    queries.push(`${artist} songs`);
  }

  // Add specific quoted terms
  for (const term of extracted.specificTerms.slice(0, 2)) {
    queries.push(term);
  }

  // PRIORITY 2: Genre + mood combinations
  if (mood && genres.length > 0 && queries.length < 3) {
    queries.push(`${mood} ${genres[0]} music`);
  }

  // Add genre-specific queries if we don't have enough
  if (queries.length < 4) {
    for (const genre of genres.slice(0, 2)) {
      if (intent.audioParams?.targetEnergy === 'high' || intent.audioParams?.targetEnergy === 'very-high') {
        queries.push(`${genre} upbeat popular`);
      } else if (intent.audioParams?.targetEnergy === 'low' || intent.audioParams?.targetEnergy === 'very-low') {
        queries.push(`${genre} chill relaxing`);
      } else {
        queries.push(`${genre} top hits`);
      }
    }
  }

  // Add activity-based query
  if (activity && queries.length < 5) {
    queries.push(`${activity} music playlist`);
  }

  // Add era preference if specified
  if (options?.eraPreference && queries.length < 6) {
    queries.push(`${options.eraPreference} hits`);
  }

  // Ensure we have at least one query
  if (queries.length === 0) {
    queries.push(rawPrompt || 'popular music hits');
    queries.push('top songs playlist');
  }

  // Deduplicate and limit
  const uniqueQueries = [...new Set(queries.filter(q => q.trim().length > 0))];
  console.log('[AgenticEngine] Built search queries:', uniqueQueries.slice(0, 6));

  return uniqueQueries.slice(0, 6);
}

/**
 * Deduplicate tracks by ID
 */
function deduplicateTracks(tracks: SpotifyTrack[]): SpotifyTrack[] {
  const seen = new Set<string>();
  const result: SpotifyTrack[] = [];

  for (const track of tracks) {
    if (!seen.has(track.id)) {
      seen.add(track.id);
      result.push(track);
    }
  }

  return result;
}

/**
 * Rank tracks by how well they match the intent
 */
function rankTracksByIntent(tracks: SpotifyTrack[], _intent: EnhancedPlaylistIntent): SpotifyTrack[] {
  // Simple ranking - in real implementation, could use audio features API
  // For now, we shuffle to provide variety
  return tracks.sort(() => Math.random() - 0.5);
}

/**
 * Fisher-Yates shuffle for true randomization
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Apply smart diversity rules - limit songs per artist
 */
function applySmartDiversity(tracks: SpotifyTrack[], maxPerArtist: number = 2): SpotifyTrack[] {
  const artistCounts = new Map<string, number>();
  const result: SpotifyTrack[] = [];

  for (const track of tracks) {
    const artistId = track.artists[0]?.id;
    if (!artistId) continue;

    const count = artistCounts.get(artistId) || 0;

    if (count < maxPerArtist) {
      result.push(track);
      artistCounts.set(artistId, count + 1);
    }
  }

  return result;
}

/**
 * Generate a smart playlist name based on intent analysis
 * Uses AI for creative names, with local fallback
 */
async function generateSmartPlaylistName(rawPrompt: string, intent: EnhancedPlaylistIntent): Promise<string> {
  const mood = intent.mood || intent.emotionalState?.primary || '';
  const activity = intent.activity || '';
  const genres = intent.suggestedSeeds?.genres || [];
  const timeContext = intent.context?.timeContext;

  // Try AI-generated name first
  try {
    const aiName = await generateCreativePlaylistName(
      rawPrompt,
      mood,
      genres,
      activity,
      timeContext
    );
    if (aiName && aiName.length > 3) {
      console.log('[AgenticEngine] AI generated name:', aiName);
      return aiName;
    }
  } catch (err) {
    console.log('[AgenticEngine] AI name generation failed, using fallback');
  }

  // Fallback: Local name generation
  // Emoji mappings for different moods/activities
  const moodEmojis: Record<string, string> = {
    'focus': '🎯', 'chill': '☕', 'energetic': '⚡', 'happy': '✨',
    'sad': '🌧️', 'romantic': '💕', 'workout': '💪', 'study': '📚',
    'party': '🎉', 'calm': '🌙', 'coding': '💻', 'relaxed': '🧘',
    'pumped': '🔥', 'melancholic': '🌊', 'confident': '👑', 'peaceful': '🕊️',
    'dreamy': '💫', 'intense': '⚔️', 'cozy': '🏠', 'nostalgic': '📻'
  };

  const energy = intent.audioParams?.targetEnergy || 'medium';

  // Get emoji
  const emoji = moodEmojis[mood.toLowerCase()] || moodEmojis[activity.toLowerCase()] || '🎵';

  // Generate creative name based on context
  const timeLabels: Record<string, string> = {
    'morning': 'Morning', 'day': 'Afternoon', 'evening': 'Evening',
    'night': 'Night', 'late-night': 'Late Night'
  };

  // Build smart name
  let name = '';

  // If we have both mood and activity, combine them
  if (mood && activity) {
    const moodCapitalized = mood.charAt(0).toUpperCase() + mood.slice(1);
    const activityCapitalized = activity.charAt(0).toUpperCase() + activity.slice(1);
    name = `${moodCapitalized} ${activityCapitalized} Mix`;
  }
  // If we have mood + time context
  else if (mood && timeContext && timeLabels[timeContext]) {
    const moodCapitalized = mood.charAt(0).toUpperCase() + mood.slice(1);
    name = `${timeLabels[timeContext]} ${moodCapitalized} Vibes`;
  }
  // If we have activity + genre
  else if (activity && genres.length > 0) {
    const activityCapitalized = activity.charAt(0).toUpperCase() + activity.slice(1);
    const genreCapitalized = genres[0].charAt(0).toUpperCase() + genres[0].slice(1);
    name = `${genreCapitalized} for ${activityCapitalized}`;
  }
  // If we only have mood
  else if (mood) {
    const moodCapitalized = mood.charAt(0).toUpperCase() + mood.slice(1);
    const energyLabels: Record<string, string> = {
      'very-low': 'Gentle', 'low': 'Soft', 'medium': '',
      'high': 'Upbeat', 'very-high': 'High Energy'
    };
    const energyLabel = energyLabels[energy] || '';
    name = energyLabel ? `${energyLabel} ${moodCapitalized} Mix` : `${moodCapitalized} Vibes`;
  }
  // If we only have activity
  else if (activity) {
    const activityCapitalized = activity.charAt(0).toUpperCase() + activity.slice(1);
    name = `${activityCapitalized} Soundtrack`;
  }
  // If we have genres
  else if (genres.length > 0) {
    const genreCapitalized = genres[0].charAt(0).toUpperCase() + genres[0].slice(1);
    name = `${genreCapitalized} Collection`;
  }
  // Fallback: use prompt but clean it up
  else {
    // Extract key words from prompt
    const cleanPrompt = rawPrompt
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .slice(0, 4)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    name = cleanPrompt || 'AI Curated Mix';
  }

  // Add "by Playlistify AI" suffix occasionally for branding
  const addBranding = Math.random() > 0.7;

  return addBranding ? `${emoji} ${name} • AI` : `${emoji} ${name}`;
}

/**
 * Infer audio characteristics from intent (privacy-safe)
 */
function inferAudioCharacteristics(
  intent: EnhancedPlaylistIntent,
  _tracks: SpotifyTrack[]
): AudioCharacteristics {
  return {
    averageEnergy: intent.audioParams.targetEnergy,
    dominantMood: intent.emotionalState.primary || 'neutral',
    bpmRange: intent.audioParams.targetBpmRange,
    vocalIntensity: intent.audioParams.vocalPreference,
    genres: intent.suggestedSeeds?.genres || [],
  };
}

// ============================================================================
// PLAYLIST EVOLUTION
// ============================================================================

/**
 * Evolve an existing playlist based on feedback and preferences
 */
export async function evolvePlaylist(
  userId: string,
  request: PlaylistEvolutionRequest
): Promise<{ success: boolean; message: string; newTracks?: SpotifyTrack[] }> {
  try {
    console.log('[AgenticEngine] Evolving playlist:', request.playlistId);

    // Get evolution suggestions from memory
    const suggestions = agentMemory.getEvolutionSuggestions(userId, request.memoryId);

    if (!suggestions.shouldEvolve && request.evolutionType !== 'refresh') {
      return { success: true, message: 'Playlist is already optimized for your preferences' };
    }

    // Get current context
    const userContext = agentMemory.getPersonalizedContext(userId);

    // Build new recommendations based on evolved preferences
    const seedGenres = userContext.suggestedGenres.length > 0
      ? userContext.suggestedGenres
      : ['pop', 'indie'];

    const recommendResult = await spotifyHandler.getRecommendations(
      undefined,
      seedGenres.slice(0, 5),
      undefined,
      10 // Get fewer tracks for evolution
    );

    if (recommendResult.status !== 'success' || !recommendResult.data?.tracks) {
      return { success: false, message: 'Could not fetch new track recommendations' };
    }

    // For now, return the new tracks (actual playlist update would require more Spotify API calls)
    return {
      success: true,
      message: `Found ${recommendResult.data.tracks.length} new tracks based on your evolved preferences`,
      newTracks: recommendResult.data.tracks,
    };

  } catch (err: any) {
    console.error('[AgenticEngine] Playlist evolution failed:', err);
    return { success: false, message: err.message || 'Evolution failed' };
  }
}

/**
 * Get weekly refresh suggestions
 */
export function getWeeklyRefreshSuggestions(userId: string): {
  shouldRefresh: boolean;
  playlistsToRefresh: Array<{ id: string; name: string; reason: string }>;
} {
  const state = agentMemory.exportUserData(userId);
  if (!state) {
    return { shouldRefresh: false, playlistsToRefresh: [] };
  }

  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const playlistsToRefresh: Array<{ id: string; name: string; reason: string }> = [];

  // Find playlists older than a week that were liked
  for (const playlist of state.recentPlaylists) {
    if (playlist.timestamp < oneWeekAgo) {
      if (playlist.feedback.overallRating === 'loved' || playlist.feedback.overallRating === 'liked') {
        playlistsToRefresh.push({
          id: playlist.playlistId,
          name: playlist.playlistName,
          reason: 'You loved this playlist! Time for a fresh version?',
        });
      }
    }

    if (playlistsToRefresh.length >= 3) break;
  }

  return {
    shouldRefresh: playlistsToRefresh.length > 0,
    playlistsToRefresh,
  };
}

// ============================================================================
// FEEDBACK PROCESSING
// ============================================================================

/**
 * Process like/skip feedback on a track
 */
export function processTrackFeedback(
  userId: string,
  memoryId: string,
  trackUri: string,
  action: 'like' | 'skip'
): { success: boolean; message: string } {
  try {
    agentMemory.recordTrackFeedback(userId, memoryId, trackUri, action);

    const messages = {
      like: "Got it! I'll remember you liked this kind of track.",
      skip: "Noted! I'll adjust future recommendations.",
    };

    return { success: true, message: messages[action] };
  } catch (err) {
    return { success: false, message: 'Failed to record feedback' };
  }
}

/**
 * Process overall playlist rating
 */
export function processPlaylistRating(
  userId: string,
  memoryId: string,
  rating: 'loved' | 'liked' | 'neutral' | 'disliked'
): { success: boolean; message: string; suggestion?: string } {
  try {
    agentMemory.recordPlaylistRating(userId, memoryId, rating);

    const responses: Record<string, { message: string; suggestion?: string }> = {
      loved: {
        message: "Amazing! I'll use this as a reference for future playlists.",
        suggestion: "Want me to create a similar one for a different time of day?"
      },
      liked: {
        message: "Great! I'm learning your taste.",
      },
      neutral: {
        message: "Thanks for the feedback. Any specific adjustments you'd like?",
        suggestion: "Try 'more energy' or 'more chill' for better results"
      },
      disliked: {
        message: "Sorry about that! I'll adjust future recommendations.",
        suggestion: "Try being more specific about the mood you want"
      },
    };

    return { success: true, ...responses[rating] };
  } catch (err) {
    return { success: false, message: 'Failed to record rating' };
  }
}

// ============================================================================
// USER INSIGHTS
// ============================================================================

/**
 * Get user's musical taste fingerprint for display
 */
export function getTasteFingerprint(userId: string): {
  topGenres: string[];
  topMoods: string[];
  listeningStyle: string;
  personalityNote: string;
  stats: ReturnType<typeof agentMemory.getUserStats>;
} {
  const stats = agentMemory.getUserStats(userId);
  const context = agentMemory.getPersonalizedContext(userId);

  // Determine listening style
  let listeningStyle = 'Balanced';
  if (context.suggestedEnergy === 'very-high' || context.suggestedEnergy === 'high') {
    listeningStyle = 'High-Energy Explorer';
  } else if (context.suggestedEnergy === 'low' || context.suggestedEnergy === 'very-low') {
    listeningStyle = 'Calm & Focused';
  }

  // Generate personality note
  let personalityNote = '';
  if (stats.totalPlaylistsGenerated > 10) {
    personalityNote = `You've created ${stats.totalPlaylistsGenerated} playlists with me. `;
    if (stats.averagePlaylistRating > 4) {
      personalityNote += "You seem to love what we create together! ";
    }
    if (stats.preferredTimeOfDay) {
      const timeNames: Record<TimeOfDay, string> = {
        'early-morning': 'early mornings',
        'morning': 'mornings',
        'afternoon': 'afternoons',
        'evening': 'evenings',
        'night': 'nights',
        'late-night': 'late nights',
      };
      personalityNote += `You often listen during ${timeNames[stats.preferredTimeOfDay]}.`;
    }
  } else if (stats.totalPlaylistsGenerated > 0) {
    personalityNote = "I'm still learning your taste. Keep creating playlists!";
  } else {
    personalityNote = "Let's discover your musical personality together.";
  }

  return {
    topGenres: context.suggestedGenres.slice(0, 5),
    topMoods: context.suggestedMoods.slice(0, 3),
    listeningStyle,
    personalityNote,
    stats,
  };
}

// ============================================================================
// CONVERSATIONAL PLAYLIST REFINEMENT
// ============================================================================

interface RefineRequest {
  originalPrompt: string;
  refinement: string;
  currentTrackUris: string[];
  playlistId: string;
}

interface RefineResult {
  message: string;
  tracks?: SpotifyTrack[];
  action: 'added' | 'removed' | 'replaced' | 'no-change';
}

/**
 * Refine a playlist through natural language commands using AI understanding
 * Supports commands like:
 * - "add more upbeat songs"
 * - "remove slow tracks"
 * - "more songs like the first one"
 * - "add 90s rock"
 * - "less electronic"
 * - Natural conversation: "I want something more energetic"
 */
export async function refinePlaylistWithChat(
  _userId: string,
  request: RefineRequest
): Promise<RefineResult> {
  const { originalPrompt, refinement, currentTrackUris, playlistId } = request;

  console.log('[AgenticEngine] Refining playlist with AI:', refinement);

  // Use AI to understand the refinement request
  const parsedRequest = await parseRefinementRequest(
    originalPrompt,
    refinement,
    [] // We could pass current track genres here
  );

  console.log('[AgenticEngine] AI parsed request:', parsedRequest);

  try {
    if (parsedRequest.action === 'add' || parsedRequest.action === 'adjust') {
      // Search for new tracks based on AI-parsed query
      const searchResult = await spotifyHandler.searchTracks(parsedRequest.searchQuery, 5);

      if (searchResult.status === 'success' && searchResult.data?.tracks) {
        const newTracks = searchResult.data.tracks.filter(
          (t: SpotifyTrack) => !currentTrackUris.includes(t.uri)
        );

        if (newTracks.length > 0) {
          // Add tracks to the Spotify playlist
          const trackUris = newTracks.map((t: SpotifyTrack) => t.uri);
          await spotifyHandler.addTracksToPlaylist(playlistId, trackUris);

          return {
            message: `${parsedRequest.explanation} Added ${newTracks.length} tracks! 🎵`,
            tracks: [...newTracks],
            action: 'added',
          };
        }

        return {
          message: `${parsedRequest.explanation} But all matching tracks are already in your playlist!`,
          action: 'no-change',
        };
      }

      return {
        message: `Couldn't find tracks matching "${parsedRequest.criteria}". Try being more specific!`,
        action: 'no-change',
      };
    }

    if (parsedRequest.action === 'remove') {
      // For removal, explain what would happen
      return {
        message: `${parsedRequest.explanation} Use the 👎 button on tracks you want to remove, and I'll learn your preferences!`,
        action: 'no-change',
      };
    }

    if (parsedRequest.action === 'replace') {
      // Search for replacement tracks
      const searchResult = await spotifyHandler.searchTracks(parsedRequest.searchQuery, 5);

      if (searchResult.status === 'success' && searchResult.data?.tracks) {
        const newTracks = searchResult.data.tracks.filter(
          (t: SpotifyTrack) => !currentTrackUris.includes(t.uri)
        );

        if (newTracks.length > 0) {
          const trackUris = newTracks.map((t: SpotifyTrack) => t.uri);
          await spotifyHandler.addTracksToPlaylist(playlistId, trackUris);

          return {
            message: `${parsedRequest.explanation} Added ${newTracks.length} new tracks! 🔄`,
            tracks: [...newTracks],
            action: 'replaced',
          };
        }
      }

      return {
        message: `Couldn't find replacement tracks. Try a different description!`,
        action: 'no-change',
      };
    }

    return {
      message: parsedRequest.explanation || "I'm ready to help! Tell me what you want to change.",
      action: 'no-change',
    };

  } catch (err: any) {
    console.error('[AgenticEngine] Refinement error:', err);
    return {
      message: 'Something went wrong. Please try again.',
      action: 'no-change',
    };
  }
}

/**
 * Get AI-generated personalized suggestion for a user
 */
export async function getAISuggestion(userId: string): Promise<{
  suggestion: string;
  prompt: string;
  reason: string;
} | null> {
  try {
    const context = agentMemory.getPersonalizedContext(userId);
    const fingerprint = getTasteFingerprint(userId);

    if (!fingerprint || fingerprint.stats.totalPlaylistsGenerated < 2) {
      return null; // Not enough data
    }

    // Get recent prompts from export data
    const userData = agentMemory.exportUserData(userId);
    const recentPrompts = userData?.recentPlaylists?.slice(-5)
      .map((p: PlaylistMemoryEntry) => p.intent.rawPrompt) || [];

    return await generatePersonalizedSuggestion(
      fingerprint.topGenres,
      fingerprint.topMoods,
      recentPrompts,
      context.timeOfDay
    );
  } catch (err) {
    console.error('[AgenticEngine] AI suggestion failed:', err);
    return null;
  }
}

/**
 * Get AI-generated memory summary for a user
 */
export async function getAIMemorySummary(userId: string): Promise<string> {
  try {
    const fingerprint = getTasteFingerprint(userId);

    // Brand new user with no playlists
    if (!fingerprint || fingerprint.stats.totalPlaylistsGenerated === 0) {
      return "Welcome to Playlistify AI! 🎵 Create your first playlist and I'll start learning your unique music taste.";
    }

    // User with just 1 playlist
    if (fingerprint.stats.totalPlaylistsGenerated === 1) {
      return "Great first playlist! 🎶 Create a few more and I'll start building your personalized music profile.";
    }

    // User with 2-3 playlists - still learning
    if (fingerprint.stats.totalPlaylistsGenerated < 4) {
      return `I'm getting to know you! You've created ${fingerprint.stats.totalPlaylistsGenerated} playlists. Keep going and I'll unlock deeper insights about your taste.`;
    }

    const context = agentMemory.getPersonalizedContext(userId);

    return await generateMemorySummary(
      fingerprint.stats.totalPlaylistsGenerated,
      fingerprint.topGenres,
      fingerprint.topMoods,
      fingerprint.stats.averagePlaylistRating || 4,
      context.timeOfDay
    );
  } catch (err) {
    console.error('[AgenticEngine] AI memory summary failed:', err);
    return "I've learned a lot about your taste! Keep creating playlists to refine my understanding.";
  }
}

/**
 * Generate AI-enhanced cover image prompt
 */
export async function getAICoverPrompt(
  playlistName: string,
  mood: string,
  genres: string[],
  userPrompt: string
): Promise<string> {
  try {
    return await generateCoverImagePrompt(playlistName, mood, genres, userPrompt);
  } catch (err) {
    console.error('[AgenticEngine] AI cover prompt failed:', err);
    return `abstract music album cover, ${mood} mood, ${genres[0] || 'modern'} style`;
  }
}

export default {
  getProactiveSuggestion,
  generateAgenticPlaylist,
  evolvePlaylist,
  getWeeklyRefreshSuggestions,
  processTrackFeedback,
  processPlaylistRating,
  getTasteFingerprint,
  refinePlaylistWithChat,
  getAISuggestion,
  getAIMemorySummary,
  getAICoverPrompt,
};
