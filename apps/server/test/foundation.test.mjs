import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {openDatabase} from '../src/database.mjs';
import {createApp} from '../src/app.mjs';
import {hashPassword} from '../src/security.mjs';
async function fixture(t,options={devOtp:true}){
 const db=openDatabase(':memory:');db.prepare('INSERT INTO users(id,email,password_hash,role) VALUES(?,?,?,?)').run('c','c@test.local',hashPassword('password123'),'controller');
 const server=createApp(db,options);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();db.close();});
 async function api(path,b,token){const r=await fetch(`http://127.0.0.1:${server.address().port}`+path,{method:b===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(b===undefined?{}:{body:JSON.stringify(b)})});return {status:r.status,...await r.json()};}
 async function signup(email='r@test.local'){await api('/auth/signup',{email,password:'password123',first_name:'First',last_name:'Last',phone:'+84912345678',account_role:'controller'});const o=await api('/auth/otp',{email,purpose:'signup'});return o.data.dev_code;}
 async function login(device='d1',email='r@test.local'){return (await api('/auth/login',{email,password:'password123',device_id:device})).data;}
 return {db,api,signup,login};
}
test('OTP validation, resend, expiry, purpose, lockout and single use',async t=>{
 const {db,api,signup,login}=await fixture(t);const code=await signup();assert.match(code,/^\d{6}$/);
 assert.equal((await api('/auth/login',{email:'r@test.local',password:'password123',device_id:'d'})).code,'VERIFICATION_REQUIRED');
 assert.equal((await api('/auth/otp',{email:'r@test.local',purpose:'signup'})).status,429);
 assert.equal((await api('/auth/reset-password',{email:'r@test.local',code,password:'newpassword'})).status,400);
 for(let i=0;i<5;i++)assert.equal((await api('/auth/verify',{email:'r@test.local',code:'bad'})).status,400);
 assert.equal((await api('/auth/verify',{email:'r@test.local',code})).status,400);
 db.prepare('UPDATE otp_challenges SET sent_at=0').run();const next=(await api('/auth/otp',{email:'r@test.local',purpose:'signup'})).data.dev_code;
 db.prepare('UPDATE otp_challenges SET expires_at=0').run();assert.equal((await api('/auth/verify',{email:'r@test.local',code:next})).status,400);
 db.prepare('UPDATE otp_challenges SET sent_at=0').run();const last=(await api('/auth/otp',{email:'r@test.local',purpose:'signup'})).data.dev_code;
 assert.equal((await api('/auth/verify',{email:'r@test.local',code:last})).status,200);assert.equal((await api('/auth/verify',{email:'r@test.local',code:last})).status,400);
 const u=await login();assert.equal(u.account_role,'remote');assert.equal(u.user.first_name,'First');
});
test('rotation, replay revocation, expiry, device ownership and isolated logout',async t=>{
 const {db,api,signup,login}=await fixture(t);const code=await signup();await api('/auth/verify',{email:'r@test.local',code});
 const one=await login(),two=await login('d2');
 db.prepare('UPDATE sessions SET expires_at=0 WHERE device_id=?').run('d1');assert.equal((await api('/users/me',undefined,one.access_token)).code,'ACCESS_EXPIRED');
 const rotated=(await api('/auth/refresh',{refresh_token:one.refresh_token})).data;
 assert.equal((await api('/users/me',undefined,rotated.access_token)).status,200);
 assert.equal((await api('/auth/refresh',{refresh_token:one.refresh_token})).code,'REFRESH_REUSED');assert.equal((await api('/users/me',undefined,rotated.access_token)).status,401);
 assert.equal((await api('/users/me',undefined,two.access_token)).status,200);
 const again=await login();await api('/auth/logout',{},again.access_token);assert.equal((await api('/auth/refresh',{refresh_token:again.refresh_token})).status,401);assert.equal((await api('/users/me',undefined,two.access_token)).status,200);
 const other=await signup('other@test.local');await api('/auth/verify',{email:'other@test.local',code:other});assert.equal((await api('/auth/login',{email:'other@test.local',password:'password123',device_id:'d2'})).code,'DEVICE_OWNERSHIP');
 db.prepare('UPDATE refresh_sessions SET expires_at=0').run();assert.equal((await api('/auth/refresh',{refresh_token:two.refresh_token})).status,401);
});
test('room capacity, expired invites, consent conversion and logout revoke membership',async t=>{
 const {db,api,signup,login}=await fixture(t);const code=await signup();await api('/auth/verify',{email:'r@test.local',code});
 const r1=await login(),r2=await login('d2'),c=await login('browser','c@test.local');const room=(await api('/rooms',{},c.access_token)).data;
 db.prepare('UPDATE rooms SET max_members=1').run();const join={invite_code:room.invite_code,device_id:'d1',camera_name:'One',grant_control:'true'};
 assert.equal((await api('/rooms/join',join,r1.access_token)).status,200);assert.equal((await api('/rooms/join',join,r1.access_token)).status,200);
 assert.equal((await api('/rooms/join',{...join,device_id:'d2'},r2.access_token)).code,'ROOM_FULL');
 db.prepare('UPDATE rooms SET expires_at=0').run();assert.equal((await api('/rooms/join',join,r1.access_token)).code,'INVITE_EXPIRED');
 const renewed=(await api('/rooms',{},c.access_token)).data;assert.equal(renewed.room_id,room.room_id);assert.ok(Date.parse(renewed.expires_at)>Date.now());
 await api('/auth/logout',{},r1.access_token);assert.equal((await api(`/rooms/${room.room_id}/members`,undefined,c.access_token)).data.total,0);
});
test('real adapter, missing delivery config and production DEV protection',async t=>{
 const db=openDatabase(':memory:');assert.throws(()=>createApp(db,{production:true,devOtp:true}));db.close();
 const f=await fixture(t,{});await f.api('/auth/signup',{email:'r@test.local',password:'password123',first_name:'A',last_name:'B',phone:'0123456789'});assert.equal((await f.api('/auth/otp',{email:'r@test.local',purpose:'signup'})).status,503);
 let delivered;const a=await fixture(t,{otpSender:{async send(message){delivered=message;}}});await a.api('/auth/signup',{email:'r@test.local',password:'password123',first_name:'A',last_name:'B',phone:'0123456789'});const result=await a.api('/auth/otp',{email:'r@test.local',purpose:'signup'});assert.equal(result.data.dev_code,undefined);assert.match(delivered.code,/^\d{6}$/);assert.equal((await a.api('/auth/verify',{email:'r@test.local',code:delivered.code})).status,200);
});
test('password reset revokes all account sessions and consumes OTP',async t=>{
 const {api,signup,login}=await fixture(t);const code=await signup();await api('/auth/verify',{email:'r@test.local',code});const one=await login(),two=await login('d2');const reset=(await api('/auth/otp',{email:'r@test.local',purpose:'forgot_password'})).data.dev_code;
 assert.equal((await api('/auth/reset-password',{email:'r@test.local',code:reset,password:'new-password'})).status,200);
 for(const s of [one,two]){assert.equal((await api('/users/me',undefined,s.access_token)).status,401);assert.equal((await api('/auth/refresh',{refresh_token:s.refresh_token})).status,401);}
 assert.equal((await api('/auth/reset-password',{email:'r@test.local',code:reset,password:'other-password'})).status,400);
 assert.equal((await api('/auth/login',{email:'r@test.local',password:'new-password',device_id:'d1'})).status,200);
});

test('JSON boundary validation and another room membership',async t=>{
 const {db,api,signup,login}=await fixture(t);
 assert.equal((await api('/auth/signup',null)).status,400);assert.equal((await api('/auth/signup',[])).status,400);assert.equal((await api('/auth/signup',{email:'invalid'})).status,400);
 const code=await signup();await api('/auth/verify',{email:'r@test.local',code});const r=await login(),c=await login('browser','c@test.local');const first=(await api('/rooms',{},c.access_token)).data;
 const join={invite_code:first.invite_code,device_id:'d1',camera_name:'Camera',grant_control:true};await api('/rooms/join',join,r.access_token);
 db.prepare("UPDATE rooms SET status='closed'").run();const second=(await api('/rooms',{},c.access_token)).data;
 assert.equal((await api('/rooms/join',{...join,invite_code:second.invite_code},r.access_token)).code,'DEVICE_IN_OTHER_ROOM');
 await api(`/rooms/${first.room_id}/leave`,{},r.access_token);assert.equal((await api('/rooms/join',{...join,invite_code:second.invite_code,grant_control:'false'},r.access_token)).status,400);assert.equal((await api('/rooms/join',{...join,invite_code:second.invite_code},r.access_token)).status,200);
});
