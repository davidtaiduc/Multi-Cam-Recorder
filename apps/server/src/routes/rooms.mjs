import {randomUUID,randomBytes} from 'node:crypto';
import {body,str,fail} from '../middleware/http.mjs';
export async function roomRoute({db,req,path,method,send,user}){
 if(path==='/rooms'&&method==='POST'){
 if(user.role!=='controller')fail(403,'Controller only');
 let room=db.prepare("SELECT * FROM rooms WHERE owner_id=? AND status='open'").get(user.id);
 if(!room){room={id:randomUUID(),invite_code:randomBytes(3).toString('hex').toUpperCase(),expires_at:Date.now()+600000};db.prepare('INSERT INTO rooms(id,owner_id,invite_code,expires_at) VALUES(?,?,?,?)').run(room.id,user.id,room.invite_code,room.expires_at);}
 if(room.expires_at<=Date.now()){room.expires_at=Date.now()+600000;db.prepare('UPDATE rooms SET expires_at=? WHERE id=?').run(room.expires_at,room.id);}
 return send(200,{room_id:room.id,invite_code:room.invite_code,expires_at:new Date(room.expires_at).toISOString()});
 }
 if(path==='/rooms/join'&&method==='POST'){
 if(user.role!=='remote')fail(403,'Remote only');
 const b=await body(req);if(b.grant_control!==true&&b.grant_control!=='true')fail(400,'Explicit consent required');
 if(b.device_id!==user.device_id)fail(403,'Device does not match session');
 const code=str(b.invite_code,'invite_code',6).toUpperCase(),name=str(b.camera_name,'camera_name',80);
 const room=db.prepare("SELECT * FROM rooms WHERE invite_code=? AND status='open' AND expires_at>?").get(code,Date.now());if(!room){const expired=db.prepare('SELECT id FROM rooms WHERE invite_code=?').get(code);fail(expired?410:404,'Invalid or expired code',expired?'INVITE_EXPIRED':'INVITE_INVALID');}
 let member=db.prepare('SELECT * FROM members WHERE device_id=?').get(user.device_id);
 if(member&&member.user_id!==user.id)fail(403,'Device belongs to another account','DEVICE_OWNERSHIP');
 if(member&&member.room_id!==room.id)fail(409,'Device already in another room','DEVICE_IN_OTHER_ROOM');
 if(!member){if(db.prepare('SELECT count(*) AS n FROM members WHERE room_id=?').get(room.id).n>=room.max_members)fail(409,'Room full','ROOM_FULL');member={id:randomUUID()};db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(member.id,room.id,user.id,user.device_id,name,Date.now());}
 return send(200,{room_id:room.id,member_id:member.id});
 }
 const match=path.match(/^\/rooms\/([^/]+)\/(members|leave)$/);
 if(match){const [,id,action]=match;const room=db.prepare('SELECT * FROM rooms WHERE id=?').get(id);if(!room)fail(404,'Room not found');
 if(action==='members'&&method==='GET'){if(room.owner_id!==user.id)fail(403,'Room owner only');const members=db.prepare('SELECT id AS member_id,device_id,camera_name,joined_at FROM members WHERE room_id=?').all(id);return send(200,{total:members.length,members});}
 if(action==='leave'&&method==='POST'){db.prepare('DELETE FROM members WHERE room_id=? AND user_id=? AND device_id=?').run(id,user.id,user.device_id);return send(200,{room_id:id});}}
 return false;
}
