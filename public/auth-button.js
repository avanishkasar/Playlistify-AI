/**
 * Auth Button Component
 * Shows user profile with logout or login button
 */

class AuthButton {
  constructor(containerId) {
    this.container = null;
    this.unsubscribe = null;
    
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = element;
    this.init();
  }

  init() {
    // Subscribe to auth state changes
    if (window.userAuth) {
      this.unsubscribe = window.userAuth.subscribe(() => {
        this.render();
      });
    }

    // Listen for localStorage changes (profile picture updates)
    window.addEventListener('storage', () => {
      this.render();
    });

    // Also listen for custom event when profile is updated on same page
    window.addEventListener('profileUpdated', () => {
      this.render();
    });

    // Initial render
    this.render();
  }

  render() {
    const user = window.userAuth ? window.userAuth.getUser() : null;
    const isAuthenticated = window.userAuth ? window.userAuth.isAuthenticated() : false;

    if (isAuthenticated && user) {
      this.container.innerHTML = this.renderUserProfile(user);
      this.attachLogoutHandler();
    } else {
      this.container.innerHTML = this.renderLoginButton();
      this.attachLoginHandler();
    }
  }

  renderUserProfile(user) {
    const profileImage = user.profile_picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.display_name || user.username) + '&background=1DB954&color=fff&size=128';

    return `
      <div class="user-profile">
        <a href="/profile.html" class="profile-link" title="My Profile">
          <img src="${profileImage}" alt="${user.display_name || user.username}" />
          <span>${user.display_name || user.username}</span>
        </a>
        <button class="logout-btn" id="logoutBtn">
          <i class="fas fa-sign-out-alt"></i>
          Logout
        </button>
      </div>
    `;
  }

  renderLoginButton() {
    return `
      <button class="login-btn" id="loginBtn">
        <i class="fas fa-sign-in-alt"></i>
        Sign In
      </button>
    `;
  }

  attachLogoutHandler() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (window.userAuth) {
          window.userAuth.logout();
        }
        // Just reload the page to show login button
        window.location.reload();
      });
    }
  }

  attachLoginHandler() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        window.location.href = '/signin.html';
      });
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// Export for use in HTML pages
if (typeof window !== 'undefined') {
  window.AuthButton = AuthButton;
}
