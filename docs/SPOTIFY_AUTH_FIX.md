# 🔧 Spotify Authentication Troubleshooting Guide

## Error: "invalid_client"

This error means Spotify's API rejected your credentials. This guide will help you fix it.

---

## 🔍 Step 1: Verify Your Spotify App Configuration

### A. Check Spotify Developer Dashboard

1. **Go to**: https://developer.spotify.com/dashboard
2. **Sign in** with your Spotify account
3. **Find your app** or create a new one if needed
4. **Click on your app** to view settings

### B. Get Correct Credentials

In your app settings, you'll see:

```
Client ID: [32-character string like: abc123def456...]
Client Secret: [click "Show Client Secret"]
```

**⚠️ Important:**
- The Client ID and Secret are **case-sensitive**
- There should be **no spaces** before or after
- If you regenerate the secret, you **must use the new one**

### C. Check Redirect URIs

Make sure you have at least one redirect URI configured:
- For local testing: `http://localhost:8888/callback`
- For production: Your production callback URL

---

## 🔑 Step 2: Get a Valid Refresh Token

The refresh token MUST match your Client ID and Secret. Follow these steps carefully:

### A. Local Authorization Flow (Recommended)

1. **Clone this helper script** (or use the one below):

```javascript
// spotify-auth-helper.js
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');

const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = 'http://localhost:8888/callback';

const spotifyApi = new SpotifyWebApi({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI
});

const scopes = [
  'playlist-modify-public',
  'playlist-modify-private',
  'playlist-read-private',
  'user-library-read'
];

const app = express();

app.get('/login', (req, res) => {
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;
    
    console.log('\n✅ SUCCESS! Your tokens:');
    console.log('\nAccess Token:', access_token);
    console.log('\nRefresh Token:', refresh_token);
    console.log('\n⚠️ SAVE THE REFRESH TOKEN - you need it for your Apify actor!');
    
    res.send(`
      <h1>✅ Authorization Successful!</h1>
      <p>Check your terminal for the tokens.</p>
      <p><strong>Refresh Token:</strong> ${refresh_token}</p>
      <p>Save this refresh token and use it in your Apify actor configuration.</p>
    `);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.send('Error getting tokens: ' + error.message);
  }
});

app.listen(8888, () => {
  console.log('\n🎵 Spotify Authorization Helper');
  console.log('\n1. Open this URL in your browser:');
  console.log('   http://localhost:8888/login\n');
  console.log('2. Log in with your Spotify account');
  console.log('3. Authorize the app');
  console.log('4. Copy the refresh token from the terminal\n');
});
```

2. **Run the helper**:
```bash
# Install dependencies first
npm install express spotify-web-api-node

# Run the helper
node spotify-auth-helper.js
```

3. **Follow the instructions** to get your refresh token

### B. Alternative: Use cURL (Advanced)

If you already have an authorization code:

```bash
curl -X POST https://accounts.spotify.com/api/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTHORIZATION_CODE" \
  -d "redirect_uri=YOUR_REDIRECT_URI" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

---

## 🔐 Step 3: Configure Apify Secrets

### Method A: Using Apify Console (Recommended)

1. **Go to**: https://console.apify.com/actors
2. **Open your actor**: `jubilant_pheasant/playlistify-ai`
3. **Click "Settings"** → **"Environment Variables"**
4. **Add these secrets**:

```
SPOTIFY_CLIENT_ID = your_client_id_here
SPOTIFY_CLIENT_SECRET = your_client_secret_here
SPOTIFY_REFRESH_TOKEN = your_refresh_token_here
```

**✅ Make sure to:**
- Mark them as **"Secret"** (eye icon)
- Remove any extra spaces
- Save changes

### Method B: Using Actor Input

When running the actor, provide these inputs:
```json
{
  "spotifyClientId": "your_client_id_here",
  "spotifyClientSecret": "your_client_secret_here",
  "spotifyRefreshToken": "your_refresh_token_here",
  "enableNLP": true,
  "port": 3001
}
```

---

## 🧪 Step 4: Test Your Credentials

### A. Test Locally

Create a test script to verify credentials:

```javascript
// test-spotify-auth.js
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
});

spotifyApi.setRefreshToken('YOUR_REFRESH_TOKEN');

async function testAuth() {
  try {
    console.log('🔄 Testing Spotify authentication...\n');
    
    // Try to refresh the access token
    const data = await spotifyApi.refreshAccessToken();
    const accessToken = data.body['access_token'];
    
    console.log('✅ SUCCESS! Authentication works!');
    console.log('Access token:', accessToken.substring(0, 20) + '...');
    console.log('Expires in:', data.body['expires_in'], 'seconds\n');
    
    // Test a simple API call
    spotifyApi.setAccessToken(accessToken);
    const me = await spotifyApi.getMe();
    console.log('✅ API call successful!');
    console.log('User:', me.body.display_name);
    console.log('Email:', me.body.email);
    
  } catch (error) {
    console.error('❌ FAILED! Error:', error.message);
    console.error('\nPossible issues:');
    console.error('- Client ID or Secret is incorrect');
    console.error('- Refresh token is invalid or expired');
    console.error('- Refresh token does not match the client credentials');
    console.error('\nPlease regenerate your credentials and try again.');
  }
}

testAuth();
```

Run it:
```bash
node test-spotify-auth.js
```

### B. Test with cURL

```bash
# Replace with your actual credentials
CLIENT_ID="your_client_id"
CLIENT_SECRET="your_client_secret"
REFRESH_TOKEN="your_refresh_token"

# Base64 encode client credentials
AUTH=$(echo -n "$CLIENT_ID:$CLIENT_SECRET" | base64)

# Test refresh token
curl -X POST https://accounts.spotify.com/api/token \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=$REFRESH_TOKEN"
```

**Expected response:**
```json
{
  "access_token": "BQD...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "..."
}
```

**Error response (invalid_client):**
```json
{
  "error": "invalid_client",
  "error_description": "Invalid client"
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Client credentials are wrong"
**Solution:**
- Copy Client ID and Secret again from Spotify Dashboard
- Make sure no spaces or newlines are included
- Regenerate Client Secret if needed

### Issue 2: "Refresh token doesn't work"
**Solution:**
- Refresh token must be obtained using the SAME Client ID/Secret
- Generate a new refresh token using the authorization flow
- Make sure the scopes include: `playlist-modify-public`, `playlist-modify-private`

### Issue 3: "Works locally but not on Apify"
**Solution:**
- Check Apify environment variables are set correctly
- Make sure secrets are marked as "Secret" in Apify
- Verify no special characters are causing encoding issues
- Check actor logs for the actual values being used (masked)

### Issue 4: "Credentials keep expiring"
**Solution:**
- Only access tokens expire (after 1 hour) - this is normal
- Refresh tokens should NOT expire if used regularly
- Your code already handles token refresh automatically
- If refresh token expires, generate a new one

---

## 📊 Diagnostic Checklist

Use this checklist to verify everything:

- [ ] Client ID is correct (32 characters, alphanumeric)
- [ ] Client Secret is correct (32 characters, alphanumeric)
- [ ] Refresh token is valid (long string, starts with `AQ...`)
- [ ] Credentials tested locally with test script ✅
- [ ] Environment variables set in Apify Console
- [ ] Variables marked as "Secret" in Apify
- [ ] Actor rebuilt after updating credentials
- [ ] Actor logs show "Spotify access token refreshed" message
- [ ] No extra spaces or newlines in credentials

---

## 🔄 Step 5: Update & Deploy

After fixing credentials:

1. **Update Apify environment variables** with correct values
2. **Rebuild the actor** (or wait for auto-rebuild)
3. **Test the actor** with a simple request
4. **Check logs** for successful authentication

---

## 📝 Example: Complete Setup

Here's a complete example workflow:

```bash
# 1. Get credentials from Spotify Dashboard
CLIENT_ID="a1b2c3d4e5f6..."
CLIENT_SECRET="x9y8z7w6v5u4..."

# 2. Generate refresh token (run helper script)
node spotify-auth-helper.js
# Follow browser prompts
REFRESH_TOKEN="AQC5xG7..."

# 3. Test credentials locally
node test-spotify-auth.js
# Should show: ✅ SUCCESS!

# 4. Add to Apify environment variables
# Go to Apify Console → Your Actor → Settings → Environment Variables

# 5. Rebuild and test
```

---

## 🆘 Still Having Issues?

If you're still getting `invalid_client` errors after following this guide:

1. **Create a NEW Spotify app** in the dashboard
2. **Get fresh credentials** from the new app
3. **Generate a new refresh token** using the new credentials
4. **Test locally first** before updating Apify
5. **Check Apify logs** for specific error messages

### Debug Mode

Enable detailed logging by adding this to your actor input:
```json
{
  "debug": true
}
```

Or check the logs in `spotifyHandler.ts` - they show:
- ✅ Token refresh success
- ❌ Authentication failures
- 🔍 Error details from Spotify API

---

## 📚 Additional Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Spotify Authorization Guide](https://developer.spotify.com/documentation/general/guides/authorization-guide/)
- [Apify Environment Variables](https://docs.apify.com/platform/actors/development/environment-variables)

---

## ✅ Success Indicators

Your authentication is working correctly when you see:

```
[INFO] Spotify access token refreshed { expiresIn: 3600 }
[INFO] Search completed { query: 'test', resultCount: 20 }
```

If you see this, your credentials are valid and everything is working! 🎉
