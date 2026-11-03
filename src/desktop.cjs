const { app, BrowserWindow } = require('electron');
const { createServer } = require('./server.cjs');
let server;
app.whenReady().then(()=>{
 server=createServer(app.getPath('userData'));
 server.listen(0,'127.0.0.1',()=>{
 const open=()=>{const win=new BrowserWindow({width:1440,height:940,minWidth:900,minHeight:650,backgroundColor:'#f7f8fa',title:'Buss',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(event,target)=>{if(new URL(target).origin!==`http://127.0.0.1:${server.address().port}`)event.preventDefault();});win.loadURL(`http://127.0.0.1:${server.address().port}`);};open();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)open();});
 });
});app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});app.on('before-quit',()=>server?.close());
