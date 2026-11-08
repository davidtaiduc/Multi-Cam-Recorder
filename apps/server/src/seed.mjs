import {randomUUID} from 'node:crypto';
import {openDatabase} from './database.mjs';
import {hashPassword} from './security.mjs';
const {CONTROLLER_EMAIL:email,CONTROLLER_PASSWORD:password}=process.env;
if(!email||!password||password==='replace-with-a-long-password'||password.length<12) throw new Error('Set controller email and a password of at least 12 characters in apps/server/.env');
const db=openDatabase(process.env.DB_PATH||'./multicam.sqlite');
if(db.prepare("SELECT id FROM users WHERE role='controller'").get()) console.log('Controller already exists; password unchanged.');
else {db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(randomUUID(),email.toLowerCase(),hashPassword(password),'controller');console.log('Controller created.');}
db.close();
