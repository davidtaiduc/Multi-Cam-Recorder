import {randomInt} from 'node:crypto';
import {digest} from '../security.mjs';
import {fail} from '../middleware/http.mjs';
export function otpService(db,{devOtp=false,production=false,otpSender}={}){
 if(devOtp&&production)throw Error('DEV_OTP_ENABLED cannot be enabled in production');
 async function send(email,purpose){
 if(!['signup','forgot_password'].includes(purpose))fail(400,'Invalid OTP purpose','VALIDATION');
 const now=Date.now(),previous=db.prepare('SELECT * FROM otp_challenges WHERE email=? AND purpose=?').get(email,purpose);
 if(previous&&now-previous.sent_at<120000)fail(429,'Wait 120 seconds before resending','OTP_COOLDOWN');
 if(!devOtp&&!otpSender)fail(503,'Email/SMS delivery adapter is not configured','OTP_DELIVERY_UNAVAILABLE');
 const code=String(randomInt(0,1000000)).padStart(6,'0');
 db.prepare('INSERT INTO otp_challenges(email,purpose,code_hash,expires_at,sent_at) VALUES(?,?,?,?,?) ON CONFLICT(email,purpose) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,sent_at=excluded.sent_at,attempts=0,used=0').run(email,purpose,digest(code),now+300000,now);
 try{if(otpSender)await otpSender.send({email,purpose,code,expiresIn:300});}catch{db.prepare('DELETE FROM otp_challenges WHERE email=? AND purpose=?').run(email,purpose);fail(503,'OTP delivery failed','OTP_DELIVERY_UNAVAILABLE');}
 return {purpose,expires_in:300,resend_after:120,delivery:devOtp?'dev_response':'adapter',...(devOtp?{dev_code:code}:{})};
 }
 function verify(email,purpose,code){
 const row=db.prepare('SELECT * FROM otp_challenges WHERE email=? AND purpose=?').get(email,purpose);
 if(!row||row.used||row.expires_at<=Date.now()||row.attempts>=5)fail(400,'OTP expired, used or locked','OTP_INVALID');
 db.prepare('UPDATE otp_challenges SET attempts=attempts+1 WHERE email=? AND purpose=?').run(email,purpose);
 if(typeof code!=='string'||!/^\d{6}$/.test(code)||digest(code)!==row.code_hash)fail(400,'Invalid OTP','OTP_INVALID');
 db.prepare('UPDATE otp_challenges SET used=1 WHERE email=? AND purpose=?').run(email,purpose);
 }
 return {send,verify};
}
