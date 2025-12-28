/**
 * Spotify OAuth Routes for User Account Connection
 * Implements Authorization Code Flow with PKCE for user-facing OAuth
 * NOW WITH PER-USER TOKEN STORAGE
 */

import express, { Request, Response } from "express";
import crypto from "crypto";
import { loadConfig } from "../config.js";
import {
    saveSpotifyTokens,
    getSpotifyTokens,
    updateSpotifyAccessToken,
    removeSpotifyConnection,
    getSpotifyConnectionInfo,
    SpotifyTokens
} from "../database.js";

const router = express.Router();
const config = loadConfig();

const CLIENT_ID = config.spotify.clientId;
const CLIENT_SECRET = config.spotify.clientSecret;
const REDIRECT_URI = process.env.SPOTIFY_USER_REDIRECT_URI || 'http://127.0.0.1:3001/api/spotify/oauth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:3001';

// Required scopes for user Spotify connection
const USER_SCOPES = [
    'user-read-email',
    'user-read-private',
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-top-read',              // For top artists and tracks
    'user-read-recently-played'   // For listening history
].join(' ');

// PKCE helpers
function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Store code verifiers + userId temporarily
interface OAuthState {
    codeVerifier: string;
    userId: number | null;
    returnUrl?: string;
}
const oauthStates = new Map<string, OAuthState>();

/**
 * GET /api/spotify/login
 * Initiate OAuth flow - redirect user to Spotify authorization
 * Query param: userId (optional) - the logged-in Playlistify user ID
 */
router.get('/login', (req: Request, res: Response) => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const returnUrl = req.query.returnUrl as string | undefined;

    console.log(`🔐 Spotify OAuth login initiated for user: ${userId || 'anonymous'}`);

    // Generate PKCE values
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');

    // Store verifier + userId + returnUrl for callback
    oauthStates.set(state, { codeVerifier, userId, returnUrl });

    // Clean up old states after 10 minutes
    setTimeout(() => oauthStates.delete(state), 10 * 60 * 1000);

    const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: USER_SCOPES,
        redirect_uri: REDIRECT_URI,
        state: state,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        show_dialog: 'true'
    }).toString();

    console.log('🚀 Redirecting to Spotify OAuth...');
    res.redirect(authUrl);
});

/**
 * GET /api/spotify/oauth/callback
 * Handle OAuth callback - exchange code for tokens and save to DB
 */
router.get('/oauth/callback', async (req: Request, res: Response): Promise<void> => {
    const { code, state, error } = req.query;

    if (error) {
        console.error('❌ Spotify OAuth error:', error);
        // Try to get returnUrl from state if available
        const oauthState = oauthStates.get(state as string);
        const returnUrl = oauthState?.returnUrl;
        const errorRedirect = returnUrl 
            ? `${FRONTEND_URL}/${returnUrl}?spotify_error=${error}`
            : `${FRONTEND_URL}/app.html?spotify_error=${error}`;
        res.redirect(errorRedirect);
        return;
    }

    if (!code || !state) {
        // Try to get returnUrl from state if available
        const oauthState = oauthStates.get(state as string);
        const returnUrl = oauthState?.returnUrl;
        const errorRedirect = returnUrl 
            ? `${FRONTEND_URL}/${returnUrl}?spotify_error=missing_params`
            : `${FRONTEND_URL}/app.html?spotify_error=missing_params`;
        res.redirect(errorRedirect);
        return;
    }

    const oauthState = oauthStates.get(state as string);
    if (!oauthState) {
        console.error('❌ Invalid state or expired verifier');
        res.redirect(`${FRONTEND_URL}/app.html?spotify_error=invalid_state`);
        return;
    }

    const { codeVerifier, userId, returnUrl } = oauthState;

    // Clean up used state (but keep returnUrl for error handling)
    oauthStates.delete(state as string);

    try {
        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code as string,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                code_verifier: codeVerifier
            })
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('❌ Token exchange failed:', errorData);
            const errorRedirect = returnUrl 
                ? `${FRONTEND_URL}/${returnUrl}?spotify_error=token_exchange_failed`
                : `${FRONTEND_URL}/app.html?spotify_error=token_exchange_failed`;
            res.redirect(errorRedirect);
            return;
        }

        const tokenData = await tokenResponse.json();
        const { access_token, refresh_token, expires_in } = tokenData;
        const expiresAt = Date.now() + (expires_in * 1000);

        console.log('✅ Spotify tokens obtained successfully');

        // Fetch Spotify user profile
        let spotifyProfile: any = null;
        try {
            const profileResponse = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${access_token}` }
            });
            if (profileResponse.ok) {
                spotifyProfile = await profileResponse.json();
            }
        } catch (e) {
            console.log('⚠️ Could not fetch Spotify profile');
        }

        // If we have a userId, save tokens to database
        if (userId) {
            const tokens: SpotifyTokens = {
                userId,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt,
                spotifyUserId: spotifyProfile?.id,
                spotifyDisplayName: spotifyProfile?.display_name,
                spotifyEmail: spotifyProfile?.email,
                spotifyAvatar: spotifyProfile?.images?.[0]?.url
            };

            saveSpotifyTokens(tokens);
            console.log(`💾 Saved Spotify tokens to DB for user ${userId}`);

            // Redirect to returnUrl if specified, otherwise default to app.html
            const redirectTo = returnUrl 
                ? `${FRONTEND_URL}/${returnUrl}?spotify_connected=true&db_stored=true`
                : `${FRONTEND_URL}/app.html?spotify_connected=true&db_stored=true`;
            res.redirect(redirectTo);
        } else {
            // No userId - fallback to localStorage method (for anonymous users)
            const redirectUrl = `${FRONTEND_URL}/app.html?` + new URLSearchParams({
                spotify_access_token: access_token,
                spotify_refresh_token: refresh_token,
                spotify_expires_in: expires_in.toString(),
                spotify_connected: 'true'
            }).toString();

            res.redirect(redirectUrl);
        }

    } catch (err: any) {
        console.error('❌ OAuth callback error:', err.message);
        // Use returnUrl from oauthState (already extracted before try block)
        const errorRedirect = returnUrl 
            ? `${FRONTEND_URL}/${returnUrl}?spotify_error=auth_failed`
            : `${FRONTEND_URL}/app.html?spotify_error=auth_failed`;
        res.redirect(errorRedirect);
    }
});

/**
 * GET /api/spotify/connection-status
 * Check if a user has a Spotify connection in the database
 */
router.get('/connection-status', (req: Request, res: Response): void => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;

    if (!userId) {
        res.json({ connected: false, message: 'No user ID provided' });
        return;
    }

    const connectionInfo = getSpotifyConnectionInfo(userId);

    if (connectionInfo) {
        res.json({
            connected: true,
            displayName: connectionInfo.displayName,
            email: connectionInfo.email,
            avatar: connectionInfo.avatar,
            spotifyUserId: connectionInfo.spotifyUserId,
            connectedAt: connectionInfo.connectedAt
        });
    } else {
        res.json({ connected: false });
    }
});

/**
 * POST /api/spotify/disconnect
 * Remove Spotify connection for a user
 */
router.post('/disconnect', (req: Request, res: Response): void => {
    const { userId } = req.body;

    if (!userId) {
        res.status(400).json({ error: 'missing_user_id', message: 'User ID is required' });
        return;
    }

    removeSpotifyConnection(userId);

    res.json({ success: true, message: 'Spotify disconnected successfully' });
});

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
            console.error('❌ Token refresh failed for user', userId);
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
 * POST /api/spotify/refresh
 * Refresh access token - now supports both DB-based and client-provided tokens
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
    const { refresh_token, userId } = req.body;

    // If userId provided, use DB tokens
    if (userId) {
        const newToken = await refreshUserToken(userId);
        if (newToken) {
            const tokens = getSpotifyTokens(userId);
            res.json({
                access_token: newToken,
                expires_in: tokens ? Math.floor((tokens.expiresAt - Date.now()) / 1000) : 3600
            });
        } else {
            res.status(401).json({ error: 'refresh_failed', message: 'Failed to refresh token' });
        }
        return;
    }

    // Fallback: client-provided refresh token
    if (!refresh_token) {
        res.status(400).json({ error: 'missing_refresh_token', message: 'Refresh token or userId is required' });
        return;
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Token refresh failed:', errorData);
            res.status(401).json({ error: 'refresh_failed', message: 'Failed to refresh token' });
            return;
        }

        const data = await response.json();
        console.log('✅ Token refreshed successfully');

        res.json({
            access_token: data.access_token,
            expires_in: data.expires_in,
            refresh_token: data.refresh_token || refresh_token
        });

    } catch (err: any) {
        console.error('❌ Token refresh error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
});

/**
 * GET /api/spotify/me
 * Get connected user's Spotify profile - supports both DB tokens and header tokens
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    let accessToken: string | null = null;

    // Try DB tokens first
    if (userId) {
        accessToken = await refreshUserToken(userId);
    }

    // Fallback to header token
    if (!accessToken) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.split(' ')[1];
        }
    }

    if (!accessToken) {
        res.status(401).json({ error: 'unauthorized', message: 'Access token required' });
        return;
    }

    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            res.status(response.status).json({ error: 'spotify_api_error', message: 'Failed to fetch profile' });
            return;
        }

        const userData = await response.json();
        res.json(userData);

    } catch (err: any) {
        console.error('❌ Profile fetch error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
});

/**
 * POST /api/spotify/create-playlist
 * Create a playlist in the connected user's Spotify account
 * Now uses DB tokens if userId is provided
 */
router.post('/create-playlist', async (req: Request, res: Response): Promise<void> => {
    const { name, description, trackUris, isPublic = false, userId } = req.body;
    let accessToken: string | null = null;

    // Try DB tokens first
    if (userId) {
        accessToken = await refreshUserToken(userId);
    }

    // Fallback to header token
    if (!accessToken) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.split(' ')[1];
        }
    }

    if (!accessToken) {
        res.status(401).json({ error: 'unauthorized', message: 'Access token required. Please connect Spotify first.' });
        return;
    }

    if (!name || !trackUris || !Array.isArray(trackUris)) {
        res.status(400).json({ error: 'invalid_request', message: 'Name and trackUris are required' });
        return;
    }

    try {
        // Step 1: Get Spotify user ID
        const userResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!userResponse.ok) {
            res.status(401).json({ error: 'invalid_token', message: 'Token expired or invalid' });
            return;
        }

        const userData = await userResponse.json();
        const spotifyUserId = userData.id;

        console.log(`📦 Creating playlist for Spotify user: ${spotifyUserId}`);

        // Step 2: Create the playlist
        const createResponse = await fetch(`https://api.spotify.com/v1/users/${spotifyUserId}/playlists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                description: description || 'Created by Playlistify AI 🤖',
                public: isPublic
            })
        });

        if (!createResponse.ok) {
            const error = await createResponse.json();
            console.error('❌ Playlist creation failed:', error);
            res.status(createResponse.status).json({ error: 'playlist_creation_failed', message: error.error?.message || 'Failed to create playlist' });
            return;
        }

        const playlist = await createResponse.json();
        console.log(`✅ Playlist created: ${playlist.id}`);

        // Step 3: Add tracks to the playlist (max 100 per request)
        const tracksToAdd = trackUris.slice(0, 100);

        const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris: tracksToAdd })
        });

        if (!addTracksResponse.ok) {
            console.error('❌ Failed to add tracks, but playlist was created');
        } else {
            console.log(`🎵 Added ${tracksToAdd.length} tracks to playlist`);
        }

        res.json({
            success: true,
            message: 'Playlist created in your Spotify account! 🎶',
            playlist: {
                id: playlist.id,
                name: playlist.name,
                external_urls: playlist.external_urls,
                uri: playlist.uri,
                trackCount: tracksToAdd.length
            }
        });

    } catch (err: any) {
        console.error('❌ Create playlist error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Failed to create playlist' });
    }
});

/**
 * POST /api/spotify/save-tokens
 * Save tokens to user profile in database
 */
router.post('/save-tokens', async (req: Request, res: Response): Promise<void> => {
    const { userId, refreshToken, accessToken, expiresIn } = req.body;

    if (!userId || !refreshToken) {
        res.status(400).json({ error: 'missing_params', message: 'userId and refreshToken are required' });
        return;
    }

    try {
        const tokens: SpotifyTokens = {
            userId: parseInt(userId),
            accessToken: accessToken || '',
            refreshToken,
            expiresAt: Date.now() + ((expiresIn || 3600) * 1000)
        };

        saveSpotifyTokens(tokens);

        res.json({
            success: true,
            message: 'Tokens saved to database',
            storage: 'database'
        });
    } catch (err: any) {
        console.error('❌ Save tokens error:', err.message);
        res.status(500).json({ error: 'save_failed', message: 'Failed to save tokens' });
    }
});

/**
 * GET /api/spotify/user-playlists
 * Get user's Spotify playlists
 */
router.get('/user-playlists', async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    let accessToken: string | null = null;

    if (userId) {
        accessToken = await refreshUserToken(userId);
    }

    if (!accessToken) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.split(' ')[1];
        }
    }

    if (!accessToken) {
        res.status(401).json({ error: 'unauthorized', message: 'Access token required' });
        return;
    }

    try {
        const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            res.status(response.status).json({ error: 'spotify_api_error', message: 'Failed to fetch playlists' });
            return;
        }

        const data = await response.json();
        res.json({ playlists: data.items || [] });

    } catch (err: any) {
        console.error('❌ Fetch playlists error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
});

/**
 * GET /api/spotify/top-artists
 * Get user's top artists from Spotify
 */
router.get('/top-artists', async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const timeRange = (req.query.timeRange as string) || 'medium_term'; // short_term, medium_term, long_term
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
        res.status(400).json({ error: 'missing_user_id', message: 'User ID is required' });
        return;
    }

    const accessToken = await refreshUserToken(userId);
    if (!accessToken) {
        res.status(401).json({ error: 'unauthorized', message: 'Spotify not connected' });
        return;
    }

    try {
        const response = await fetch(
            `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=${limit}`,
            {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            res.status(response.status).json({ 
                error: 'spotify_api_error', 
                message: error.error?.message || 'Failed to fetch top artists' 
            });
            return;
        }

        const data = await response.json();
        res.json({ 
            artists: data.items || [],
            total: data.total || 0
        });

    } catch (err: any) {
        console.error('❌ Fetch top artists error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
});

/**
 * GET /api/spotify/top-tracks
 * Get user's top tracks from Spotify
 */
router.get('/top-tracks', async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const timeRange = (req.query.timeRange as string) || 'medium_term';
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
        res.status(400).json({ error: 'missing_user_id', message: 'User ID is required' });
        return;
    }

    const accessToken = await refreshUserToken(userId);
    if (!accessToken) {
        res.status(401).json({ error: 'unauthorized', message: 'Spotify not connected' });
        return;
    }

    try {
        const response = await fetch(
            `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
            {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            res.status(response.status).json({ 
                error: 'spotify_api_error', 
                message: error.error?.message || 'Failed to fetch top tracks' 
            });
            return;
        }

        const data = await response.json();
        res.json({ 
            tracks: data.items || [],
            total: data.total || 0
        });

    } catch (err: any) {
        console.error('❌ Fetch top tracks error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
});

/**
 * GET /api/spotify/recently-played
 * Get user's recently played tracks
 */
router.get('/recently-played', async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userId) {
        res.status(400).json({ error: 'missing_user_id', message: 'User ID is required' });
        return;
    }

    const accessToken = await refreshUserToken(userId);
    if (!accessToken) {
        res.status(401).json({ error: 'unauthorized', message: 'Spotify not connected' });
        return;
    }

    try {
        const response = await fetch(
            `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
            {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            res.status(response.status).json({ 
                error: 'spotify_api_error', 
                message: error.error?.message || 'Failed to fetch recently played' 
            });
            return;
        }

        const data = await response.json();
        res.json({ 
            items: data.items || [],
            cursors: data.cursors || null
        });

    } catch (err: any) {
        console.error('❌ Fetch recently played error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
});

/**
 * GET /api/spotify/user-context
 * Get comprehensive user context (top artists, tracks, playlists, recently played)
 */
router.get('/user-context', async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;

    if (!userId) {
        res.status(400).json({ error: 'missing_user_id', message: 'User ID is required' });
        return;
    }

    const accessToken = await refreshUserToken(userId);
    if (!accessToken) {
        res.status(401).json({ error: 'unauthorized', message: 'Spotify not connected' });
        return;
    }

    try {
        // Fetch all data in parallel
        const [topArtists, topTracks, playlists, recentlyPlayed] = await Promise.all([
            fetch('https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=20', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }).then(r => r.ok ? r.json() : { items: [] }),
            
            fetch('https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=20', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }).then(r => r.ok ? r.json() : { items: [] }),
            
            fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }).then(r => r.ok ? r.json() : { items: [] }),
            
            fetch('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }).then(r => r.ok ? r.json() : { items: [] })
        ]);

        res.json({
            topArtists: topArtists.items || [],
            topTracks: topTracks.items || [],
            playlists: playlists.items || [],
            recentlyPlayed: recentlyPlayed.items || []
        });

    } catch (err: any) {
        console.error('❌ Fetch user context error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
});

/**
 * DELETE /api/spotify/delete-playlist
 * Delete (unfollow) a playlist from user's Spotify
 */
router.delete('/delete-playlist', async (req: Request, res: Response): Promise<void> => {
    const { userId, playlistId } = req.body;
    let accessToken: string | null = null;

    if (userId) {
        accessToken = await refreshUserToken(parseInt(userId));
    }

    if (!accessToken) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.split(' ')[1];
        }
    }

    if (!accessToken) {
        res.status(401).json({ error: 'unauthorized', message: 'Access token required' });
        return;
    }

    if (!playlistId) {
        res.status(400).json({ error: 'missing_playlist_id', message: 'Playlist ID is required' });
        return;
    }

    try {
        // Unfollow (delete) the playlist
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok && response.status !== 200) {
            const errorData = await response.text();
            console.error('❌ Delete playlist failed:', errorData);
            res.status(response.status).json({ error: 'delete_failed', message: 'Failed to delete playlist' });
            return;
        }

        console.log(`🗑️ Playlist ${playlistId} deleted successfully`);
        res.json({ success: true, message: 'Playlist deleted' });

    } catch (err: any) {
        console.error('❌ Delete playlist error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
});

/**
 * POST /api/spotify/save-credentials
 * Save user's Spotify app credentials (client ID, secret, refresh token)
 */
router.post('/save-credentials', async (req: Request, res: Response): Promise<void> => {
    const { userId, clientId, clientSecret, refreshToken } = req.body;

    if (!userId || !refreshToken) {
        res.status(400).json({ error: 'missing_params', message: 'userId and refreshToken are required' });
        return;
    }

    try {
        // Try to get an access token using the provided credentials
        let accessToken = '';
        let expiresAt = Date.now() + 3600000;

        if (clientId && clientSecret && refreshToken) {
            try {
                const response = await fetch('https://accounts.spotify.com/api/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
                    },
                    body: new URLSearchParams({
                        grant_type: 'refresh_token',
                        refresh_token: refreshToken
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    accessToken = data.access_token;
                    expiresAt = Date.now() + (data.expires_in * 1000);
                    console.log('✅ Validated credentials and got access token');
                } else {
                    res.status(400).json({ error: 'invalid_credentials', message: 'Could not authenticate with provided credentials' });
                    return;
                }
            } catch (e) {
                console.error('Failed to validate credentials:', e);
                res.status(400).json({ error: 'validation_failed', message: 'Failed to validate credentials' });
                return;
            }
        }

        // Fetch Spotify profile
        let spotifyProfile: any = null;
        if (accessToken) {
            try {
                const profileResponse = await fetch('https://api.spotify.com/v1/me', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (profileResponse.ok) {
                    spotifyProfile = await profileResponse.json();
                }
            } catch (e) {
                console.log('⚠️ Could not fetch Spotify profile');
            }
        }

        // Save tokens
        const tokens: SpotifyTokens = {
            userId: parseInt(userId),
            accessToken,
            refreshToken,
            expiresAt,
            spotifyUserId: spotifyProfile?.id,
            spotifyDisplayName: spotifyProfile?.display_name,
            spotifyEmail: spotifyProfile?.email,
            spotifyAvatar: spotifyProfile?.images?.[0]?.url
        };

        saveSpotifyTokens(tokens);

        res.json({
            success: true,
            message: 'Spotify connected successfully',
            profile: spotifyProfile ? {
                displayName: spotifyProfile.display_name,
                email: spotifyProfile.email,
                avatar: spotifyProfile.images?.[0]?.url
            } : null
        });

    } catch (err: any) {
        console.error('❌ Save credentials error:', err.message);
        res.status(500).json({ error: 'server_error', message: 'Failed to save credentials' });
    }
});

/**
 * GET /api/spotify/status
 * Check if OAuth endpoints are available
 */
router.get('/status', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        message: 'Spotify OAuth endpoints ready (per-user tokens enabled)',
        endpoints: {
            login: '/api/spotify/login?userId=XXX',
            callback: '/api/spotify/oauth/callback',
            connectionStatus: '/api/spotify/connection-status?userId=XXX',
            disconnect: '/api/spotify/disconnect',
            refresh: '/api/spotify/refresh',
            me: '/api/spotify/me?userId=XXX',
            createPlaylist: '/api/spotify/create-playlist',
            userPlaylists: '/api/spotify/user-playlists?userId=XXX',
            deletePlaylist: '/api/spotify/delete-playlist',
            saveCredentials: '/api/spotify/save-credentials',
            topArtists: '/api/spotify/top-artists?userId=XXX&timeRange=medium_term',
            topTracks: '/api/spotify/top-tracks?userId=XXX&timeRange=medium_term',
            recentlyPlayed: '/api/spotify/recently-played?userId=XXX',
            userContext: '/api/spotify/user-context?userId=XXX'
        }
    });
});

export default router;
