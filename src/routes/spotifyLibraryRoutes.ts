/**
 * Spotify Library Routes
 * Endpoints for managing user's saved Spotify playlists in Playlistify
 */

import express, { Request, Response } from "express";
import { loadConfig } from "../config.js";
import {
    getSpotifyTokens,
    updateSpotifyAccessToken,
    saveToSpotifyLibrary,
    removeFromSpotifyLibrary,
    getSpotifyLibrary,
    isInSpotifyLibrary,
    getSpotifyLibraryCount,
    SpotifyLibraryItem,
    isSpotifyConnected
} from "../database.js";

const router = express.Router();
const config = loadConfig();

const CLIENT_ID = config.spotify.clientId;
const CLIENT_SECRET = config.spotify.clientSecret;

/**
 * Helper function to refresh token for a user
 */
async function refreshUserToken(userId: number): Promise<string | null> {
    const tokens = getSpotifyTokens(userId);
    if (!tokens) return null;

    // Check if token is still valid (5 min buffer)
    if (tokens.expiresAt > Date.now() + 300000) {
        return tokens.accessToken;
    }

    // Token needs refresh
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: tokens.refreshToken
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Token refresh failed for user', userId, ':', errorData);
            return null;
        }

        const data = await response.json();
        const newExpiresAt = Date.now() + (data.expires_in * 1000);

        updateSpotifyAccessToken(userId, data.access_token, newExpiresAt, data.refresh_token);

        return data.access_token;
    } catch (err: any) {
        console.error('❌ Token refresh error:', err.message);
        return null;
    }
}

/**
 * GET /api/spotify/library/status
 * Check if user has Spotify connected and library status
 */
router.get('/status', (req: Request, res: Response): void => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;

    if (!userId) {
        res.json({ 
            connected: false, 
            message: 'No user ID provided',
            libraryCount: 0
        });
        return;
    }

    const connected = isSpotifyConnected(userId);
    const libraryCount = getSpotifyLibraryCount(userId);

    res.json({
        connected,
        libraryCount,
        message: connected ? 'Spotify connected' : 'Spotify not connected'
    });
});

/**
 * GET /api/spotify/library/playlists
 * Fetch user's Spotify playlists (from Spotify API)
 */
router.get('/playlists', async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    
    if (!userId) {
        res.status(400).json({ error: 'missing_user_id', message: 'User ID is required' });
        return;
    }

    const accessToken = await refreshUserToken(userId);

    if (!accessToken) {
        console.error('❌ No access token available for user', userId);
        res.status(401).json({ 
            error: 'not_connected', 
            message: 'Spotify not connected. Please connect your Spotify account first.',
            diagnostic: 'Token refresh returned null - user may need to reconnect'
        });
        return;
    }

    console.log('✅ Access token obtained for user', userId, '(length:', accessToken.length, ')');

    // First, test if we can access the user's profile (requires fewer permissions)
    try {
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!profileResponse.ok) {
            const profileError = await profileResponse.json().catch(() => ({}));
            console.error('❌ Cannot access Spotify profile:', {
                status: profileResponse.status,
                error: profileError
            });
            res.status(profileResponse.status).json({ 
                error: 'spotify_api_error', 
                message: profileError.error?.message || `Cannot access Spotify profile: ${profileResponse.status}`,
                spotifyError: profileError.error,
                status: profileResponse.status,
                diagnostic: 'Profile access failed - token may be invalid or missing scopes'
            });
            return;
        }

        const profile = await profileResponse.json();
        console.log('✅ Spotify profile accessible for user', userId, ':', profile.display_name || profile.id);
    } catch (profileErr: any) {
        console.error('❌ Profile check error:', profileErr.message);
        res.status(500).json({ 
            error: 'server_error', 
            message: 'Failed to verify Spotify connection',
            diagnostic: profileErr.message
        });
        return;
    }

    // Now try to fetch playlists
    try {
        const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorText = await response.text().catch(() => '');
            console.error('❌ Spotify API error fetching playlists:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
                rawResponse: errorText
            });
            res.status(response.status).json({ 
                error: 'spotify_api_error', 
                message: errorData.error?.message || `Spotify API error: ${response.status} ${response.statusText}`,
                spotifyError: errorData.error,
                status: response.status,
                diagnostic: `Profile accessible but playlists endpoint failed - may be missing 'playlist-read-private' scope`
            });
            return;
        }

        const data = await response.json();
        const playlists = data.items || [];

        // Check which playlists are saved in library
        const playlistsWithSavedStatus = playlists.map((playlist: any) => ({
            ...playlist,
            savedToLibrary: isInSpotifyLibrary(userId, playlist.id)
        }));

        res.json({ 
            playlists: playlistsWithSavedStatus,
            total: data.total || playlists.length
        });

    } catch (err: any) {
        console.error('❌ Fetch playlists error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Failed to fetch playlists' });
    }
});

/**
 * GET /api/spotify/library/tracks
 * Fetch tracks of a specific playlist
 */
router.get('/tracks', async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const playlistId = req.query.playlistId as string;
    
    if (!userId) {
        res.status(400).json({ error: 'missing_user_id', message: 'User ID is required' });
        return;
    }

    if (!playlistId) {
        res.status(400).json({ error: 'missing_playlist_id', message: 'Playlist ID is required' });
        return;
    }

    const accessToken = await refreshUserToken(userId);

    if (!accessToken) {
        res.status(401).json({ 
            error: 'not_connected', 
            message: 'Spotify not connected' 
        });
        return;
    }

    try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            res.status(response.status).json({ 
                error: 'spotify_api_error', 
                message: 'Failed to fetch tracks' 
            });
            return;
        }

        const data = await response.json();
        
        // Format tracks
        const tracks = (data.items || []).map((item: any) => ({
            id: item.track?.id,
            name: item.track?.name,
            artists: item.track?.artists?.map((a: any) => a.name).join(', '),
            album: item.track?.album?.name,
            albumArt: item.track?.album?.images?.[0]?.url,
            duration: item.track?.duration_ms,
            addedAt: item.added_at,
            previewUrl: item.track?.preview_url,
            spotifyUrl: item.track?.external_urls?.spotify
        })).filter((t: any) => t.id);

        res.json({ 
            tracks,
            total: data.total || tracks.length
        });

    } catch (err: any) {
        console.error('❌ Fetch tracks error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Failed to fetch tracks' });
    }
});

/**
 * GET /api/spotify/library/saved
 * Get user's saved playlists in Playlistify library
 */
router.get('/saved', (req: Request, res: Response): void => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    
    if (!userId) {
        res.status(400).json({ error: 'missing_user_id', message: 'User ID is required' });
        return;
    }

    const savedPlaylists = getSpotifyLibrary(userId);

    res.json({ 
        playlists: savedPlaylists,
        count: savedPlaylists.length
    });
});

/**
 * POST /api/spotify/library/save
 * Save a playlist to user's Playlistify library
 */
router.post('/save', (req: Request, res: Response): void => {
    const { userId, playlist } = req.body;
    
    if (!userId) {
        res.status(400).json({ error: 'missing_user_id', message: 'User ID is required' });
        return;
    }

    if (!playlist || !playlist.id || !playlist.name) {
        res.status(400).json({ error: 'invalid_playlist', message: 'Valid playlist data is required' });
        return;
    }

    const libraryItem: SpotifyLibraryItem = {
        userId: parseInt(userId),
        playlistId: playlist.id,
        playlistName: playlist.name,
        coverImage: playlist.images?.[0]?.url || playlist.coverImage,
        trackCount: playlist.tracks?.total || playlist.trackCount || 0,
        ownerName: playlist.owner?.display_name || playlist.ownerName,
        isPublic: playlist.public !== false,
        spotifyUrl: playlist.external_urls?.spotify || playlist.spotifyUrl
    };

    const success = saveToSpotifyLibrary(libraryItem);

    if (success) {
        res.json({ 
            success: true, 
            message: 'Playlist saved to library',
            playlist: libraryItem
        });
    } else {
        res.status(500).json({ 
            error: 'save_failed', 
            message: 'Failed to save playlist to library' 
        });
    }
});

/**
 * POST /api/spotify/library/remove
 * Remove a playlist from user's Playlistify library
 */
router.post('/remove', (req: Request, res: Response): void => {
    const { userId, playlistId } = req.body;
    
    if (!userId) {
        res.status(400).json({ error: 'missing_user_id', message: 'User ID is required' });
        return;
    }

    if (!playlistId) {
        res.status(400).json({ error: 'missing_playlist_id', message: 'Playlist ID is required' });
        return;
    }

    const success = removeFromSpotifyLibrary(parseInt(userId), playlistId);

    if (success) {
        res.json({ 
            success: true, 
            message: 'Playlist removed from library' 
        });
    } else {
        res.status(404).json({ 
            error: 'not_found', 
            message: 'Playlist not found in library' 
        });
    }
});

/**
 * GET /api/spotify/library/check
 * Check if a specific playlist is in user's library
 */
router.get('/check', (req: Request, res: Response): void => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const playlistId = req.query.playlistId as string;
    
    if (!userId || !playlistId) {
        res.status(400).json({ error: 'missing_params', message: 'userId and playlistId are required' });
        return;
    }

    const inLibrary = isInSpotifyLibrary(userId, playlistId);

    res.json({ inLibrary });
});

/**
 * DELETE /api/spotify/library/delete
 * Delete a playlist from user's Spotify account
 */
router.delete('/delete', async (req: Request, res: Response): Promise<void> => {
    const { userId, playlistId } = req.body;

    if (!userId || !playlistId) {
        res.status(400).json({ error: 'missing_params', message: 'User ID and Playlist ID are required' });
        return;
    }

    const accessToken = await refreshUserToken(userId);
    if (!accessToken) {
        res.status(401).json({ error: 'unauthorized', message: 'Spotify access token expired or not found' });
        return;
    }

    try {
        // Unfollow (delete) the playlist from Spotify
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok && response.status !== 204) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Spotify API error deleting playlist:', errorData);
            res.status(response.status).json({ 
                error: 'spotify_api_error', 
                message: errorData.error?.message || 'Failed to delete playlist from Spotify' 
            });
            return;
        }

        // Also remove from Playlistify library if it's saved there
        try {
            removeFromSpotifyLibrary(userId, playlistId);
        } catch (e) {
            console.log('Note: Playlist was not in Playlistify library');
        }

        console.log(`🗑️ Playlist ${playlistId} deleted successfully for user ${userId}`);
        res.json({ success: true, message: 'Playlist deleted successfully' });

    } catch (err: any) {
        console.error('❌ Delete playlist error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
});

export default router;

