export class ApiError extends Error {
 constructor(status,message,code=String(status)){super(message);this.status=status;this.code=code;}
}
export const fail=(status,message,code)=>{throw new ApiError(status,message,code)};
export const str=(v,name,max=200)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():fail(400,`Invalid ${name}`,'VALIDATION');
export const emailValue=v=>{const email=str(v,'email').toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))fail(400,'Invalid email','VALIDATION');return email;};
export const passwordValue=v=>{if(typeof v!=='string'||v.length<6||v.length>128)fail(400,'Password must contain 6–128 characters','VALIDATION');return v;};
export async function body(req){let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>65536)fail(413,'Request too large');chunks.push(chunk);}let value;try{value=JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{fail(400,'Invalid JSON','VALIDATION')}if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Expected JSON object','VALIDATION');return value;}
