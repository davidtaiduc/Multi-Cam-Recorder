import React,{useEffect,useState,useMemo} from 'react';
import {Alert,Button,KeyboardAvoidingView,Platform,ScrollView,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView,initialWindowMetrics} from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type {JoinRoomInput} from '@multicam/contracts';
import {createApi,errorText} from '@multicam/contracts/client';
import {AuthScreen} from './src/features/auth/AuthScreen';
import {LocalCameraScreen} from './src/features/camera/LocalCameraScreen';
const base=process.env.EXPO_PUBLIC_API_URL||'';
export default function App(){return <SafeAreaProvider initialMetrics={initialWindowMetrics}><RemoteScreen/></SafeAreaProvider>;}
function RemoteScreen(){
 const [cameraOpen, setCameraOpen] = useState(false);
 const [token,setToken]=useState(''),[device,setDevice]=useState(''),[code,setCode]=useState(''),[name,setName]=useState('Camera'),[consent,setConsent]=useState(false),[room,setRoom]=useState<string|null>(null),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const client=useMemo(()=>createApi(base,{async read(){const raw=await SecureStore.getItemAsync('auth_session');return raw?JSON.parse(raw):null;},async write(v){if(v)await SecureStore.setItemAsync('auth_session',JSON.stringify(v));else await SecureStore.deleteItemAsync('auth_session');}},v=>{setToken(v?.access_token||'');if(!v){setRoom(null);setConsent(false);}}),[]);
 const api=client.call.bind(client);
 useEffect(()=>{void run(async()=>{let id=await SecureStore.getItemAsync('device_id');if(!id){id=Crypto.randomUUID();await SecureStore.setItemAsync('device_id',id);}setDevice(id);await SecureStore.deleteItemAsync('access_token');await client.restore();}).finally(()=>setReady(true));},[]);
 useEffect(()=>{if(token)void run(async()=>{const me=await api<{room_id:string|null}>('/users/me');setRoom(me.room_id);});},[!!token]);
 async function run(task:()=>Promise<void>){setBusy(true);try{await task();}catch(e){Alert.alert('Thông báo',errorText(e));}finally{setBusy(false);}}
 if (cameraOpen && token) return <LocalCameraScreen cameraName={name} onBack={() => setCameraOpen(false)}/>;
 return <SafeAreaView style={s.page}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.content}><Text style={s.title}>MultiCam Remote</Text><Text style={s.subtitle}>Kết nối điện thoại với phòng quay của bạn</Text>{!token?<AuthScreen ready={ready&&!!device} api={api} onLogin={async(email,password)=>{await client.login({email,password,device_id:device},'remote');}}/>:<><Button title="Camera và clip cục bộ" disabled={busy} onPress={() => setCameraOpen(true)}/>{!room?<><TextInput style={s.input} placeholder="Mã phòng 6 ký tự" autoCapitalize="characters" maxLength={6} value={code} onChangeText={setCode}/><TextInput style={s.input} placeholder="Tên camera" value={name} onChangeText={setName}/><View style={s.row}><Switch value={consent} onValueChange={setConsent}/><Text>Tôi đồng ý cho Controller điều khiển quay</Text></View><Button disabled={busy||!consent} title="Tham gia phòng" onPress={()=>void run(async()=>{const input:JoinRoomInput={invite_code:code,device_id:device,camera_name:name,grant_control:true};const data=await api<{room_id:string}>('/rooms/join',input);setRoom(data.room_id);})}/></>:<><Text style={s.banner}>Đã cấp quyền điều khiển • Chưa hỗ trợ quay từ xa</Text><Text>Phòng: {room}</Text><Button disabled={busy} title="Rời phòng, thu hồi quyền" onPress={()=>void run(async()=>{await api(`/rooms/${room}/leave`,{});setRoom(null);setConsent(false);})}/></>}<Button disabled={busy} title="Đăng xuất" onPress={()=>void run(async()=>{if(room)await api(`/rooms/${room}/leave`,{});await client.logout();setRoom(null);setConsent(false);})}/></>}</ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#eef2f6'},content:{padding:20,gap:16,paddingBottom:40},subtitle:{fontSize:15,color:'#52636c',lineHeight:22},title:{fontSize:30,fontWeight:'700',color:'#126858'},input:{backgroundColor:'white',borderWidth:1,borderColor:'#a0adb8',padding:14,borderRadius:8},row:{gap:8},banner:{backgroundColor:'#9d1725',color:'white',padding:16},note:{fontSize:12,color:'#657080'}});
