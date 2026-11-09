export type AccountRole = 'controller' | 'remote';
export type RecordingState = 'idle' | 'recording' | 'saved' | 'failed';
export type UploadState = 'none' | 'uploading' | 'uploaded' | 'failed';
export interface ApiResponse<T> {code: string; message: string; data: T}
export interface LoginData {user:UserProfile; account_role:AccountRole; access_token:string; refresh_token:string; expires_in:number}
export interface RoomData {room_id:string; invite_code:string; expires_at:string}
export interface JoinRoomInput {invite_code:string; device_id:string; camera_name:string; grant_control:true}
export interface Member {member_id:string; device_id:string; camera_name:string; joined_at:number}
export interface MembersData {total:number; members:Member[]}
export interface RecordingCommand {command_id:string; type:'start_record'|'stop_record'; issued_at:string; payload:Record<string,unknown>}
export interface TokenStore {get():Promise<string|null>; set(token:string):Promise<void>; clear():Promise<void>}

export interface UserProfile {id:string;email:string;first_name:string;last_name:string;phone:string}
export interface SignupInput {email:string;password:string;first_name:string;last_name:string;phone:string}
export type OtpPurpose='signup'|'forgot_password';
export interface OtpData {purpose:OtpPurpose;expires_in:number;resend_after:number;delivery:'dev_response'|'adapter';dev_code?:string}
export interface SessionStorage {read():Promise<LoginData|null>;write(value:LoginData|null):Promise<void>}
