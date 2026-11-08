import {createServer} from 'node:http';
import {randomUUID,randomBytes} from 'node:crypto';
import {hashPassword,verifyPassword,digest,newToken} from './security.mjs';
class ApiError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new ApiError(status,message)};
async function body(req){let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>65536)fail(413,'Request too large');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{fail(400,'Invalid JSON')}}
const str=(v,name,max=200)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():fail(400,`Invalid ${name}`);
export function createApp(db,{origin='http://localhost:5173'}={}){
 const attempts=new Map();
 return createServer(async(req,res)=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'};
 const send=(status,data,message='OK')=>{res.writeHead(status,headers);res.end(JSON.stringify({code:status<400?'1000':String(status),message,data}));};
 try{
 if(req.method==='OPTIONS'){res.writeHead(204,headers);return res.end();}
 const path=new URL(req.url,'http://localhost').pathname,method=req.method;
 if(path==='/health'&&method==='GET')return send(200,{status:'ok'});
 if(path.startsWith('/auth/')&&method==='POST'){
 const key=req.socket.remoteAddress,now=Date.now();let a=attempts.get(key);if(!a||now>a.until){a={count:0,until:now+60000};attempts.set(key,a);}if(++a.count>30)fail(429,'Try again later');
 if(attempts.size>10000)for(const [k,v]of attempts)if(v.until<now)attempts.delete(k);
 }
 if(path==='/auth/signup'&&method==='POST'){
 const b=await body(req),email=str(b.email,'email').toLowerCase(),password=str(b.password,'password',128);
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||password.length<6)fail(400,'Email or password invalid');
 if(db.prepare('SELECT id FROM users WHERE email=?').get(email))fail(409,'Email already registered');
 const id=randomUUID();db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(id,email,hashPassword(password),'remote');
 return send(201,{user_id:id,account_role:'remote',verify_required:false},'Development signup: verification not implemented');
 }
 if(path==='/auth/login'&&method==='POST'){
 const b=await body(req),email=str(b.email,'email').toLowerCase(),password=str(b.password,'password',128),device=str(b.device_id,'device_id');
 const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
 if(!user||!verifyPassword(password,user.password_hash))fail(401,'Invalid credentials');
 const token=newToken();db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(token),user.id,device,Date.now()+3600000);
 return send(200,{user:{id:user.id,email:user.email},account_role:user.role,access_token:token,expires_in:3600});
 }
 const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
 const user=token&&db.prepare('SELECT u.*,s.device_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=? AND expires_at>?').get(digest(token),Date.now());
 if(!user)fail(401,'Authentication required');
 if(path==='/auth/logout'&&method==='POST'){db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));return send(200,{});}
 if(path==='/users/me'&&method==='GET'){const membership=db.prepare('SELECT room_id FROM members WHERE user_id=? AND device_id=?').get(user.id,user.device_id);return send(200,{id:user.id,email:user.email,account_role:user.role,device_id:user.device_id,room_id:membership?.room_id||null});}
 if(path==='/rooms'&&method==='POST'){
 if(user.role!=='controller')fail(403,'Controller only');
 let room=db.prepare("SELECT * FROM rooms WHERE owner_id=? AND status='open'").get(user.id);
 if(!room){room={id:randomUUID(),invite_code:randomBytes(3).toString('hex').toUpperCase(),expires_at:Date.now()+600000};db.prepare('INSERT INTO rooms(id,owner_id,invite_code,expires_at) VALUES(?,?,?,?)').run(room.id,user.id,room.invite_code,room.expires_at);}
 return send(200,{room_id:room.id,invite_code:room.invite_code,expires_at:new Date(room.expires_at).toISOString()});
 }
 if(path==='/rooms/join'&&method==='POST'){
 if(user.role!=='remote')fail(403,'Remote only');
 const b=await body(req);if(b.grant_control!==true)fail(400,'Explicit consent required');
 if(b.device_id!==user.device_id)fail(403,'Device does not match session');
 const code=str(b.invite_code,'invite_code',6).toUpperCase(),name=str(b.camera_name,'camera_name',80);
 const room=db.prepare("SELECT * FROM rooms WHERE invite_code=? AND status='open' AND expires_at>?").get(code,Date.now());if(!room)fail(404,'Invalid or expired code');
 let member=db.prepare('SELECT * FROM members WHERE device_id=?').get(user.device_id);
 if(member&&member.room_id!==room.id)fail(409,'Device already in another room');
 if(!member){if(db.prepare('SELECT count(*) AS n FROM members WHERE room_id=?').get(room.id).n>=room.max_members)fail(409,'Room full');member={id:randomUUID()};db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(member.id,room.id,user.id,user.device_id,name,Date.now());}
 return send(200,{room_id:room.id,member_id:member.id});
 }
 const match=path.match(/^\/rooms\/([^/]+)\/(members|leave)$/);
 if(match){const [,id,action]=match;const room=db.prepare('SELECT * FROM rooms WHERE id=?').get(id);if(!room)fail(404,'Room not found');
 if(action==='members'&&method==='GET'){if(room.owner_id!==user.id)fail(403,'Room owner only');const members=db.prepare('SELECT id AS member_id,device_id,camera_name,joined_at FROM members WHERE room_id=?').all(id);return send(200,{total:members.length,members});}
 if(action==='leave'&&method==='POST'){db.prepare('DELETE FROM members WHERE room_id=? AND user_id=? AND device_id=?').run(id,user.id,user.device_id);return send(200,{room_id:id});}}
 if(path.startsWith('/videos')||path.includes('/sync')||path.includes('/recording'))fail(501,'Module planned; not implemented in base');
 fail(404,'Route not found');
 }catch(e){if(!(e instanceof ApiError))console.error(e);send(e.status||500,null,e.status?e.message:'Internal server error');}
 });
}
