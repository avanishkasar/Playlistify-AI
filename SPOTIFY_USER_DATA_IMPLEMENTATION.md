# Spotify User Data Implementation Guide

## Overview

This guide shows how to fetch user's top artists, top tracks, and existing playlists from Spotify API (similar to Playlistable's features).

---

## Required Spotify API Scopes

Add these scopes to your OAuth request:

```typescript
const USER_SCOPES = [
    'user-read-email',
    'user-read-private',
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-top-read',        // NEW: For top artists/tracks
    'user-read-recently-played'  // NEW: For listening history
].join(' ');
```

**Location:** `src/routes/spotifyOAuthRoutes.ts` line 28-35

---

## New API Endpoints to Add

### 1. Get User's Top Artists

**Endpoint:** `GET /api/spotify/top-artists?userId=1&timeRange=medium_term&limit=20`

**Time Ranges:**
- `short_term` - Last 4 weeks
- `medium_term` - Last 6 months (default)
- `long_term` - All time

**Implementation:**

```typescript
// Add to src/routes/spotifyOAuthRoutes.ts

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
```

### 2. Get User's Top Tracks

**Endpoint:** `GET /api/spotify/top-tracks?userId=1&timeRange=medium_term&limit=20`

**Implementation:**

```typescript
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
```

### 3. Get User's Recently Played Tracks

**Endpoint:** `GET /api/spotify/recently-played?userId=1&limit=50`

**Implementation:**

```typescript
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
```

### 4. Combined User Context Endpoint

**Endpoint:** `GET /api/spotify/user-context?userId=1`

Returns all user data in one call (top artists, top tracks, playlists, recently played).

**Implementation:**

```typescript
/**
 * GET /api/spotify/user-context
 * Get comprehensive user context (top artists, tracks, playlists)
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
```

---

## Frontend Implementation

### Fetch User Context on Page Load

```javascript
// Add to public/app.html or public/spotify-library.html

async function loadUserContext() {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
        const response = await fetch(`/api/spotify/user-context?userId=${userId}`);
        const data = await response.json();

        // Display top artists
        renderTopArtists(data.topArtists);
        
        // Display top tracks
        renderTopTracks(data.topTracks);
        
        // Display existing playlists
        renderExistingPlaylists(data.playlists);
        
        // Store for @Artist and #Track tagging
        window.userSpotifyContext = data;
        
    } catch (err) {
        console.error('Failed to load user context:', err);
    }
}

function renderTopArtists(artists) {
    const container = document.getElementById('topArtistsContainer');
    if (!container) return;

    container.innerHTML = artists.map(artist => `
        <div class="artist-chip" onclick="addArtistToPrompt('${artist.name}')">
            <img src="${artist.images[0]?.url || ''}" alt="${artist.name}">
            <span>${artist.name}</span>
        </div>
    `).join('');
}

function renderTopTracks(tracks) {
    const container = document.getElementById('topTracksContainer');
    if (!container) return;

    container.innerHTML = tracks.map(track => `
        <div class="track-chip" onclick="addTrackToPrompt('${track.name}', '${track.artists[0]?.name}')">
            <span>${track.name}</span>
            <span class="artist-name">${track.artists[0]?.name}</span>
        </div>
    `).join('');
}

// Add to prompt functions
function addArtistToPrompt(artistName) {
    const promptInput = document.getElementById('playlistPrompt');
    if (promptInput) {
        promptInput.value += ` @${artistName}`;
        promptInput.focus();
    }
}

function addTrackToPrompt(trackName, artistName) {
    const promptInput = document.getElementById('playlistPrompt');
    if (promptInput) {
        promptInput.value += ` #${trackName} by ${artistName}`;
        promptInput.focus();
    }
}
```

---

## @Artist and #Track Tagging Implementation

### Parse Tags in Backend

```typescript
// Add to src/services/intentEngine.ts or create new file

export function parsePromptTags(prompt: string): {
    artists: string[];
    tracks: string[];
    cleanPrompt: string;
} {
    const artists: string[] = [];
    const tracks: string[] = [];
    
    // Extract @Artist tags
    const artistMatches = prompt.match(/@(\w+(?:\s+\w+)*)/g);
    if (artistMatches) {
        artistMatches.forEach(match => {
            const artist = match.replace('@', '').trim();
            if (artist) artists.push(artist);
        });
    }
    
    // Extract #Track tags
    const trackMatches = prompt.match(/#([^#@]+?)(?:\s+by\s+([^#@]+))?/g);
    if (trackMatches) {
        trackMatches.forEach(match => {
            const track = match.replace('#', '').replace(/\s+by\s+.*$/, '').trim();
            if (track) tracks.push(track);
        });
    }
    
    // Clean prompt (remove tags for AI processing)
    let cleanPrompt = prompt
        .replace(/@(\w+(?:\s+\w+)*)/g, '')
        .replace(/#([^#@]+?)(?:\s+by\s+[^#@]+)?/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    return { artists, tracks, cleanPrompt };
}
```

### Use Tags in Playlist Generation

```typescript
// Modify src/services/agenticEngine.ts generateAgenticPlaylist function

export async function generateAgenticPlaylist(
    userId: string,
    rawPrompt: string,
    options?: { ... }
): Promise<AgenticPlaylist | { error: string }> {
    
    // Parse tags
    const { artists, tracks, cleanPrompt } = parsePromptTags(rawPrompt);
    
    // Use artists as seed for recommendations
    if (artists.length > 0) {
        // Search for artist IDs
        const artistIds = await Promise.all(
            artists.map(name => searchArtistId(name))
        );
        
        // Use in recommendations
        const recommendations = await spotifyHandler.getRecommendations(
            artistIds.filter(Boolean),
            undefined,
            undefined,
            targetCount
        );
    }
    
    // Use tracks as seed
    if (tracks.length > 0) {
        const trackUris = await Promise.all(
            tracks.map(name => searchTrackUri(name))
        );
        
        // Include in playlist or use for recommendations
    }
    
    // Continue with normal flow using cleanPrompt
    // ...
}
```

---

## Stripe Payment Integration

### Install Stripe

```bash
npm install stripe @stripe/stripe-js
```

### Backend Setup

```typescript
// Create src/routes/paymentRoutes.ts (or update existing)

import Stripe from 'stripe';
import express, { Request, Response } from 'express';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
});

/**
 * POST /api/payment/create-checkout-session
 * Create Stripe checkout session
 */
router.post('/create-checkout-session', async (req: Request, res: Response) => {
    const { userId, plan } = req.body; // plan: 'pro' or 'enterprise'
    
    const prices = {
        pro: process.env.STRIPE_PRO_PRICE_ID,
        enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID
    };
    
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: prices[plan as keyof typeof prices],
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
            client_reference_id: userId.toString(),
            metadata: {
                userId: userId.toString(),
                plan: plan
            }
        });
        
        res.json({ sessionId: session.id, url: session.url });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/payment/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature']!;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    
    let event: Stripe.Event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;
            // Update user subscription in database
            await updateUserSubscription(
                parseInt(session.metadata!.userId),
                session.metadata!.plan
            );
            break;
        case 'customer.subscription.deleted':
            // Handle subscription cancellation
            break;
    }
    
    res.json({ received: true });
});

export default router;
```

### Frontend Integration

```javascript
// Add to public/app.html or create payment.js

async function initiatePayment(plan) {
    const userId = getCurrentUserId();
    
    try {
        const response = await fetch('/api/payment/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, plan })
        });
        
        const { url } = await response.json();
        window.location.href = url; // Redirect to Stripe Checkout
    } catch (err) {
        console.error('Payment initiation failed:', err);
    }
}
```

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Summary

**To implement Playlistable-like features:**

1. ✅ Add `user-top-read` scope to OAuth
2. ✅ Create endpoints for top artists/tracks
3. ✅ Fetch user context on page load
4. ✅ Display top artists/tracks in UI
5. ✅ Implement @Artist and #Track tagging
6. ✅ Parse tags in backend
7. ✅ Use tags in playlist generation
8. ✅ Integrate Stripe for payments

**Next Steps:**
1. Update OAuth scopes
2. Add new API endpoints
3. Update frontend to fetch and display user data
4. Implement tagging UI
5. Set up Stripe account and integrate

