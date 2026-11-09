import React,{useState,useEffect,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import type {RoomData,MembersData} from '@multicam/contracts';
import './style.css';
import QRCode from 'qrcode';
import {createApi,errorText} from '@multicam/contracts/client';
const deviceKey='multicam_controller_device';
const device=sessionStorage.getItem(deviceKey)||(crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''));sessionStorage.setItem(deviceKey,device);
const env = (import.meta as unknown as {env: {VITE_API_URL?: string; DEV: boolean}}).env;
const base = env.VITE_API_URL || (env.DEV ? '/api' : 'http://localhost:3000');
function App(){const [token,setToken]=useState(''),[room,setRoom]=useState<RoomData|null>(null),[members,setMembers]=useState<MembersData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
const client=useMemo(()=>createApi(base,{async read(){const raw=sessionStorage.getItem('multicam_session');return raw?JSON.parse(raw):null;},async write(v){if(v)sessionStorage.setItem('multicam_session',JSON.stringify(v));else sessionStorage.removeItem('multicam_session');}},v=>{setToken(v?.access_token||'');if(!v){setRoom(null);setMembers(null);}}),[]);
const [qr,setQr]=useState(''),[ready,setReady]=useState(false);
useEffect(()=>{void run(async()=>{await client.restore();}).finally(()=>setReady(true));},[]);
useEffect(()=>{if(token)void run(async()=>{await client.call('/users/me');setRoom(await client.call<RoomData>('/rooms',{}));});},[!!token]);
useEffect(()=>{let active=true;if(room)void QRCode.toDataURL(room.invite_code,{width:220}).then(url=>{if(active)setQr(url);}).catch(e=>setError(errorText(e)));else setQr('');return()=>{active=false;};},[room]);
const api=client.call.bind(client);
async function run(task:()=>Promise<void>){setBusy(true);setError('');try{await task();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
return <main><small>MULTICAM / TEAM BASE</small><h1>Controller</h1><p>Quản lý phòng thu thập video</p>{error&&<p role="alert">{error}</p>}{!token?<form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);void run(async()=>{await client.login({email:data.get('email'),password:data.get('password'),device_id:device},'controller');});}}><label>Email<input name="email" type="email" required/></label><label>Mật khẩu<input name="password" type="password" required/></label><button disabled={busy||!ready}>Đăng nhập</button></form>:<><button disabled={busy||!ready} onClick={()=>void run(async()=>setRoom(await api<RoomData>('/rooms',{})))}>Tạo / mở phòng hiện tại</button><button disabled={busy||!ready} onClick={()=>void run(async()=>{await client.logout();setRoom(null);setMembers(null);})}>Đăng xuất</button>{room&&<section><h2>Mã mời: {room.invite_code}</h2>{qr&&<img src={qr} alt="QR mã mời phòng" width={220} height={220}/>}<p>Hạn mã: {new Date(room.expires_at).toLocaleString()}</p><button disabled={busy||!ready} onClick={()=>void run(async()=>setMembers(await api<MembersData>(`/rooms/${room.room_id}/members`)))}>Tải danh sách máy (thủ công)</button>{members&&<ul>{members.members.map(m=><li key={m.member_id}>{m.camera_name} — {m.device_id}</li>)}</ul>}<p>Đồng bộ, quay và upload: chưa triển khai.</p></section>}</>}</main>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
