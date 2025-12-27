/**
 * JioSaavn API Service
 * Handles searching and downloading songs via the unofficial JioSaavn API
 */

// Using a working JioSaavn API instance
const JIOSAAVN_API_BASE = 'https://jiosaavn-api-privatecvc2.vercel.app';

export interface JioSaavnSong {
  id: string;
  name: string;
  artists: {
    primary: Array<{ id: string; name: string }>;
    featured: Array<{ id: string; name: string }>;
    all: Array<{ id: string; name: string }>;
  };
  album: {
    id: string;
    name: string;
    url: string;
  };
  duration: number;
  image: Array<{ quality: string; url: string }>;
  downloadUrl: Array<{ quality: string; url: string }>;
  playCount?: number;
  language: string;
  year?: string;
}

export interface SearchResult {
  status: string;
  message: string | null;
  data: {
    total: number;
    start: number;
    results: JioSaavnSong[];
  };
}

export interface SongDetailsResult {
  status: string;
  message: string | null;
  data: JioSaavnSong[];
}

/**
 * Search for songs on JioSaavn
 */
export async function searchSongs(query: string, limit: number = 10): Promise<SearchResult | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `${JIOSAAVN_API_BASE}/search/songs?query=${encodedQuery}&limit=${limit}`
    );

    if (!response.ok) {
      console.error('[JioSaavn] Search failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[JioSaavn] Search error:', error);
    return null;
  }
}

/**
 * Get song details by ID (includes download URLs)
 */
export async function getSongById(id: string): Promise<SongDetailsResult | null> {
  try {
    const response = await fetch(`${JIOSAAVN_API_BASE}/songs/${id}`);

    if (!response.ok) {
      console.error('[JioSaavn] Song fetch failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[JioSaavn] Song fetch error:', error);
    return null;
  }
}

/**
 * Get song details by link
 */
export async function getSongByLink(link: string): Promise<SongDetailsResult | null> {
  try {
    const encodedLink = encodeURIComponent(link);
    const response = await fetch(`${JIOSAAVN_API_BASE}/songs?link=${encodedLink}`);

    if (!response.ok) {
      console.error('[JioSaavn] Song link fetch failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[JioSaavn] Song link fetch error:', error);
    return null;
  }
}

/**
 * Match a Spotify track to JioSaavn equivalent
 * Searches by song name + artist name
 */
export async function matchSpotifyTrack(
  trackName: string,
  artistName: string
): Promise<JioSaavnSong | null> {
  try {
    // Search for the song with artist name for better accuracy
    const query = `${trackName} ${artistName}`;
    const result = await searchSongs(query, 5);

    if (!result || result.status !== 'SUCCESS' || !result.data?.results?.length) {
      console.log('[JioSaavn] No match found for:', query);
      return null;
    }

    // Return the first (most relevant) result
    const song = result.data.results[0];

    // Optionally, we could add more sophisticated matching here
    // (e.g., comparing duration, checking artist name similarity)

    return song;
  } catch (error) {
    console.error('[JioSaavn] Match error:', error);
    return null;
  }
}

/**
 * Get download URL for a specific quality
 */
export function getDownloadUrl(song: JioSaavnSong, quality: '12kbps' | '48kbps' | '96kbps' | '160kbps' | '320kbps' = '320kbps'): string | null {
  if (!song.downloadUrl || !song.downloadUrl.length) {
    return null;
  }

  // Find the requested quality
  const qualityUrl = song.downloadUrl.find(d => d.quality === quality);
  if (qualityUrl) {
    return qualityUrl.url;
  }

  // Fallback to highest available quality
  const qualities = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
  for (const q of qualities) {
    const url = song.downloadUrl.find(d => d.quality === q);
    if (url) {
      return url.url;
    }
  }

  return null;
}

/**
 * Get the highest quality image URL
 */
export function getImageUrl(song: JioSaavnSong): string | null {
  if (!song.image || !song.image.length) {
    return null;
  }

  // Prefer 500x500 quality
  const highQuality = song.image.find(img => img.quality === '500x500');
  if (highQuality) {
    return highQuality.url;
  }

  // Return the last (usually highest quality)
  return song.image[song.image.length - 1]?.url || null;
}
