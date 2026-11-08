import {openDatabase} from './database.mjs';
import {createApp} from './app.mjs';
const db=openDatabase(process.env.DB_PATH||'./multicam.sqlite');
const server=createApp(db,{origin:process.env.CORS_ORIGIN||'http://localhost:5173'});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log('MultiCam API listening on port '+(process.env.PORT||3000)));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
