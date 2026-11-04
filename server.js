// The hall's server: serves the live screen and the control page, pushes what
// happens to every open screen (Server-Sent Events), and takes the control
// page's buttons. It listens on this computer only (127.0.0.1).

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, normalize, extname, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGame } from './src/game.js';
import { createSimulator } from './src/simulator.js';
import { createTts, vieneuWorker } from './src/tts.js';
import { createTikTok } from './src/tiktok.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, 'public');
const DATA = join(ROOT, 'data');
const TTS_DIR = join(DATA, 'tts');
const SETTINGS_FILE = join(DATA, 'settings.json');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3100;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

// --- what every screen hears -------------------------------------------------

const clients = new Set();
const logLines = [];

function send(res, type, data) {
  res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(type, data) {
  for (const res of clients) send(res, type, data);
}

function log(line) {
  const entry = { at: Date.now(), line };
  logLines.push(entry);
  if (logLines.length > 120) logLines.shift();
  broadcast('log', entry);
}

function partsText(parts) {
  return (parts ?? []).map((p) => p.v).join('');
}

// --- the hall ------------------------------------------------------------------

let saved = {};
try {
  saved = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
} catch {
  // first run: defaults
}

const tts = createTts(TTS_DIR, { worker: vieneuWorker(ROOT), onChange: refreshVoice });
let voice = { ai: { status: 'none', voices: [], default: null, error: null }, mac: { voice: null, better: false, all: [] } };
refreshVoice();
const VOICE_SAMPLE = 'Xin chào cả sảnh! Mời Mai Anh bước lên sàn diễn với bộ Áo dài đỏ!';

function refreshVoice() {
  tts.info().then((info) => {
    voice = info;
    broadcast('voice', info);
  });
}

const game = createGame({
  settings: saved,
  emit(type, data) {
    broadcast(type, data);
    if (type === 'banner') log(partsText(data.parts));
    else if (type === 'show:start') log(`Lên sàn: ${data.viewer?.name ?? 'người mẫu của sảnh'} · ${data.lookName}`);
    else if (type === 'say') log(`Bình luận: ${data.text}`);
    else if (type === 'remind') log('MC nhắc theo dõi kênh');
    else if (type === 'settings') saveSettings(data);
  },
  speak(line, priority) {
    const { voiceRate, voiceEngine, voiceName } = game.settings;
    tts.say(line, { rate: voiceRate, priority, engine: voiceEngine, voice: voiceName }).then((done) => {
      if (done) broadcast('speak', { text: line, url: done.url, priority, speed: done.speed ?? 1 });
    });
  },
});

const simulator = createSimulator(game);
const tiktok = createTikTok(game, (state) => {
  broadcast('tiktok', state);
  log(state.error ? `TikTok: ${state.error}` : `TikTok: ${state.status}${state.username ? ` @${state.username}` : ''}`);
});

let saveTimer = null;
function saveSettings(settings) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await mkdir(DATA, { recursive: true });
      await writeFile(SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`);
    } catch (err) {
      console.error('[cài đặt]', err.message);
    }
  }, 400);
}

function fullState() {
  return { ...game.snapshot(), tiktok: tiktok.state, simulator: simulator.state, voice };
}

// --- requests --------------------------------------------------------------

// Only pages served from here may call the API (no other website, no DNS tricks).
function trusted(req) {
  const allowed = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`, `${HOST}:${PORT}`]);
  if (!allowed.has(req.headers.host ?? '')) return false;
  const origin = req.headers.origin;
  return !origin || allowed.has(origin.replace(/^https?:\/\//, ''));
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 16_384) {
        reject(new Error('too large'));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('bad json'));
      }
    });
    req.on('error', reject);
  });
}

async function serveFile(res, file) {
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Không có trang này');
  }
}

function events(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
  });
  res.write('retry: 2000\n\n');
  send(res, 'state', fullState());
  send(res, 'tiktok', tiktok.state);
  for (const entry of logLines) send(res, 'log', entry);
  clients.add(res);
  req.on('close', () => clients.delete(res));
}

async function api(req, res, path) {
  if (req.method === 'GET' && path === '/api/state') return json(res, 200, fullState());
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) return json(res, 415, { error: 'JSON only' });
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return json(res, 400, { error: err.message });
  }

  const [, , group, name] = path.split('/');
  if (group === 'sim' && !name) {
    if (body.on) simulator.start(body.rate);
    else simulator.stop();
    broadcast('simulator', simulator.state);
    return json(res, 200, simulator.state);
  }
  if (group === 'test' && name) {
    return simulator.fire(name, body) ? json(res, 200, { ok: true }) : json(res, 404, { error: 'unknown event' });
  }
  if (group === 'host' && name) {
    const done = game.command(name);
    if (done) log(`Điều khiển: ${name}`);
    return done ? json(res, 200, { ok: true }) : json(res, 409, { error: 'not now' });
  }
  // Heard on the control page only, never on the live screen.
  if (group === 'voice' && name === 'test') {
    const done = await tts.say(String(body.text ?? '').slice(0, 200) || VOICE_SAMPLE, {
      rate: Math.min(240, Math.max(140, Number(body.rate) || game.settings.voiceRate)),
      priority: 3,
      engine: body.engine === 'mac' ? 'mac' : 'vieneu',
      voice: typeof body.voice === 'string' ? body.voice.slice(0, 40) : game.settings.voiceName,
    });
    return json(res, 200, { url: done?.url ?? null, speed: done?.speed ?? 1, engine: done?.engine ?? null, voice: done?.voice ?? null });
  }
  if (group === 'settings' && !name) {
    game.applySettings(body);
    return json(res, 200, game.settings);
  }
  if (group === 'tiktok' && name === 'connect') return json(res, 200, await tiktok.connect(body.username));
  if (group === 'tiktok' && name === 'disconnect') {
    await tiktok.disconnect();
    return json(res, 200, tiktok.state);
  }
  return json(res, 404, { error: 'not found' });
}

const server = createServer(async (req, res) => {
  if (!trusted(req)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Chỉ mở được từ máy này (localhost)');
    return;
  }
  try {
    const path = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    if (path === '/events') return events(req, res);
    if (path.startsWith('/api/')) return await api(req, res, path);
    if (/^\/tts\/[0-9a-f]{24}\.(wav|mp3)$/.test(path)) return await serveFile(res, join(TTS_DIR, path.slice(5)));
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'GET only' });
    if (path === '/admin') {
      res.writeHead(302, { Location: '/admin.html' });
      res.end();
      return;
    }
    const file = normalize(join(PUBLIC, path === '/' ? 'index.html' : path));
    if (!file.startsWith(PUBLIC + sep)) return json(res, 404, { error: 'not found' });
    return await serveFile(res, file);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) json(res, 500, { error: 'server error' });
    else res.end();
  }
});

// Keep the event streams open through proxies and sleep.
setInterval(() => {
  for (const res of clients) res.write(': ping\n\n');
}, 15_000).unref();

server.listen(PORT, HOST, () => {
  console.log('Sảnh thời trang đang chạy:');
  console.log(`  Màn hình live (đưa vào OBS, 1080 x 1920): http://localhost:${PORT}/`);
  console.log(`  Trang điều khiển:                          http://localhost:${PORT}/admin.html`);
  console.log(`  Tủ đồ:                                     http://localhost:${PORT}/wardrobe.html`);
});

function shutdown() {
  simulator.stop();
  game.stop();
  tts.close();
  tiktok.disconnect({ quiet: true }).finally(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
