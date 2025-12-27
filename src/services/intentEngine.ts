/**
 * Intent Engine - Advanced natural language understanding for Playlistify AI
 * 
 * This module goes beyond simple keyword matching to understand:
 * - Emotional intent ("music for quiet confidence")
 * - Contextual needs ("2am debugging session")
 * - Implicit requirements ("survive a presentation")
 * 
 * The goal is to extract structured parameters that reflect what the user FEELS,
 * not just what genre they named.
 */

import { NLPPlaylistIntent } from '../types.js';
import { TimeOfDay, EnergyLevel, AudioCharacteristics } from './agentMemory.js';

// ============================================================================
// TYPES - Rich intent representation
// ============================================================================

export interface EnhancedPlaylistIntent extends NLPPlaylistIntent {
  // Core emotional understanding
  emotionalState: {
    primary: string;
    secondary?: string;
    intensity: 'subtle' | 'moderate' | 'strong';
  };

  // Derived audio parameters
  audioParams: {
    targetEnergy: EnergyLevel;
    targetBpmRange: { min: number; max: number };
    vocalPreference: AudioCharacteristics['vocalIntensity'];
    instrumentalBias: number; // 0-1, higher = prefer instrumental
  };

  // Context understanding
  context: {
    activity?: string;
    timeContext?: 'morning' | 'day' | 'evening' | 'night' | 'late-night';
    duration?: 'short' | 'medium' | 'long'; // Session length hint
    social?: 'solo' | 'focus' | 'background' | 'social';
  };

  // Explanation of understanding
  reasoning: string;

  // Confidence in interpretation
  confidence: number; // 0-1
}

// ============================================================================
// EMOTIONAL VOCABULARY - What users really mean
// ============================================================================

/**
 * Emotional concepts and their musical translations
 * These go beyond genres to capture feelings
 */
const EMOTIONAL_CONCEPTS: Record<string, {
  energy: EnergyLevel;
  genres: string[];
  moods: string[];
  bpmRange: { min: number; max: number };
  vocalPref: AudioCharacteristics['vocalIntensity'];
}> = {
  // Calm states
  'peace': { energy: 'low', genres: ['ambient', 'classical', 'new-age'], moods: ['peaceful', 'serene'], bpmRange: { min: 60, max: 90 }, vocalPref: 'instrumental' },
  'calm': { energy: 'low', genres: ['ambient', 'chill', 'acoustic'], moods: ['calm', 'relaxed'], bpmRange: { min: 60, max: 100 }, vocalPref: 'low-vocals' },
  'tranquil': { energy: 'very-low', genres: ['ambient', 'classical', 'nature'], moods: ['tranquil', 'zen'], bpmRange: { min: 50, max: 80 }, vocalPref: 'instrumental' },
  'relaxed': { energy: 'low', genres: ['chill', 'lo-fi', 'acoustic'], moods: ['relaxed', 'easy'], bpmRange: { min: 70, max: 100 }, vocalPref: 'low-vocals' },
  'mellow': { energy: 'low', genres: ['folk', 'indie', 'acoustic'], moods: ['mellow', 'gentle'], bpmRange: { min: 70, max: 100 }, vocalPref: 'medium-vocals' },

  // Focus states
  'focus': { energy: 'medium', genres: ['electronic', 'ambient', 'lo-fi'], moods: ['focused', 'clear'], bpmRange: { min: 100, max: 130 }, vocalPref: 'instrumental' },
  'concentration': { energy: 'medium', genres: ['classical', 'ambient', 'electronic'], moods: ['focused', 'sharp'], bpmRange: { min: 90, max: 120 }, vocalPref: 'instrumental' },
  'productive': { energy: 'medium', genres: ['electronic', 'lo-fi', 'ambient'], moods: ['productive', 'driven'], bpmRange: { min: 100, max: 130 }, vocalPref: 'low-vocals' },
  'flow': { energy: 'medium', genres: ['electronic', 'lo-fi', 'post-rock'], moods: ['flow', 'immersed'], bpmRange: { min: 110, max: 140 }, vocalPref: 'instrumental' },

  // Confidence states
  'confident': { energy: 'high', genres: ['hip-hop', 'rock', 'electronic'], moods: ['confident', 'bold'], bpmRange: { min: 110, max: 140 }, vocalPref: 'medium-vocals' },
  'powerful': { energy: 'high', genres: ['rock', 'electronic', 'orchestral'], moods: ['powerful', 'strong'], bpmRange: { min: 120, max: 150 }, vocalPref: 'medium-vocals' },
  'empowered': { energy: 'high', genres: ['pop', 'hip-hop', 'rock'], moods: ['empowered', 'uplifted'], bpmRange: { min: 110, max: 140 }, vocalPref: 'vocal-heavy' },
  'bold': { energy: 'high', genres: ['rock', 'hip-hop', 'electronic'], moods: ['bold', 'fearless'], bpmRange: { min: 120, max: 150 }, vocalPref: 'medium-vocals' },

  // High energy states
  'energetic': { energy: 'very-high', genres: ['electronic', 'dance', 'rock'], moods: ['energetic', 'alive'], bpmRange: { min: 125, max: 160 }, vocalPref: 'medium-vocals' },
  'pumped': { energy: 'very-high', genres: ['electronic', 'hip-hop', 'rock'], moods: ['pumped', 'fired-up'], bpmRange: { min: 130, max: 170 }, vocalPref: 'vocal-heavy' },
  'hyped': { energy: 'very-high', genres: ['electronic', 'hip-hop', 'dance'], moods: ['hyped', 'excited'], bpmRange: { min: 128, max: 160 }, vocalPref: 'vocal-heavy' },
  'intense': { energy: 'very-high', genres: ['metal', 'electronic', 'rock'], moods: ['intense', 'driven'], bpmRange: { min: 140, max: 180 }, vocalPref: 'medium-vocals' },

  // Happy states
  'happy': { energy: 'high', genres: ['pop', 'dance', 'indie'], moods: ['happy', 'joyful'], bpmRange: { min: 115, max: 135 }, vocalPref: 'vocal-heavy' },
  'joyful': { energy: 'high', genres: ['pop', 'funk', 'soul'], moods: ['joyful', 'upbeat'], bpmRange: { min: 110, max: 140 }, vocalPref: 'vocal-heavy' },
  'uplifting': { energy: 'high', genres: ['pop', 'electronic', 'dance'], moods: ['uplifting', 'positive'], bpmRange: { min: 118, max: 135 }, vocalPref: 'vocal-heavy' },
  'cheerful': { energy: 'medium', genres: ['pop', 'indie', 'folk'], moods: ['cheerful', 'bright'], bpmRange: { min: 105, max: 130 }, vocalPref: 'vocal-heavy' },

  // Sad/melancholic states
  'sad': { energy: 'low', genres: ['indie', 'acoustic', 'singer-songwriter'], moods: ['sad', 'melancholic'], bpmRange: { min: 60, max: 90 }, vocalPref: 'vocal-heavy' },
  'melancholic': { energy: 'low', genres: ['indie', 'classical', 'ambient'], moods: ['melancholic', 'wistful'], bpmRange: { min: 60, max: 95 }, vocalPref: 'medium-vocals' },
  'nostalgic': { energy: 'medium', genres: ['indie', 'synthwave', 'pop'], moods: ['nostalgic', 'reminiscent'], bpmRange: { min: 90, max: 120 }, vocalPref: 'medium-vocals' },
  'reflective': { energy: 'low', genres: ['ambient', 'acoustic', 'piano'], moods: ['reflective', 'thoughtful'], bpmRange: { min: 70, max: 100 }, vocalPref: 'low-vocals' },

  // Romantic states
  'romantic': { energy: 'medium', genres: ['r-n-b', 'soul', 'jazz'], moods: ['romantic', 'intimate'], bpmRange: { min: 70, max: 110 }, vocalPref: 'vocal-heavy' },
  'sensual': { energy: 'low', genres: ['r-n-b', 'soul', 'jazz'], moods: ['sensual', 'smooth'], bpmRange: { min: 60, max: 100 }, vocalPref: 'vocal-heavy' },
  'intimate': { energy: 'low', genres: ['acoustic', 'jazz', 'soul'], moods: ['intimate', 'close'], bpmRange: { min: 60, max: 95 }, vocalPref: 'vocal-heavy' },

  // Chill/Lo-fi states
  'chill': { energy: 'low', genres: ['lo-fi', 'chill', 'ambient'], moods: ['chill', 'laid-back'], bpmRange: { min: 70, max: 100 }, vocalPref: 'low-vocals' },
  'lofi': { energy: 'low', genres: ['lo-fi', 'hip-hop', 'jazz'], moods: ['chill', 'cozy'], bpmRange: { min: 70, max: 95 }, vocalPref: 'low-vocals' },
  'cozy': { energy: 'low', genres: ['acoustic', 'folk', 'indie'], moods: ['cozy', 'warm'], bpmRange: { min: 70, max: 100 }, vocalPref: 'medium-vocals' },
  'dreamy': { energy: 'low', genres: ['dream-pop', 'ambient', 'shoegaze'], moods: ['dreamy', 'ethereal'], bpmRange: { min: 80, max: 115 }, vocalPref: 'medium-vocals' },
};

/**
 * Activity to audio parameter mappings
 */
const ACTIVITY_AUDIO_PARAMS: Record<string, {
  energy: EnergyLevel;
  genres: string[];
  bpmRange: { min: number; max: number };
  vocalPref: AudioCharacteristics['vocalIntensity'];
  social: EnhancedPlaylistIntent['context']['social'];
}> = {
  // Work/Study
  'coding': { energy: 'medium', genres: ['electronic', 'lo-fi', 'ambient'], bpmRange: { min: 100, max: 130 }, vocalPref: 'instrumental', social: 'focus' },
  'studying': { energy: 'low', genres: ['classical', 'lo-fi', 'ambient'], bpmRange: { min: 70, max: 100 }, vocalPref: 'instrumental', social: 'focus' },
  'working': { energy: 'medium', genres: ['electronic', 'lo-fi', 'indie'], bpmRange: { min: 90, max: 120 }, vocalPref: 'low-vocals', social: 'focus' },
  'debugging': { energy: 'medium', genres: ['electronic', 'lo-fi', 'post-rock'], bpmRange: { min: 100, max: 125 }, vocalPref: 'instrumental', social: 'focus' },
  'writing': { energy: 'low', genres: ['classical', 'ambient', 'piano'], bpmRange: { min: 60, max: 90 }, vocalPref: 'instrumental', social: 'focus' },
  'reading': { energy: 'very-low', genres: ['classical', 'ambient', 'jazz'], bpmRange: { min: 50, max: 80 }, vocalPref: 'instrumental', social: 'solo' },

  // Physical
  'workout': { energy: 'very-high', genres: ['electronic', 'hip-hop', 'rock'], bpmRange: { min: 130, max: 170 }, vocalPref: 'vocal-heavy', social: 'solo' },
  'gym': { energy: 'very-high', genres: ['electronic', 'hip-hop', 'metal'], bpmRange: { min: 130, max: 175 }, vocalPref: 'medium-vocals', social: 'solo' },
  'running': { energy: 'very-high', genres: ['electronic', 'pop', 'hip-hop'], bpmRange: { min: 140, max: 180 }, vocalPref: 'medium-vocals', social: 'solo' },
  'yoga': { energy: 'very-low', genres: ['ambient', 'new-age', 'world'], bpmRange: { min: 50, max: 80 }, vocalPref: 'instrumental', social: 'solo' },
  'stretching': { energy: 'low', genres: ['ambient', 'chill', 'acoustic'], bpmRange: { min: 60, max: 90 }, vocalPref: 'instrumental', social: 'solo' },

  // Relaxation
  'sleeping': { energy: 'very-low', genres: ['ambient', 'classical', 'nature'], bpmRange: { min: 40, max: 70 }, vocalPref: 'instrumental', social: 'solo' },
  'meditating': { energy: 'very-low', genres: ['ambient', 'new-age', 'nature'], bpmRange: { min: 40, max: 70 }, vocalPref: 'instrumental', social: 'solo' },
  'relaxing': { energy: 'low', genres: ['chill', 'lo-fi', 'ambient'], bpmRange: { min: 60, max: 95 }, vocalPref: 'low-vocals', social: 'solo' },

  // Social
  'party': { energy: 'very-high', genres: ['dance', 'hip-hop', 'pop'], bpmRange: { min: 120, max: 140 }, vocalPref: 'vocal-heavy', social: 'social' },
  'dancing': { energy: 'very-high', genres: ['dance', 'electronic', 'pop'], bpmRange: { min: 118, max: 135 }, vocalPref: 'vocal-heavy', social: 'social' },
  'dinner': { energy: 'low', genres: ['jazz', 'acoustic', 'soul'], bpmRange: { min: 70, max: 110 }, vocalPref: 'medium-vocals', social: 'background' },
  'cooking': { energy: 'medium', genres: ['jazz', 'funk', 'soul'], bpmRange: { min: 90, max: 120 }, vocalPref: 'vocal-heavy', social: 'background' },

  // Travel
  'driving': { energy: 'high', genres: ['rock', 'pop', 'indie'], bpmRange: { min: 100, max: 130 }, vocalPref: 'vocal-heavy', social: 'solo' },
  'roadtrip': { energy: 'high', genres: ['rock', 'indie', 'country'], bpmRange: { min: 100, max: 130 }, vocalPref: 'vocal-heavy', social: 'social' },
  'commuting': { energy: 'medium', genres: ['pop', 'indie', 'electronic'], bpmRange: { min: 100, max: 125 }, vocalPref: 'medium-vocals', social: 'solo' },
  'flying': { energy: 'low', genres: ['ambient', 'electronic', 'chill'], bpmRange: { min: 80, max: 110 }, vocalPref: 'low-vocals', social: 'solo' },
};

/**
 * Time-context patterns in user input
 */
const TIME_PATTERNS: Array<{ pattern: RegExp; context: EnhancedPlaylistIntent['context']['timeContext'] }> = [
  { pattern: /\b(morning|sunrise|dawn|6am|7am|8am|wake\s*up|breakfast)\b/i, context: 'morning' },
  { pattern: /\b(afternoon|lunch|midday|noon|day|daytime)\b/i, context: 'day' },
  { pattern: /\b(evening|sunset|dusk|dinner|5pm|6pm|7pm)\b/i, context: 'evening' },
  { pattern: /\b(night|nighttime|9pm|10pm|11pm|bedtime)\b/i, context: 'night' },
  { pattern: /\b(late\s*night|midnight|2am|3am|4am|1am|after\s*hours|insomnia)\b/i, context: 'late-night' },
];

/**
 * Intent modifiers that adjust the output
 */
const INTENSITY_MODIFIERS: Record<string, number> = {
  'very': 1.3,
  'super': 1.4,
  'extremely': 1.5,
  'really': 1.2,
  'so': 1.15,
  'kinda': 0.7,
  'slightly': 0.6,
  'somewhat': 0.7,
  'a bit': 0.75,
  'gentle': 0.6,
  'subtle': 0.5,
};

// ============================================================================
// MAIN INTENT PARSING FUNCTION
// ============================================================================

/**
 * Parse natural language into rich, structured intent
 * This is where the "magic" happens
 */
export function parseEnhancedIntent(
  rawPrompt: string,
  userContext?: {
    timeOfDay?: TimeOfDay;
    previousMood?: string;
    preferredGenres?: string[];
  }
): EnhancedPlaylistIntent {
  const prompt = rawPrompt.toLowerCase().trim();

  // Initialize result
  const result: EnhancedPlaylistIntent = {
    emotionalState: {
      primary: 'neutral',
      intensity: 'moderate',
    },
    audioParams: {
      targetEnergy: 'medium',
      targetBpmRange: { min: 90, max: 130 },
      vocalPreference: 'medium-vocals',
      instrumentalBias: 0.3,
    },
    context: {},
    reasoning: '',
    confidence: 0.5,
    suggestedSeeds: { genres: [] },
  };

  const reasoningParts: string[] = [];

  // ==========================================================================
  // Step 1: Detect emotional concepts
  // ==========================================================================
  let emotionMatch: { key: string; config: typeof EMOTIONAL_CONCEPTS[string] } | null = null;
  let emotionScore = 0;

  for (const [emotion, config] of Object.entries(EMOTIONAL_CONCEPTS)) {
    // Check for direct match
    if (prompt.includes(emotion)) {
      const newScore = emotion.length; // Longer matches are more specific
      if (newScore > emotionScore) {
        emotionMatch = { key: emotion, config };
        emotionScore = newScore;
      }
    }

    // Check for related moods
    for (const mood of config.moods) {
      if (prompt.includes(mood) && mood.length > emotionScore) {
        emotionMatch = { key: emotion, config };
        emotionScore = mood.length;
      }
    }
  }

  if (emotionMatch) {
    result.emotionalState.primary = emotionMatch.key;
    result.audioParams.targetEnergy = emotionMatch.config.energy;
    result.audioParams.targetBpmRange = emotionMatch.config.bpmRange;
    result.audioParams.vocalPreference = emotionMatch.config.vocalPref;
    result.suggestedSeeds!.genres = [...emotionMatch.config.genres];
    result.mood = emotionMatch.key;
    result.confidence += 0.2;
    reasoningParts.push(`I detected a "${emotionMatch.key}" emotional intent`);
  }

  // ==========================================================================
  // Step 2: Detect activity context
  // ==========================================================================
  let activityMatch: { key: string; config: typeof ACTIVITY_AUDIO_PARAMS[string] } | null = null;

  for (const [activity, config] of Object.entries(ACTIVITY_AUDIO_PARAMS)) {
    if (prompt.includes(activity)) {
      activityMatch = { key: activity, config };
      break;
    }
  }

  if (activityMatch) {
    result.activity = activityMatch.key;
    result.context.activity = activityMatch.key;
    result.context.social = activityMatch.config.social;

    // Blend with emotion if both present
    if (emotionMatch) {
      // Activity often takes precedence for BPM and energy
      result.audioParams.targetEnergy = activityMatch.config.energy;
      result.audioParams.targetBpmRange = activityMatch.config.bpmRange;
      // Merge genres
      result.suggestedSeeds!.genres = [...new Set([
        ...result.suggestedSeeds!.genres!,
        ...activityMatch.config.genres,
      ])].slice(0, 5);
    } else {
      result.audioParams.targetEnergy = activityMatch.config.energy;
      result.audioParams.targetBpmRange = activityMatch.config.bpmRange;
      result.audioParams.vocalPreference = activityMatch.config.vocalPref;
      result.suggestedSeeds!.genres = [...activityMatch.config.genres];
    }

    result.confidence += 0.15;
    reasoningParts.push(`for "${activityMatch.key}"`);
  }

  // ==========================================================================
  // Step 3: Detect time context
  // ==========================================================================
  for (const { pattern, context } of TIME_PATTERNS) {
    if (pattern.test(prompt)) {
      result.context.timeContext = context;
      result.confidence += 0.1;
      reasoningParts.push(`at ${context}`);

      // Adjust audio params based on time if no strong emotion/activity
      if (!emotionMatch && !activityMatch) {
        switch (context) {
          case 'morning':
            result.audioParams.targetEnergy = 'medium';
            result.audioParams.targetBpmRange = { min: 90, max: 120 };
            result.suggestedSeeds!.genres = ['acoustic', 'indie', 'folk'];
            break;
          case 'late-night':
            result.audioParams.targetEnergy = 'low';
            result.audioParams.targetBpmRange = { min: 70, max: 100 };
            result.suggestedSeeds!.genres = ['lo-fi', 'ambient', 'electronic'];
            result.audioParams.vocalPreference = 'low-vocals';
            break;
        }
      }
      break;
    }
  }

  // Use user context if no time detected in prompt
  if (!result.context.timeContext && userContext?.timeOfDay) {
    const timeMap: Record<TimeOfDay, EnhancedPlaylistIntent['context']['timeContext']> = {
      'early-morning': 'morning',
      'morning': 'morning',
      'afternoon': 'day',
      'evening': 'evening',
      'night': 'night',
      'late-night': 'late-night',
    };
    result.context.timeContext = timeMap[userContext.timeOfDay];
  }

  // ==========================================================================
  // Step 4: Detect intensity modifiers
  // ==========================================================================
  let intensityMultiplier = 1;
  for (const [modifier, multiplier] of Object.entries(INTENSITY_MODIFIERS)) {
    if (prompt.includes(modifier)) {
      intensityMultiplier = multiplier;
      result.emotionalState.intensity = multiplier > 1 ? 'strong' : 'subtle';
      break;
    }
  }

  // Apply intensity to BPM range
  if (intensityMultiplier !== 1) {
    const midBpm = (result.audioParams.targetBpmRange.min + result.audioParams.targetBpmRange.max) / 2;
    const range = result.audioParams.targetBpmRange.max - result.audioParams.targetBpmRange.min;

    if (intensityMultiplier > 1) {
      // Higher intensity = higher BPM
      result.audioParams.targetBpmRange = {
        min: Math.round(midBpm),
        max: Math.round(midBpm + range * intensityMultiplier),
      };
    } else {
      // Lower intensity = lower BPM
      result.audioParams.targetBpmRange = {
        min: Math.round(midBpm - range * (1 - intensityMultiplier)),
        max: Math.round(midBpm),
      };
    }
  }

  // ==========================================================================
  // Step 5: Detect explicit genre mentions
  // ==========================================================================
  const genrePatterns = [
    'rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop', 'hip hop',
    'country', 'metal', 'indie', 'folk', 'r&b', 'rnb', 'soul', 'blues',
    'edm', 'house', 'techno', 'ambient', 'lo-fi', 'lofi', 'chill',
    'acoustic', 'punk', 'alternative', 'dance', 'disco', 'funk', 'reggae',
    'latin', 'bollywood', 'kpop', 'k-pop', 'jpop', 'j-pop', 'anime',
  ];

  const detectedGenres: string[] = [];
  for (const genre of genrePatterns) {
    if (prompt.includes(genre.replace('-', ' ')) || prompt.includes(genre)) {
      detectedGenres.push(genre.replace(' ', '-'));
    }
  }

  if (detectedGenres.length > 0) {
    result.genre = detectedGenres.join(', ');
    result.suggestedSeeds!.genres = [...new Set([
      ...detectedGenres,
      ...result.suggestedSeeds!.genres!,
    ])].slice(0, 5);
    result.confidence += 0.15;
    reasoningParts.push(`with ${detectedGenres.join(', ')} style`);
  }

  // ==========================================================================
  // Step 6: Detect special qualifiers
  // ==========================================================================

  // Instrumental preference
  if (/\b(instrumental|no vocals|no lyrics|without words|no singing)\b/i.test(prompt)) {
    result.audioParams.vocalPreference = 'instrumental';
    result.audioParams.instrumentalBias = 0.9;
    reasoningParts.push('keeping it instrumental');
  } else if (/\b(vocals|lyrics|singing|with words)\b/i.test(prompt)) {
    result.audioParams.vocalPreference = 'vocal-heavy';
    result.audioParams.instrumentalBias = 0.1;
  }

  // Energy overrides
  if (/\b(calm|quiet|soft|gentle|peaceful)\b/i.test(prompt) && !activityMatch) {
    result.audioParams.targetEnergy = 'low';
    result.audioParams.targetBpmRange = { min: 60, max: 95 };
  } else if (/\b(energetic|upbeat|fast|intense|powerful)\b/i.test(prompt) && !activityMatch) {
    result.audioParams.targetEnergy = 'high';
    result.audioParams.targetBpmRange = { min: 115, max: 145 };
  }

  // ==========================================================================
  // Step 7: Apply user context (personalization)
  // ==========================================================================
  if (userContext?.preferredGenres && result.suggestedSeeds!.genres!.length < 3) {
    // Fill in with user preferences if we don't have enough signals
    const extraGenres = userContext.preferredGenres
      .filter(g => !result.suggestedSeeds!.genres!.includes(g))
      .slice(0, 3 - result.suggestedSeeds!.genres!.length);
    result.suggestedSeeds!.genres = [...result.suggestedSeeds!.genres!, ...extraGenres];
  }

  // ==========================================================================
  // Step 8: Build final reasoning
  // ==========================================================================
  if (reasoningParts.length > 0) {
    result.reasoning = reasoningParts.join(' ');
  } else {
    result.reasoning = 'I created a balanced playlist based on your description';
    // Fallback genres if none detected
    if (result.suggestedSeeds!.genres!.length === 0) {
      result.suggestedSeeds!.genres = ['pop', 'indie', 'electronic'];
    }
  }

  // Ensure we have at least some genres
  if (result.suggestedSeeds!.genres!.length === 0) {
    result.suggestedSeeds!.genres = ['pop', 'indie', 'rock'];
  }

  // Cap confidence
  result.confidence = Math.min(0.95, result.confidence);

  console.log('[IntentEngine] Parsed intent:', {
    prompt: rawPrompt,
    emotion: result.emotionalState.primary,
    energy: result.audioParams.targetEnergy,
    genres: result.suggestedSeeds!.genres,
    confidence: result.confidence,
  });

  return result;
}

/**
 * Generate human-readable explanation for why tracks were chosen
 * This is critical for the "explainability" requirement
 */
export function generateExplanation(
  intent: EnhancedPlaylistIntent,
  userContext?: {
    timeOfDay?: TimeOfDay;
    listeningHistory?: string;
    preferenceNote?: string;
  }
): string {
  const parts: string[] = [];

  // Start with emotional understanding
  if (intent.emotionalState.primary !== 'neutral') {
    parts.push(`I picked tracks that match your "${intent.emotionalState.primary}" mood`);
  }

  // Add activity context
  if (intent.context.activity) {
    parts.push(`perfect for ${intent.context.activity}`);
  }

  // Add time context
  if (intent.context.timeContext) {
    const timeDescriptions: Record<string, string> = {
      'morning': 'with a fresh morning energy',
      'day': 'with a steady daytime vibe',
      'evening': 'to wind down your evening',
      'night': 'for a relaxed night atmosphere',
      'late-night': 'with that late-night calm',
    };
    if (timeDescriptions[intent.context.timeContext]) {
      parts.push(timeDescriptions[intent.context.timeContext]);
    }
  }

  // Add audio characteristic insights
  const energyDescriptions: Record<EnergyLevel, string> = {
    'very-low': 'I kept the energy very low and soothing',
    'low': 'I chose calmer, more relaxed tracks',
    'medium': 'I balanced the energy for sustained focus',
    'high': 'I added high-energy tracks to keep you motivated',
    'very-high': 'I maxed out the energy with powerful, driving beats',
  };
  parts.push(energyDescriptions[intent.audioParams.targetEnergy]);

  // Add vocal preference insight
  if (intent.audioParams.vocalPreference === 'instrumental') {
    parts.push('keeping vocals minimal so you can focus');
  } else if (intent.audioParams.vocalPreference === 'vocal-heavy') {
    parts.push('with strong vocals to sing along to');
  }

  // Add user history insight if available
  if (userContext?.preferenceNote) {
    parts.push(userContext.preferenceNote);
  }

  // Construct final explanation
  let explanation = parts.slice(0, 3).join(' — ');

  // Add period if not already there
  if (!explanation.endsWith('.')) {
    explanation += '.';
  }

  return explanation;
}

/**
 * Suggest quick modifications based on current playlist
 */
export function suggestModifications(intent: EnhancedPlaylistIntent): Array<{
  label: string;
  action: string;
  icon: string;
}> {
  const suggestions: Array<{ label: string; action: string; icon: string }> = [];

  // Energy modifications
  if (intent.audioParams.targetEnergy === 'high' || intent.audioParams.targetEnergy === 'very-high') {
    suggestions.push({ label: 'More chill', action: 'less energy', icon: '🌙' });
  } else if (intent.audioParams.targetEnergy === 'low' || intent.audioParams.targetEnergy === 'very-low') {
    suggestions.push({ label: 'More energy', action: 'more energy', icon: '⚡' });
  }

  // Vocal modifications
  if (intent.audioParams.vocalPreference !== 'instrumental') {
    suggestions.push({ label: 'Less vocals', action: 'more instrumental', icon: '🎹' });
  } else {
    suggestions.push({ label: 'More vocals', action: 'add vocals', icon: '🎤' });
  }

  // Generic useful modifications
  suggestions.push({ label: 'Discover new', action: 'hidden gems', icon: '✨' });
  suggestions.push({ label: 'Same vibe', action: 'refresh tracks', icon: '🔄' });

  return suggestions.slice(0, 4);
}

export default {
  parseEnhancedIntent,
  generateExplanation,
  suggestModifications,
};
