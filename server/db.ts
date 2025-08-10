import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from "@shared/schema";
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Use local SQLite database for standalone mode
const dbPath = './data/datamind.db';
const dbDir = dirname(dbPath);

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle({ client: sqlite, schema });

// Initialize database with schema
export function initializeDatabase() {
  try {
    // Disable foreign key constraints during initialization
    sqlite.pragma('foreign_keys = OFF');
    
    console.log('Creating database tables...');
    
    // Create tables one by one for better error handling
    const createTableSQL = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT,
        role TEXT DEFAULT 'analyst',
        created_at INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        agent_type TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id)
      )`,
      `CREATE TABLE IF NOT EXISTS visualizations (
        id TEXT PRIMARY KEY,
        message_id TEXT,
        user_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        chart_type TEXT NOT NULL,
        chart_config TEXT NOT NULL,
        data TEXT NOT NULL,
        sql_query TEXT,
        is_pinned INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 0,
        created_at INTEGER,
        FOREIGN KEY(message_id) REFERENCES chat_messages(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS pinned_visualizations (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        visualization_id TEXT,
        pinned_at INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(visualization_id) REFERENCES visualizations(id)
      )`
    ];

    for (const sql of createTableSQL) {
      try {
        sqlite.exec(sql);
        console.log('Table created:', sql.substring(32, sql.indexOf(' (')));
      } catch (error) {
        console.error('Error creating table:', error);
        console.error('SQL:', sql);
        throw error;
      }
    }
    
    console.log('Tables created successfully');
    
    // Create a default user if none exists
    const userCheck = sqlite.prepare('SELECT id FROM users WHERE username = ?');
    const userExists = userCheck.get('user_1');
    if (!userExists) {
      const userId = crypto.randomUUID();
      const now = Date.now();
      const insertUser = sqlite.prepare(`
        INSERT INTO users (id, username, password, display_name, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertUser.run(userId, 'user_1', 'password', 'Default User', 'analyst', now);
      console.log('Created default user:', userId);
    } else {
      console.log('Default user already exists:', (userExists as any).id);
    }
    
    // Ensure foreign key constraints are enabled
    sqlite.pragma('foreign_keys = ON');
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}