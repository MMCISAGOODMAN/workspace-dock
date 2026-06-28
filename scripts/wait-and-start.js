const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MAIN_FILE = path.join(__dirname, '../dist/main/index.js');
const VITE_URL = 'http://localhost:5173';
const TIMEOUT_MS = 120_000;
const POLL_MS = 300;

function waitForFile(filePath) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (fs.existsSync(filePath)) return resolve();
      if (Date.now() - start > TIMEOUT_MS) {
        return reject(new Error(`Timeout waiting for ${filePath}`));
      }
      setTimeout(check, POLL_MS);
    };
    check();
  });
}

function waitForHttp(url) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > TIMEOUT_MS) {
          return reject(new Error(`Timeout waiting for ${url}`));
        }
        setTimeout(check, POLL_MS);
      });
    };
    check();
  });
}

async function main() {
  console.log('[dev:electron] Waiting for main process and Vite dev server...');
  await Promise.all([waitForFile(MAIN_FILE), waitForHttp(VITE_URL)]);
  console.log('[dev:electron] Starting Electron...');

  const env = { ...process.env, NODE_ENV: 'development' };
  delete env.ELECTRON_RUN_AS_NODE;

  const electronBin = require('electron');
  const child = spawn(electronBin, ['.'], {
    stdio: 'inherit',
    env,
    cwd: path.join(__dirname, '..'),
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error('[dev:electron]', err.message);
  process.exit(1);
});
