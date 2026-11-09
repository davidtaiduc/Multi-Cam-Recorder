import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../../../packages/contracts/src/client.ts';
const old={access_token:'old',refresh_token:'refresh',account_role:'remote'};
function client(){let stored=old;const api=createApi('http://test',{async read(){return stored;},async write(v){stored=v;}},()=>{});return {api,get stored(){return stored;}};}
function response(status,code,data){return new Response(JSON.stringify({code,data,message:code}),{status});}
test('shared client collapses concurrent refresh and retries only once',async t=>{
 const original=global.fetch;t.after(()=>global.fetch=original);let refreshes=0;global.fetch=async(url,init)=>{if(url.endsWith('/auth/refresh')){refreshes++;await new Promise(r=>setTimeout(r,20));return response(200,'1000',{...old,access_token:'new',refresh_token:'new-r'});}return init.headers.Authorization==='Bearer old'?response(401,'ACCESS_EXPIRED',null):response(200,'1000',{ok:true});};
 const c=client();await c.api.restore();await Promise.all(Array.from({length:10},()=>c.api.call('/users/me')));assert.equal(refreshes,1);assert.equal(c.stored.access_token,'new');
 let calls=0;global.fetch=async url=>{calls++;return url.endsWith('/auth/refresh')?response(200,'1000',{...old,access_token:'next'}):response(401,'ACCESS_EXPIRED',null);};await assert.rejects(c.api.call('/users/me'));assert.equal(calls,3);assert.equal(c.stored,null);
});
test('network and server errors preserve session; invalid refresh clears it',async t=>{
 const original=global.fetch;t.after(()=>global.fetch=original);const c=client();await c.api.restore();global.fetch=async()=>{throw Error('offline');};await assert.rejects(c.api.call('/users/me'));assert.equal(c.stored,old);
 global.fetch=async url=>url.endsWith('/auth/refresh')?response(503,'503',null):response(401,'ACCESS_EXPIRED',null);await assert.rejects(c.api.call('/users/me'));assert.equal(c.stored,old);
 global.fetch=async()=>response(401,'SESSION_EXPIRED',null);await assert.rejects(c.api.call('/users/me'));assert.equal(c.stored,null);
});
