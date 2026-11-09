import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../src/database.mjs';
import {hashPassword,digest} from '../src/security.mjs';
import {issue,rotate} from '../src/services/sessions.mjs';
test('version 1 migration preserves users, sessions, rooms and members; refresh persists across reopen',()=>{
 const dir=mkdtempSync(join(tmpdir(),'multicam-migration-')),file=join(dir,'legacy.sqlite');let db;
 try{
 db=new DatabaseSync(file);db.exec(`CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY);INSERT INTO schema_migrations VALUES(1);
 CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('controller','remote')));
 CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),device_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE TABLE rooms(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),invite_code TEXT UNIQUE NOT NULL,expires_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'open',max_members INTEGER NOT NULL DEFAULT 8);
 CREATE TABLE members(id TEXT PRIMARY KEY,room_id TEXT NOT NULL REFERENCES rooms(id),user_id TEXT NOT NULL REFERENCES users(id),device_id TEXT UNIQUE NOT NULL,camera_name TEXT NOT NULL,joined_at INTEGER NOT NULL,UNIQUE(room_id,device_id));`);
 db.prepare('INSERT INTO users VALUES(?,?,?,?)').run('c','c@test.local',hashPassword('password123'),'controller');db.prepare('INSERT INTO users VALUES(?,?,?,?)').run('r','r@test.local',hashPassword('password123'),'remote');
 db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest('legacy-token'),'r','device',Date.now()+3600000);db.prepare('INSERT INTO rooms(id,owner_id,invite_code,expires_at) VALUES(?,?,?,?)').run('room','c','ABCDEF',Date.now()+600000);db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run('m','room','r','device','Camera',Date.now());db.close();db=null;
 db=openDatabase(file);assert.equal(db.prepare('SELECT verified FROM users WHERE id=?').get('r').verified,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM members').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM rooms').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n,1);assert.equal(db.prepare('SELECT user_id FROM devices').get().user_id,'r');
 const issued=issue(db,db.prepare('SELECT * FROM users WHERE id=?').get('r'),'device');db.close();db=null;db=openDatabase(file);const next=rotate(db,issued.refresh_token);assert.ok(next.refresh_token);assert.notEqual(next.refresh_token,issued.refresh_token);assert.equal(db.prepare('SELECT COUNT(*) n FROM schema_migrations').get().n,2);assert.equal(db.prepare('SELECT COUNT(*) n FROM members').get().n,1);
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});
