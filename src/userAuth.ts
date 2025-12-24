/**
 * User Authentication Routes
 * Handles user registration, login, and session management
 */

import express, { Request, Response } from "express";
import { createUser, authenticateUser, getUserById, getUserPlaylists, getUserStats, User } from "./database.js";
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
    const user = authenticateUser(username, password);
    
    if (!user) {
      res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid username or password'
      });
      return;
    }
    
    const token = createSession(user.id, user.username);
    
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
    res.status(500).json({
      error: 'login_failed',
      message: 'An error occurred during login'
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

export default router;
