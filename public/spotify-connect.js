/**
 * Spotify Connection Handler
 * Manages user's Spotify OAuth tokens for creating playlists in their account
 * NOW WITH PER-USER DB TOKEN SUPPORT
 */

const SpotifyConnect = {
    // Storage keys (for fallback/anonymous users)
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'spotify_user_access_token',
        REFRESH_TOKEN: 'spotify_user_refresh_token',
        EXPIRES_AT: 'spotify_token_expires_at',
        USER_PROFILE: 'spotify_user_profile'
    },

    // Cached connection info from DB
    _dbConnection: null,

    /**
     * Get the current logged-in user ID from auth system
     */
    getCurrentUserId() {
        try {
            // Try multiple sources for user ID
            const authUser = localStorage.getItem('auth_user');
            if (authUser) {
                const user = JSON.parse(authUser);
                return user.id || null;
            }

            const playlistifyUser = localStorage.getItem('playlistify_user');
            if (playlistifyUser) {
                const user = JSON.parse(playlistifyUser);
                return user.id || null;
            }

            // Try auth token to get session
            const authToken = localStorage.getItem('auth_token');
            if (authToken && window.userAuth) {
                const currentUser = window.userAuth.getCurrentUser?.();
                return currentUser?.id || null;
            }
        } catch (e) {
            console.log('Could not get user ID');
        }
        return null;
    },

    /**
     * Check if user has connected their Spotify account (DB or localStorage)
     */
    isConnected() {
        // First check DB connection
        if (this._dbConnection && this._dbConnection.connected) {
            return true;
        }

        // Fallback to localStorage
        const accessToken = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
        const expiresAt = localStorage.getItem(this.STORAGE_KEYS.EXPIRES_AT);

        if (!accessToken) return false;

        // Check if token is expired
        if (expiresAt && Date.now() > parseInt(expiresAt)) {
            return this.hasRefreshToken();
        }

        return true;
    },

    /**
     * Check if we have a refresh token (localStorage fallback)
     */
    hasRefreshToken() {
        return !!localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
    },

    /**
     * Check connection status from database
     */
    async checkDbConnectionStatus() {
        const userId = this.getCurrentUserId();
        if (!userId) {
            this._dbConnection = null;
            return null;
        }

        try {
            const response = await fetch(`/api/spotify/connection-status?userId=${userId}`);
            const data = await response.json();

            if (data.connected) {
                this._dbConnection = data;
                console.log(`✅ Spotify connected via DB: ${data.displayName}`);
            } else {
                this._dbConnection = null;
            }

            return this._dbConnection;
        } catch (err) {
            console.error('Failed to check Spotify connection status:', err);
            this._dbConnection = null;
            return null;
        }
    },

    /**
     * Get the current access token (refreshes if needed)
     */
    async getAccessToken() {
        const userId = this.getCurrentUserId();

        // If we have a DB connection, use server-side refresh
        if (userId && this._dbConnection) {
            try {
                const response = await fetch('/api/spotify/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.access_token;
                }
            } catch (err) {
                console.error('Failed to refresh token via DB:', err);
            }
        }

        // Fallback to localStorage tokens
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
     * Refresh the access token using refresh token (localStorage fallback)
     */
    async refreshAccessToken() {
        const refreshToken = localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) return false;

        try {
            const response = await fetch('/api/spotify/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (!response.ok) {
                this.disconnect();
                return false;
            }

            const data = await response.json();
            this.storeTokens(data.access_token, data.refresh_token, data.expires_in);
            return true;
        } catch (err) {
            console.error('Failed to refresh token:', err);
            return false;
        }
    },

    /**
     * Store tokens in localStorage (fallback for anonymous users)
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

        // Check for DB storage success
        const dbStored = params.get('db_stored');
        const connected = params.get('spotify_connected');
        const error = params.get('spotify_error');

        if (error) {
            console.error('Spotify auth error:', error);
            this.showNotification('❌ Spotify connection failed: ' + error, 'error');
            window.history.replaceState({}, '', window.location.pathname);
            return false;
        }

        // If stored in DB, just refresh connection status
        if (dbStored === 'true' && connected === 'true') {
            console.log('✅ Spotify tokens stored in database');
            window.history.replaceState({}, '', window.location.pathname);

            // Refresh DB connection status and show modal
            this.checkDbConnectionStatus().then(() => {
                this.showSetupModal();
                this.updateUI();
            });

            return true;
        }

        // Legacy localStorage flow
        const accessToken = params.get('spotify_access_token') || params.get('access_token');
        const refreshToken = params.get('spotify_refresh_token') || params.get('refresh_token');
        const expiresIn = params.get('spotify_expires_in') || params.get('expires_in');

        if (accessToken && refreshToken) {
            this.storeTokens(accessToken, refreshToken, parseInt(expiresIn));
            this.fetchAndStoreProfile(accessToken);

            window.history.replaceState({}, '', window.location.pathname);

            this.showSetupModal();
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
            const response = await fetch('/api/spotify/me', {
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
     * Get connected user's profile (DB or localStorage)
     */
    getUserProfile() {
        // First check DB connection
        if (this._dbConnection) {
            return {
                display_name: this._dbConnection.displayName,
                email: this._dbConnection.email,
                images: this._dbConnection.avatar ? [{ url: this._dbConnection.avatar }] : []
            };
        }

        // Fallback to localStorage
        const profile = localStorage.getItem(this.STORAGE_KEYS.USER_PROFILE);
        return profile ? JSON.parse(profile) : null;
    },

    /**
     * Connect to Spotify - redirects to OAuth with userId
     */
    connect() {
        const userId = this.getCurrentUserId();
        let loginUrl = '/api/spotify/login';

        if (userId) {
            loginUrl += `?userId=${userId}`;
            console.log(`🔐 Starting Spotify OAuth for user ${userId}`);
        } else {
            console.log('🔐 Starting Spotify OAuth (no user logged in)');
        }

        window.location.href = loginUrl;
    },

    /**
     * Disconnect Spotify account
     */
    async disconnect() {
        const userId = this.getCurrentUserId();

        // If logged in, disconnect from DB
        if (userId) {
            try {
                await fetch('/api/spotify/disconnect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                });
                console.log('🔌 Disconnected Spotify from database');
            } catch (err) {
                console.error('Failed to disconnect from DB:', err);
            }
        }

        // Clear localStorage
        Object.values(this.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });

        this._dbConnection = null;
        this.updateUI();
        this.showNotification('🔌 Spotify disconnected', 'info');
    },

    /**
     * Create a playlist in user's connected Spotify account
     */
    async createPlaylistInUserAccount(name, description, trackUris) {
        const userId = this.getCurrentUserId();

        // If DB connected, use userId-based creation
        if (userId && this._dbConnection) {
            try {
                const response = await fetch('/api/spotify/create-playlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        description: description || 'Created by Playlistify AI 🤖',
                        trackUris,
                        isPublic: false,
                        userId
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    console.error('Failed to create playlist:', error);
                    return null;
                }

                const data = await response.json();
                console.log('✅ Playlist created via DB tokens:', data.playlist);
                this.showNotification('🎶 Playlist added to your Spotify!', 'success');
                return data.playlist;
            } catch (err) {
                console.error('Error creating playlist:', err);
                return null;
            }
        }

        // Fallback to localStorage tokens
        if (!this.isConnected()) {
            console.log('User not connected to Spotify');
            return null;
        }

        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            console.error('Could not get access token');
            return null;
        }

        try {
            const response = await fetch('/api/spotify/create-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    name,
                    description: description || 'Created by Playlistify AI 🤖',
                    trackUris,
                    isPublic: false
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Failed to create playlist:', error);

                if (response.status === 401) {
                    const refreshed = await this.refreshAccessToken();
                    if (refreshed) {
                        return this.createPlaylistInUserAccount(name, description, trackUris);
                    }
                }
                return null;
            }

            const data = await response.json();
            console.log('✅ Playlist created:', data.playlist);
            this.showNotification('🎶 Playlist added to your Spotify!', 'success');
            return data.playlist;

        } catch (err) {
            console.error('Error creating playlist:', err);
            return null;
        }
    },

    /**
     * Update UI elements based on connection status
     */
    updateUI() {
        const connectBtns = document.querySelectorAll('.spotify-connect-btn');
        const isConnected = this.isConnected() || (this._dbConnection && this._dbConnection.connected);
        const profile = this.getUserProfile();

        connectBtns.forEach(btn => {
            if (isConnected && profile) {
                const avatarUrl = profile.images?.[0]?.url || '';
                const displayName = profile.display_name || profile.email || 'Connected';

                btn.innerHTML = `
          <img src="${avatarUrl}" alt="" class="spotify-avatar" onerror="this.style.display='none'">
          <span class="spotify-name">${displayName}</span>
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

        // Update any status indicators
        const statusIndicators = document.querySelectorAll('.spotify-connection-status');
        statusIndicators.forEach(indicator => {
            if (isConnected) {
                indicator.textContent = `Connected as ${profile?.display_name || profile?.email || 'Spotify User'}`;
                indicator.classList.add('connected');
            } else {
                indicator.textContent = 'Not connected';
                indicator.classList.remove('connected');
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
        <p>Connected as <strong>${profile?.display_name || profile?.email || 'Unknown'}</strong></p>
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
     * Show quick connect popup
     */
    showConnectPopup() {
        const existingModal = document.querySelector('.spotify-connect-popup-overlay');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'spotify-connect-popup-overlay';
        modal.innerHTML = `
      <div class="spotify-connect-popup">
        <button class="popup-close" onclick="this.closest('.spotify-connect-popup-overlay').remove()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="popup-icon">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
        <h2>Connect Your Spotify</h2>
        <p>Link your Spotify account to create playlists directly in your library and manage your music collection.</p>
        <div class="popup-features">
          <div class="popup-feature">
            <span class="feature-icon">✨</span>
            <span>Create playlists directly</span>
          </div>
          <div class="popup-feature">
            <span class="feature-icon">📚</span>
            <span>Manage your library</span>
          </div>
          <div class="popup-feature">
            <span class="feature-icon">🗑️</span>
            <span>Delete unwanted playlists</span>
          </div>
        </div>
        <div class="popup-actions">
          <a href="spotify-library.html" class="popup-btn primary">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Connect Spotify
          </a>
          <button class="popup-btn secondary" onclick="this.closest('.spotify-connect-popup-overlay').remove()">
            Maybe Later
          </button>
        </div>
      </div>
    `;
        document.body.appendChild(modal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
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

    // =========================================================================
    // SETUP MODAL FUNCTIONS
    // =========================================================================

    /**
     * Show the Spotify setup modal after OAuth with cosmetic animation
     */
    showSetupModal() {
        const modal = document.getElementById('spotifySetupModal');
        if (!modal) return;

        // Reset to step 1
        this.goToStep(1);
        modal.classList.add('visible');

        // Run the cosmetic setup animation
        this.runSetupAnimation();
    },

    /**
     * Run the cosmetic "Creating App → Generating Credentials → Securing Token" animation
     * This is purely visual - tokens are already stored via OAuth
     */
    async runSetupAnimation() {
        const statusText = document.getElementById('setupStatusText');
        const steps = [
            { id: 1, text: 'Creating Spotify App Connection...', duration: 800 },
            { id: 2, text: 'Generating Credentials...', duration: 700 },
            { id: 3, text: 'Securing Refresh Token...', duration: 900 },
            { id: 4, text: 'Saving to Your Account...', duration: 600 }
        ];

        // Reset all steps
        for (let i = 1; i <= 4; i++) {
            const stepEl = document.getElementById(`animStep${i}`);
            const progressBar = document.getElementById(`animProgress${i}`);
            if (stepEl) {
                stepEl.classList.remove('active', 'completed');
                if (i === 1) stepEl.classList.add('active');
            }
            if (progressBar) progressBar.style.width = '0%';
        }

        // Animate each step
        for (const step of steps) {
            const stepEl = document.getElementById(`animStep${step.id}`);
            const progressBar = document.getElementById(`animProgress${step.id}`);

            if (stepEl) stepEl.classList.add('active');
            if (statusText) statusText.textContent = step.text;

            // Animate progress bar
            await this.animateProgressBar(progressBar, step.duration);

            // Mark as completed
            if (stepEl) {
                stepEl.classList.remove('active');
                stepEl.classList.add('completed');
            }

            // Small delay between steps
            await this.sleep(150);
        }

        // All done - show success
        if (statusText) {
            statusText.textContent = '✅ Setup Complete!';
            statusText.classList.add('success');
        }

        // Wait a moment then transition to success step
        await this.sleep(800);

        this.goToStep(2);
        this.updateConnectedProfile();
    },

    /**
     * Animate a progress bar from 0 to 100%
     */
    animateProgressBar(progressBar, duration) {
        return new Promise(resolve => {
            if (!progressBar) {
                resolve();
                return;
            }

            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min((elapsed / duration) * 100, 100);
                progressBar.style.width = `${progress}%`;

                if (progress < 100) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    },

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Go to a specific setup step
     */
    goToStep(step) {
        document.querySelectorAll('.setup-step').forEach(s => s.classList.add('hidden'));
        const stepEl = document.getElementById(`setupStep${step}`);
        if (stepEl) stepEl.classList.remove('hidden');
    },

    /**
     * Close the setup modal
     */
    closeSetupModal() {
        const modal = document.getElementById('spotifySetupModal');
        if (modal) modal.classList.remove('visible');
    },

    /**
     * Show feedback for token input
     */
    showTokenFeedback(message, isSuccess = true) {
        const feedback = document.getElementById('tokenFeedback');
        if (!feedback) return;

        feedback.textContent = message;
        feedback.classList.remove('hidden', 'success', 'error');
        feedback.classList.add(isSuccess ? 'success' : 'error');
    },

    /**
     * Hide token feedback
     */
    hideTokenFeedback() {
        const feedback = document.getElementById('tokenFeedback');
        if (feedback) feedback.classList.add('hidden');
    },

    /**
     * Save token from setup modal with enhanced feedback
     */
    async saveSetupToken() {
        const input = document.getElementById('setupRefreshToken');
        const saveBtn = document.getElementById('saveTokenBtn');
        const btnText = saveBtn?.querySelector('.btn-text');
        const btnSpinner = saveBtn?.querySelector('.btn-spinner');

        if (!input) return;

        const token = input.value.trim();
        if (!token) {
            this.showTokenFeedback('❌ Please enter a refresh token', false);
            input.focus();
            return;
        }

        // Show loading state
        if (btnText) btnText.textContent = 'Saving...';
        if (btnSpinner) btnSpinner.classList.remove('hidden');
        if (saveBtn) saveBtn.disabled = true;
        this.hideTokenFeedback();

        const success = await this.saveManualToken(token);

        // Reset button state
        if (btnText) btnText.textContent = 'Save Token';
        if (btnSpinner) btnSpinner.classList.add('hidden');
        if (saveBtn) saveBtn.disabled = false;

        if (success) {
            this.showTokenFeedback('✓ Token saved successfully!', true);
            setTimeout(() => {
                input.value = '';
                this.goToStep(3);
                this.updateConnectedProfile();
            }, 800);
        } else {
            this.showTokenFeedback('❌ Invalid token - please check and try again', false);
        }
    },

    /**
     * Skip token setup
     */
    skipTokenSetup() {
        this.closeSetupModal();
        this.showNotification('ℹ️ Playlists will be saved in-app only. You can connect fully later.', 'info');
    },

    /**
     * Update the connected profile display in modal
     */
    updateConnectedProfile() {
        const profile = this.getUserProfile();
        const container = document.getElementById('connectedProfile');
        if (!container) return;

        if (profile) {
            const avatarUrl = profile.images?.[0]?.url || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%231DB954%22/><text x=%2212%22 y=%2216%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2210%22>♪</text></svg>';
            const displayName = profile.display_name || profile.email || 'Spotify User';

            container.innerHTML = `
                <img src="${avatarUrl}" 
                     alt="${displayName}" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%231DB954%22/><text x=%2212%22 y=%2216%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2210%22>♪</text></svg>'">
                <div class="profile-info">
                    <div class="profile-name">${displayName}</div>
                    <div class="profile-status">✓ Connected & Ready</div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="profile-info">
                    <div class="profile-name">Spotify User</div>
                    <div class="profile-status">✓ Connected</div>
                </div>
            `;
        }
    },

    /**
     * Save manual refresh token
     */
    async saveManualToken(refreshToken) {
        if (!refreshToken || refreshToken.trim().length < 10) {
            this.showNotification('❌ Invalid refresh token', 'error');
            return false;
        }

        const userId = this.getCurrentUserId();

        // If logged in, save to database
        if (userId) {
            try {
                const response = await fetch('/api/spotify/save-tokens', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        refreshToken: refreshToken.trim()
                    })
                });

                if (response.ok) {
                    // Refresh DB connection status
                    await this.checkDbConnectionStatus();
                    this.showNotification('✅ Token saved to your account!', 'success');
                    this.updateUI();
                    return true;
                }
            } catch (err) {
                console.error('Failed to save token to DB:', err);
            }
        }

        // Fallback: store in localStorage
        localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, refreshToken.trim());

        // Try to get an access token with it
        const success = await this.refreshAccessToken();
        if (success) {
            const accessToken = await this.getAccessToken();
            if (accessToken) {
                await this.fetchAndStoreProfile(accessToken);
            }
            this.showNotification('✅ Token saved successfully!', 'success');
            this.updateUI();
            return true;
        } else {
            localStorage.removeItem(this.STORAGE_KEYS.REFRESH_TOKEN);
            this.showNotification('❌ Invalid token - could not authenticate', 'error');
            return false;
        }
    },

    /**
     * Initialize on page load
     */
    async init() {
        // Check for OAuth callback first
        const callbackHandled = this.handleCallback();

        if (!callbackHandled) {
            // Check DB connection status for logged-in users
            await this.checkDbConnectionStatus();
        }

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
