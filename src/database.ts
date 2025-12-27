import Database, { Database as DatabaseType } from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// User interface
export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_login: string | null;
  spotify_connected: number;
  spotify_id: string | null;
  display_name: string | null;
}

// Ensure data directory exists
const dataDir = join(__dirname, '../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const db: DatabaseType = new Database(join(dataDir, 'playlistify.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database tables
 */
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      spotify_connected BOOLEAN DEFAULT 0,
      spotify_id TEXT,
      display_name TEXT,
      profile_picture TEXT
    )
  `);

  // Add profile_picture column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN profile_picture TEXT`);
  } catch (e) {
    // Column already exists
  }

  // Playlists table
  db.exec(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      playlist_name TEXT NOT NULL,
      playlist_type TEXT NOT NULL,
      description TEXT,
      track_count INTEGER DEFAULT 0,
      spotify_playlist_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // User statistics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id INTEGER PRIMARY KEY,
      total_playlists INTEGER DEFAULT 0,
      favorite_genre TEXT,
      total_tracks_added INTEGER DEFAULT 0,
      last_activity DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Payment orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      product_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      pro_code TEXT UNIQUE NOT NULL,
      transaction_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME
    )
  `);

  // Pro activations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pro_activations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      pro_code TEXT NOT NULL,
      product_type TEXT NOT NULL,
      activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (pro_code) REFERENCES payment_orders(pro_code)
    )
  `);

  // Spotify tokens table - stores per-user OAuth tokens
  db.exec(`
    CREATE TABLE IF NOT EXISTS spotify_tokens (
      user_id INTEGER PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      spotify_user_id TEXT,
      spotify_display_name TEXT,
      spotify_email TEXT,
      spotify_avatar TEXT,
      connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Spotify Library table - stores saved playlists from user's Spotify account
  db.exec(`
    CREATE TABLE IF NOT EXISTS spotify_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      playlist_id TEXT NOT NULL,
      playlist_name TEXT NOT NULL,
      cover_image TEXT,
      track_count INTEGER DEFAULT 0,
      owner_name TEXT,
      is_public BOOLEAN DEFAULT 1,
      spotify_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, playlist_id)
    )
  `);

  console.log('✅ Database initialized successfully');

  // Seed initial users if database is empty
  // DISABLED: Only real users should be in the system
  // seedInitialUsers();
}

/**
 * Seed database with initial users for leaderboard
 */
function seedInitialUsers() {
  // Check if users already exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count > 0) {
    console.log('ℹ️ Users already exist, skipping seed');
    return;
  }

  console.log('🌱 Seeding initial users...');

  // 11 users for leaderboard - avanish champion, then decreasing realistically
  const users = [
    { username: 'avanish', email: 'avanish@playlistify.ai', password: 'Avanish@123', displayName: 'Avanish Kasar', playlists: 47 },
    { username: 'priya_sharma', email: 'priya.sharma@gmail.com', password: 'Priya@2024', displayName: 'Priya Sharma', playlists: 20 },
    { username: 'rahul_dev', email: 'rahul.developer@outlook.com', password: 'RahulDev#99', displayName: 'Rahul Kumar', playlists: 14 },
    { username: 'sneha_music', email: 'sneha.melodies@yahoo.com', password: 'Sneha!Music1', displayName: 'Sneha Patel', playlists: 7 },
    { username: 'arjun_beats', email: 'arjun.beats@gmail.com', password: 'ArjunB@567', displayName: 'Arjun Reddy', playlists: 6 },
    { username: 'ananya_vibes', email: 'ananya.vibes@hotmail.com', password: 'Ananya#Vibes', displayName: 'Ananya Singh', playlists: 5 },
    { username: 'vikram_tunes', email: 'vikram.tunes@gmail.com', password: 'VikramT@321', displayName: 'Vikram Mehra', playlists: 4 },
    { username: 'kavya_rhythms', email: 'kavya.rhythms@outlook.com', password: 'Kavya!2024', displayName: 'Kavya Nair', playlists: 3 },
    { username: 'rohan_sounds', email: 'rohan.sounds@gmail.com', password: 'RohanS#789', displayName: 'Rohan Gupta', playlists: 2 },
    { username: 'meera_playlist', email: 'meera.music@yahoo.com', password: 'Meera@Play1', displayName: 'Meera Joshi', playlists: 2 },
    { username: 'aditya_mix', email: 'aditya.mix@gmail.com', password: 'AdityaM!234', displayName: 'Aditya Verma', playlists: 2 }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name)
    VALUES (?, ?, ?, ?)
  `);

  const insertStats = db.prepare(`
    INSERT INTO user_stats (user_id, total_playlists, total_tracks_added, last_activity)
    VALUES (?, ?, ?, datetime('now', '-' || ? || ' hours'))
  `);

  for (const user of users) {
    try {
      const passwordHash = hashPassword(user.password);
      const result = insertUser.run(user.username, user.email, passwordHash, user.displayName);

      // Insert stats with random activity time
      const hoursAgo = Math.floor(Math.random() * 168); // Random time in last week
      insertStats.run(result.lastInsertRowid, user.playlists, user.playlists * 15, hoursAgo);

      console.log(`  ✓ Created user: ${user.username} (${user.playlists} playlists)`);
    } catch (error: any) {
      console.log(`  ⚠️ Skipped ${user.username}: ${error.message}`);
    }
  }

  console.log('✅ User seeding complete!');
}

/**
 * Hash password using SHA-256
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Create a new user
 */
export function createUser(username: string, email: string, password: string) {
  const passwordHash = hashPassword(password);

  try {
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, display_name)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(username, email, passwordHash, username);

    // Initialize user stats
    const statsStmt = db.prepare(`
      INSERT INTO user_stats (user_id, total_playlists, total_tracks_added)
      VALUES (?, 0, 0)
    `);
    statsStmt.run(result.lastInsertRowid);

    return {
      id: result.lastInsertRowid,
      username,
      email,
      display_name: username
    };
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error('Username or email already exists');
    }
    throw error;
  }
}

/**
 * Authenticate user
 */
export function authenticateUser(username: string, password: string) {
  const passwordHash = hashPassword(password);

  const stmt = db.prepare(`
    SELECT id, username, email, display_name, spotify_connected
    FROM users
    WHERE username = ? AND password_hash = ?
  `);

  const user = stmt.get(username, passwordHash) as User | undefined;

  if (user) {
    // Update last login
    const updateStmt = db.prepare(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `);
    updateStmt.run(user.id);
  }

  return user || null;
}

/**
 * Get user by ID
 */
export function getUserById(userId: number): User | undefined {
  const stmt = db.prepare(`
    SELECT id, username, email, display_name, spotify_connected, created_at, last_login
    FROM users
    WHERE id = ?
  `);

  return stmt.get(userId) as User | undefined;
}

/**
 * Create a playlist record
 */
export function createPlaylist(userId: number, playlistName: string, playlistType: string, description?: string) {
  const stmt = db.prepare(`
    INSERT INTO playlists (user_id, playlist_name, playlist_type, description)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(userId, playlistName, playlistType, description || '');

  // Update user stats
  updateUserStats(userId);

  return {
    id: result.lastInsertRowid,
    playlist_name: playlistName,
    playlist_type: playlistType
  };
}

/**
 * Get user playlists
 */
export function getUserPlaylists(userId: number) {
  const stmt = db.prepare(`
    SELECT id, playlist_name, playlist_type, description, track_count, created_at
    FROM playlists
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);

  return stmt.all(userId);
}

/**
 * Get user statistics
 */
export function getUserStats(userId: number) {
  const stmt = db.prepare(`
    SELECT 
      us.*,
      COUNT(DISTINCT p.id) as playlist_count,
      COUNT(DISTINCT p.playlist_type) as unique_types
    FROM user_stats us
    LEFT JOIN playlists p ON us.user_id = p.user_id
    WHERE us.user_id = ?
    GROUP BY us.user_id
  `);

  return stmt.get(userId);
}

/**
 * Update user statistics
 */
function updateUserStats(userId: number) {
  const stmt = db.prepare(`
    UPDATE user_stats
    SET 
      total_playlists = (SELECT COUNT(*) FROM playlists WHERE user_id = ?),
      last_activity = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `);

  stmt.run(userId, userId);
}

/**
 * Update playlist track count
 */
export function updatePlaylistTrackCount(playlistId: number, trackCount: number) {
  const stmt = db.prepare(`
    UPDATE playlists
    SET track_count = ?
    WHERE id = ?
  `);

  stmt.run(trackCount, playlistId);
}

/**
 * Delete playlist
 */
export function deletePlaylist(playlistId: number, userId: number) {
  const stmt = db.prepare(`
    DELETE FROM playlists
    WHERE id = ? AND user_id = ?
  `);

  const result = stmt.run(playlistId, userId);

  if (result.changes > 0) {
    updateUserStats(userId);
  }

  return result.changes > 0;
}

/**
 * Increment user's playlist generation count
 * Ensures user_stats exists before updating
 */
export function incrementPlaylistCount(userId: number) {
  // First, ensure user_stats exists for this user
  const checkStmt = db.prepare(`SELECT user_id FROM user_stats WHERE user_id = ?`);
  const exists = checkStmt.get(userId);
  
  if (!exists) {
    // Create user_stats entry if it doesn't exist
    const insertStmt = db.prepare(`
      INSERT INTO user_stats (user_id, total_playlists, total_tracks_added)
      VALUES (?, 0, 0)
    `);
    insertStmt.run(userId);
  }
  
  // Now update the count
  const stmt = db.prepare(`
    UPDATE user_stats
    SET 
      total_playlists = total_playlists + 1,
      last_activity = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `);

  const result = stmt.run(userId);
  console.log(`[Database] Incremented playlist count for user ${userId}, changes: ${result.changes}`);
}

/**
 * Get all users with their stats (for admin dashboard)
 */
export function getAllUsersWithStats() {
  const stmt = db.prepare(`
    SELECT 
      u.id,
      u.username,
      u.email,
      u.display_name,
      u.created_at,
      u.last_login,
      u.spotify_connected,
      COALESCE(us.total_playlists, 0) as playlist_count,
      COALESCE(us.total_tracks_added, 0) as total_tracks,
      us.last_activity
    FROM users u
    LEFT JOIN user_stats us ON u.id = us.user_id
    ORDER BY u.created_at DESC
  `);

  return stmt.all();
}

/**
 * Get total stats for admin dashboard
 */
export function getAdminDashboardStats() {
  const userCount = db.prepare(`SELECT COUNT(*) as count FROM users`).get() as any;
  const playlistCount = db.prepare(`SELECT SUM(total_playlists) as count FROM user_stats`).get() as any;
  const todayUsers = db.prepare(`
    SELECT COUNT(*) as count FROM users 
    WHERE date(created_at) = date('now')
  `).get() as any;
  const todayPlaylists = db.prepare(`
    SELECT COUNT(*) as count FROM playlists 
    WHERE date(created_at) = date('now')
  `).get() as any;

  return {
    totalUsers: userCount?.count || 0,
    totalPlaylists: playlistCount?.count || 0,
    todayUsers: todayUsers?.count || 0,
    todayPlaylists: todayPlaylists?.count || 0
  };
}

/**
 * Check if admin credentials are valid
 */
export function validateAdminCredentials(username: string, password: string): boolean {
  // Hardcoded admin credentials as requested
  return username === 'admin' && password === 'admin';
}

/**
 * Get top users leaderboard (top 20 by playlist count)
 * Only includes users with at least 1 playlist
 */
export function getLeaderboard(limit: number = 20) {
  const stmt = db.prepare(`
    SELECT 
      u.id,
      u.username,
      u.display_name,
      u.profile_picture,
      COALESCE(us.total_playlists, 0) as playlist_count,
      u.created_at
    FROM users u
    LEFT JOIN user_stats us ON u.id = us.user_id
    WHERE COALESCE(us.total_playlists, 0) > 0
    ORDER BY COALESCE(us.total_playlists, 0) DESC, u.created_at ASC
    LIMIT ?
  `);

  return stmt.all(limit);
}

/**
 * Update user profile picture
 */
export function updateProfilePicture(userId: number, profilePicture: string) {
  const stmt = db.prepare(`
    UPDATE users SET profile_picture = ? WHERE id = ?
  `);
  return stmt.run(profilePicture, userId);
}

/**
 * Update user display name
 */
export function updateDisplayName(userId: number, displayName: string) {
  const stmt = db.prepare(`
    UPDATE users SET display_name = ? WHERE id = ?
  `);
  return stmt.run(displayName, userId);
}

/**
 * Update username
 */
export function updateUsername(userId: number, username: string) {
  try {
    const stmt = db.prepare(`
      UPDATE users SET username = ? WHERE id = ?
    `);
    stmt.run(username, userId);
    return { success: true };
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'Username already taken' };
    }
    throw error;
  }
}

/**
 * Update user password
 */
export function updatePassword(userId: number, currentPassword: string, newPassword: string) {
  const currentHash = hashPassword(currentPassword);
  const newHash = hashPassword(newPassword);

  // Verify current password
  const user = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(userId) as any;

  if (!user || user.password_hash !== currentHash) {
    return { success: false, error: 'Current password is incorrect' };
  }

  const stmt = db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`);
  stmt.run(newHash, userId);

  return { success: true };
}

// ============================================================================
// PAYMENT FUNCTIONS
// ============================================================================

interface PaymentOrder {
  orderId: string;
  userId: string;
  productType: string;
  amount: number;
  proCode: string;
  status: string;
}

/**
 * Create a new payment order
 */
export function createPaymentOrder(order: PaymentOrder) {
  const stmt = db.prepare(`
    INSERT INTO payment_orders (order_id, user_id, product_type, amount, pro_code, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    order.orderId,
    order.userId,
    order.productType,
    order.amount,
    order.proCode,
    order.status
  );

  return order;
}

/**
 * Verify a payment order with transaction ID
 */
export function verifyPaymentOrder(orderId: string, transactionId: string) {
  // Get the order
  const order = db.prepare(`
    SELECT * FROM payment_orders WHERE order_id = ?
  `).get(orderId) as any;

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  if (order.status === "verified") {
    return { success: true, proCode: order.pro_code, productType: order.product_type };
  }

  // Update order with transaction ID and mark as verified
  const stmt = db.prepare(`
    UPDATE payment_orders 
    SET transaction_id = ?, status = 'verified', verified_at = CURRENT_TIMESTAMP
    WHERE order_id = ?
  `);

  stmt.run(transactionId, orderId);

  return {
    success: true,
    proCode: order.pro_code,
    productType: order.product_type
  };
}

/**
 * Get payment order by order ID
 */
export function getPaymentOrderByCode(orderId: string) {
  const stmt = db.prepare(`SELECT * FROM payment_orders WHERE order_id = ?`);
  const order = stmt.get(orderId) as any;

  if (!order) return null;

  return {
    orderId: order.order_id,
    userId: order.user_id,
    productType: order.product_type,
    amount: order.amount,
    proCode: order.pro_code,
    status: order.status,
    transactionId: order.transaction_id,
    createdAt: order.created_at
  };
}

/**
 * Activate Pro features with a code
 */
export function activateProCode(proCode: string, userId: string) {
  // Find the order with this pro code
  const order = db.prepare(`
    SELECT * FROM payment_orders WHERE pro_code = ? AND status = 'verified'
  `).get(proCode) as any;

  if (!order) {
    return { success: false, error: "Invalid or unused Pro code" };
  }

  // Check if already activated
  const existing = db.prepare(`
    SELECT * FROM pro_activations WHERE pro_code = ?
  `).get(proCode);

  if (existing) {
    return { success: false, error: "Code already used" };
  }

  // Calculate expiry (24h for download, null for permanent)
  const expiresAt = order.product_type === 'download'
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Create activation record
  const stmt = db.prepare(`
    INSERT INTO pro_activations (user_id, pro_code, product_type, expires_at)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(userId, proCode, order.product_type, expiresAt);

  return {
    success: true,
    productType: order.product_type,
    expiresAt
  };
}

/**
 * Get Pro status for a user
 */
export function getProCode(userId: string) {
  // Check for any active Pro subscription
  const stmt = db.prepare(`
    SELECT * FROM pro_activations 
    WHERE user_id = ? 
    AND (expires_at IS NULL OR expires_at > datetime('now'))
    ORDER BY activated_at DESC
    LIMIT 1
  `);

  const activation = stmt.get(userId) as any;

  if (!activation) {
    return null;
  }

  return {
    isActive: true,
    productType: activation.product_type,
    expiresAt: activation.expires_at
  };
}

// ============================================================================
// SPOTIFY TOKEN FUNCTIONS - Per-user token storage
// ============================================================================

export interface SpotifyTokens {
  userId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  spotifyUserId?: string;
  spotifyDisplayName?: string;
  spotifyEmail?: string;
  spotifyAvatar?: string;
}

/**
 * Save or update Spotify tokens for a user
 */
export function saveSpotifyTokens(tokens: SpotifyTokens) {
  const stmt = db.prepare(`
    INSERT INTO spotify_tokens (
      user_id, access_token, refresh_token, expires_at,
      spotify_user_id, spotify_display_name, spotify_email, spotify_avatar,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      spotify_user_id = excluded.spotify_user_id,
      spotify_display_name = excluded.spotify_display_name,
      spotify_email = excluded.spotify_email,
      spotify_avatar = excluded.spotify_avatar,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(
    tokens.userId,
    tokens.accessToken,
    tokens.refreshToken,
    tokens.expiresAt,
    tokens.spotifyUserId || null,
    tokens.spotifyDisplayName || null,
    tokens.spotifyEmail || null,
    tokens.spotifyAvatar || null
  );

  // Also update the spotify_connected flag in users table
  db.prepare(`UPDATE users SET spotify_connected = 1 WHERE id = ?`).run(tokens.userId);

  console.log(`💾 Saved Spotify tokens for user ${tokens.userId}`);
  return true;
}

/**
 * Get Spotify tokens for a user
 */
export function getSpotifyTokens(userId: number): SpotifyTokens | null {
  const stmt = db.prepare(`
    SELECT * FROM spotify_tokens WHERE user_id = ?
  `);

  const row = stmt.get(userId) as any;

  if (!row) return null;

  return {
    userId: row.user_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at,
    spotifyUserId: row.spotify_user_id,
    spotifyDisplayName: row.spotify_display_name,
    spotifyEmail: row.spotify_email,
    spotifyAvatar: row.spotify_avatar
  };
}

/**
 * Update only the access token (after refresh)
 */
export function updateSpotifyAccessToken(userId: number, accessToken: string, expiresAt: number, newRefreshToken?: string) {
  let stmt;
  if (newRefreshToken) {
    stmt = db.prepare(`
      UPDATE spotify_tokens 
      SET access_token = ?, expires_at = ?, refresh_token = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `);
    stmt.run(accessToken, expiresAt, newRefreshToken, userId);
  } else {
    stmt = db.prepare(`
      UPDATE spotify_tokens 
      SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `);
    stmt.run(accessToken, expiresAt, userId);
  }

  console.log(`🔄 Updated access token for user ${userId}`);
  return true;
}

/**
 * Remove Spotify connection for a user
 */
export function removeSpotifyConnection(userId: number) {
  db.prepare(`DELETE FROM spotify_tokens WHERE user_id = ?`).run(userId);
  db.prepare(`UPDATE users SET spotify_connected = 0 WHERE id = ?`).run(userId);

  console.log(`🔌 Removed Spotify connection for user ${userId}`);
  return true;
}

/**
 * Check if a user has a valid Spotify connection
 */
export function isSpotifyConnected(userId: number): boolean {
  const tokens = getSpotifyTokens(userId);
  return tokens !== null;
}

/**
 * Get Spotify connection info for a user (without exposing tokens)
 */
export function getSpotifyConnectionInfo(userId: number) {
  const stmt = db.prepare(`
    SELECT spotify_user_id, spotify_display_name, spotify_email, spotify_avatar, connected_at
    FROM spotify_tokens WHERE user_id = ?
  `);

  const row = stmt.get(userId) as any;

  if (!row) return null;

  return {
    connected: true,
    spotifyUserId: row.spotify_user_id,
    displayName: row.spotify_display_name,
    email: row.spotify_email,
    avatar: row.spotify_avatar,
    connectedAt: row.connected_at
  };
}

// ============================================
// SPOTIFY LIBRARY FUNCTIONS
// ============================================

export interface SpotifyLibraryItem {
  id?: number;
  userId: number;
  playlistId: string;
  playlistName: string;
  coverImage?: string;
  trackCount: number;
  ownerName?: string;
  isPublic?: boolean;
  spotifyUrl?: string;
}

/**
 * Save a playlist to user's Playlistify library
 */
export function saveToSpotifyLibrary(item: SpotifyLibraryItem): boolean {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO spotify_library 
      (user_id, playlist_id, playlist_name, cover_image, track_count, owner_name, is_public, spotify_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      item.userId,
      item.playlistId,
      item.playlistName,
      item.coverImage || null,
      item.trackCount,
      item.ownerName || null,
      item.isPublic ? 1 : 0,
      item.spotifyUrl || null
    );
    
    console.log(`📚 Saved playlist "${item.playlistName}" to library for user ${item.userId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to save to library:', error.message);
    return false;
  }
}

/**
 * Remove a playlist from user's Playlistify library
 */
export function removeFromSpotifyLibrary(userId: number, playlistId: string): boolean {
  try {
    const stmt = db.prepare(`
      DELETE FROM spotify_library WHERE user_id = ? AND playlist_id = ?
    `);
    
    const result = stmt.run(userId, playlistId);
    
    if (result.changes > 0) {
      console.log(`🗑️ Removed playlist ${playlistId} from library for user ${userId}`);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error('❌ Failed to remove from library:', error.message);
    return false;
  }
}

/**
 * Get all saved playlists in user's Playlistify library
 */
export function getSpotifyLibrary(userId: number): SpotifyLibraryItem[] {
  try {
    const stmt = db.prepare(`
      SELECT id, user_id as userId, playlist_id as playlistId, playlist_name as playlistName,
             cover_image as coverImage, track_count as trackCount, owner_name as ownerName,
             is_public as isPublic, spotify_url as spotifyUrl, created_at as createdAt
      FROM spotify_library 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    
    return stmt.all(userId) as SpotifyLibraryItem[];
  } catch (error: any) {
    console.error('❌ Failed to get library:', error.message);
    return [];
  }
}

/**
 * Check if a playlist is in user's Playlistify library
 */
export function isInSpotifyLibrary(userId: number, playlistId: string): boolean {
  try {
    const stmt = db.prepare(`
      SELECT 1 FROM spotify_library WHERE user_id = ? AND playlist_id = ?
    `);
    
    return stmt.get(userId, playlistId) !== undefined;
  } catch (error: any) {
    return false;
  }
}

/**
 * Get count of saved playlists in user's library
 */
export function getSpotifyLibraryCount(userId: number): number {
  try {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM spotify_library WHERE user_id = ?
    `);
    
    const result = stmt.get(userId) as any;
    return result?.count || 0;
  } catch (error: any) {
    return 0;
  }
}

// Initialize database on module load
initializeDatabase();

export default db;
