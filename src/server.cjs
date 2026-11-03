const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const { randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
function createServer(dataDir = process.env.BUSS_DATA || path.join(__dirname, '../.data')) {
 fs.mkdirSync(dataDir,{recursive:true});
 const db = new DatabaseSync(path.join(dataDir,'buss.sqlite'));
 db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER NOT NULL,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,sender INTEGER NOT NULL,recipient INTEGER,room TEXT,body TEXT NOT NULL,created TEXT DEFAULT CURRENT_TIMESTAMP);`);
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{
 try {
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')) {
 if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`) return json(res,403,{error:'Origin not allowed'});
 let body={}; if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>20000)return json(res,413,{error:'Request too large'});}try{body=JSON.parse(raw||'{}')}catch{return json(res,400,{error:'Invalid JSON'})}}
 const token=(req.headers.cookie||'').match(/(?:^|; )buss=([a-f0-9]+)/)?.[1];
 const user=token?db.prepare('SELECT u.id,u.name,u.email FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?').get(token,Date.now()):null;
 if(['/api/register','/api/login'].includes(url.pathname)&&req.method==='POST') {
 const email=String(body.email||'').trim().toLowerCase(), password=String(body.password||'');
 if(!/^\S+@\S+\.\S+$/.test(email)||password.length<8||password.length>256)return json(res,400,{error:'Enter a valid email and a password of 8–256 characters.'});
 let account;
 if(url.pathname==='/api/register') {const name=String(body.name||'').trim().slice(0,60);if(!name)return json(res,400,{error:'Enter your name.'});const salt=randomBytes(16).toString('hex');try{const result=db.prepare('INSERT INTO users(name,email,password) VALUES(?,?,?)').run(name,email,salt+':'+scryptSync(password,salt,64).toString('hex'));account={id:Number(result.lastInsertRowid),name,email};}catch(e){if(e.errcode===2067||e.code?.includes('CONSTRAINT'))return json(res,409,{error:'This email already has an account.'});throw e;}}
 else {const row=db.prepare('SELECT * FROM users WHERE email=?').get(email);const [salt,hash]=(row?.password||'invalid:').split(':');const attempt=scryptSync(password,salt,64);if(!row||!timingSafeEqual(attempt,Buffer.from(hash,'hex')))return json(res,401,{error:'Email or password is incorrect.'});account={id:row.id,name:row.name,email:row.email};}
 const session=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(session,account.id,Date.now()+30*86400000);res.setHeader('Set-Cookie',`buss=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);return json(res,200,account);
 }
 if(url.pathname==='/api/me')return json(res,200,user||null);
 if(!user)return json(res,401,{error:'Please sign in first.'});
 if(url.pathname==='/api/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE token=?').run(token);res.setHeader('Set-Cookie','buss=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
 if(url.pathname==='/api/users')return json(res,200,db.prepare('SELECT id,name,email FROM users WHERE id!=? ORDER BY name').all(user.id));
 if(url.pathname==='/api/messages'&&req.method==='GET'){const peer=Number(url.searchParams.get('peer'));return json(res,200,peer?db.prepare('SELECT m.*,u.name FROM messages m JOIN users u ON u.id=m.sender WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?) ORDER BY m.id DESC LIMIT 200').all(user.id,peer,peer,user.id).reverse():db.prepare("SELECT m.*,u.name FROM messages m JOIN users u ON u.id=m.sender WHERE room='general' ORDER BY m.id DESC LIMIT 200").all().reverse());}
 if(url.pathname==='/api/messages'&&req.method==='POST'){const text=String(body.body||'').trim();if(!text||text.length>4000)return json(res,400,{error:'Messages must contain 1–4,000 characters.'});const peer=Number(body.peer)||null;if(peer&&!db.prepare('SELECT id FROM users WHERE id=?').get(peer))return json(res,404,{error:'Account not found.'});db.prepare('INSERT INTO messages(sender,recipient,room,body) VALUES(?,?,?,?)').run(user.id,peer,peer?null:'general',text);return json(res,201,{ok:true});}
 return json(res,404,{error:'Not found'});
 }
 const file={'/':'index.html','/app.js':'app.js','/style.css':'style.css'}[url.pathname];if(!file){res.writeHead(404);return res.end('Not found');}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'");res.end(fs.readFileSync(path.join(__dirname,file)));
 }catch(e){console.error(e);json(res,500,{error:'Something went wrong. Please try again.'});}
 });server.on('close',()=>db.close());return server;
}
module.exports={createServer};if(require.main===module)createServer().listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log('Buss is running at http://127.0.0.1:'+(process.env.PORT||3000)));
