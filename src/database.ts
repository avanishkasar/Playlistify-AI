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

  console.log('✅ Database initialized successfully');
  
  // Seed initial users if database is empty
  seedInitialUsers();
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
  
  // Realistic user data with varied playlist counts
  const users = [
    { username: 'avanish', email: 'avanish@playlistify.ai', password: 'Avanish@123', displayName: 'Avanish Kasar', playlists: 30 },
    { username: 'priya_sharma', email: 'priya.sharma@gmail.com', password: 'Priya@2024', displayName: 'Priya Sharma', playlists: 24 },
    { username: 'rahul_dev', email: 'rahul.developer@outlook.com', password: 'RahulDev#99', displayName: 'Rahul Kumar', playlists: 21 },
    { username: 'sneha_music', email: 'sneha.melodies@yahoo.com', password: 'Sneha!Music1', displayName: 'Sneha Patel', playlists: 19 },
    { username: 'arjun_beats', email: 'arjun.beats@gmail.com', password: 'ArjunB@567', displayName: 'Arjun Reddy', playlists: 17 },
    { username: 'ananya_vibes', email: 'ananya.vibes@hotmail.com', password: 'Ananya#Vibes', displayName: 'Ananya Singh', playlists: 15 },
    { username: 'vikram_tunes', email: 'vikram.tunes@gmail.com', password: 'VikramT@321', displayName: 'Vikram Mehra', playlists: 14 },
    { username: 'kavya_rhythms', email: 'kavya.rhythms@outlook.com', password: 'Kavya!2024', displayName: 'Kavya Nair', playlists: 12 },
    { username: 'rohan_sounds', email: 'rohan.sounds@gmail.com', password: 'RohanS#789', displayName: 'Rohan Gupta', playlists: 11 },
    { username: 'meera_playlist', email: 'meera.music@yahoo.com', password: 'Meera@Play1', displayName: 'Meera Joshi', playlists: 10 },
    { username: 'aditya_mix', email: 'aditya.mix@gmail.com', password: 'AdityaM!234', displayName: 'Aditya Verma', playlists: 9 },
    { username: 'ishita_songs', email: 'ishita.songs@outlook.com', password: 'Ishita#Song', displayName: 'Ishita Kapoor', playlists: 8 },
    { username: 'kartik_beats', email: 'kartik.beats@gmail.com', password: 'KartikB@456', displayName: 'Kartik Malhotra', playlists: 7 },
    { username: 'divya_melody', email: 'divya.melody@hotmail.com', password: 'DivyaM!890', displayName: 'Divya Chopra', playlists: 6 },
    { username: 'nikhil_trance', email: 'nikhil.trance@gmail.com', password: 'NikhilT#123', displayName: 'Nikhil Saxena', playlists: 5 },
    { username: 'pooja_vibes', email: 'pooja.vibes@yahoo.com', password: 'PoojaV@567', displayName: 'Pooja Agarwal', playlists: 4 },
    { username: 'sameer_audio', email: 'sameer.audio@gmail.com', password: 'SameerA!234', displayName: 'Sameer Khan', playlists: 3 },
    { username: 'neha_tracks', email: 'neha.tracks@outlook.com', password: 'NehaT#890', displayName: 'Neha Desai', playlists: 2 },
    { username: 'varun_music', email: 'varun.music@gmail.com', password: 'VarunM@111', displayName: 'Varun Bhatt', playlists: 1 },
    { username: 'shreya_notes', email: 'shreya.notes@hotmail.com', password: 'ShreyaN!999', displayName: 'Shreya Iyer', playlists: 1 }
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
 */
export function incrementPlaylistCount(userId: number) {
  const stmt = db.prepare(`
    UPDATE user_stats
    SET 
      total_playlists = total_playlists + 1,
      last_activity = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `);
  
  stmt.run(userId);
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
    ORDER BY COALESCE(us.total_playlists, 0) DESC
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

// Initialize database on module load
initializeDatabase();

export default db;
