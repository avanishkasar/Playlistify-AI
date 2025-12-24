/**
 * User Authentication Manager
 * Handles login, signup, and session management
 */

class UserAuth {
  constructor() {
    this.token = null;
    this.user = null;
    this.listeners = [];
    
    this.loadFromStorage();
    this.initializeForms();
  }

  /**
   * Load token and user from localStorage
   */
  loadFromStorage() {
    this.token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
    
    // Validate session if we have a token
    if (this.token) {
      this.validateSession();
    }
  }

  /**
   * Initialize login/signup forms
   */
  initializeForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }

    if (showSignup) {
      showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchToSignup();
      });
    }

    if (showLogin) {
      showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchToLogin();
      });
    }
  }

  /**
   * Switch to signup form
   */
  switchToSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('formTitle').textContent = 'Create Your Account';
    document.querySelector('.subtitle').textContent = 'Join Playlistify AI to start creating';
  }

  /**
   * Switch to login form
   */
  switchToLogin() {
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('formTitle').textContent = 'Welcome Back';
    document.querySelector('.subtitle').textContent = 'Sign in to continue creating playlists';
  }

  /**
   * Handle login form submission
   */
  async handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Signing In...</span>';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      this.setSession(data.token, data.user);
      window.location.href = '/app.html';
      
    } catch (error) {
      this.showError(error.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Sign In</span>';
    }
  }

  /**
   * Handle signup form submission
   */
  async handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Validate passwords match
    if (password !== passwordConfirm) {
      this.showError('Passwords do not match');
      return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Creating Account...</span>';

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      this.setSession(data.token, data.user);
      window.location.href = '/app.html';
      
    } catch (error) {
      this.showError(error.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-user-plus"></i><span>Sign Up</span>';
    }
  }

  /**
   * Set session data
   */
  setSession(token, user) {
    this.token = token;
    this.user = user;
    
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    
    this.notifyListeners();
  }

  /**
   * Set user data (alias for external use)
   */
  setUser(user) {
    this.user = user;
    localStorage.setItem('auth_user', JSON.stringify(user));
    this.notifyListeners();
  }

  /**
   * Validate current session
   */
  async validateSession() {
    if (!this.token) return false;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const userData = await response.json();
      this.user = userData;
      localStorage.setItem('auth_user', JSON.stringify(userData));
      this.notifyListeners();
      return true;
      
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    if (this.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    this.notifyListeners();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Get auth token
   */
  getToken() {
    return this.token;
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify listeners of state change
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
  }
}

// Create and export singleton instance
const userAuth = new UserAuth();

// Export for use in HTML pages
if (typeof window !== 'undefined') {
  window.userAuth = userAuth;
}
