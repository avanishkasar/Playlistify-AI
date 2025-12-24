# Spotify OAuth Authentication Setup Guide

## 🎯 Quick Start

This guide will help you set up Spotify OAuth authentication for Playlistify in under 5 minutes.

## 📋 Prerequisites

- Node.js (v20 or higher)
- A Spotify account (free or premium)

## 🔧 Step 1: Create a Spotify Developer App

1. **Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)**
   - Log in with your Spotify account
   - Click **"Create App"**

2. **Fill in App Details:**
   ```
   App Name: Playlistify
   App Description: AI-powered playlist generator
   Website: http://localhost:3001 (or your domain)
   Redirect URIs: http://localhost:3001/auth/callback
   ```

3. **Click "Save"** and you'll see your app dashboard

4. **Get Your Credentials:**
   - Click **"Settings"** button
   - Copy your **Client ID**
   - Click **"View client secret"** and copy it
   - **IMPORTANT:** Keep these credentials secret!

## 🔐 Step 2: Configure Environment Variables

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your credentials:**
   ```env
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   SPOTIFY_REDIRECT_URI=http://localhost:3001/auth/callback
   FRONTEND_URL=http://localhost:5500
   PORT=3001
   ```

3. **Replace placeholders:**
   - Replace `your_client_id_here` with your actual Client ID
   - Replace `your_client_secret_here` with your actual Client Secret

## 🚀 Step 3: Install Dependencies

```bash
npm install
```

## ▶️ Step 4: Run the Application

1. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   - Navigate to `http://localhost:5500` (or wherever your frontend is served)
   - You'll be automatically redirected to the login page

## 🎵 Step 5: Connect Your Spotify Account

1. Click **"Connect with Spotify"** button
2. You'll be redirected to Spotify's authorization page
3. Log in with your Spotify credentials
4. Click **"Authorize"** to grant Playlistify access
5. You'll be redirected back to Playlistify, now logged in!

## ✅ What Happens After Authorization

Once authorized:
- ✓ You're logged in with your Spotify account
- ✓ Playlistify can access your playlists
- ✓ You can create and manage playlists
- ✓ Your session persists across browser restarts
- ✓ Tokens are automatically refreshed when needed

## 🔄 How the OAuth Flow Works

```
User clicks "Connect"
    ↓
Redirect to Spotify Login
    ↓
User authorizes Playlistify
    ↓
Spotify sends authorization code
    ↓
Backend exchanges code for tokens
    ↓
User redirected back with tokens
    ↓
Tokens stored in localStorage
    ↓
✓ Logged in!
```

## 📱 API Scopes Requested

Playlistify requests these permissions:
- `user-read-private` - View your profile
- `user-read-email` - View your email
- `playlist-read-private` - View private playlists
- `playlist-modify-public` - Create/edit public playlists
- `playlist-modify-private` - Create/edit private playlists
- `user-library-read` - View your saved tracks
- `user-top-read` - View your top artists/tracks
- `user-read-recently-played` - View recently played

## 🔒 Security Notes

1. **Never commit `.env` to version control**
   - Already added to `.gitignore`
   - Keep credentials secret

2. **Refresh Tokens**
   - Access tokens expire after 1 hour
   - Automatically refreshed by the auth system
   - Refresh tokens are long-lived

3. **Logout**
   - Clears all tokens from localStorage
   - Click logout button in navbar

## 🌐 Production Deployment

When deploying to production:

1. **Update Spotify App Settings:**
   - Add production redirect URI: `https://yourdomain.com/auth/callback`
   - Save settings

2. **Update Environment Variables:**
   ```env
   SPOTIFY_REDIRECT_URI=https://yourdomain.com/auth/callback
   FRONTEND_URL=https://yourdomain.com
   ```

3. **Use environment variables in your hosting platform:**
   - Railway: Add in Environment Variables section
   - Vercel: Add in Project Settings → Environment Variables
   - Heroku: Use `heroku config:set`

## 🐛 Troubleshooting

### Error: "Invalid redirect URI"
**Solution:** Make sure the redirect URI in `.env` EXACTLY matches what's in your Spotify App settings.

### Error: "Authentication failed"
**Solution:** 
- Check your Client ID and Secret are correct
- Ensure no extra spaces in `.env` file
- Restart the server after changing `.env`

### Not redirected after login
**Solution:**
- Check browser console for errors
- Verify `FRONTEND_URL` is correct
- Clear browser cache and localStorage

### Token expired errors
**Solution:** Tokens are auto-refreshed. If issues persist:
```javascript
// In browser console:
localStorage.clear();
location.reload();
```

## 📚 File Structure

```
├── src/
│   ├── auth.ts              # OAuth routes (login, callback, refresh)
│   ├── config.ts            # Configuration management
│   └── main.ts              # Express server with auth routes
├── public/
│   ├── auth.js              # Frontend auth manager
│   ├── auth-button.js       # Login/logout button component
│   ├── auth.css             # Authentication styles
│   ├── login.html           # Login page
│   └── index.html           # Main app (requires auth)
└── .env                     # Your credentials (not committed)
```

## 🎉 You're All Set!

Your Playlistify app now has secure Spotify OAuth authentication. Users can:
- ✅ Log in with one click
- ✅ Stay logged in across sessions
- ✅ Create and manage playlists
- ✅ Access all Spotify features

## 💡 Next Steps

- Customize the login page design
- Add user profile features
- Implement playlist sharing
- Add social features

## 🆘 Need Help?

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [OAuth 2.0 Guide](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- Check browser console for errors
- Review server logs

Enjoy building with Playlistify! 🎵✨
