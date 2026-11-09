import {randomUUID} from 'node:crypto';
import {digest,newToken} from '../security.mjs';
import {fail} from '../middleware/http.mjs';
import {profile} from '../repositories/users.mjs';
export const ACCESS_MS=15*60*1000;
export const REFRESH_MS=30*24*60*60*1000;
export function issue(db,user,device,id=randomUUID()){
 const access=newToken(),refresh=newToken();
 db.prepare('INSERT OR IGNORE INTO refresh_sessions(id,user_id,device_id,expires_at) VALUES(?,?,?,?)').run(id,user.id,device,Date.now()+REFRESH_MS);
 db.prepare('INSERT INTO sessions(token_hash,user_id,device_id,expires_at,session_id) VALUES(?,?,?,?,?)').run(digest(access),user.id,device,Date.now()+ACCESS_MS,id);
 db.prepare('INSERT INTO refresh_tokens(token_hash,session_id) VALUES(?,?)').run(digest(refresh),id);
 return {user:profile(user),account_role:user.role,access_token:access,refresh_token:refresh,expires_in:ACCESS_MS/1000};
}
export function revoke(db,id){db.prepare('UPDATE refresh_sessions SET revoked=1 WHERE id=?').run(id);db.prepare('DELETE FROM sessions WHERE session_id=?').run(id);}
export function rotate(db,token){
 const row=db.prepare('SELECT r.*,t.used FROM refresh_tokens t JOIN refresh_sessions r ON r.id=t.session_id WHERE t.token_hash=?').get(digest(token));
 if(!row||row.revoked||row.expires_at<=Date.now())fail(401,'Refresh session expired','SESSION_EXPIRED');
 if(row.used){revoke(db,row.id);fail(401,'Refresh reuse revoked this session','REFRESH_REUSED');}
 db.exec('BEGIN IMMEDIATE');
 try{db.prepare('UPDATE refresh_tokens SET used=1 WHERE token_hash=?').run(digest(token));db.prepare('UPDATE sessions SET expires_at=0 WHERE session_id=?').run(row.id);const result=issue(db,db.prepare('SELECT * FROM users WHERE id=?').get(row.user_id),row.device_id,row.id);db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}
}
export function authenticate(db,req){
 const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
 const row=token&&db.prepare('SELECT u.*,s.device_id,s.session_id,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN refresh_sessions r ON r.id=s.session_id WHERE token_hash=? AND (s.session_id IS NULL OR (r.revoked=0 AND r.expires_at>?))').get(digest(token),Date.now());
 if(!row)fail(401,'Authentication required','SESSION_EXPIRED');
 if(row.expires_at<=Date.now())fail(401,'Access token expired','ACCESS_EXPIRED');
 return {...row,token};
}
