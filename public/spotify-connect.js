/**
 * Spotify Connection Handler
 * Manages user's Spotify OAuth tokens for creating playlists in their account
 */

const SpotifyConnect = {
    // Storage keys
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'spotify_user_access_token',
        REFRESH_TOKEN: 'spotify_user_refresh_token',
        EXPIRES_AT: 'spotify_token_expires_at',
        USER_PROFILE: 'spotify_user_profile'
    },

    /**
     * Check if user has connected their Spotify account
     */
    isConnected() {
        const accessToken = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
        const expiresAt = localStorage.getItem(this.STORAGE_KEYS.EXPIRES_AT);

        if (!accessToken) return false;

        // Check if token is expired
        if (expiresAt && Date.now() > parseInt(expiresAt)) {
            // Token expired, try to refresh
            return this.hasRefreshToken();
        }

        return true;
    },

    /**
     * Check if we have a refresh token
     */
    hasRefreshToken() {
        return !!localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
    },

    /**
     * Get the current access token (refreshes if needed)
     */
    async getAccessToken() {
        const accessToken = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
        const expiresAt = localStorage.getItem(this.STORAGE_KEYS.EXPIRES_AT);

        // Check if token needs refresh (5 min buffer)
        if (expiresAt && Date.now() > parseInt(expiresAt) - 300000) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                return localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
            }
            return null;
        }

        return accessToken;
    },

    /**
     * Refresh the access token using refresh token
     */
    async refreshAccessToken() {
        const refreshToken = localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) return false;

        try {
            const response = await fetch('/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (!response.ok) {
                this.disconnect();
                return false;
            }

            const data = await response.json();
            this.storeTokens(data.access_token, null, data.expires_in);
            return true;
        } catch (err) {
            console.error('Failed to refresh token:', err);
            return false;
        }
    },

    /**
     * Store tokens in localStorage
     */
    storeTokens(accessToken, refreshToken, expiresIn) {
        if (accessToken) {
            localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        }
        if (refreshToken) {
            localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
        if (expiresIn) {
            const expiresAt = Date.now() + (expiresIn * 1000);
            localStorage.setItem(this.STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
        }
    },

    /**
     * Handle OAuth callback - parse tokens from URL
     */
    handleCallback() {
        const params = new URLSearchParams(window.location.search);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const expiresIn = params.get('expires_in');
        const error = params.get('error');

        if (error) {
            console.error('Spotify auth error:', error);
            this.showNotification('❌ Spotify connection failed: ' + error, 'error');
            // Clear URL params
            window.history.replaceState({}, '', window.location.pathname);
            return false;
        }

        if (accessToken && refreshToken) {
            this.storeTokens(accessToken, refreshToken, parseInt(expiresIn));
            this.fetchAndStoreProfile(accessToken);

            // Clear URL params (clean URL)
            window.history.replaceState({}, '', window.location.pathname);

            this.showNotification('✅ Spotify connected! Playlists will be created in your account.', 'success');
            this.updateUI();
            return true;
        }

        return false;
    },

    /**
     * Fetch and store user's Spotify profile
     */
    async fetchAndStoreProfile(accessToken) {
        try {
            const response = await fetch('/auth/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (response.ok) {
                const profile = await response.json();
                localStorage.setItem(this.STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
                this.updateUI();
            }
        } catch (err) {
            console.error('Failed to fetch Spotify profile:', err);
        }
    },

    /**
     * Get connected user's profile
     */
    getUserProfile() {
        const profile = localStorage.getItem(this.STORAGE_KEYS.USER_PROFILE);
        return profile ? JSON.parse(profile) : null;
    },

    /**
     * Connect to Spotify - redirects to OAuth
     */
    connect() {
        window.location.href = '/auth/login';
    },

    /**
     * Disconnect Spotify account
     */
    disconnect() {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        this.updateUI();
        this.showNotification('🔌 Spotify disconnected', 'info');
    },

    /**
     * Update UI elements based on connection status
     */
    updateUI() {
        const connectBtns = document.querySelectorAll('.spotify-connect-btn');
        const isConnected = this.isConnected();
        const profile = this.getUserProfile();

        connectBtns.forEach(btn => {
            if (isConnected && profile) {
                btn.innerHTML = `
          <img src="${profile.images?.[0]?.url || ''}" alt="" class="spotify-avatar" onerror="this.style.display='none'">
          <span class="spotify-name">${profile.display_name || 'Connected'}</span>
          <span class="spotify-badge">✓</span>
        `;
                btn.classList.add('connected');
                btn.onclick = () => this.showDisconnectModal();
            } else {
                btn.innerHTML = `
          <svg class="spotify-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <span>Connect Spotify</span>
        `;
                btn.classList.remove('connected');
                btn.onclick = () => this.connect();
            }
        });
    },

    /**
     * Show disconnect confirmation modal
     */
    showDisconnectModal() {
        const profile = this.getUserProfile();
        const modal = document.createElement('div');
        modal.className = 'spotify-modal-overlay';
        modal.innerHTML = `
      <div class="spotify-modal">
        <h3>Spotify Connected</h3>
        <p>Connected as <strong>${profile?.display_name || 'Unknown'}</strong></p>
        <p class="modal-info">Playlists are being created directly in your Spotify account.</p>
        <div class="modal-actions">
          <button class="modal-btn secondary" onclick="this.closest('.spotify-modal-overlay').remove()">Close</button>
          <button class="modal-btn danger" onclick="SpotifyConnect.disconnect(); this.closest('.spotify-modal-overlay').remove()">Disconnect</button>
        </div>
      </div>
    `;
        document.body.appendChild(modal);
    },

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `spotify-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      padding: 1rem 2rem;
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#1DB954' : '#3b82f6'};
      color: white;
      border-radius: 100px;
      font-weight: 600;
      z-index: 10001;
      animation: slideDown 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    },

    /**
     * Initialize on page load
     */
    init() {
        // Check for OAuth callback
        this.handleCallback();
        // Update UI
        this.updateUI();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    SpotifyConnect.init();
});

// Export for use in other scripts
window.SpotifyConnect = SpotifyConnect;
