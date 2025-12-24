# 🎵 Spotify OAuth - Quick Reference

## Backend Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | GET | Redirects to Spotify authorization |
| `/auth/callback` | GET | Handles OAuth callback, exchanges code for tokens |
| `/auth/refresh` | POST | Refreshes expired access token |
| `/auth/logout` | POST | Logs out user (client clears tokens) |
| `/auth/me` | GET | Gets current user profile |

## Frontend Usage

### Check if user is logged in
```javascript
if (spotifyAuth.isAuthenticated()) {
  console.log('User is logged in');
}
```

### Get current user
```javascript
const user = spotifyAuth.getUser();
console.log(user.display_name);
```

### Get access token
```javascript
const token = await spotifyAuth.getAccessToken();
// Use token for Spotify API calls
```

### Login
```javascript
spotifyAuth.login();
// Redirects to Spotify login
```

### Logout
```javascript
spotifyAuth.logout();
// Clears all tokens
```

### Listen for auth changes
```javascript
const unsubscribe = spotifyAuth.subscribe(() => {
  console.log('Auth state changed');
  const user = spotifyAuth.getUser();
  // Update UI
});

// Later, cleanup:
unsubscribe();
```

## Environment Variables

```bash
# Required
SPOTIFY_CLIENT_ID=abc123
SPOTIFY_CLIENT_SECRET=xyz789
SPOTIFY_REDIRECT_URI=http://localhost:3001/auth/callback
FRONTEND_URL=http://localhost:5500

# Optional
PORT=3001
```

## Token Storage

Tokens are stored in `localStorage`:
- `spotify_access_token` - API access token (expires in 1 hour)
- `spotify_refresh_token` - Long-lived token for refreshing access
- `spotify_token_expiry` - Timestamp when access token expires

## Making Authenticated API Calls

```javascript
const token = await spotifyAuth.getAccessToken();

const response = await fetch('https://api.spotify.com/v1/me/playlists', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const playlists = await response.json();
```

## Common Spotify API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/v1/me` | Current user profile |
| `/v1/me/playlists` | User's playlists |
| `/v1/me/tracks` | User's saved tracks |
| `/v1/me/top/artists` | User's top artists |
| `/v1/me/top/tracks` | User's top tracks |
| `/v1/playlists/{id}` | Get playlist details |
| `/v1/playlists/{id}/tracks` | Playlist tracks |
| `/v1/search` | Search for tracks/artists/albums |
| `/v1/recommendations` | Get recommendations |

## User Object Structure

```javascript
{
  display_name: "John Doe",
  email: "john@example.com",
  id: "user123",
  images: [{ url: "https://..." }],
  product: "premium", // or "free"
  country: "US"
}
```

## Error Handling

```javascript
try {
  const token = await spotifyAuth.getAccessToken();
  if (!token) {
    // User not logged in
    spotifyAuth.login();
    return;
  }
  
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.status === 401) {
    // Token invalid - will auto-refresh
    await spotifyAuth.refreshAccessToken();
  }
  
  if (!response.ok) {
    throw new Error('API request failed');
  }
  
  const data = await response.json();
} catch (error) {
  console.error('Error:', error);
}
```

## OAuth Flow Diagram

```
┌─────────────┐
│   User      │ Clicks "Connect with Spotify"
└─────┬───────┘
      │
      v
┌─────────────┐
│  Frontend   │ Redirects to /auth/login
└─────┬───────┘
      │
      v
┌─────────────┐
│  Backend    │ Redirects to Spotify with Client ID
└─────┬───────┘
      │
      v
┌─────────────┐
│  Spotify    │ User logs in and authorizes
└─────┬───────┘
      │
      v
┌─────────────┐
│  Backend    │ Receives code, exchanges for tokens
└─────┬───────┘
      │
      v
┌─────────────┐
│  Frontend   │ Receives tokens, stores in localStorage
└─────┬───────┘
      │
      v
┌─────────────┐
│   Logged    │ ✓ User authenticated!
│     In      │
└─────────────┘
```

## Testing

### Test authentication locally
```bash
# 1. Start server
npm run dev

# 2. Open browser
http://localhost:5500

# 3. Click "Connect with Spotify"

# 4. Check browser console
console.log(spotifyAuth.getUser());
```

### Clear auth and test again
```javascript
// In browser console:
localStorage.clear();
location.reload();
```

## Production Checklist

- [ ] Update Spotify App redirect URI
- [ ] Set production environment variables
- [ ] Enable HTTPS
- [ ] Update FRONTEND_URL to production domain
- [ ] Test OAuth flow on production
- [ ] Set up error monitoring
- [ ] Configure CORS if needed
