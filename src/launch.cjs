const { spawn } = require('node:child_process');
const env = { ...process.env };
// Editor hosts may use Electron as Node. The app needs the desktop runtime.
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [require('node:path').join(__dirname, '..')], { env, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
