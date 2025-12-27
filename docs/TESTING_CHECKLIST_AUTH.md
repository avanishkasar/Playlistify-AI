# 🧪 Spotify OAuth Testing Checklist

## Pre-Testing Setup

- [ ] Spotify Developer App created
- [ ] Client ID and Secret copied
- [ ] Redirect URI configured: `http://localhost:3001/auth/callback`
- [ ] `.env` file created with credentials
- [ ] Dependencies installed: `npm install`
- [ ] Code compiled: `npm run build`
- [ ] Server started: `npm start`

## ✅ Phase 1: Initial Authentication

### Test 1: Login Page
- [ ] Open `http://localhost:5500`
- [ ] Redirected to `/login.html`
- [ ] "Connect with Spotify" button visible
- [ ] Page styling looks good (green gradient, music notes)
- [ ] Security note visible at bottom

### Test 2: OAuth Initiation
- [ ] Click "Connect with Spotify"
- [ ] Button shows "Connecting..." loading state
- [ ] Redirected to `accounts.spotify.com`
- [ ] Spotify login page loads

### Test 3: Spotify Authorization
- [ ] Log in with your Spotify credentials
- [ ] Authorization page shows "Playlistify" app name
- [ ] Permissions list displayed:
  - [ ] View your profile
  - [ ] View your email
  - [ ] Access your playlists
  - [ ] Modify your playlists
  - [ ] Access your library
- [ ] Click "Authorize"

### Test 4: Callback & Redirect
- [ ] Redirected back to your app
- [ ] URL briefly shows tokens (then clears)
- [ ] Redirected to main app (`/index.html`)

### Test 5: Authenticated State
- [ ] Main app loads successfully
- [ ] User profile visible in navbar
- [ ] Profile picture displays (if you have one)
- [ ] Display name shows correctly
- [ ] Logout button visible

## ✅ Phase 2: Token Management

### Test 6: Token Storage
Open browser DevTools (F12) → Console:

```javascript
// Check localStorage
localStorage.getItem('spotify_access_token')  // Should return token string
localStorage.getItem('spotify_refresh_token') // Should return token string
localStorage.getItem('spotify_token_expiry')  // Should return timestamp

// Check auth state
spotifyAuth.isAuthenticated()  // Should return true
spotifyAuth.getUser()          // Should return user object
```

**Expected Results:**
- [ ] Access token exists
- [ ] Refresh token exists
- [ ] Expiry timestamp is ~1 hour in future
- [ ] `isAuthenticated()` returns `true`
- [ ] User object has correct data

### Test 7: User Profile Data
```javascript
const user = spotifyAuth.getUser();
console.log(user);
```

**Verify user object contains:**
- [ ] `display_name` - Your Spotify name
- [ ] `email` - Your email
- [ ] `id` - User ID
- [ ] `images` - Profile pictures array
- [ ] `product` - "premium" or "free"
- [ ] `country` - Your country code

### Test 8: API Calls with Token
```javascript
const token = await spotifyAuth.getAccessToken();
const response = await fetch('https://api.spotify.com/v1/me/playlists', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const playlists = await response.json();
console.log(playlists);
```

**Expected Results:**
- [ ] Token retrieved successfully
- [ ] API call succeeds (status 200)
- [ ] Playlists data returned
- [ ] No CORS errors

## ✅ Phase 3: Session Persistence

### Test 9: Page Reload
- [ ] Refresh the page (F5)
- [ ] Still logged in
- [ ] User profile still visible
- [ ] No login prompt

### Test 10: Browser Restart
- [ ] Close browser completely
- [ ] Open browser again
- [ ] Navigate to `http://localhost:5500`
- [ ] Still logged in
- [ ] User profile displays

### Test 11: New Tab
- [ ] Open new tab
- [ ] Navigate to `http://localhost:5500`
- [ ] Already logged in
- [ ] Same user profile

## ✅ Phase 4: Logout & Re-login

### Test 12: Logout
- [ ] Click "Logout" button in navbar
- [ ] Redirected to `/login.html`
- [ ] User profile removed from navbar

**Verify in Console:**
```javascript
localStorage.getItem('spotify_access_token')  // Should be null
spotifyAuth.isAuthenticated()                 // Should be false
spotifyAuth.getUser()                         // Should be null
```

### Test 13: Re-login
- [ ] Click "Connect with Spotify" again
- [ ] Redirected to Spotify (may auto-authorize)
- [ ] Redirected back to app
- [ ] Logged in again successfully

## ✅ Phase 5: Token Refresh

### Test 14: Token Expiry Simulation
```javascript
// Manually expire token
localStorage.setItem('spotify_token_expiry', Date.now() - 1000);

// Try to get token (should auto-refresh)
const token = await spotifyAuth.getAccessToken();
console.log('Token refreshed:', token);
```

**Expected Results:**
- [ ] Token refresh triggered automatically
- [ ] New access token received
- [ ] New expiry time set
- [ ] No errors

### Test 15: Refresh Endpoint Test
```javascript
const refreshToken = localStorage.getItem('spotify_refresh_token');
const response = await fetch('http://localhost:3001/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: refreshToken })
});
const data = await response.json();
console.log(data);
```

**Expected Results:**
- [ ] Status 200
- [ ] New `access_token` in response
- [ ] `expires_in` field present

## ✅ Phase 6: Error Handling

### Test 16: Invalid Credentials
- [ ] Logout
- [ ] Modify `.env` with wrong Client ID
- [ ] Restart server
- [ ] Try to login
- [ ] Should see error message

### Test 17: Network Error
- [ ] Turn off internet
- [ ] Try to make API call
- [ ] Error handled gracefully

### Test 18: Expired Refresh Token
```javascript
// Set invalid refresh token
localStorage.setItem('spotify_refresh_token', 'invalid_token');
localStorage.setItem('spotify_token_expiry', Date.now() - 1000);

// Try to refresh
await spotifyAuth.getAccessToken();
```

**Expected Results:**
- [ ] Refresh fails
- [ ] Logged out automatically
- [ ] Redirected to login

## ✅ Phase 7: UI/UX

### Test 19: Responsive Design
- [ ] Open DevTools (F12) → Toggle device toolbar
- [ ] Test on mobile sizes (375px, 414px)
- [ ] Login page looks good on mobile
- [ ] Auth button in navbar responsive
- [ ] User profile readable on small screens

### Test 20: Animations
- [ ] Music notes float on login page
- [ ] Button hover effects work
- [ ] Loading states visible
- [ ] Smooth transitions

### Test 21: Different User
- [ ] Logout current user
- [ ] Login with different Spotify account
- [ ] Correct user profile displays
- [ ] Correct playlists accessible

## ✅ Phase 8: Production Readiness

### Test 22: Environment Variables
```bash
# Test with production-like URLs
SPOTIFY_REDIRECT_URI=https://example.com/auth/callback
FRONTEND_URL=https://example.com
```

- [ ] Configuration loads correctly
- [ ] No hardcoded localhost URLs in code

### Test 23: HTTPS Simulation
- [ ] Use tool like `ngrok` for HTTPS tunnel
- [ ] Update Spotify app redirect URI
- [ ] Test OAuth flow over HTTPS
- [ ] Verify secure cookie handling

### Test 24: Error Messages
- [ ] Clear error messages for users
- [ ] No sensitive data in errors
- [ ] Console errors helpful for debugging

## ✅ Phase 9: Edge Cases

### Test 25: User Denies Authorization
- [ ] Logout
- [ ] Click "Connect with Spotify"
- [ ] Click "Cancel" on Spotify authorization page
- [ ] Redirected back with error
- [ ] Error message displayed

### Test 26: Concurrent Sessions
- [ ] Login in Chrome
- [ ] Login in Firefox (same Spotify account)
- [ ] Both sessions work independently
- [ ] Logout in one doesn't affect other

### Test 27: Token Revocation
- [ ] Login to app
- [ ] Go to Spotify Account Settings → Apps
- [ ] Remove Playlistify access
- [ ] Try to use app
- [ ] Error detected and handled

## 📊 Test Results Summary

| Test Phase | Tests | Passed | Failed |
|------------|-------|--------|--------|
| Initial Auth | 5 | ☐ | ☐ |
| Token Management | 3 | ☐ | ☐ |
| Session Persistence | 3 | ☐ | ☐ |
| Logout & Re-login | 2 | ☐ | ☐ |
| Token Refresh | 2 | ☐ | ☐ |
| Error Handling | 3 | ☐ | ☐ |
| UI/UX | 3 | ☐ | ☐ |
| Production Ready | 3 | ☐ | ☐ |
| Edge Cases | 3 | ☐ | ☐ |
| **TOTAL** | **27** | **☐** | **☐** |

## 🐛 Common Issues & Solutions

### Issue: "Invalid redirect URI"
**Solution:** 
- Redirect URI in `.env` must EXACTLY match Spotify app settings
- Check for extra spaces or trailing slashes

### Issue: Stuck on login page
**Solution:**
- Check browser console for errors
- Verify Client ID and Secret are correct
- Ensure server is running

### Issue: Token refresh fails
**Solution:**
- Check refresh token is valid
- Verify Client Secret is correct
- Server must be able to reach Spotify API

### Issue: CORS errors
**Solution:**
- Frontend and backend must be on allowed origins
- Check Spotify app settings

## ✅ All Tests Passed?

If all tests pass:
- ✅ OAuth implementation is working correctly
- ✅ Ready for production deployment
- ✅ Users can authenticate seamlessly

## 📝 Notes

Test Date: _______________

Tester: _______________

Environment:
- [ ] Local Development
- [ ] Staging
- [ ] Production

Browser Tested:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

Additional Notes:
_______________________________________
_______________________________________
_______________________________________
