import spotifyHandler from './spotifyHandler.js';
import { parsePlaylistIntent } from '../utils/nlpHelper.js';
import { SpotifyTrack } from '../types.js';

/**
 * Advanced playlist builder with smart track selection
 */

export interface PlaylistBuilderOptions {
  name: string;
  description?: string;
  targetCount?: number;
  filters?: {
    minDuration?: number; // milliseconds
    maxDuration?: number;
    excludeExplicit?: boolean;
  };
  diversity?: {
    maxTracksPerArtist?: number;
    maxTracksPerAlbum?: number;
  };
}

/**
 * Build a smart playlist from natural language description
 */
export async function buildSmartPlaylist(
  nlDescription: string,
  options: PlaylistBuilderOptions
): Promise<{ success: boolean; playlistId?: string; tracks?: SpotifyTrack[]; error?: string }> {
  try {
    console.log('Building smart playlist', { description: nlDescription, options });

    // Parse intent from description
    const intent = parsePlaylistIntent(nlDescription);
    console.log('Parsed intent', { intent });

    // Get recommendations based on intent
    const seedGenres = intent.suggestedSeeds?.genres || ['pop'];
    const recommendResult = await spotifyHandler.getRecommendations(
      undefined,
      seedGenres,
      undefined,
      options.targetCount || 30
    );

    if (recommendResult.status !== 'success' || !recommendResult.data?.tracks) {
      return {
        success: false,
        error: 'Failed to get recommendations',
      };
    }

    let tracks = recommendResult.data.tracks as SpotifyTrack[];

    // Apply filters
    if (options.filters) {
      tracks = applyFilters(tracks, options.filters);
    }

    // Apply diversity rules
    if (options.diversity) {
      tracks = applyDiversity(tracks, options.diversity);
    }

    // Limit to target count
    if (options.targetCount) {
      tracks = tracks.slice(0, options.targetCount);
    }

    console.log('Playlist tracks selected', { count: tracks.length });

    // Create playlist
    const trackUris = tracks.map((t) => t.uri);
    const playlistResult = await spotifyHandler.createPlaylist(
      undefined,
      options.name,
      options.description || nlDescription,
      trackUris
    );

    if (playlistResult.status !== 'success' || !playlistResult.data?.playlist) {
      return {
        success: false,
        error: 'Failed to create playlist',
      };
    }

    return {
      success: true,
      playlistId: playlistResult.data.playlist.id,
      tracks,
    };
  } catch (err: any) {
    console.error('Smart playlist builder failed', { error: err?.message || err });
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Apply duration and content filters to tracks
 */
function applyFilters(
  tracks: SpotifyTrack[],
  filters: NonNullable<PlaylistBuilderOptions['filters']>
): SpotifyTrack[] {
  return tracks.filter((track) => {
    // Duration filters
    if (filters.minDuration && track.duration_ms < filters.minDuration) {
      return false;
    }
    if (filters.maxDuration && track.duration_ms > filters.maxDuration) {
      return false;
    }

    // Note: Explicit content filter would require additional API data
    // This is a placeholder for future implementation

    return true;
  });
}

/**
 * Apply diversity rules to avoid repetition
 */
function applyDiversity(
  tracks: SpotifyTrack[],
  diversity: NonNullable<PlaylistBuilderOptions['diversity']>
): SpotifyTrack[] {
  const artistCounts = new Map<string, number>();
  const albumCounts = new Map<string, number>();
  const result: SpotifyTrack[] = [];

  for (const track of tracks) {
    const artistId = track.artists[0]?.id;
    const albumId = track.album.id;

    const artistCount = artistCounts.get(artistId) || 0;
    const albumCount = albumCounts.get(albumId) || 0;

    // Check artist diversity
    if (
      diversity.maxTracksPerArtist &&
      artistCount >= diversity.maxTracksPerArtist
    ) {
      continue;
    }

    // Check album diversity
    if (diversity.maxTracksPerAlbum && albumCount >= diversity.maxTracksPerAlbum) {
      continue;
    }

    // Add track and update counts
    result.push(track);
    artistCounts.set(artistId, artistCount + 1);
    albumCounts.set(albumId, albumCount + 1);
  }

  return result;
}

/**
 * Merge multiple playlists into one
 */
export async function mergePlaylists(
  playlistIds: string[],
  newPlaylistName: string,
  _options?: { shuffle?: boolean; removeDuplicates?: boolean }
): Promise<{ success: boolean; playlistId?: string; error?: string }> {
  try {
    console.log('Merging playlists', { playlistIds, newPlaylistName });

    // Note: This would require additional Spotify API calls to fetch playlist tracks
    // For now, this is a placeholder for future implementation

    return {
      success: false,
      error: 'Merge functionality not yet implemented - requires playlist fetch API',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

export default {
  buildSmartPlaylist,
  mergePlaylists,
};
