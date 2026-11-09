import {fail} from '../middleware/http.mjs';
export const profile=u=>({id:u.id,email:u.email,first_name:u.first_name,last_name:u.last_name,phone:u.phone});
export function bindDevice(db,userId,device){
 const owner=db.prepare('SELECT user_id FROM devices WHERE device_id=?').get(device);
 const legacy=db.prepare('SELECT user_id FROM members WHERE device_id=? AND user_id<>? UNION SELECT user_id FROM sessions WHERE device_id=? AND user_id<>?').get(device,userId,device,userId);
 if((owner&&owner.user_id!==userId)||legacy)fail(403,'Device belongs to another account','DEVICE_OWNERSHIP');
 db.prepare('INSERT OR IGNORE INTO devices VALUES(?,?)').run(device,userId);
}
