/**
 * Spotify OAuth Authentication Routes
 * Handles user authentication flow with Spotify
 */

import express, { Request, Response } from "express";
import { loadConfig } from "./config.js";

const router = express.Router();
const config = loadConfig();

const CLIENT_ID = config.spotify.clientId;
const CLIENT_SECRET = config.spotify.clientSecret;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/auth/callback';
// Frontend URL - default to index.html since frontend is served from same server
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

/**
 * Step 1: Redirect user to Spotify authorization page
 * User clicks "Connect with Spotify" → redirected here
 */
router.get('/login', (req: Request, res: Response) => {
  console.log('🔐 Auth login endpoint hit');
  console.log('Client ID:', CLIENT_ID);
  console.log('Redirect URI:', REDIRECT_URI);
  
  const scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-library-modify',
    'user-top-read',
    'user-read-recently-played'
  ].join(' ');

  const authUrl = 'https://accounts.spotify.com/authorize?' + 
    new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scopes,
      redirect_uri: REDIRECT_URI,
      show_dialog: 'true'
    }).toString();

  console.log('🚀 Redirecting to:', authUrl);
  res.redirect(authUrl);
});

/**
 * Step 2: Spotify redirects back here with authorization code
 * Exchange code for user's access token and refresh token
 */
router.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error) {
    console.error('Authorization error:', error);
    return res.redirect(`${FRONTEND_URL}?error=access_denied`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}?error=no_code`);
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
      },
      body: new URLSearchParams({
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return res.redirect(`${FRONTEND_URL}?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Redirect to frontend with tokens
    const redirectUrl = `${FRONTEND_URL}?` + new URLSearchParams({
      access_token,
      refresh_token,
      expires_in: expires_in.toString()
    }).toString();

    res.redirect(redirectUrl);

  } catch (err: any) {
    console.error('Error in callback:', err.message);
    res.redirect(`${FRONTEND_URL}?error=auth_failed`);
  }
});

/**
 * Step 3: Refresh expired access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ 
      error: 'missing_refresh_token',
      message: 'Refresh token is required' 
    });
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
      console.error('Token refresh error:', errorData);
      return res.status(401).json({ 
        error: 'refresh_failed',
        message: 'Failed to refresh access token'
      });
    }

    const data = await response.json();
    res.json({
      access_token: data.access_token,
      expires_in: data.expires_in
    });

  } catch (err: any) {
    console.error('Error refreshing token:', err.message);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Internal server error'
    });
  }
});

/**
 * Logout endpoint (client-side will clear tokens)
 */
router.post('/logout', (req: Request, res: Response) => {
  res.json({ 
    status: 'success',
    message: 'Logged out successfully' 
  });
});

/**
 * Get current user's Spotify profile
 */
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'unauthorized',
      message: 'Authorization header required' 
    });
  }

  const accessToken = authHeader.split(' ')[1];

  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'spotify_api_error',
        message: 'Failed to fetch user profile'
      });
    }

    const userData = await response.json();
    res.json(userData);

  } catch (err: any) {
    console.error('Error fetching user profile:', err.message);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Internal server error'
    });
  }
});

export default router;
