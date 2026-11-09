import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {openDatabase} from '../src/database.mjs';
import {createApp} from '../src/app.mjs';
import {hashPassword} from '../src/security.mjs';
test('permissions, multi-device sessions, consent, join, ownership and logout',async t=>{
 const db=openDatabase(':memory:');db.prepare('INSERT INTO users(id,email,password_hash,role) VALUES(?,?,?,?)').run('controller','c@example.test',hashPassword('password1234'),'controller');
 const server=createApp(db,{devOtp:true});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();db.close();});
 const base=`http://127.0.0.1:${server.address().port}`;
 async function api(path,b,token,method=b?'POST':'GET'){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(b?{body:JSON.stringify(b)}:{})});return {status:r.status,...await r.json()};}
 assert.equal((await api('/health')).status,200);
 assert.equal((await api('/rooms',{})).status,401);
 const signup=await api('/auth/signup',{email:'r@example.test',password:'password123',first_name:'Remote',last_name:'Test',phone:'+84912345678',account_role:'controller'});assert.equal(signup.data.account_role,'remote');
 const otp=(await api('/auth/otp',{email:'r@example.test',purpose:'signup'})).data.dev_code;await api('/auth/verify',{email:'r@example.test',code:otp});
 assert.equal((await api('/auth/login',{email:'r@example.test',password:'wrong-password',device_id:'d1'})).status,401);
 const c=(await api('/auth/login',{email:'c@example.test',password:'password1234',device_id:'browser'})).data.access_token;
 const r=(await api('/auth/login',{email:'r@example.test',password:'password123',device_id:'d1'})).data.access_token;
 const r2=(await api('/auth/login',{email:'r@example.test',password:'password123',device_id:'d2'})).data.access_token;
 assert.equal((await api('/users/me',null,r)).status,200);
 assert.equal((await api('/rooms',{},r)).status,403);
 const room=(await api('/rooms',{},c)).data;assert.equal((await api('/rooms',{},c)).data.room_id,room.room_id);
 const join={invite_code:room.invite_code,device_id:'d1',camera_name:'Left',grant_control:true};
 assert.equal((await api('/rooms/join',{...join,grant_control:false},r)).status,400);
 assert.equal((await api('/rooms/join',{...join,device_id:'d2'},r)).status,403);
 assert.equal((await api('/rooms/join',join,r)).status,200);
 assert.equal((await api('/rooms/join',join,r)).status,200);
 assert.equal((await api('/rooms/join',{...join,device_id:'d2'},r2)).status,200);
 assert.equal((await api(`/rooms/${room.room_id}/members`,null,c)).data.total,2);
 assert.equal((await api(`/rooms/${room.room_id}/members`,null,r)).status,403);
 await api(`/rooms/${room.room_id}/leave`,{},r);
 assert.equal((await api(`/rooms/${room.room_id}/members`,null,c)).data.total,1);
 await api('/auth/logout',{},r);assert.equal((await api('/users/me',null,r)).status,401);assert.equal((await api('/users/me',null,r2)).status,200);
 db.prepare('UPDATE rooms SET expires_at=0').run();assert.equal((await api('/rooms/join',{...join,device_id:'d2'},r2)).status,410);
 db.prepare('UPDATE sessions SET expires_at=0').run();assert.equal((await api('/users/me',null,c)).status,401);
});
test('database survives restart and enforces single controller',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const dir=mkdtempSync(join(tmpdir(),'multicam-'));
 try{let db=openDatabase(join(dir,'test.sqlite'));db.prepare('INSERT INTO users(id,email,password_hash,role) VALUES(?,?,?,?)').run('1','one',hashPassword('password'),'controller');assert.throws(()=>db.prepare('INSERT INTO users(id,email,password_hash,role) VALUES(?,?,?,?)').run('2','two','hash','controller'));db.close();db=openDatabase(join(dir,'test.sqlite'));assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,1);db.close();}finally{rmSync(dir,{recursive:true,force:true});}
});
