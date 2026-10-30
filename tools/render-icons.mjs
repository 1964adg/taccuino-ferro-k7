// Strumento per chi sviluppa (non serve all'app): genera le icone PNG da icons/icon.svg
// usando Chrome in modalità headless.
// Uso: avviare il server locale sulla porta indicata, poi
//   node tools/render-icons.mjs [porta] [percorso di chrome]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const PORT = process.argv[2] || '8000';
const CHROME = process.argv[3] || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = { 'icon-512.png': 512, 'icon-192.png': 192, 'apple-touch-icon.png': 180, 'favicon-32.png': 32 };
const DEBUG_PORT = 9334;

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'icons-'))}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page;
for (let i = 0; i < 50 && !page; i++) {
  try { page = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* attende */ }
  await sleep(200);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

for (const [name, size] of Object.entries(SIZES)) {
  await send('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false });
  // Un SVG aperto da solo riempie la finestra, che ha esattamente la misura dell'icona
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/icons/icon.svg` });
  await sleep(600);
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: size, height: size, scale: 1 } });
  writeFileSync(join(ROOT, 'icons', name), Buffer.from(shot.result.data, 'base64'));
  console.log('creata', name);
}
ws.close();
chrome.kill();
process.exit(0);
