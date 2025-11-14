/**
 * Simple development server for local testing
 * This bypasses Apify Actor requirements and runs a basic Express server
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import SpotifyWebApi from 'spotify-web-api-node';

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true
}));

app.use(express.json());

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID || 'e7b084553d51471fbc32cb2e8a90936d',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '5db1a269182b45c5ba59406192bfa704',
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN
});

// Refresh access token on startup
async function refreshAccessToken() {
    try {
        const data = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(data.body.access_token);
        console.log('✅ Access token refreshed successfully');
        
        // Refresh every 50 minutes (token expires in 1 hour)
        setTimeout(refreshAccessToken, 50 * 60 * 1000);
    } catch (error) {
        console.error('❌ Error refreshing access token:', error);
    }
}

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', server: 'dev-server' });
});

// Search tracks
app.post('/api/search', async (req, res) => {
    try {
        const { query, limit = 20 } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const result = await spotifyApi.searchTracks(query, { limit });
        
        const tracks = result.body.tracks?.items.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0]?.name || 'Unknown Artist',
            album: track.album.name,
            uri: track.uri,
            duration_ms: track.duration_ms,
            preview_url: track.preview_url
        })) || [];

        res.json({ tracks });
    } catch (error: any) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: 'Failed to search tracks',
            details: error.message 
        });
    }
});

// Get recommendations
app.post('/api/recommend', async (req, res) => {
    try {
        const { seedTracks, limit = 20 } = req.body;
        
        if (!seedTracks || seedTracks.length === 0) {
            return res.status(400).json({ error: 'Seed tracks are required' });
        }

        const result = await spotifyApi.getRecommendations({
            seed_tracks: seedTracks.slice(0, 5), // Spotify allows max 5 seeds
            limit
        });

        const tracks = result.body.tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0]?.name || 'Unknown Artist',
            album: track.album.name,
            uri: track.uri,
            duration_ms: track.duration_ms,
            preview_url: track.preview_url
        }));

        res.json({ tracks });
    } catch (error: any) {
        console.error('Recommendations error:', error);
        res.status(500).json({ 
            error: 'Failed to get recommendations',
            details: error.message 
        });
    }
});

// Create playlist
app.post('/api/create-playlist', async (req, res) => {
    try {
        const { name, description, tracks } = req.body;

        if (!name || !tracks || tracks.length === 0) {
            return res.status(400).json({ 
                error: 'Name and tracks are required' 
            });
        }

        // Get current user
        const userData = await spotifyApi.getMe();
        const userId = userData.body.id;

        // Create playlist
        const playlistData = await spotifyApi.createPlaylist(name, {
            public: false
        });

        const playlistId = playlistData.body.id;

        // Add tracks (Spotify allows max 100 tracks per request)
        const trackUris = tracks.map((track: any) => track.uri || `spotify:track:${track.id}`);
        
        for (let i = 0; i < trackUris.length; i += 100) {
            const batch = trackUris.slice(i, i + 100);
            await spotifyApi.addTracksToPlaylist(playlistId, batch);
        }

        res.json({
            success: true,
            playlistId,
            playlistUrl: playlistData.body.external_urls.spotify,
            message: `Playlist "${name}" created with ${tracks.length} tracks`
        });
    } catch (error: any) {
        console.error('Create playlist error:', error);
        res.status(500).json({ 
            error: 'Failed to create playlist',
            details: error.message 
        });
    }
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Development server running on http://localhost:${PORT}`);
    console.log(`📡 Frontend should be at http://localhost:8080`);
    console.log('\nAvailable endpoints:');
    console.log('  GET  /health');
    console.log('  POST /api/search');
    console.log('  POST /api/recommend');
    console.log('  POST /api/create-playlist');
    console.log('\n⏳ Refreshing Spotify access token...');
    await refreshAccessToken();
});
