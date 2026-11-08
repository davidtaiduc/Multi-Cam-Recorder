import { DatabaseSync } from 'node:sqlite';
export function openDatabase(path) {
 const db = new DatabaseSync(path);
 db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('controller','remote')));
 CREATE UNIQUE INDEX IF NOT EXISTS one_controller ON users(role) WHERE role='controller';
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),device_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),invite_code TEXT UNIQUE NOT NULL,expires_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'open',max_members INTEGER NOT NULL DEFAULT 8);
 CREATE UNIQUE INDEX IF NOT EXISTS one_open_room ON rooms(owner_id) WHERE status='open';
 CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY,room_id TEXT NOT NULL REFERENCES rooms(id),user_id TEXT NOT NULL REFERENCES users(id),device_id TEXT UNIQUE NOT NULL,camera_name TEXT NOT NULL,joined_at INTEGER NOT NULL,UNIQUE(room_id,device_id));
 INSERT OR IGNORE INTO schema_migrations VALUES(1);`);
 return db;
}
