import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTts, speedOf } from '../src/tts.js';

const FAKE = fileURLToPath(new URL('./fake-vieneu.mjs', import.meta.url));

// A voice module with the fake worker and no Mac voice, cleaned up after the test.
async function setup(t, env = {}, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'giong-'));
  const log = join(dir, 'jobs.log');
  const worker = { command: process.execPath, args: [FAKE], env: { FAKE_LOG: log, ...env } };
  const tts = createTts(join(dir, 'tts'), { worker, mac: false, ...options });
  t.after(async () => {
    tts.close();
    await rm(dir, { recursive: true, force: true });
  });
  return { tts, dir, jobs: async () => (await readFile(log, 'utf8').catch(() => '')).split('\n').filter(Boolean) };
}

async function until(tts, status) {
  for (let i = 0; i < 150; i += 1) {
    if ((await tts.info()).ai.status === status) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail(`the AI voice never became ${status}`);
}

test('speed follows the rate slider, within what still sounds natural', () => {
  assert.equal(speedOf(185), 1);
  assert.equal(speedOf(222), 1.2);
  assert.equal(speedOf(140), 0.76);
  assert.equal(speedOf(240), 1.3);
  assert.equal(speedOf(100), 0.75);
});

test('the AI voice reads once loaded, each line made once', async (t) => {
  const { tts, dir, jobs } = await setup(t);
  await until(tts, 'ready');
  const info = await tts.info();
  assert.deepEqual(info.ai.voices.map((v) => v.id), ['Giọng A', 'Giọng B']);

  const first = await tts.say('Chào Bé Na!', { rate: 222, voice: 'Giọng B' });
  assert.match(first.url, /^\/tts\/[0-9a-f]{24}\.mp3$/);
  assert.equal(first.engine, 'vieneu');
  assert.equal(first.voice, 'Giọng B');
  assert.equal(first.speed, 1.2);
  await stat(join(dir, 'tts', first.url.slice(5)));

  const again = await tts.say('Chào Bé Na!', { rate: 185, voice: 'Giọng B' });
  assert.equal(again.url, first.url, 'the pace is set when playing, so the file is the same');
  assert.equal(again.speed, 1);
  assert.deepEqual(await jobs(), ['Giọng B|Chào Bé Na!']);
});

test('an unknown voice reads with the default one', async (t) => {
  const { tts, jobs } = await setup(t);
  await until(tts, 'ready');
  const done = await tts.say('Cả sảnh, tạo dáng!', { voice: 'Không có giọng này' });
  assert.equal(done.voice, 'Giọng A');
  assert.deepEqual(await jobs(), ['Giọng A|Cả sảnh, tạo dáng!']);
});

test('the Mac voice chosen skips the AI one', async (t) => {
  const { tts, jobs } = await setup(t);
  await until(tts, 'ready');
  const done = await tts.say('Chào!', { engine: 'mac' });
  assert.equal(done.url, null, 'no Mac voice in this test');
  assert.deepEqual(await jobs(), []);
});

test('without the AI voice installed, nothing is started', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'giong-'));
  const tts = createTts(join(dir, 'tts'), { worker: null, mac: false });
  t.after(async () => {
    tts.close();
    await rm(dir, { recursive: true, force: true });
  });
  assert.equal((await tts.info()).ai.status, 'none');
  assert.equal((await tts.say('Chào!')).url, null);
});

test('a worker that stops is started again, a few times at most', async (t) => {
  let readies = 0;
  const { tts, jobs } = await setup(t, { FAKE_DIE_AFTER: '1' }, {
    restartMs: 10,
    onChange: () => tts.info().then((info) => { if (info.ai.status === 'ready') readies += 1; }),
  });
  for (let i = 1; i <= 4; i += 1) {
    for (let wait = 0; readies < i && wait < 150; wait += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok((await tts.say(`Câu ${i}`)).url, `line ${i} read`);
  }
  await until(tts, 'failed');
  assert.match((await tts.info()).ai.error, /exited with 1/);
  assert.equal((await tts.say('Câu 5')).url, null, 'no AI voice left and no Mac voice here');
  assert.equal((await jobs()).length, 4);
});
