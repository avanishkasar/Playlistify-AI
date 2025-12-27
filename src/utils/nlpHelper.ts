import { NLPPlaylistIntent } from './types.js';

/**
 * Optional NLP helper for interpreting natural language playlist requests
 * Can integrate with OpenAI, Gemini, or other LLM services
 * 
 * Example: "Create a mellow Sunday morning playlist" 
 * -> { mood: 'mellow', activity: 'morning', suggestedSeeds: { genres: ['acoustic', 'folk'] } }
 */

// Mood to genre mappings (English + Hindi + Tamil + Telugu)
const MOOD_GENRE_MAP: Record<string, string[]> = {
  // English
  happy: ['pop', 'dance', 'funk'],
  sad: ['blues', 'indie', 'acoustic'],
  energetic: ['electronic', 'rock', 'metal'],
  calm: ['ambient', 'classical', 'chill'],
  mellow: ['folk', 'acoustic', 'jazz'],
  romantic: ['r-n-b', 'soul', 'romance'],
  party: ['dance', 'edm', 'hip-hop'],
  focus: ['classical', 'ambient', 'study'],
  workout: ['rock', 'metal', 'electronic'],
  chill: ['chill', 'lo-fi', 'ambient'],
  relax: ['ambient', 'chill', 'acoustic'],
  study: ['classical', 'lo-fi', 'ambient'],
  // Hindi (खुश, उदास, etc.)
  'खुश': ['pop', 'dance', 'bollywood'],
  'खुशी': ['pop', 'dance', 'bollywood'],
  'उदास': ['blues', 'indie', 'acoustic'],
  'दुखी': ['blues', 'indie', 'acoustic'],
  'शांत': ['ambient', 'classical', 'chill'],
  'रोमांटिक': ['r-n-b', 'soul', 'bollywood'],
  'प्यार': ['r-n-b', 'soul', 'bollywood'],
  'पार्टी': ['dance', 'edm', 'bollywood'],
  'व्यायाम': ['rock', 'electronic', 'hip-hop'],
  'जिम': ['rock', 'electronic', 'hip-hop'],
  'पढ़ाई': ['classical', 'lo-fi', 'ambient'],
  'आराम': ['ambient', 'chill', 'acoustic'],
  'सोना': ['ambient', 'classical', 'sleep'],
  'ऊर्जा': ['electronic', 'rock', 'dance'],
  'मस्ती': ['dance', 'bollywood', 'pop'],
  // Tamil (மகிழ்ச்சி, etc.)
  'மகிழ்ச்சி': ['pop', 'dance', 'tamil'],
  'சோகம்': ['blues', 'indie', 'acoustic'],
  'அமைதி': ['ambient', 'classical', 'chill'],
  'காதல்': ['r-n-b', 'soul', 'tamil'],
  'கட்சி': ['dance', 'edm', 'tamil'],
  'உடற்பயிற்சி': ['rock', 'electronic', 'hip-hop'],
  'படிப்பு': ['classical', 'lo-fi', 'ambient'],
  'ஓய்வு': ['ambient', 'chill', 'acoustic'],
  'ஆற்றல்': ['electronic', 'rock', 'dance'],
  // Telugu (సంతోషం, etc.)
  'సంతోషం': ['pop', 'dance', 'telugu'],
  'బాధ': ['blues', 'indie', 'acoustic'],
  'ప్రశాంతం': ['ambient', 'classical', 'chill'],
  'ప్రేమ': ['r-n-b', 'soul', 'telugu'],
  'పార్టీ': ['dance', 'edm', 'telugu'],
  'వ్యాయామం': ['rock', 'electronic', 'hip-hop'],
  'చదువు': ['classical', 'lo-fi', 'ambient'],
  'విశ్రాంతి': ['ambient', 'chill', 'acoustic'],
  'శక్తి': ['electronic', 'rock', 'dance'],
};

const ACTIVITY_GENRE_MAP: Record<string, string[]> = {
  // English
  morning: ['acoustic', 'folk', 'indie'],
  night: ['electronic', 'ambient', 'chill'],
  workout: ['rock', 'electronic', 'metal'],
  study: ['classical', 'ambient', 'lo-fi'],
  party: ['dance', 'hip-hop', 'pop'],
  sleep: ['ambient', 'classical', 'chill'],
  driving: ['rock', 'pop', 'country'],
  coding: ['electronic', 'lo-fi', 'ambient'],
  cooking: ['jazz', 'pop', 'acoustic'],
  running: ['electronic', 'rock', 'hip-hop'],
  meditation: ['ambient', 'classical', 'new-age'],
  // Hindi
  'सुबह': ['acoustic', 'folk', 'indie'],
  'रात': ['electronic', 'ambient', 'chill'],
  'नींद': ['ambient', 'classical', 'sleep'],
  'गाड़ी': ['rock', 'pop', 'bollywood'],
  'ड्राइविंग': ['rock', 'pop', 'bollywood'],
  'खाना': ['jazz', 'pop', 'acoustic'],
  'दौड़': ['electronic', 'rock', 'hip-hop'],
  'ध्यान': ['ambient', 'classical', 'indian-classical'],
  // Tamil
  'காலை': ['acoustic', 'folk', 'indie'],
  'இரவு': ['electronic', 'ambient', 'chill'],
  'தூக்கம்': ['ambient', 'classical', 'sleep'],
  'ஓட்டுதல்': ['rock', 'pop', 'tamil'],
  'சமையல்': ['jazz', 'pop', 'acoustic'],
  'தியானம்': ['ambient', 'classical', 'indian-classical'],
  // Telugu
  'ఉదయం': ['acoustic', 'folk', 'indie'],
  'రాత్రి': ['electronic', 'ambient', 'chill'],
  'నిద్ర': ['ambient', 'classical', 'sleep'],
  'డ్రైవింగ్': ['rock', 'pop', 'telugu'],
  'వంట': ['jazz', 'pop', 'acoustic'],
  'ధ్యానం': ['ambient', 'classical', 'indian-classical'],
};

// Language detection patterns
const LANGUAGE_PATTERNS = {
  hindi: /[\u0900-\u097F]/,
  tamil: /[\u0B80-\u0BFF]/,
  telugu: /[\u0C00-\u0C7F]/,
};

/**
 * Detect language from text
 */
function detectLanguage(text: string): 'english' | 'hindi' | 'tamil' | 'telugu' {
  if (LANGUAGE_PATTERNS.hindi.test(text)) return 'hindi';
  if (LANGUAGE_PATTERNS.tamil.test(text)) return 'tamil';
  if (LANGUAGE_PATTERNS.telugu.test(text)) return 'telugu';
  return 'english';
}

/**
 * Parse natural language intent without calling external APIs
 * Simple keyword matching approach - supports English, Hindi, Tamil, Telugu
 */
export function parsePlaylistIntent(description: string): NLPPlaylistIntent {
  const lower = description.toLowerCase();
  const intent: NLPPlaylistIntent = {};
  
  // Detect language
  const language = detectLanguage(description);
  console.log('Detected language:', language);

  // Detect mood keywords (check both original and lowercase)
  for (const [mood, genres] of Object.entries(MOOD_GENRE_MAP)) {
    if (lower.includes(mood.toLowerCase()) || description.includes(mood)) {
      intent.mood = mood;
      intent.suggestedSeeds = { genres };
      break;
    }
  }

  // Detect activity keywords
  for (const [activity, genres] of Object.entries(ACTIVITY_GENRE_MAP)) {
    if (lower.includes(activity.toLowerCase()) || description.includes(activity)) {
      intent.activity = activity;
      if (!intent.suggestedSeeds) {
        intent.suggestedSeeds = { genres };
      } else {
        // Merge genres
        intent.suggestedSeeds.genres = [
          ...(intent.suggestedSeeds.genres || []),
          ...genres,
        ].slice(0, 5);
      }
      break;
    }
  }

  // Detect explicit genre mentions
  const commonGenres = ['rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'metal', 'indie', 'folk', 'bollywood', 'tamil', 'telugu', 'lo-fi', 'ambient', 'edm', 'r&b', 'soul'];
  const detectedGenres: string[] = [];
  for (const genre of commonGenres) {
    if (lower.includes(genre)) {
      detectedGenres.push(genre);
    }
  }
  if (detectedGenres.length > 0) {
    intent.genre = detectedGenres.join(', ');
    if (!intent.suggestedSeeds) {
      intent.suggestedSeeds = { genres: detectedGenres.slice(0, 5) };
    }
  }

  console.log('Parsed NLP intent', { description, language, intent });
  return intent;
}

/**
 * Optional: Call OpenAI/Gemini for more sophisticated NLP
 * Requires API key in environment (OPENAI_API_KEY or GOOGLE_API_KEY)
 */
export async function parsePlaylistIntentWithLLM(description: string): Promise<NLPPlaylistIntent> {
  // Placeholder for LLM integration
  // You can implement this using OpenAI SDK or Google Generative AI
  
  console.log('LLM-based NLP not yet implemented, falling back to keyword matching');
  return parsePlaylistIntent(description);
}

export default {
  parsePlaylistIntent,
  parsePlaylistIntentWithLLM,
};
