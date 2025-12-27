/**
 * AI Service - OpenRouter integration for intelligent features
 * 
 * Uses AI for:
 * - Creative playlist name generation
 * - Smart cover image prompts
 * - Natural language chat refinement understanding
 * - Personalized suggestions based on taste profile
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Use a fast, cheap model for quick responses
const FAST_MODEL = 'google/gemini-2.0-flash-001';
const CREATIVE_MODEL = 'google/gemini-2.0-flash-001';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  success: boolean;
  content: string;
  error?: string;
}

/**
 * Make a request to OpenRouter API
 */
async function callAI(messages: AIMessage[], model: string = FAST_MODEL, maxTokens: number = 150): Promise<AIResponse> {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://playlistify-ai.app',
        'X-Title': 'Playlistify AI',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Service] API error:', response.status, errorText);
      return { success: false, content: '', error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    return { success: true, content: content.trim() };
  } catch (err: any) {
    console.error('[AI Service] Request failed:', err.message);
    return { success: false, content: '', error: err.message };
  }
}

/**
 * Generate a creative, unique playlist name using AI
 */
export async function generateCreativePlaylistName(
  prompt: string,
  mood: string,
  genres: string[],
  activity?: string,
  timeOfDay?: string
): Promise<string> {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are a creative music curator. Generate a unique, catchy playlist name (3-6 words max).
Rules:
- Be creative and poetic, not generic
- Include 1 relevant emoji at the start
- Capture the vibe/mood, not just describe it
- No quotes in your response
- Just respond with the name, nothing else

Examples of GOOD names:
- 🌙 Midnight Thoughts Unfolding
- ⚡ Electric Soul Revival
- 🍂 Autumn Coffee Mornings
- 💫 Stardust & Late Nights

Examples of BAD names (too generic):
- Happy Playlist
- Workout Mix
- Chill Vibes`,
    },
    {
      role: 'user',
      content: `Create a playlist name for:
Prompt: "${prompt}"
Mood: ${mood || 'unspecified'}
Genres: ${genres.join(', ') || 'mixed'}
${activity ? `Activity: ${activity}` : ''}
${timeOfDay ? `Time: ${timeOfDay}` : ''}`,
    },
  ];

  const result = await callAI(messages, CREATIVE_MODEL, 50);
  
  if (result.success && result.content) {
    // Clean up the response
    let name = result.content.replace(/["']/g, '').trim();
    // Ensure it starts with emoji
    if (!/^\p{Emoji}/u.test(name)) {
      name = '🎵 ' + name;
    }
    return name;
  }
  
  // Fallback to simple name
  return `🎵 ${prompt.slice(0, 30)}`;
}

/**
 * Generate a creative prompt for AI cover image generation
 */
export async function generateCoverImagePrompt(
  playlistName: string,
  mood: string,
  genres: string[],
  userPrompt: string
): Promise<string> {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are an art director creating prompts for album cover art.
Generate a detailed visual description for an AI image generator.

Rules:
- Focus on abstract, artistic visuals (no text, no people's faces)
- Include color palette, mood, artistic style
- Make it suitable for a music playlist cover (square format)
- Keep it under 100 words
- Just output the prompt, no explanations`,
    },
    {
      role: 'user',
      content: `Create a cover art prompt for:
Playlist: "${playlistName}"
Mood: ${mood}
Genres: ${genres.join(', ')}
User's request: "${userPrompt}"`,
    },
  ];

  const result = await callAI(messages, CREATIVE_MODEL, 100);
  
  if (result.success && result.content) {
    return result.content;
  }
  
  // Fallback to basic prompt
  return `abstract music album cover art, ${mood} mood, ${genres[0] || 'modern'} style, vibrant colors, minimalist design`;
}

/**
 * Understand and parse a chat refinement request using AI
 */
export async function parseRefinementRequest(
  originalPrompt: string,
  refinementMessage: string,
  currentGenres: string[]
): Promise<{
  action: 'add' | 'remove' | 'replace' | 'adjust';
  criteria: string;
  searchQuery: string;
  explanation: string;
}> {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are a music curation assistant. Parse the user's playlist refinement request and extract actionable information.

Respond in this exact JSON format:
{
  "action": "add" | "remove" | "replace" | "adjust",
  "criteria": "what to look for (e.g., 'upbeat pop songs', '90s rock')",
  "searchQuery": "Spotify search query to find matching songs",
  "explanation": "friendly explanation of what you'll do (1 sentence)"
}

Examples:
- "add more upbeat songs" → action: "add", criteria: "upbeat songs", searchQuery: "upbeat pop dance hits"
- "remove the slow ones" → action: "remove", criteria: "slow tempo songs"
- "more 90s rock" → action: "add", criteria: "90s rock songs", searchQuery: "90s rock hits classic"
- "less electronic" → action: "remove", criteria: "electronic songs"`,
    },
    {
      role: 'user',
      content: `Original playlist request: "${originalPrompt}"
Current genres: ${currentGenres.join(', ')}
User says: "${refinementMessage}"

Parse this request:`,
    },
  ];

  const result = await callAI(messages, FAST_MODEL, 200);
  
  if (result.success && result.content) {
    try {
      // Try to parse JSON from response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          action: parsed.action || 'add',
          criteria: parsed.criteria || refinementMessage,
          searchQuery: parsed.searchQuery || refinementMessage,
          explanation: parsed.explanation || `I'll ${parsed.action} ${parsed.criteria}`,
        };
      }
    } catch (e) {
      console.log('[AI Service] Failed to parse refinement JSON, using fallback');
    }
  }
  
  // Fallback parsing
  const lower = refinementMessage.toLowerCase();
  let action: 'add' | 'remove' | 'replace' | 'adjust' = 'add';
  if (lower.includes('remove') || lower.includes('less') || lower.includes('no more')) {
    action = 'remove';
  } else if (lower.includes('replace') || lower.includes('change')) {
    action = 'replace';
  }
  
  return {
    action,
    criteria: refinementMessage,
    searchQuery: refinementMessage.replace(/^(add|remove|more|less|no)\s+/i, ''),
    explanation: `I'll ${action} songs based on: ${refinementMessage}`,
  };
}

/**
 * Generate a personalized suggestion based on user's taste profile
 */
export async function generatePersonalizedSuggestion(
  topGenres: string[],
  topMoods: string[],
  recentPrompts: string[],
  timeOfDay: string
): Promise<{
  suggestion: string;
  prompt: string;
  reason: string;
}> {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are a personal music AI that knows the user's taste deeply.
Generate a personalized playlist suggestion based on their history.

Respond in JSON:
{
  "suggestion": "catchy title for the suggestion (with emoji)",
  "prompt": "the playlist prompt to generate",
  "reason": "why you're suggesting this (personal, 1 sentence)"
}`,
    },
    {
      role: 'user',
      content: `User's profile:
- Top genres: ${topGenres.join(', ')}
- Common moods: ${topMoods.join(', ')}
- Recent requests: ${recentPrompts.slice(0, 3).join('; ')}
- Current time: ${timeOfDay}

Generate a personalized suggestion:`,
    },
  ];

  const result = await callAI(messages, FAST_MODEL, 150);
  
  if (result.success && result.content) {
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          suggestion: parsed.suggestion || '🎵 Something new for you',
          prompt: parsed.prompt || 'discover something new',
          reason: parsed.reason || 'Based on your listening history',
        };
      }
    } catch (e) {
      console.log('[AI Service] Failed to parse suggestion JSON');
    }
  }
  
  // Fallback
  return {
    suggestion: `🎵 ${topMoods[0] || 'Chill'} ${topGenres[0] || 'Music'} Mix`,
    prompt: `${topMoods[0] || 'relaxing'} ${topGenres[0] || 'music'}`,
    reason: 'Based on your favorite genres',
  };
}

/**
 * Generate a memory summary for the user
 */
export async function generateMemorySummary(
  totalPlaylists: number,
  topGenres: string[],
  topMoods: string[],
  avgRating: number,
  preferredTime: string
): Promise<string> {
  if (totalPlaylists < 3) {
    return "I'm still getting to know your taste! Create a few more playlists and I'll learn your preferences.";
  }
  
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are a friendly music AI summarizing what you've learned about a user.
Write a brief, personal 2-3 sentence summary. Be warm and insightful.
Don't use bullet points, just flowing text.`,
    },
    {
      role: 'user',
      content: `User stats:
- Total playlists created: ${totalPlaylists}
- Favorite genres: ${topGenres.join(', ')}
- Common moods: ${topMoods.join(', ')}
- Average playlist rating: ${avgRating.toFixed(1)}/5
- Usually listens: ${preferredTime}

Summarize what you've learned:`,
    },
  ];

  const result = await callAI(messages, FAST_MODEL, 100);
  
  if (result.success && result.content) {
    return result.content;
  }
  
  return `You've created ${totalPlaylists} playlists with me! I've noticed you love ${topGenres[0] || 'diverse'} music, especially when you're feeling ${topMoods[0] || 'good'}.`;
}

/**
 * AI-powered search query generator for diverse, accurate music discovery
 * This is the key to finding the RIGHT songs, not just songs from mentioned artists
 */
export async function generateSmartSearchQueries(
  rawPrompt: string,
  targetCount: number = 20
): Promise<{
  queries: string[];
  understanding: string;
  filters: {
    maxPerArtist: number;
    yearRange?: string;
    excludePatterns?: string[];
    prioritize?: string[];
  };
}> {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are a music curation expert. Generate Spotify search queries to find diverse, high-quality songs.

CRITICAL RULES:
1. NEVER just search for artist names - that only returns THEIR songs
2. Generate DIVERSE queries that find songs matching the VIBE/MOOD/STYLE
3. Think about SIMILAR artists, sub-genres, eras, and sounds
4. For scenarios (e.g., "Sunday morning"), infer the energy, tempo, and feel
5. Include queries for discovering lesser-known tracks with the same vibe

Respond in JSON:
{
  "understanding": "1-sentence interpretation of what user wants",
  "queries": [
    "query1 - most specific",
    "query2 - genre/mood combo",
    "query3 - similar artists", 
    "query4 - era/style combo",
    "query5 - vibe/activity",
    "query6 - discovery query"
  ],
  "filters": {
    "maxPerArtist": 2,
    "yearRange": "optional - e.g., '2015-2023'",
    "prioritize": ["what to prioritize in results"],
    "excludePatterns": ["what to avoid"]
  }
}

Example - User: "Upbeat 70s rock with a muted color palette for a Sunday morning"
Good response:
{
  "understanding": "Laid-back but uplifting classic rock for a relaxed Sunday, not too heavy",
  "queries": [
    "70s rock classics upbeat feel good",
    "Fleetwood Mac Eagles style rock",
    "classic rock sunday morning vibes",
    "70s soft rock hits",
    "Tom Petty style heartland rock",
    "yacht rock 70s mellow"
  ],
  "filters": {
    "maxPerArtist": 2,
    "yearRange": "1970-1985",
    "prioritize": ["melodic", "feel-good", "not heavy metal"],
    "excludePatterns": ["hard rock", "heavy metal", "punk"]
  }
}`,
    },
    {
      role: 'user',
      content: `Generate search queries for: "${rawPrompt}"
Target: ${targetCount} songs with max variety`,
    },
  ];

  const result = await callAI(messages, FAST_MODEL, 400);
  
  if (result.success && result.content) {
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          queries: parsed.queries || [rawPrompt],
          understanding: parsed.understanding || 'Creating your playlist',
          filters: {
            maxPerArtist: parsed.filters?.maxPerArtist || 2,
            yearRange: parsed.filters?.yearRange,
            excludePatterns: parsed.filters?.excludePatterns,
            prioritize: parsed.filters?.prioritize,
          },
        };
      }
    } catch (e) {
      console.log('[AI Service] Failed to parse search queries JSON, using fallback');
    }
  }
  
  // Fallback: Basic query generation
  return {
    queries: [
      rawPrompt,
      `${rawPrompt} playlist`,
      `${rawPrompt} songs`,
      `best ${rawPrompt} music`,
    ],
    understanding: 'Creating your playlist',
    filters: { maxPerArtist: 2 },
  };
}

/**
 * Extract structured parameters from a complex prompt
 */
export async function parseComplexPrompt(rawPrompt: string): Promise<{
  mood: string;
  energy: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  genres: string[];
  era?: string;
  scenario?: string;
  artistReferences: string[];
  songCount?: number;
  exclusions: string[];
}> {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `Extract structured music parameters from natural language. Handle complex, multi-layered prompts.

Examples to understand:
- "25 songs similar to Phantogram released in the past 5 years" → song count, artist reference, year range
- "Exclude artists I listened to in 2024. Max 2 songs per artist" → exclusion rules
- "cleaning the house" → infer upbeat, medium-high energy
- "sitting in a hot tub" → infer relaxed, chill, sensual vibes

Respond in JSON:
{
  "mood": "primary mood",
  "energy": "very-low|low|medium|high|very-high",
  "genres": ["genre1", "genre2"],
  "era": "optional - decade or year range",
  "scenario": "activity or situation if mentioned",
  "artistReferences": ["artists mentioned as references, not to ONLY include"],
  "songCount": null or number if specified,
  "exclusions": ["things to avoid"]
}`,
    },
    {
      role: 'user',
      content: rawPrompt,
    },
  ];

  const result = await callAI(messages, FAST_MODEL, 250);
  
  if (result.success && result.content) {
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          mood: parsed.mood || 'mixed',
          energy: parsed.energy || 'medium',
          genres: parsed.genres || [],
          era: parsed.era,
          scenario: parsed.scenario,
          artistReferences: parsed.artistReferences || [],
          songCount: parsed.songCount,
          exclusions: parsed.exclusions || [],
        };
      }
    } catch (e) {
      console.log('[AI Service] Failed to parse complex prompt');
    }
  }
  
  return {
    mood: 'mixed',
    energy: 'medium',
    genres: [],
    artistReferences: [],
    exclusions: [],
  };
}

export default {
  generateCreativePlaylistName,
  generateCoverImagePrompt,
  parseRefinementRequest,
  generatePersonalizedSuggestion,
  generateMemorySummary,
  generateSmartSearchQueries,
  parseComplexPrompt,
};
