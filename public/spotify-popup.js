/**
 * Spotify Connect Popup
 * A beautiful popup to prompt users to connect their Spotify account
 */

const SpotifyPopup = {
  popup: null,
  isShown: false,
  hasBeenDismissed: false,

  /**
   * Initialize the popup component
   */
  init() {
    // Check if popup has been dismissed this session
    this.hasBeenDismissed = sessionStorage.getItem('spotify_popup_dismissed') === 'true';
    
    // Create popup element
    this.createPopup();
    
    // Auto-show popup after delay if not connected and not dismissed
    if (!this.hasBeenDismissed) {
      setTimeout(() => this.autoShow(), 5000);
    }
  },

  /**
   * Create the popup HTML element
   */
  createPopup() {
    const popup = document.createElement('div');
    popup.className = 'spotify-connect-popup';
    popup.id = 'spotifyConnectPopup';
    popup.innerHTML = `
      <button class="spotify-popup-close" onclick="SpotifyPopup.hide()">
        <i class="fas fa-times"></i>
      </button>
      <div class="spotify-popup-header">
        <div class="spotify-popup-icon">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="#000" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
        <div>
          <div class="spotify-popup-title">Connect Spotify</div>
          <div class="spotify-popup-subtitle">Unlock full features</div>
        </div>
      </div>
      <div class="spotify-popup-body">
        Create playlists directly in your Spotify account and manage your library!
      </div>
      <div class="spotify-popup-features">
        <div class="spotify-popup-feature">
          <i class="fas fa-check"></i>
          <span>Save playlists to your account</span>
        </div>
        <div class="spotify-popup-feature">
          <i class="fas fa-check"></i>
          <span>Manage & delete playlists</span>
        </div>
        <div class="spotify-popup-feature">
          <i class="fas fa-check"></i>
          <span>View your entire library</span>
        </div>
      </div>
      <div class="spotify-popup-actions">
        <a href="spotify-library.html" class="spotify-popup-btn primary">
          <i class="fab fa-spotify"></i> Connect Now
        </a>
        <button class="spotify-popup-btn secondary" onclick="SpotifyPopup.dismiss()">
          Later
        </button>
      </div>
    `;
    
    document.body.appendChild(popup);
    this.popup = popup;
  },

  /**
   * Auto-show popup if conditions are met
   */
  async autoShow() {
    // Don't show if already dismissed
    if (this.hasBeenDismissed) return;
    
    // Don't show if already connected
    if (window.SpotifyConnect) {
      await SpotifyConnect.checkDbConnectionStatus();
      const isConnected = SpotifyConnect.isConnected() || 
        (SpotifyConnect._dbConnection && SpotifyConnect._dbConnection.connected);
      
      if (isConnected) return;
    }
    
    // Don't show on spotify-library page
    if (window.location.pathname.includes('spotify-library')) return;
    
    // Show the popup
    this.show();
  },

  /**
   * Show the popup
   */
  show() {
    if (this.popup && !this.isShown) {
      this.popup.classList.add('show');
      this.isShown = true;
    }
  },

  /**
   * Hide the popup (temporary)
   */
  hide() {
    if (this.popup) {
      this.popup.classList.remove('show');
      this.isShown = false;
    }
  },

  /**
   * Dismiss the popup for this session
   */
  dismiss() {
    this.hide();
    this.hasBeenDismissed = true;
    sessionStorage.setItem('spotify_popup_dismissed', 'true');
  },

  /**
   * Force show the popup (ignores dismiss state)
   */
  forceShow() {
    if (this.popup) {
      this.popup.classList.add('show');
      this.isShown = true;
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if not on signin page
  if (!window.location.pathname.includes('signin')) {
    SpotifyPopup.init();
  }
});

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.SpotifyPopup = SpotifyPopup;
}

