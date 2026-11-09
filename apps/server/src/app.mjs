import {createServer} from 'node:http';
import {ApiError,fail} from './middleware/http.mjs';
import {authenticate} from './services/sessions.mjs';
import {otpService} from './services/otp.mjs';
import {authRoute} from './routes/auth.mjs';
import {roomRoute} from './routes/rooms.mjs';
export function createApp(db,{origin='http://localhost:5173',...options}={}){
 const otp=otpService(db,options),attempts=new Map();
 return createServer(async(req,res)=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'};
 const send=(status,data,message='OK',code)=>{res.writeHead(status,headers);res.end(JSON.stringify({code:code||(status<400?'1000':String(status)),message,data}));return true;};
 try{
 if(req.method==='OPTIONS'){res.writeHead(204,headers);return res.end();}
 const path=new URL(req.url,'http://localhost').pathname,method=req.method;
 if(path==='/health'&&method==='GET')return send(200,{status:'ok'});
 if(path.startsWith('/auth/')&&method==='POST'){
 const key=req.socket.remoteAddress,now=Date.now();let a=attempts.get(key);if(!a||now>a.until){a={count:0,until:now+60000};attempts.set(key,a);}if(++a.count>60)fail(429,'Try again later','RATE_LIMIT');
 if(attempts.size>10000)for(const [k,v]of attempts)if(v.until<now)attempts.delete(k);
 }
 const publicAuth=['/auth/signup','/auth/login','/auth/otp','/auth/verify','/auth/reset-password','/auth/refresh'].includes(path)&&method==='POST';
 const user=publicAuth?null:authenticate(db,req),ctx={db,req,path,method,send,otp,user};
 if(await authRoute(ctx)||await roomRoute(ctx))return;
 if(path.startsWith('/videos')||path.includes('/sync')||path.includes('/recording'))fail(501,'Module planned; not implemented');
 fail(404,'Route not found');
 }catch(e){if(!(e instanceof ApiError))console.error('Unhandled API error:',e.name);send(e.status||500,null,e.status?e.message:'Internal server error',e.code);}
 });
}
