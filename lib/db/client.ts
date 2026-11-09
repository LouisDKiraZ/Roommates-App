import * as SQLite from "expo-sqlite";

// Lazily opens the on-device database and makes sure the schema exists.
// Repositories are the only code that should import this — screens and
// context go through them instead of touching SQL directly.

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("roomly.db").then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          avatar_color TEXT NOT NULL,
          initials TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS apartments (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          invite_code TEXT NOT NULL UNIQUE,
          owner_id TEXT NOT NULL REFERENCES users(id),
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS apartment_members (
          apartment_id TEXT NOT NULL REFERENCES apartments(id),
          user_id TEXT NOT NULL REFERENCES users(id),
          joined_at TEXT NOT NULL,
          PRIMARY KEY (apartment_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS join_requests (
          id TEXT PRIMARY KEY NOT NULL,
          apartment_id TEXT NOT NULL REFERENCES apartments(id),
          user_id TEXT NOT NULL REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          responded_at TEXT
        );
      `);
      return db;
    });
  }
  return dbPromise;
}
