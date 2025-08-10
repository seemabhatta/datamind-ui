import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from "@shared/schema";
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Ensure data directory exists
const dbPath = process.env.DATABASE_URL || './data/datamind.db';
const dbDir = dirname(dbPath);

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = OFF');

export const db = drizzle({ client: sqlite, schema });

// Initialize database with schema
export function initializeDatabase() {
  try {
    // Disable foreign key constraints during initialization
    sqlite.pragma('foreign_keys = OFF');
    
    // Create tables manually since we can't use migrations with the current setup
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT,
        role TEXT DEFAULT 'analyst',
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        title TEXT,
        agent_type TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES chat_sessions(id),
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS visualizations (
        id TEXT PRIMARY KEY,
        message_id TEXT REFERENCES chat_messages(id),
        user_id TEXT REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        chart_type TEXT NOT NULL,
        chart_config TEXT NOT NULL,
        data TEXT NOT NULL,
        sql_query TEXT,
        is_pinned INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 0,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS pinned_visualizations (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        visualization_id TEXT REFERENCES visualizations(id),
        pinned_at INTEGER
      );
    `);
    
    // Create a default user if none exists
    const userExists = sqlite.prepare('SELECT id FROM users WHERE username = ?').get('user_1');
    if (!userExists) {
      const userId = crypto.randomUUID();
      const now = Date.now();
      sqlite.prepare(`
        INSERT INTO users (id, username, password, display_name, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, 'user_1', 'password', 'Default User', 'analyst', now);
      console.log('Created default user:', userId);
    }
    
    // Re-enable foreign key constraints
    sqlite.pragma('foreign_keys = ON');
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}