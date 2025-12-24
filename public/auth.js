/**
 * Spotify Authentication Manager
 * Handles user authentication, token management, and session persistence
 */

class SpotifyAuth {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.user = null;
    this.listeners = [];
    
    this.loadFromStorage();
    this.handleOAuthCallback();
  }

  /**
   * Load tokens from localStorage on initialization
   */
  loadFromStorage() {
    this.accessToken = localStorage.getItem('spotify_access_token');
    this.refreshToken = localStorage.getItem('spotify_refresh_token');
    const expiry = localStorage.getItem('spotify_token_expiry');
    this.tokenExpiry = expiry ? parseInt(expiry) : null;

    // If we have a token, fetch user profile
    if (this.accessToken && !this.isTokenExpired()) {
      this.fetchUserProfile();
    }
  }

  /**
   * Handle OAuth callback from Spotify
   */
  handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = params.get('expires_in');
    const error = params.get('error');

    if (error) {
      console.error('Authentication error:', error);
      this.showError('Authentication failed. Please try again.');
      this.clearUrl();
      return;
    }

    if (accessToken && refreshToken) {
      // Calculate token expiry time (current time + expires_in seconds)
      const expiresInMs = parseInt(expiresIn || '3600') * 1000;
      const expiryTime = Date.now() + expiresInMs;

      this.setTokens(accessToken, refreshToken, expiryTime);
      this.clearUrl();
      this.fetchUserProfile();
    }
  }

  /**
   * Clear URL parameters after handling callback
   */
  clearUrl() {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  /**
   * Store tokens in memory and localStorage
   */
  setTokens(accessToken, refreshToken, expiry) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiry = expiry;

    localStorage.setItem('spotify_access_token', accessToken);
    localStorage.setItem('spotify_refresh_token', refreshToken);
    localStorage.setItem('spotify_token_expiry', expiry.toString());

    this.notifyListeners();
  }

  /**
   * Check if current access token is expired
   */
  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    // Consider token expired 5 minutes before actual expiry
    return Date.now() > (this.tokenExpiry - 5 * 60 * 1000);
  }

  /**
   * Fetch current user's Spotify profile
   */
  async fetchUserProfile() {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.ok) {
        this.user = await response.json();
        this.notifyListeners();
      } else if (response.status === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
      } else {
        console.error('Failed to fetch user profile:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  /**
   * Refresh expired access token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      this.logout();
      return;
    }

    try {
      const response = await fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        const expiryTime = Date.now() + (data.expires_in * 1000);
        
        // Update access token (refresh token stays the same)
        this.accessToken = data.access_token;
        this.tokenExpiry = expiryTime;
        
        localStorage.setItem('spotify_access_token', data.access_token);
        localStorage.setItem('spotify_token_expiry', expiryTime.toString());
        
        // Retry fetching user profile
        await this.fetchUserProfile();
      } else {
        console.error('Failed to refresh token');
        this.logout();
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
    }
  }

  /**
   * Initiate Spotify OAuth login flow
   */
  login() {
    window.location.href = '/auth/login';
  }

  /**
   * Logout and clear all stored data
   */
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.user = null;

    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');

    this.notifyListeners();
  }

  /**
   * Get current user data
   */
  getUser() {
    return this.user;
  }

  /**
   * Get current access token (refreshes if expired)
   */
  async getAccessToken() {
    if (!this.accessToken) return null;

    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    return this.accessToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.accessToken && !!this.user && !this.isTokenExpired();
  }

  /**
   * Subscribe to authentication state changes
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Show error message to user
   */
  showError(message) {
    // Create a simple error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
  }
}

// Create and export singleton instance
const spotifyAuth = new SpotifyAuth();

// Export for use in HTML pages
if (typeof window !== 'undefined') {
  window.spotifyAuth = spotifyAuth;
}
