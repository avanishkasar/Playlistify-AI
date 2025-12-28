/**
 * User Authentication Routes
 * Handles user registration, login, and session management
 */

import express, { Request, Response } from "express";
import { createUser, authenticateUser, getUserById, getUserPlaylists, getUserStats, User, updateProfilePicture, updateDisplayName, updateUsername, updatePassword, hashPassword } from "../database.js";
import db from "../database.js";
import crypto from "crypto";

const router = express.Router();

// In-memory session store (in production, use Redis or similar)
const sessions = new Map<string, { userId: number; username: string; expiresAt: number }>();

/**
 * Generate session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create session for user
 */
function createSession(userId: number, username: string): string {
  const token = generateSessionToken();
  const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

  sessions.set(token, { userId, username, expiresAt });

  return token;
}

/**
 * Validate session token
 */
function validateSession(token: string) {
  const session = sessions.get(token);

  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return session;
}

/**
 * Register new user
 */
router.post('/register', (req: Request, res: Response): void => {
  const { username, email, password } = req.body;

  // Validation
  if (!username || !email || !password) {
    res.status(400).json({
      error: 'missing_fields',
      message: 'Username, email, and password are required'
    });
    return;
  }

  if (username.length < 3) {
    res.status(400).json({
      error: 'invalid_username',
      message: 'Username must be at least 3 characters'
    });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({
      error: 'weak_password',
      message: 'Password must be at least 6 characters'
    });
    return;
  }

  try {
    const user = createUser(username, email, password);
    const token = createSession(user.id as number, user.username);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name
      },
      token
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'registration_failed',
      message: error.message
    });
  }
});

/**
 * Login user
 * TEMPORARY: Password validation disabled - accepts any password if username exists
 */
router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({
      error: 'missing_credentials',
      message: 'Username and password are required'
    });
    return;
  }

  try {
    // TEMPORARY: Skip password validation - just check if username exists
    const userStmt = db.prepare('SELECT id, username, email, display_name FROM users WHERE username = ?');
    const userData = userStmt.get(username) as { id: number; username: string; email: string; display_name: string | null } | undefined;

    if (!userData) {
      res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid username or password'
      });
      return;
    }

    // Password validation skipped - allow any password
    const token = createSession(userData.id, userData.username);

    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userData.id);

    res.json({
      success: true,
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        display_name: userData.display_name
      },
      token
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      error: 'login_failed',
      message: 'An error occurred during login'
    });
  }
});

/**
 * Forgot Password - Reset password using username and email
 */
router.post('/forgot-password', (req: Request, res: Response): void => {
  const { username, email, newPassword } = req.body;

  if (!username || !email || !newPassword) {
    res.status(400).json({
      error: 'missing_fields',
      message: 'Username, email, and new password are required'
    });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({
      error: 'weak_password',
      message: 'Password must be at least 6 characters'
    });
    return;
  }

  try {
    // Verify user exists with matching username and email
    const stmt = db.prepare(`
      SELECT id FROM users WHERE username = ? AND email = ?
    `);
    const user = stmt.get(username, email) as { id: number } | undefined;

    if (!user) {
      res.status(404).json({
        error: 'user_not_found',
        message: 'No account found with that username and email combination'
      });
      return;
    }

    // Update password
    const passwordHash = hashPassword(newPassword);
    const updateStmt = db.prepare(`
      UPDATE users SET password_hash = ? WHERE id = ?
    `);
    updateStmt.run(passwordHash, user.id);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.'
    });
  } catch (error: any) {
    console.error('[Auth] Forgot password error:', error);
    res.status(500).json({
      error: 'reset_failed',
      message: 'An error occurred during password reset'
    });
  }
});

/**
 * Logout user
 */
router.post('/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    sessions.delete(token);
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * Get current user profile
 */
router.get('/me', (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'No token provided'
    });
    return;
  }

  const session = validateSession(token);

  if (!session) {
    res.status(401).json({
      error: 'invalid_session',
      message: 'Session expired or invalid'
    });
    return;
  }

  const user = getUserById(session.userId);

  if (!user) {
    res.status(404).json({
      error: 'user_not_found',
      message: 'User not found'
    });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    display_name: user.display_name,
    created_at: user.created_at,
    last_login: user.last_login
  });
});

/**
 * Get user's playlists
 */
router.get('/playlists', (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const session = validateSession(token);

  if (!session) {
    res.status(401).json({ error: 'invalid_session' });
    return;
  }

  const playlists = getUserPlaylists(session.userId);

  res.json({ playlists });
});

/**
 * Get user statistics
 */
router.get('/stats', (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const session = validateSession(token);

  if (!session) {
    res.status(401).json({ error: 'invalid_session' });
    return;
  }

  const stats = getUserStats(session.userId);

  res.json({ stats });
});

/**
 * Update profile picture
 */
router.post('/profile/picture', (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { profilePicture } = req.body;

  if (!token) {
    res.status(401).json({ error: 'unauthorized', message: 'No token provided' });
    return;
  }

  const session = validateSession(token);
  if (!session) {
    res.status(401).json({ error: 'invalid_session', message: 'Session expired' });
    return;
  }

  if (!profilePicture) {
    res.status(400).json({ error: 'missing_field', message: 'Profile picture URL is required' });
    return;
  }

  try {
    updateProfilePicture(session.userId, profilePicture);
    res.json({ success: true, message: 'Profile picture updated' });
  } catch (error: any) {
    res.status(500).json({ error: 'update_failed', message: error.message });
  }
});

/**
 * Update display name
 */
router.post('/profile/displayname', (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { displayName } = req.body;

  if (!token) {
    res.status(401).json({ error: 'unauthorized', message: 'No token provided' });
    return;
  }

  const session = validateSession(token);
  if (!session) {
    res.status(401).json({ error: 'invalid_session', message: 'Session expired' });
    return;
  }

  if (!displayName || displayName.length < 2) {
    res.status(400).json({ error: 'invalid_name', message: 'Display name must be at least 2 characters' });
    return;
  }

  try {
    updateDisplayName(session.userId, displayName);
    res.json({ success: true, message: 'Display name updated' });
  } catch (error: any) {
    res.status(500).json({ error: 'update_failed', message: error.message });
  }
});

/**
 * Update username
 */
router.post('/profile/username', (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { username } = req.body;

  if (!token) {
    res.status(401).json({ error: 'unauthorized', message: 'No token provided' });
    return;
  }

  const session = validateSession(token);
  if (!session) {
    res.status(401).json({ error: 'invalid_session', message: 'Session expired' });
    return;
  }

  if (!username || username.length < 3) {
    res.status(400).json({ error: 'invalid_username', message: 'Username must be at least 3 characters' });
    return;
  }

  const result = updateUsername(session.userId, username);
  if (result.success) {
    // Update session with new username
    const sessionData = sessions.get(token);
    if (sessionData) {
      sessionData.username = username;
    }
    res.json({ success: true, message: 'Username updated' });
  } else {
    res.status(400).json({ error: 'username_taken', message: result.error });
  }
});

/**
 * Update password
 */
router.post('/profile/password', (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { currentPassword, newPassword } = req.body;

  if (!token) {
    res.status(401).json({ error: 'unauthorized', message: 'No token provided' });
    return;
  }

  const session = validateSession(token);
  if (!session) {
    res.status(401).json({ error: 'invalid_session', message: 'Session expired' });
    return;
  }

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'missing_fields', message: 'Current and new password are required' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'weak_password', message: 'New password must be at least 6 characters' });
    return;
  }

  const result = updatePassword(session.userId, currentPassword, newPassword);
  if (result.success) {
    res.json({ success: true, message: 'Password updated successfully' });
  } else {
    res.status(400).json({ error: 'password_error', message: result.error });
  }
});

export default router;
