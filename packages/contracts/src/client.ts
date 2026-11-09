import type {LoginData,SessionStorage} from './index';
export class ApiError extends Error {status:number;code:string;constructor(status:number,code:string,message:string){super(message);this.status=status;this.code=code;}}
export const errorText=(e:unknown)=>e instanceof ApiError?({INVITE_EXPIRED:'Mã mời hết hạn. Controller cần mở lại phòng.',INVITE_INVALID:'Mã mời không hợp lệ.',ROOM_FULL:'Phòng đã đầy.',DEVICE_IN_OTHER_ROOM:'Thiết bị đang thuộc phòng khác.',DEVICE_OWNERSHIP:'Thiết bị đã gắn với tài khoản khác.',SESSION_EXPIRED:'Phiên hết hạn. Vui lòng đăng nhập lại.',REFRESH_REUSED:'Phiên đã bị thu hồi do dùng lại refresh token.',VERIFICATION_REQUIRED:'Cần xác thực tài khoản.',OTP_COOLDOWN:'Chờ 120 giây trước khi gửi lại mã.',OTP_INVALID:'OTP sai, hết hạn hoặc đã dùng.',OTP_DELIVERY_UNAVAILABLE:'Chưa cấu hình dịch vụ gửi OTP. DEV cần bật DEV_OTP_ENABLED.',INVALID_CREDENTIALS:'Email hoặc mật khẩu không đúng.'}[e.code]||e.message):String(e);
export function createApi(base:string,storage:SessionStorage,onChange:(v:LoginData|null)=>void){
 let session:LoginData|null=null,refreshing:Promise<void>|null=null;
 async function set(value:LoginData|null){await storage.write(value);session=value;onChange(value);}
 async function request<T>(path:string,input:unknown,token?:string):Promise<T>{
 let res:Response;try{res=await fetch(base+path,{method:input===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(input===undefined?{}:{body:JSON.stringify(input)})});}catch{throw Error('Server unreachable. Session retained. Check LAN address and connection.');}
 const json=await res.json();if(!res.ok)throw new ApiError(res.status,json.code,json.message);return json.data;
 }
 async function refresh(){
 if(!refreshing){const original=session;refreshing=(async()=>{try{const next=await request<LoginData>('/auth/refresh',{refresh_token:original?.refresh_token});if(session===original)await set(next);}catch(e){if(e instanceof ApiError&&e.status===401&&session===original)await set(null);throw e;}finally{refreshing=null;}})();}
 await refreshing;
 }
 return {
 async restore(){session=await storage.read();onChange(session);},
 async login(input:unknown,role:'controller'|'remote'){const value=await request<LoginData>('/auth/login',input);if(value.account_role!==role){await request('/auth/logout',{},value.access_token);throw Error('Wrong account role');}await set(value);},
 async logout(){await this.call('/auth/logout',{});await set(null);},
 async call<T>(path:string,input?:unknown):Promise<T>{
 const token=session?.access_token;
 try{return await request<T>(path,input,token);}catch(e){
 if(!(e instanceof ApiError)||e.status!==401||!session||path.startsWith('/auth/')&&path!=='/auth/logout')throw e;
 if(e.code!=='ACCESS_EXPIRED'){await set(null);throw e;}
 if(session.access_token===token)await refresh();
 try{return await request<T>(path,input,session?.access_token);}catch(retry){if(retry instanceof ApiError&&retry.status===401)await set(null);throw retry;}
 }
 }
 };
}
