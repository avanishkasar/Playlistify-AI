/**
 * Admin Routes
 * Handles admin authentication and dashboard data
 */

import express, { Request, Response } from "express";
import { getAllUsersWithStats, getAdminDashboardStats, validateAdminCredentials } from "../database.js";
import crypto from "crypto";

const router = express.Router();

// In-memory admin session store
const adminSessions = new Map<string, { expiresAt: number }>();

/**
 * Generate admin session token
 */
function generateAdminToken(): string {
  return 'admin_' + crypto.randomBytes(32).toString('hex');
}

/**
 * Create admin session
 */
function createAdminSession(): string {
  const token = generateAdminToken();
  const expiresAt = Date.now() + (1 * 60 * 60 * 1000); // 1 hour

  adminSessions.set(token, { expiresAt });

  return token;
}

/**
 * Validate admin session token
 */
function validateAdminSession(token: string): boolean {
  const session = adminSessions.get(token);

  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return false;
  }

  return true;
}

/**
 * Middleware to protect admin routes
 */
function requireAdminAuth(req: Request, res: Response, next: Function): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token || !validateAdminSession(token)) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Admin authentication required'
    });
    return;
  }

  next();
}

/**
 * Admin login
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

  if (validateAdminCredentials(username, password)) {
    const token = createAdminSession();

    res.json({
      success: true,
      message: 'Admin login successful',
      token
    });
  } else {
    res.status(401).json({
      error: 'invalid_credentials',
      message: 'Invalid admin credentials'
    });
  }
});

/**
 * Admin logout
 */
router.post('/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    adminSessions.delete(token);
  }

  res.json({ success: true, message: 'Logged out' });
});

/**
 * Verify admin session
 */
router.get('/verify', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token && validateAdminSession(token)) {
    res.json({ valid: true });
  } else {
    res.status(401).json({ valid: false });
  }
});

/**
 * Get dashboard overview stats
 */
router.get('/stats', requireAdminAuth, (_req: Request, res: Response) => {
  try {
    const stats = getAdminDashboardStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    });
  }
});

/**
 * Get all users with their stats
 */
router.get('/users', requireAdminAuth, (_req: Request, res: Response) => {
  try {
    const users = getAllUsersWithStats();
    res.json({
      success: true,
      data: users
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    });
  }
});

/**
 * SECURITY: Removed /users-credentials endpoint
 * Passwords should never be exposed via API endpoints
 * This endpoint was a security risk and has been removed
 */

export default router;
