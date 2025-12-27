import SpotifyWebApi from "spotify-web-api-node";
import { searchCache, recommendCache } from "../utils/cache.js";
import { SpotifyTrack, MCPResponse } from "../types.js";

let spotifyApi: SpotifyWebApi;
let tokenExpiresAt = 0;

// Valid Spotify API seed genres (as of 2024)
// https://developer.spotify.com/documentation/web-api/reference/get-recommendation-genres
const VALID_SPOTIFY_GENRES = new Set([
  'acoustic', 'afrobeat', 'alt-rock', 'alternative', 'ambient', 'anime',
  'black-metal', 'bluegrass', 'blues', 'bossanova', 'brazil', 'breakbeat',
  'british', 'cantopop', 'chicago-house', 'children', 'chill', 'classical',
  'club', 'comedy', 'country', 'dance', 'dancehall', 'death-metal', 'deep-house',
  'detroit-techno', 'disco', 'disney', 'drum-and-bass', 'dub', 'dubstep', 'edm',
  'electro', 'electronic', 'emo', 'folk', 'forro', 'french', 'funk', 'garage',
  'german', 'gospel', 'goth', 'grindcore', 'groove', 'grunge', 'guitar',
  'happy', 'hard-rock', 'hardcore', 'hardstyle', 'heavy-metal', 'hip-hop',
  'holidays', 'honky-tonk', 'house', 'idm', 'indian', 'indie', 'indie-pop',
  'industrial', 'iranian', 'j-dance', 'j-idol', 'j-pop', 'j-rock', 'jazz',
  'k-pop', 'kids', 'latin', 'latino', 'malay', 'mandopop', 'metal', 'metal-misc',
  'metalcore', 'minimal-techno', 'movies', 'mpb', 'new-age', 'new-release',
  'opera', 'pagode', 'party', 'philippines-opm', 'piano', 'pop', 'pop-film',
  'post-dubstep', 'power-pop', 'progressive-house', 'psych-rock', 'punk',
  'punk-rock', 'r-n-b', 'rainy-day', 'reggae', 'reggaeton', 'road-trip', 'rock',
  'rock-n-roll', 'rockabilly', 'romance', 'sad', 'salsa', 'samba', 'sertanejo',
  'show-tunes', 'singer-songwriter', 'ska', 'sleep', 'songwriter', 'soul',
  'soundtracks', 'spanish', 'study', 'summer', 'swedish', 'synth-pop', 'tango',
  'techno', 'trance', 'trip-hop', 'turkish', 'work-out', 'world-music'
]);

// Map our internal genre names to valid Spotify genres
const GENRE_MAPPING: Record<string, string> = {
  // Lo-fi variations
  'lo-fi': 'chill',
  'lofi': 'chill',
  'lo fi': 'chill',

  // Nature/meditation
  'nature': 'ambient',
  'meditation': 'ambient',
  'zen': 'ambient',

  // Electronic variations
  'synthwave': 'synth-pop',
  'chillwave': 'chill',
  'vaporwave': 'electronic',
  'post-rock': 'rock',

  // Pop variations
  'bedroom-pop': 'indie-pop',
  'electropop': 'electro',
  'dream-pop': 'indie-pop',

  // R&B/Soul
  'rnb': 'r-n-b',
  'neo-soul': 'soul',

  // Shoegaze and others
  'shoegaze': 'indie',
  'orchestral': 'classical',
  'cinematic': 'soundtracks',

  // World music
  'world': 'world-music',

  // Metal variations
  'progressive-metal': 'metal',

  // Hip-hop variations
  'trap': 'hip-hop',
  'rap': 'hip-hop',
};

/**
 * Validate and map genres to valid Spotify seed genres
 */
export function validateAndMapGenres(genres: string[]): string[] {
  const validatedGenres: string[] = [];

  for (const genre of genres) {
    const normalizedGenre = genre.toLowerCase().trim();

    // Check if it's directly valid
    if (VALID_SPOTIFY_GENRES.has(normalizedGenre)) {
      if (!validatedGenres.includes(normalizedGenre)) {
        validatedGenres.push(normalizedGenre);
      }
    }
    // Check if we have a mapping
    else if (GENRE_MAPPING[normalizedGenre]) {
      const mappedGenre = GENRE_MAPPING[normalizedGenre];
      if (!validatedGenres.includes(mappedGenre)) {
        validatedGenres.push(mappedGenre);
      }
    }
    // Fallback: try to find a partial match
    else {
      for (const validGenre of VALID_SPOTIFY_GENRES) {
        if (validGenre.includes(normalizedGenre) || normalizedGenre.includes(validGenre)) {
          if (!validatedGenres.includes(validGenre)) {
            validatedGenres.push(validGenre);
            break;
          }
        }
      }
    }
  }

  // Ensure we return at least one genre
  if (validatedGenres.length === 0) {
    console.log('[SpotifyHandler] No valid genres found, defaulting to pop');
    return ['pop'];
  }

  console.log('[SpotifyHandler] Validated genres:', { input: genres, output: validatedGenres });
  return validatedGenres.slice(0, 5);
}

export function initializeSpotify(
  clientId: string,
  clientSecret: string,
  refreshToken: string
) {
  spotifyApi = new SpotifyWebApi({
    clientId,
    clientSecret,
  });
  spotifyApi.setRefreshToken(refreshToken);
  console.log("Spotify API initialized");
}



async function ensureAccessToken(): Promise<string> {
  if (!spotifyApi) {
    throw new Error("Spotify API not initialized. Call initializeSpotify() first.");
  }

  // Only refresh if token is expired or about to expire (within 60 seconds)
  if (Date.now() < tokenExpiresAt - 60000) {
    // console.log("Using cached access token");
    return spotifyApi.getAccessToken() || "";
  }


  try {
    const data = await spotifyApi.refreshAccessToken();
    const accessToken = data.body["access_token"];
    const expiresIn = data.body["expires_in"] || 3600;

    spotifyApi.setAccessToken(accessToken);
    tokenExpiresAt = Date.now() + expiresIn * 1000;

    console.log("Spotify access token refreshed", { expiresIn });
    return accessToken;
  } catch (err: any) {
    console.error("Failed to refresh Spotify access token", {
      error: err?.message || err,
    });
    throw new Error(
      `Spotify authentication failed: ${err?.message || "Unknown error"}`
    );
  }
}

/**
 * Search for tracks on Spotify with caching
 */
export async function searchTracks(
  query: string,
  limit = 20
): Promise<MCPResponse> {
  try {
    if (!query || query.trim().length === 0) {
      return {
        status: "error",
        message: "Query parameter is required and cannot be empty",
      };
    }

    const cacheKey = `search:${query}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log("Returning cached search results", { query });
      return cached;
    }

    await ensureAccessToken();
    const res = await spotifyApi.searchTracks(query, { limit });
    const items = res.body.tracks?.items || [];

    const tracks: SpotifyTrack[] = items.map((t: any) => ({
      id: t.id,
      name: t.name,
      artists: t.artists.map((a: any) => ({ id: a.id, name: a.name })),
      album: {
        id: t.album.id,
        name: t.album.name,
        images: t.album.images
      },
      uri: t.uri,
      external_urls: t.external_urls,
      duration_ms: t.duration_ms,
      preview_url: t.preview_url,
    }));

    const response: MCPResponse = {
      status: "success",
      data: { tracks, count: tracks.length },
      timestamp: new Date().toISOString(),
    };

    searchCache.set(cacheKey, response);
    console.log("Search completed", { query, resultCount: tracks.length });

    return response;
  } catch (err: any) {
    console.error("Search tracks failed", { query, error: err?.message || err });
    return {
      status: "error",
      message: `Search failed: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Get track recommendations with caching
 */
export async function getRecommendations(
  seedArtists?: string[],
  seedGenres?: string[],
  seedTracks?: string[],
  limit = 20
): Promise<MCPResponse> {
  try {
    await ensureAccessToken();

    const params: any = { limit };
    if (seedArtists && seedArtists.length)
      params.seed_artists = seedArtists.slice(0, 5);
    if (seedGenres && seedGenres.length) {
      // Validate and map genres to ensure they're valid Spotify seed genres
      const validGenres = validateAndMapGenres(seedGenres);
      params.seed_genres = validGenres.slice(0, 5);
    }
    if (seedTracks && seedTracks.length)
      params.seed_tracks = seedTracks.slice(0, 5);

    // Spotify requires at least one seed
    if (!params.seed_artists && !params.seed_genres && !params.seed_tracks) {
      params.seed_genres = ["pop"];
      console.log("No seeds provided, defaulting to pop genre");
    }

    // Create cache key from params
    const cacheKey = `recommend:${JSON.stringify(params)}`;
    const cached = recommendCache.get(cacheKey);
    if (cached) {
      console.log("Returning cached recommendations");
      return cached;
    }

    const res = await spotifyApi.getRecommendations(params);
    const tracks: SpotifyTrack[] = (res.body.tracks || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      artists: t.artists.map((a: any) => ({ id: a.id, name: a.name })),
      album: {
        id: t.album.id,
        name: t.album.name,
        images: t.album.images
      },
      uri: t.uri,
      external_urls: t.external_urls,
      duration_ms: t.duration_ms,
      preview_url: t.preview_url,
    }));

    const response: MCPResponse = {
      status: "success",
      data: { tracks, count: tracks.length, seeds: params },
      timestamp: new Date().toISOString(),
    };

    recommendCache.set(cacheKey, response);
    console.log("Recommendations completed", {
      seedCount: Object.keys(params).length - 1,
      resultCount: tracks.length,
    });

    return response;
  } catch (err: any) {
    // Better error logging
    const errorMessage = err?.body?.error?.message || err?.message || JSON.stringify(err);
    console.error("Get recommendations failed", {
      error: errorMessage,
      statusCode: err?.statusCode
    });
    return {
      status: "error",
      message: `Recommendations failed: ${errorMessage}`,
    };
  }
}

/**
 * Create a playlist and optionally add tracks
 */
export async function createPlaylist(
  _userId: string | undefined,
  name: string,
  description: string,
  trackUris: string[],
  isPublic = false
): Promise<MCPResponse> {
  try {
    if (!name || name.trim().length === 0) {
      return {
        status: "error",
        message: "Playlist name is required and cannot be empty",
      };
    }

    await ensureAccessToken();

    const createRes = await spotifyApi.createPlaylist(name, {
      description:
        description || `Created via MCP on ${new Date().toLocaleDateString()}`,
      public: isPublic,
    });

    const playlist = createRes.body;
    console.log("Playlist created", {
      playlistId: playlist.id,
      name: playlist.name,
    });

    // Add tracks if provided
    if (trackUris && trackUris.length > 0) {
      // Spotify API accepts up to 100 tracks per request
      const chunks: string[][] = [];
      for (let i = 0; i < trackUris.length; i += 100) {
        chunks.push(trackUris.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        await spotifyApi.addTracksToPlaylist(playlist.id, chunk);
      }

      console.log("Tracks added to playlist", {
        playlistId: playlist.id,
        trackCount: trackUris.length,
      });
    }

    return {
      status: "success",
      data: {
        playlist: {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          uri: playlist.uri,
          external_urls: playlist.external_urls,
          trackCount: trackUris.length,
        },
      },
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      status: "error",
      message: `Create playlist failed: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Set playlist cover image from a URL
 * Downloads the image and uploads it to Spotify
 */
export async function setPlaylistCover(playlistId: string, imageUrl: string): Promise<MCPResponse> {
  try {
    await ensureAccessToken();

    // Fetch the image from the URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return { status: 'error', message: 'Failed to fetch image from URL' };
    }

    // Get image as buffer and convert to base64
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Spotify requires the image to be under 256KB and in JPEG format
    // Pollinations.ai returns images that should be compatible
    // If the image is too large, we'll skip the upload
    if (base64Image.length > 256 * 1024 * 1.37) { // ~350KB in base64
      console.log('Image too large for Spotify cover, skipping upload');
      return { status: 'error', message: 'Image too large for Spotify' };
    }

    // Upload to Spotify
    await spotifyApi.uploadCustomPlaylistCoverImage(playlistId, base64Image);

    console.log('Playlist cover uploaded successfully', { playlistId });

    return {
      status: 'success',
      data: { message: 'Cover image uploaded successfully' },
      timestamp: new Date().toISOString(),
    };

  } catch (err: any) {
    console.error('Set playlist cover failed:', err?.message || err);
    return {
      status: 'error',
      message: `Set cover failed: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Add tracks to an existing playlist
 */
export async function addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<MCPResponse> {
  try {
    await ensureAccessToken();

    if (!trackUris || trackUris.length === 0) {
      return { status: 'error', message: 'No tracks provided' };
    }

    // Add tracks in chunks of 100 (Spotify limit)
    for (let i = 0; i < trackUris.length; i += 100) {
      const chunk = trackUris.slice(i, i + 100);
      await spotifyApi.addTracksToPlaylist(playlistId, chunk);
    }

    console.log('Tracks added to playlist', { playlistId, trackCount: trackUris.length });

    return {
      status: 'success',
      data: { added: trackUris.length },
      timestamp: new Date().toISOString(),
    };

  } catch (err: any) {
    console.error('Add tracks failed:', err?.message || err);
    return {
      status: 'error',
      message: `Add tracks failed: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Get audio features for multiple tracks
 * Returns tempo, energy, danceability, valence, key, mode for each track
 */
export async function getAudioFeatures(trackIds: string[]): Promise<MCPResponse> {
  try {
    await ensureAccessToken();

    if (!trackIds || trackIds.length === 0) {
      return { status: 'error', message: 'No track IDs provided' };
    }

    // Spotify allows up to 100 tracks per request
    const allFeatures: any[] = [];

    for (let i = 0; i < trackIds.length; i += 100) {
      const chunk = trackIds.slice(i, i + 100);
      const response = await spotifyApi.getAudioFeaturesForTracks(chunk);
      if (response.body.audio_features) {
        allFeatures.push(...response.body.audio_features);
      }
    }

    console.log('Audio features fetched', { trackCount: allFeatures.length });

    return {
      status: 'success',
      data: { audioFeatures: allFeatures },
      timestamp: new Date().toISOString(),
    };

  } catch (err: any) {
    console.error('Get audio features failed:', err?.message || err);
    return {
      status: 'error',
      message: `Get audio features failed: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Get tracks from a playlist
 */
export async function getPlaylistTracks(playlistId: string): Promise<MCPResponse> {
  try {
    await ensureAccessToken();

    const tracks: any[] = [];
    let offset = 0;
    const limit = 100;

    // Paginate through all tracks
    while (true) {
      const response = await spotifyApi.getPlaylistTracks(playlistId, { offset, limit });
      const items = response.body.items;

      if (!items || items.length === 0) break;

      tracks.push(...items.map(item => ({
        id: item.track?.id,
        uri: item.track?.uri,
        name: item.track?.name,
        artists: item.track?.artists?.map((a: any) => ({ name: a.name, id: a.id })),
        album: {
          name: item.track?.album?.name,
          images: item.track?.album?.images
        },
        duration_ms: item.track?.duration_ms,
        preview_url: item.track?.preview_url
      })));

      if (items.length < limit) break;
      offset += limit;
    }

    console.log('Playlist tracks fetched', { playlistId, trackCount: tracks.length });

    return {
      status: 'success',
      data: { tracks },
      timestamp: new Date().toISOString(),
    };

  } catch (err: any) {
    console.error('Get playlist tracks failed:', err?.message || err);
    return {
      status: 'error',
      message: `Get playlist tracks failed: ${err?.message || String(err)}`,
    };
  }
}

export default { searchTracks, getRecommendations, createPlaylist, initializeSpotify, setPlaylistCover, addTracksToPlaylist, getAudioFeatures, getPlaylistTracks };

