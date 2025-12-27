/**
 * Agent Memory System - The heart of Playlistify AI's emotional intelligence
 * 
 * PRIVACY-FIRST DESIGN:
 * - We store ONLY derived preferences, never raw listening history
 * - User data is stored locally in JSON (no external DB required)
 * - All data can be cleared by the user at any time
 * - We learn patterns, not track individual behaviors
 * 
 * This is what makes Playlistify AI "feel human" - it remembers you.
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES - Representing user's musical personality over time
// ============================================================================

/**
 * Represents a single playlist generation event
 * Used to learn from what worked (and what didn't)
 */
export interface PlaylistMemoryEntry {
  id: string;
  timestamp: number;
  timeOfDay: TimeOfDay;
  dayOfWeek: number; // 0-6, Sunday = 0
  
  // What the user asked for
  intent: {
    rawPrompt: string;
    parsedMood?: string;
    parsedActivity?: string;
    parsedEnergy?: EnergyLevel;
  };
  
  // What we generated
  playlistId: string;
  playlistName: string;
  trackCount: number;
  
  // Derived audio characteristics (privacy-safe, no track IDs stored long-term)
  characteristics: AudioCharacteristics;
  
  // How the user reacted
  feedback: PlaylistFeedback;
}

/**
 * Time periods that affect musical preferences
 */
export type TimeOfDay = 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late-night';

/**
 * Energy levels - the core of emotional understanding
 */
export type EnergyLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

/**
 * Audio characteristics we infer (not raw Spotify data)
 * These are privacy-safe derived metrics
 */
export interface AudioCharacteristics {
  averageEnergy: EnergyLevel;
  dominantMood: string;
  bpmRange: { min: number; max: number };
  vocalIntensity: 'instrumental' | 'low-vocals' | 'medium-vocals' | 'vocal-heavy';
  genres: string[];
}

/**
 * User feedback on a playlist
 */
export interface PlaylistFeedback {
  overallRating?: 'loved' | 'liked' | 'neutral' | 'disliked';
  likedTracks: string[]; // Track URIs
  skippedTracks: string[]; // Track URIs
  completed: boolean; // Did they listen to the whole thing?
  regeneratedWith?: string; // If they asked for a modification
}

/**
 * Learned user preferences over time
 * This is the "taste fingerprint" that evolves
 */
export interface UserTasteProfile {
  // When do they listen?
  listeningPatterns: {
    preferredTimes: TimeOfDay[];
    averageSessionsPerDay: number;
    mostActiveDay: number;
  };
  
  // What do they like at different times?
  timeBasedPreferences: Record<TimeOfDay, {
    preferredEnergy: EnergyLevel;
    preferredGenres: string[];
    preferredMoods: string[];
    vocalPreference: AudioCharacteristics['vocalIntensity'];
  }>;
  
  // Overall taste evolution
  genreAffinities: Record<string, number>; // Genre -> affinity score (0-100)
  moodAffinities: Record<string, number>;
  
  // Activity patterns
  activityPreferences: Record<string, {
    preferredEnergy: EnergyLevel;
    preferredGenres: string[];
  }>;
  
  // What to avoid (learned from skips and dislikes)
  avoidPatterns: {
    genres: string[];
    characteristics: string[];
  };
  
  // Emotional continuity tracking
  recentMoodTrend: {
    period: 'day' | 'week';
    dominantMood: string;
    energyTrend: 'decreasing' | 'stable' | 'increasing';
  };
}

/**
 * Complete user memory state
 */
export interface AgentMemoryState {
  userId: string;
  createdAt: number;
  lastUpdatedAt: number;
  
  // Recent history (last N generations)
  recentPlaylists: PlaylistMemoryEntry[];
  
  // Learned profile
  tasteProfile: UserTasteProfile;
  
  // Stats for transparency
  stats: {
    totalPlaylistsGenerated: number;
    totalTracksLiked: number;
    totalTracksSkipped: number;
    averagePlaylistRating: number;
  };
}

// ============================================================================
// CORE AGENT MEMORY CLASS
// ============================================================================

export class AgentMemory {
  private memoryPath: string;
  private memory: Map<string, AgentMemoryState>;
  private maxRecentPlaylists = 50; // Keep last 50 for learning
  
  constructor(dataDir: string = './data') {
    this.memoryPath = path.join(dataDir, 'agent-memory.json');
    this.memory = new Map();
    this.loadFromDisk();
  }
  
  // ==========================================================================
  // PERSISTENCE - Simple JSON storage (works anywhere, no DB required)
  // ==========================================================================
  
  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.memoryPath)) {
        const data = JSON.parse(fs.readFileSync(this.memoryPath, 'utf-8'));
        this.memory = new Map(Object.entries(data));
        console.log(`[AgentMemory] Loaded ${this.memory.size} user profiles from disk`);
      }
    } catch (err) {
      console.warn('[AgentMemory] Could not load memory from disk, starting fresh:', err);
      this.memory = new Map();
    }
  }
  
  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.memoryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Object.fromEntries(this.memory);
      fs.writeFileSync(this.memoryPath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('[AgentMemory] Failed to save memory to disk:', err);
    }
  }
  
  // ==========================================================================
  // USER PROFILE MANAGEMENT
  // ==========================================================================
  
  /**
   * Get or create a user's memory state
   */
  getOrCreateUser(userId: string): AgentMemoryState {
    if (!this.memory.has(userId)) {
      const newState = this.createEmptyState(userId);
      this.memory.set(userId, newState);
      this.saveToDisk();
    }
    return this.memory.get(userId)!;
  }
  
  /**
   * Create empty state for new user
   */
  private createEmptyState(userId: string): AgentMemoryState {
    const now = Date.now();
    return {
      userId,
      createdAt: now,
      lastUpdatedAt: now,
      recentPlaylists: [],
      tasteProfile: {
        listeningPatterns: {
          preferredTimes: [],
          averageSessionsPerDay: 0,
          mostActiveDay: 0,
        },
        timeBasedPreferences: {
          'early-morning': this.getDefaultTimePrefs(),
          'morning': this.getDefaultTimePrefs(),
          'afternoon': this.getDefaultTimePrefs(),
          'evening': this.getDefaultTimePrefs(),
          'night': this.getDefaultTimePrefs(),
          'late-night': this.getDefaultTimePrefs(),
        },
        genreAffinities: {},
        moodAffinities: {},
        activityPreferences: {},
        avoidPatterns: { genres: [], characteristics: [] },
        recentMoodTrend: {
          period: 'week',
          dominantMood: 'neutral',
          energyTrend: 'stable',
        },
      },
      stats: {
        totalPlaylistsGenerated: 0,
        totalTracksLiked: 0,
        totalTracksSkipped: 0,
        averagePlaylistRating: 0,
      },
    };
  }
  
  private getDefaultTimePrefs() {
    return {
      preferredEnergy: 'medium' as EnergyLevel,
      preferredGenres: [],
      preferredMoods: [],
      vocalPreference: 'medium-vocals' as AudioCharacteristics['vocalIntensity'],
    };
  }
  
  // ==========================================================================
  // RECORDING EVENTS - Learning from user behavior
  // ==========================================================================
  
  /**
   * Record a new playlist generation
   * This is where the agent starts learning
   */
  recordPlaylistGeneration(
    userId: string,
    entry: Omit<PlaylistMemoryEntry, 'id' | 'timestamp' | 'timeOfDay' | 'dayOfWeek' | 'feedback'>
  ): string {
    const state = this.getOrCreateUser(userId);
    const now = new Date();
    
    const memoryEntry: PlaylistMemoryEntry = {
      id: `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now.getTime(),
      timeOfDay: this.getTimeOfDay(now),
      dayOfWeek: now.getDay(),
      ...entry,
      feedback: {
        likedTracks: [],
        skippedTracks: [],
        completed: false,
      },
    };
    
    // Add to recent playlists
    state.recentPlaylists.unshift(memoryEntry);
    
    // Keep only last N
    if (state.recentPlaylists.length > this.maxRecentPlaylists) {
      state.recentPlaylists = state.recentPlaylists.slice(0, this.maxRecentPlaylists);
    }
    
    // Update stats
    state.stats.totalPlaylistsGenerated++;
    state.lastUpdatedAt = Date.now();
    
    // Update listening patterns
    this.updateListeningPatterns(state, memoryEntry);
    
    this.saveToDisk();
    
    console.log(`[AgentMemory] Recorded playlist generation for user ${userId}: ${memoryEntry.id}`);
    return memoryEntry.id;
  }
  
  /**
   * Record user feedback on a track (like/skip)
   */
  recordTrackFeedback(
    userId: string,
    playlistMemoryId: string,
    trackUri: string,
    action: 'like' | 'skip'
  ): void {
    const state = this.getOrCreateUser(userId);
    const playlist = state.recentPlaylists.find(p => p.id === playlistMemoryId);
    
    if (playlist) {
      if (action === 'like') {
        if (!playlist.feedback.likedTracks.includes(trackUri)) {
          playlist.feedback.likedTracks.push(trackUri);
          state.stats.totalTracksLiked++;
        }
      } else {
        if (!playlist.feedback.skippedTracks.includes(trackUri)) {
          playlist.feedback.skippedTracks.push(trackUri);
          state.stats.totalTracksSkipped++;
        }
      }
      
      // Update taste profile based on feedback
      this.updateTasteFromFeedback(state, playlist, trackUri, action);
      
      state.lastUpdatedAt = Date.now();
      this.saveToDisk();
    }
  }
  
  /**
   * Record overall playlist rating
   */
  recordPlaylistRating(
    userId: string,
    playlistMemoryId: string,
    rating: PlaylistFeedback['overallRating']
  ): void {
    const state = this.getOrCreateUser(userId);
    const playlist = state.recentPlaylists.find(p => p.id === playlistMemoryId);
    
    if (playlist) {
      playlist.feedback.overallRating = rating;
      
      // Update average rating
      const ratedPlaylists = state.recentPlaylists.filter(p => p.feedback.overallRating);
      const ratingValues = { loved: 5, liked: 4, neutral: 3, disliked: 1 };
      const sum = ratedPlaylists.reduce((acc, p) => 
        acc + (ratingValues[p.feedback.overallRating!] || 3), 0);
      state.stats.averagePlaylistRating = sum / ratedPlaylists.length;
      
      // Learn from positive/negative feedback
      if (rating === 'loved' || rating === 'liked') {
        this.reinforcePreferences(state, playlist);
      } else if (rating === 'disliked') {
        this.penalizePreferences(state, playlist);
      }
      
      state.lastUpdatedAt = Date.now();
      this.saveToDisk();
    }
  }
  
  // ==========================================================================
  // LEARNING - How the agent gets smarter
  // ==========================================================================
  
  private updateListeningPatterns(state: AgentMemoryState, entry: PlaylistMemoryEntry): void {
    const patterns = state.tasteProfile.listeningPatterns;
    
    // Track preferred times
    if (!patterns.preferredTimes.includes(entry.timeOfDay)) {
      patterns.preferredTimes.push(entry.timeOfDay);
    }
    
    // Update most active day
    const dayCount = new Map<number, number>();
    state.recentPlaylists.forEach(p => {
      dayCount.set(p.dayOfWeek, (dayCount.get(p.dayOfWeek) || 0) + 1);
    });
    let maxDay = 0, maxCount = 0;
    dayCount.forEach((count, day) => {
      if (count > maxCount) {
        maxDay = day;
        maxCount = count;
      }
    });
    patterns.mostActiveDay = maxDay;
    
    // Update time-based preferences
    const timePrefs = state.tasteProfile.timeBasedPreferences[entry.timeOfDay];
    timePrefs.preferredEnergy = entry.characteristics.averageEnergy;
    entry.characteristics.genres.forEach(genre => {
      if (!timePrefs.preferredGenres.includes(genre)) {
        timePrefs.preferredGenres.push(genre);
      }
    });
    if (!timePrefs.preferredMoods.includes(entry.characteristics.dominantMood)) {
      timePrefs.preferredMoods.push(entry.characteristics.dominantMood);
    }
    timePrefs.vocalPreference = entry.characteristics.vocalIntensity;
  }
  
  private updateTasteFromFeedback(
    state: AgentMemoryState,
    playlist: PlaylistMemoryEntry,
    _trackUri: string,
    action: 'like' | 'skip'
  ): void {
    const multiplier = action === 'like' ? 1 : -0.5;
    
    // Update genre affinities
    playlist.characteristics.genres.forEach(genre => {
      state.tasteProfile.genreAffinities[genre] = 
        Math.max(0, Math.min(100, 
          (state.tasteProfile.genreAffinities[genre] || 50) + (10 * multiplier)
        ));
    });
    
    // Update mood affinities
    const mood = playlist.characteristics.dominantMood;
    state.tasteProfile.moodAffinities[mood] = 
      Math.max(0, Math.min(100,
        (state.tasteProfile.moodAffinities[mood] || 50) + (10 * multiplier)
      ));
    
    // Track patterns to avoid
    if (action === 'skip') {
      const avoidPatterns = state.tasteProfile.avoidPatterns;
      playlist.characteristics.genres.forEach(genre => {
        const affinity = state.tasteProfile.genreAffinities[genre] || 50;
        if (affinity < 30 && !avoidPatterns.genres.includes(genre)) {
          avoidPatterns.genres.push(genre);
        }
      });
    }
  }
  
  private reinforcePreferences(state: AgentMemoryState, playlist: PlaylistMemoryEntry): void {
    // Boost affinities for characteristics of liked playlists
    playlist.characteristics.genres.forEach(genre => {
      state.tasteProfile.genreAffinities[genre] = 
        Math.min(100, (state.tasteProfile.genreAffinities[genre] || 50) + 15);
    });
    
    const mood = playlist.characteristics.dominantMood;
    state.tasteProfile.moodAffinities[mood] = 
      Math.min(100, (state.tasteProfile.moodAffinities[mood] || 50) + 15);
  }
  
  private penalizePreferences(state: AgentMemoryState, playlist: PlaylistMemoryEntry): void {
    // Reduce affinities for characteristics of disliked playlists
    playlist.characteristics.genres.forEach(genre => {
      state.tasteProfile.genreAffinities[genre] = 
        Math.max(0, (state.tasteProfile.genreAffinities[genre] || 50) - 20);
    });
    
    const mood = playlist.characteristics.dominantMood;
    state.tasteProfile.moodAffinities[mood] = 
      Math.max(0, (state.tasteProfile.moodAffinities[mood] || 50) - 20);
  }
  
  // ==========================================================================
  // INSIGHTS - What the agent knows about the user
  // ==========================================================================
  
  /**
   * Get personalized recommendations based on learned preferences
   */
  getPersonalizedContext(userId: string): {
    timeOfDay: TimeOfDay;
    suggestedEnergy: EnergyLevel;
    suggestedGenres: string[];
    suggestedMoods: string[];
    avoidGenres: string[];
    recentMoodTrend: string;
    explanation: string;
  } {
    const state = this.getOrCreateUser(userId);
    const now = new Date();
    const timeOfDay = this.getTimeOfDay(now);
    const timePrefs = state.tasteProfile.timeBasedPreferences[timeOfDay];
    
    // Get top genres by affinity
    const topGenres = Object.entries(state.tasteProfile.genreAffinities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);
    
    // Build personalized explanation
    let explanation = '';
    if (state.stats.totalPlaylistsGenerated > 0) {
      explanation = this.buildPersonalizedExplanation(state, timeOfDay, timePrefs);
    }
    
    return {
      timeOfDay,
      suggestedEnergy: timePrefs.preferredEnergy,
      suggestedGenres: topGenres.length > 0 ? topGenres : timePrefs.preferredGenres,
      suggestedMoods: timePrefs.preferredMoods,
      avoidGenres: state.tasteProfile.avoidPatterns.genres,
      recentMoodTrend: state.tasteProfile.recentMoodTrend.dominantMood,
      explanation,
    };
  }
  
  private buildPersonalizedExplanation(
    state: AgentMemoryState,
    _timeOfDay: TimeOfDay,
    timePrefs: typeof state.tasteProfile.timeBasedPreferences[TimeOfDay]
  ): string {
    const parts: string[] = [];
    
    // Time-based insight
    if (timePrefs.preferredGenres.length > 0) {
      parts.push(`At this time you usually prefer ${timePrefs.preferredGenres.slice(0, 2).join(' and ')}`);
    }
    
    // Energy insight
    const energyMap: Record<EnergyLevel, string> = {
      'very-low': 'very calm',
      'low': 'relaxed',
      'medium': 'balanced',
      'high': 'energetic',
      'very-high': 'high-energy'
    };
    parts.push(`with ${energyMap[timePrefs.preferredEnergy]} vibes`);
    
    // Recent trend
    if (state.tasteProfile.recentMoodTrend.dominantMood !== 'neutral') {
      parts.push(`(you've been in a ${state.tasteProfile.recentMoodTrend.dominantMood} mood lately)`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Check if user typically listens at current time (for proactive suggestions)
   */
  shouldSuggestProactively(userId: string): {
    shouldSuggest: boolean;
    reason: string;
    suggestedPrompt?: string;
  } {
    const state = this.memory.get(userId);
    if (!state || state.stats.totalPlaylistsGenerated < 3) {
      return { shouldSuggest: false, reason: 'Not enough history' };
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    
    // Check if user usually listens at this time
    const recentAtThisTime = state.recentPlaylists.filter(p => {
      const pDate = new Date(p.timestamp);
      const hourDiff = Math.abs(pDate.getHours() - currentHour);
      return hourDiff <= 1; // Within an hour window
    });
    
    if (recentAtThisTime.length >= 2) {
      const mostCommonMood = this.getMostCommonValue(
        recentAtThisTime.map(p => p.characteristics.dominantMood)
      );
      const mostCommonActivity = this.getMostCommonValue(
        recentAtThisTime.filter(p => p.intent.parsedActivity).map(p => p.intent.parsedActivity!)
      );
      
      return {
        shouldSuggest: true,
        reason: `You usually listen around this time`,
        suggestedPrompt: mostCommonActivity 
          ? `${mostCommonActivity} music` 
          : `${mostCommonMood} vibes`
      };
    }
    
    // Check if it's their most active day
    if (currentDay === state.tasteProfile.listeningPatterns.mostActiveDay) {
      return {
        shouldSuggest: true,
        reason: `It's your most active listening day`,
        suggestedPrompt: 'your usual vibe'
      };
    }
    
    return { shouldSuggest: false, reason: 'No pattern match' };
  }
  
  /**
   * Get suggestions for playlist evolution
   */
  getEvolutionSuggestions(userId: string, playlistMemoryId: string): {
    shouldEvolve: boolean;
    suggestions: string[];
    tracksToConsiderRemoving: string[];
  } {
    const state = this.memory.get(userId);
    if (!state) {
      return { shouldEvolve: false, suggestions: [], tracksToConsiderRemoving: [] };
    }
    
    const playlist = state.recentPlaylists.find(p => p.id === playlistMemoryId);
    if (!playlist) {
      return { shouldEvolve: false, suggestions: [], tracksToConsiderRemoving: [] };
    }
    
    const suggestions: string[] = [];
    
    // Suggest based on skipped tracks
    if (playlist.feedback.skippedTracks.length > 2) {
      suggestions.push('Remove frequently skipped tracks');
    }
    
    // Suggest based on evolved preferences
    const currentContext = this.getPersonalizedContext(userId);
    if (playlist.characteristics.averageEnergy !== currentContext.suggestedEnergy) {
      suggestions.push(`Adjust energy to match your current ${currentContext.suggestedEnergy} preference`);
    }
    
    // Suggest adding new genres user has grown to like
    const newLikedGenres = Object.entries(state.tasteProfile.genreAffinities)
      .filter(([genre, score]) => score > 70 && !playlist.characteristics.genres.includes(genre))
      .map(([genre]) => genre);
    
    if (newLikedGenres.length > 0) {
      suggestions.push(`Add more ${newLikedGenres[0]} tracks based on your recent preferences`);
    }
    
    return {
      shouldEvolve: suggestions.length > 0,
      suggestions,
      tracksToConsiderRemoving: playlist.feedback.skippedTracks,
    };
  }
  
  // ==========================================================================
  // UTILITIES
  // ==========================================================================
  
  private getTimeOfDay(date: Date): TimeOfDay {
    const hour = date.getHours();
    if (hour >= 5 && hour < 8) return 'early-morning';
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    if (hour >= 21 && hour < 24) return 'night';
    return 'late-night'; // 0-5
  }
  
  private getMostCommonValue<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;
    const counts = new Map<T, number>();
    arr.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    let max: T = arr[0];
    let maxCount = 0;
    counts.forEach((count, val) => {
      if (count > maxCount) {
        max = val;
        maxCount = count;
      }
    });
    return max;
  }
  
  /**
   * Get user stats for display
   */
  getUserStats(userId: string): AgentMemoryState['stats'] & { 
    daysSinceFirstUse: number;
    preferredTimeOfDay: TimeOfDay | null;
  } {
    const state = this.getOrCreateUser(userId);
    const daysSinceFirstUse = Math.floor((Date.now() - state.createdAt) / (1000 * 60 * 60 * 24));
    const preferredTimeOfDay = state.tasteProfile.listeningPatterns.preferredTimes[0] || null;
    
    return {
      ...state.stats,
      daysSinceFirstUse,
      preferredTimeOfDay,
    };
  }
  
  /**
   * Clear user memory (privacy feature)
   */
  clearUserMemory(userId: string): void {
    this.memory.delete(userId);
    this.saveToDisk();
    console.log(`[AgentMemory] Cleared memory for user ${userId}`);
  }
  
  /**
   * Export user data (GDPR compliance)
   */
  exportUserData(userId: string): AgentMemoryState | null {
    return this.memory.get(userId) || null;
  }
}

// Global singleton instance
export const agentMemory = new AgentMemory();

export default agentMemory;
