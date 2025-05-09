import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || './database.sqlite';

class Database {
  private db: BetterSqlite3.Database | null = null;

  init() {
    // Create db directory if it doesn't exist
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database connection
    this.db = new BetterSqlite3(DB_PATH);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Create tables if they don't exist
    this.createTables();
    
    console.log('Database initialized');
    
    // Add default user if needed (for simplified authentication-free system)
    this.ensureDefaultUser();
    
    return this.db;
  }

  private createTables() {
    if (!this.db) throw new Error('Database not initialized');

    // Users table (simplified but kept for reference to other tables)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Printers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS printers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        serial_number TEXT,
        access_code TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Printer status table (for storing the last known status)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS printer_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        printer_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        progress REAL DEFAULT 0,
        time_remaining INTEGER DEFAULT 0,
        current_file TEXT,
        nozzle_temp REAL,
        bed_temp REAL,
        error_message TEXT,
        connected BOOLEAN DEFAULT 0,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (printer_id) REFERENCES printers (id) ON DELETE CASCADE
      )
    `);
  }

  // Ensure we have a default user (ID 1) for the system
  private ensureDefaultUser() {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE id = 1');
    const result = stmt.get() as { count: number };
    
    if (result.count === 0) {
      const insertStmt = this.db.prepare(
        'INSERT INTO users (id, username) VALUES (1, ?)'
      );
      insertStmt.run('admin');
      console.log('Default user created');
    }
  }

  get() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
}

const database = new Database();
export default database;