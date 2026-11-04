// The MC's voice, rendered to files the screen plays. Two engines:
// - VieNeu-TTS (vieneu/): an AI Vietnamese voice that runs on this machine,
//   25 voices to pick from. A Python worker keeps the model loaded
//   (vieneu/worker.py); `npm run setup:voice` installs it.
// - macOS's own Vietnamese voice through `say`, the best installed version
//   (Premium, then Enhanced, then the basic one).
// VieNeu reads once it is installed and loaded; until then, or if it fails,
// the Mac voice does. With neither, the screen falls back to the browser's
// speech, if it has any.

import { spawn, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const KEEP_MS = 2 * 24 * 3600 * 1000;
const BACKLOG = 2; // lines waiting beyond this are dropped, unless they matter
const NORMAL_RATE = 185; // the rate slider's default: VieNeu's own pace
const JOB_MS = 20_000;
const RESTARTS = 3;

const rank = (name) => (/premium/i.test(name) ? 3 : /enhanced|nâng cao/i.test(name) ? 2 : 1);
const fileName = (key, ext) => `${createHash('sha1').update(key).digest('hex').slice(0, 24)}.${ext}`;

// VieNeu plays faster or slower in the browser (pitch kept); the Mac voice
// is rendered at the rate itself.
export const speedOf = (rate) => Math.round(Math.min(1.3, Math.max(0.75, rate / NORMAL_RATE)) * 100) / 100;

// The installed VieNeu worker, if any.
export function vieneuWorker(root) {
  const python = process.platform === 'win32'
    ? join(root, 'vieneu', '.venv', 'Scripts', 'python.exe')
    : join(root, 'vieneu', '.venv', 'bin', 'python');
  const script = join(root, 'vieneu', 'worker.py');
  return existsSync(python) && existsSync(script) ? { command: python, args: [script] } : null;
}

export function createTts(dir, {
  worker = null,
  mac = process.platform === 'darwin',
  restartMs = 3000,
  onChange = () => {},
} = {}) {
  let macVoices = null;
  let chain = Promise.resolve();
  let waiting = 0;
  let closed = false;
  const ai = { status: worker ? 'starting' : 'none', voices: [], default: null, error: null, child: null, jobs: new Map(), next: 1, restarts: 0 };

  // --- VieNeu ------------------------------------------------------------------

  function startAi() {
    let down = false;
    let tail = '';
    const child = spawn(worker.command, worker.args, { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...worker.env } });
    ai.child = child;
    child.stderr.on('data', (chunk) => { tail = (tail + chunk).slice(-4000); });
    child.stdin.on('error', () => {}); // a dead worker; its exit is handled below
    createInterface({ input: child.stdout }).on('line', (line) => {
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      if (message.ready) {
        Object.assign(ai, { status: 'ready', voices: message.voices ?? [], default: message.default ?? null, error: null });
        onChange();
        return;
      }
      const job = ai.jobs.get(message.id);
      if (!job) return;
      ai.jobs.delete(message.id);
      clearTimeout(job.timer);
      if (message.ok) job.resolve();
      else job.reject(new Error(message.error || 'VieNeu could not read the line'));
    });
    const stop = (reason) => {
      if (down) return;
      down = true;
      ai.child = null;
      for (const job of ai.jobs.values()) {
        clearTimeout(job.timer);
        job.reject(new Error('VieNeu stopped'));
      }
      ai.jobs.clear();
      if (closed) return;
      const last = tail.trim().split('\n').filter(Boolean).at(-1);
      ai.error = (last || reason).slice(0, 300);
      if (ai.restarts < RESTARTS) {
        ai.restarts += 1;
        ai.status = 'starting';
        setTimeout(() => closed || startAi(), restartMs * ai.restarts).unref();
      } else {
        ai.status = 'failed';
      }
      console.error('[giọng AI]', ai.error);
      onChange();
    };
    child.on('error', (err) => stop(err.message));
    child.on('exit', (code, signal) => stop(`exited with ${code ?? signal}`));
  }

  function aiRender(text, file, voice) {
    return new Promise((resolve, reject) => {
      if (ai.status !== 'ready' || !ai.child) return reject(new Error('VieNeu is not ready'));
      const id = ai.next;
      ai.next += 1;
      const timer = setTimeout(() => {
        ai.jobs.delete(id);
        reject(new Error('VieNeu took too long'));
      }, JOB_MS);
      ai.jobs.set(id, { resolve, reject, timer });
      ai.child.stdin.write(`${JSON.stringify({ id, text, voice, out: file })}\n`);
    });
  }

  const aiVoice = (name) => (ai.voices.some((v) => v.id === name) ? name : ai.default);

  // --- the Mac voice -------------------------------------------------------------

  // Installed Vietnamese voices, best first.
  function macVoiceList() {
    if (!macVoices) {
      macVoices = !mac
        ? Promise.resolve([])
        : new Promise((resolve) => {
          execFile('say', ['-v', '?'], { timeout: 5000 }, (err, out) => {
            if (err) return resolve([]);
            const found = [];
            for (const line of out.split('\n')) {
              const m = /^(.+?)\s{2,}vi[_-]VN\b/.exec(line);
              if (m) found.push(m[1].trim());
            }
            resolve(found.sort((a, b) => rank(b) - rank(a)));
          });
        });
    }
    return macVoices;
  }

  // The text goes in through stdin, so nothing in it can read as an option.
  function macRender(text, file, voice, rate) {
    return new Promise((resolve, reject) => {
      const args = ['-v', voice, '-r', String(rate), '--file-format=WAVE', '--data-format=LEI16@22050', '-o', file, '-f', '-'];
      const child = spawn('say', args, { stdio: ['pipe', 'ignore', 'pipe'] });
      let error = '';
      const timer = setTimeout(() => child.kill('SIGKILL'), 15_000);
      child.stderr.on('data', (chunk) => { error += chunk; });
      child.on('error', reject);
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(error.trim() || `say exited with ${code}`));
      });
      child.stdin.end(text);
    });
  }

  // --- both ----------------------------------------------------------------------

  async function cached(name, make) {
    const file = join(dir, name);
    try {
      await stat(file);
    } catch {
      await mkdir(dir, { recursive: true });
      await make(file);
    }
    return `/tts/${name}`;
  }

  async function synth(text, { rate, engine, voice }) {
    if (engine !== 'mac' && ai.status === 'ready') {
      const name = aiVoice(voice);
      try {
        const url = await cached(fileName(`vieneu|${name}|${text}`, 'mp3'), (file) => aiRender(text, file, name));
        return { url, speed: speedOf(rate), engine: 'vieneu', voice: name };
      } catch (err) {
        console.error('[giọng AI]', err.message);
      }
    }
    const [macVoice] = await macVoiceList();
    if (!macVoice) return { url: null };
    const url = await cached(fileName(`${macVoice}|${rate}|${text}`, 'wav'), (file) => macRender(text, file, macVoice, rate));
    return { url, speed: 1, engine: 'mac', voice: macVoice };
  }

  async function sweep() {
    try {
      const now = Date.now();
      for (const name of await readdir(dir)) {
        if (!/\.(wav|mp3)(\.part)?$/.test(name)) continue;
        const file = join(dir, name);
        if (now - (await stat(file)).mtimeMs > KEEP_MS) await unlink(file);
      }
    } catch {
      // nothing cached yet
    }
  }

  if (worker) startAi();
  sweep();
  const sweeper = setInterval(sweep, 6 * 3600 * 1000);
  sweeper.unref();

  return {
    async info() {
      const list = await macVoiceList();
      return {
        ai: { status: ai.status, voices: ai.voices, default: ai.default, error: ai.error },
        mac: { voice: list[0] ?? null, better: list[0] ? rank(list[0]) > 1 : false, all: list },
      };
    },
    // One at a time and in order. Resolves { url, speed, engine, voice } (url
    // null: no voice here), or null when the line was dropped because too many
    // were waiting. `engine` 'mac' skips VieNeu.
    say(text, { rate = NORMAL_RATE, priority = 1, engine = 'vieneu', voice = null } = {}) {
      if (waiting > BACKLOG && priority < 2) return Promise.resolve(null);
      waiting += 1;
      const job = chain
        .then(() => synth(text, { rate, engine, voice }))
        .catch((err) => {
          console.error('[giọng đọc]', err.message);
          return { url: null };
        })
        .finally(() => { waiting -= 1; });
      chain = job;
      return job;
    },
    close() {
      closed = true;
      clearInterval(sweeper);
      ai.child?.stdin.end();
      ai.child?.kill();
    },
  };
}
