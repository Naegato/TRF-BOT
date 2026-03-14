import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const DB_PATH = process.env.DB_PATH ?? 'data.db';

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
        discordId    TEXT PRIMARY KEY,
        firstName    TEXT NOT NULL,
        lastName     TEXT NOT NULL,
        role         TEXT NOT NULL,
        year         INTEGER,
        track        TEXT,
        intake       TEXT,
        registeredAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        guildId        TEXT NOT NULL,
        openedBy       TEXT NOT NULL,
        openedAt       INTEGER,
        closedAt       INTEGER,
        scheduledStart INTEGER,
        scheduledEnd   INTEGER
    );

    CREATE TABLE IF NOT EXISTS points (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        discordId TEXT NOT NULL,
        type      TEXT NOT NULL,
        grantedBy TEXT NOT NULL,
        amount    INTEGER NOT NULL DEFAULT 1,
        sessionId INTEGER REFERENCES sessions(id),
        messageId TEXT,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS points_messageId_unique
        ON points(messageId) WHERE type = 'proof';

    CREATE UNIQUE INDEX IF NOT EXISTS points_session_discordId_unique
        ON points(sessionId, discordId) WHERE type = 'session';

    CREATE TABLE IF NOT EXISTS rendus (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        guildId   TEXT NOT NULL,
        createdBy TEXT NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        year      INTEGER,
        track     TEXT,
        intake    TEXT
    );
`);

export const db = drizzle(sqlite, { schema });

export function connectDatabase(): void {
    console.log(`Connected to SQLite database at ${DB_PATH}.`);
}
