// Rust Simulator local server: serves the game and relays player state over WebSockets.
// No installs needed beyond Node.js 18+.  Run:  node server.js   (PORT=8080 by default)
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const PORT=+process.env.PORT||8080;
const GAME=path.join(__dirname,'index.html');
const MAX_ROOM=12,MAX_MSG=16*1024,MAX_PRESENCE=8*1024;
const rooms=new Map(); // room -> Set(client)

function page(){const html=fs.readFileSync(GAME,'utf8'),tag='<script>window.__RS_SERVER=1</script>';
  if(/<head[^>]*>/i.test(html))return html.replace(/<head[^>]*>/i,m=>m+tag);
  return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+tag+html;}
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');
  if(u.pathname==='/'||u.pathname==='/index.html'){
    try{const b=page();res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(b);}
    catch(e){res.writeHead(500,{'Content-Type':'text/plain'});res.end('index.html is missing next to server.js');}
    return;}
  if(u.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return;}
  res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');
});

function frame(str){const p=Buffer.from(str,'utf8'),n=p.length;let h;
  if(n<126){h=Buffer.alloc(2);h[1]=n;}else if(n<65536){h=Buffer.alloc(4);h[1]=126;h.writeUInt16BE(n,2);}else{h=Buffer.alloc(10);h[1]=127;h.writeBigUInt64BE(BigInt(n),2);}
  h[0]=0x81;return Buffer.concat([h,p]);}
function send(c,obj){if(c.dead)return;try{c.sock.write(frame(JSON.stringify(obj)));}catch(e){}}
function broadcast(room,obj,except){const set=rooms.get(room);if(!set)return;const f=frame(JSON.stringify(obj));for(const c of set)if(c!==except&&!c.dead){try{c.sock.write(f);}catch(e){}}}
function bye(c){if(c.dead)return;c.dead=true;const set=rooms.get(c.room);if(set){set.delete(c);if(!set.size)rooms.delete(c.room);}broadcast(c.room,{t:'l',id:c.id});try{c.sock.destroy();}catch(e){}
  console.log(`[${c.room}] ${c.id} left (${set?set.size:0} in room)`);}
function onMessage(c,txt){
  if(txt.length>MAX_MSG)return;let m;try{m=JSON.parse(txt);}catch(e){return;}
  if(!m||m.t!=='p'||!m.p||typeof m.p!=='object'||Array.isArray(m.p))return;
  for(const k of Object.keys(m.p)){if(k==='__proto__'||k==='constructor'||k==='prototype')continue;if(m.p[k]===null)delete c.pres[k];else c.pres[k]=m.p[k];}
  if(JSON.stringify(c.pres).length>MAX_PRESENCE){c.pres={};return;}
  broadcast(c.room,{t:'p',id:c.id,p:m.p},c);
}
server.on('upgrade',(req,sock)=>{
  const u=new URL(req.url,'http://x');const key=req.headers['sec-websocket-key'];
  if(u.pathname!=='/ws'||!key){sock.destroy();return;}
  const room=String(u.searchParams.get('room')||'').toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,16)||'LOBBY';
  const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  sock.setNoDelay(true);
  const set=rooms.get(room)||new Set();
  const c={id:crypto.randomBytes(6).toString('hex'),sock,room,pres:{},buf:Buffer.alloc(0),frag:[],dead:false};
  if(set.size>=MAX_ROOM){send(c,{t:'full_room'});setTimeout(()=>sock.destroy(),200);return;}
  set.add(c);rooms.set(room,set);
  send(c,{t:'hi',id:c.id});send(c,{t:'full',peers:[...set].filter(x=>x!==c).map(x=>({id:x.id,p:x.pres}))});broadcast(room,{t:'p',id:c.id,p:{}},c);
  console.log(`[${room}] ${c.id} joined (${set.size} in room)`);
  sock.on('data',d=>{c.buf=Buffer.concat([c.buf,d]);
    while(c.buf.length>=2){const b0=c.buf[0],b1=c.buf[1],op=b0&15,fin=b0>>7,masked=b1>>7;let len=b1&127,off=2;
      if(len===126){if(c.buf.length<4)return;len=c.buf.readUInt16BE(2);off=4;}else if(len===127){if(c.buf.length<10)return;const big=c.buf.readBigUInt64BE(2);if(big>BigInt(MAX_MSG*4)){bye(c);return;}len=Number(big);off=10;}
      if(len>MAX_MSG*4){bye(c);return;}
      const need=off+(masked?4:0)+len;if(c.buf.length<need)return;
      let pl=c.buf.subarray(off+(masked?4:0),need);if(masked){const mk=c.buf.subarray(off,off+4);pl=Buffer.from(pl);for(let i=0;i<pl.length;i++)pl[i]^=mk[i&3];}
      c.buf=c.buf.subarray(need);
      if(op===8){bye(c);return;}
      if(op===9){try{const p2=pl.subarray(0,125);sock.write(Buffer.concat([Buffer.from([0x8a,p2.length]),p2]));}catch(e){}continue;}
      if(op===10)continue;
      if(op===1||op===0){c.frag.push(pl);if(fin){const txt=Buffer.concat(c.frag).toString('utf8');c.frag=[];onMessage(c,txt);}}
    }});
  sock.on('close',()=>bye(c));sock.on('error',()=>bye(c));sock.on('end',()=>bye(c));
});
server.listen(PORT,'0.0.0.0',()=>{
  console.log('\n  Rust Simulator server is running.\n');
  console.log('  On this PC:        http://localhost:'+PORT);
  for(const list of Object.values(os.networkInterfaces()))for(const a of list||[])if(a.family==='IPv4'&&!a.internal)console.log('  Same Wi-Fi / LAN:  http://'+a.address+':'+PORT);
  console.log('\n  For friends over the internet, run the tunnel (see README) and share the https link it prints.\n  Keep this window open while you play. Press Ctrl+C to stop.\n');
});
