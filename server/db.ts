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
      )`,
      `CREATE TABLE IF NOT EXISTS snowflake_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        account TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT,
        database TEXT,
        schema TEXT,
        warehouse TEXT,
        role TEXT,
        authenticator TEXT DEFAULT 'SNOWFLAKE',
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        last_connected INTEGER,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS agent_configurations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        config_data TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
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
    let userId = '0d493db8-bfed-4dd0-ab40-ae8a3225f8a5';
    if (!userExists) {
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

    // Create default Snowflake connection if none exists
    const connCheck = sqlite.prepare('SELECT id FROM snowflake_connections WHERE user_id = ?');
    const connExists = connCheck.get(userId);
    if (!connExists) {
      const now = Date.now();
      const insertConn = sqlite.prepare(`
        INSERT INTO snowflake_connections (id, user_id, name, account, username, password, database, schema, warehouse, role, is_default, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const connId = crypto.randomUUID();
      insertConn.run(
        connId, userId, 'SF Personal', 'KIXUIII-MTC00254', 'nl2sql_service_user', process.env.SNOWFLAKE_PASSWORD || '', 
        'CORTES_DEMO_2', 'CORTEX_DEMO', 'CORTEX_ANALYST_WH', 'nl2sql_service_role', 
        1, 1, now, now
      );
      console.log('Created default Snowflake connection:', connId);
    } else {
      console.log('Default Snowflake connection already exists');
    }
    
    // Ensure foreign key constraints are enabled
    sqlite.pragma('foreign_keys = ON');
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}