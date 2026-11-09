import {randomUUID} from 'node:crypto';
import {body,str,emailValue,passwordValue,fail} from '../middleware/http.mjs';
import {hashPassword,verifyPassword,digest} from '../security.mjs';
import {bindDevice,profile} from '../repositories/users.mjs';
import {issue,rotate,revoke} from '../services/sessions.mjs';
export async function authRoute({db,req,path,method,send,otp,user}){
 if(method==='POST'&&path==='/auth/signup'){
 const b=await body(req),email=emailValue(b.email),password=passwordValue(b.password),first=str(b.first_name,'first_name',80),last=str(b.last_name,'last_name',80),phone=str(b.phone,'phone',24);
 if(!/^\+?[0-9 ()-]{7,24}$/.test(phone))fail(400,'Invalid phone','VALIDATION');
 if(db.prepare('SELECT id FROM users WHERE email=?').get(email))fail(409,'Email already registered','EMAIL_EXISTS');
 const id=randomUUID();db.prepare('INSERT INTO users(id,email,password_hash,role,first_name,last_name,phone,verified) VALUES(?,?,?,?,?,?,?,0)').run(id,email,hashPassword(password),'remote',first,last,phone);
 return send(201,{user_id:id,account_role:'remote',verify_required:true});
 }
 if(method==='POST'&&path==='/auth/otp'){
 const b=await body(req),email=emailValue(b.email),u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
 if(!u)fail(404,'Account not found');
 if(b.purpose==='signup'&&u.verified)fail(409,'Account already verified');
 return send(200,await otp.send(email,b.purpose));
 }
 if(method==='POST'&&path==='/auth/verify'){
 const b=await body(req),email=emailValue(b.email);otp.verify(email,'signup',b.code);db.prepare('UPDATE users SET verified=1 WHERE email=?').run(email);return send(200,{verified:true});
 }
 if(method==='POST'&&path==='/auth/reset-password'){
 const b=await body(req),email=emailValue(b.email),password=passwordValue(b.password);otp.verify(email,'forgot_password',b.code);
 const u=db.prepare('SELECT id FROM users WHERE email=?').get(email);if(!u)fail(404,'Account not found');
 db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(password),u.id);db.prepare('UPDATE refresh_sessions SET revoked=1 WHERE user_id=?').run(u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);db.prepare('DELETE FROM members WHERE user_id=?').run(u.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return send(200,{});
 }
 if(method==='POST'&&path==='/auth/login'){
 const b=await body(req),email=emailValue(b.email),password=passwordValue(b.password),device=str(b.device_id,'device_id');
 const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
 if(!u||!verifyPassword(password,u.password_hash))fail(401,'Invalid credentials','INVALID_CREDENTIALS');
 if(!u.verified)fail(403,'Verify your account first','VERIFICATION_REQUIRED');
 bindDevice(db,u.id,device);return send(200,issue(db,u,device));
 }
 if(method==='POST'&&path==='/auth/refresh'){const b=await body(req);return send(200,rotate(db,str(b.refresh_token,'refresh_token')));}
 if(method==='POST'&&path==='/auth/logout'){
 if(user.session_id)revoke(db,user.session_id);else db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(user.token));
 // Device consent is removed on logout; other devices keep their sessions.
 db.prepare('DELETE FROM members WHERE user_id=? AND device_id=?').run(user.id,user.device_id);return send(200,{});
 }
 if(method==='GET'&&path==='/users/me'){
 const member=db.prepare('SELECT room_id FROM members WHERE user_id=? AND device_id=?').get(user.id,user.device_id);
 return send(200,{...profile(user),account_role:user.role,device_id:user.device_id,room_id:member?.room_id||null});
 }
 return false;
}
