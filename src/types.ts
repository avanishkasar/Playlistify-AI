// Type definitions for MCP requests and Spotify data structures

export interface MCPRequest {
  tool: 'search-track' | 'recommend' | 'create-playlist';
  input: Record<string, any>;
}

export interface MCPResponse {
  status: 'success' | 'error';
  data?: any;
  message?: string;
  timestamp?: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: { id: string; name: string; images?: Array<{ url: string; width: number; height: number }> };
  uri: string;
  external_urls: { spotify: string };
  duration_ms: number;
  preview_url?: string | null; // 30-second preview MP3 URL
  popularity?: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  external_urls: { spotify: string };
}

export interface SearchTrackInput {
  query: string;
  limit?: number;
}

export interface RecommendInput {
  seedArtists?: string[];
  seedGenres?: string[];
  seedTracks?: string[];
  limit?: number;
}

export interface CreatePlaylistInput {
  name: string;
  description?: string;
  trackUris: string[];
  userId?: string;
  public?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface NLPPlaylistIntent {
  mood?: string;
  genre?: string;
  activity?: string;
  suggestedSeeds?: {
    genres?: string[];
    artists?: string[];
  };
}

// ============================================================================
// AGENTIC FEATURES - What makes Playlistify AI "feel human"
// ============================================================================

/**
 * Proactive suggestion from the agent
 * Generated when the agent detects a good time to suggest music
 */
export interface ProactiveSuggestion {
  id: string;
  type: 'habitual' | 'context' | 'evolution';
  title: string;
  description: string;
  suggestedPrompt: string;
  confidence: number;
  reason: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Playlist with agent memory tracking
 */
export interface AgenticPlaylist {
  playlist: SpotifyPlaylist;
  tracks: SpotifyTrack[];
  memoryId: string; // Links to agent memory entry
  explanation: string;
  modifications: Array<{ label: string; action: string; icon: string }>;
  createdAt: number;
  canEvolve: boolean;
}

/**
 * Feedback action from the user
 */
export interface FeedbackAction {
  playlistMemoryId: string;
  trackUri?: string;
  action: 'like' | 'skip' | 'love' | 'dislike';
  timestamp: number;
}

/**
 * Evolution request for playlist refresh
 */
export interface PlaylistEvolutionRequest {
  playlistId: string;
  memoryId: string;
  evolutionType: 'refresh' | 'adapt' | 'evolve';
  keepLikedTracks: boolean;
  removeSkippedTracks: boolean;
  adjustEnergy?: 'more' | 'less';
  adjustVocals?: 'more' | 'less';
}

/**
 * API response with explanation
 */
export interface ExplainedResponse<T> {
  data: T;
  explanation: string;
  reasoning?: string;
  suggestions?: string[];
  memoryUpdated: boolean;
}
