// Stands in for vieneu/worker.py in the tests: the same protocol, no model.
// FAKE_LOG lists the jobs it got; FAKE_DIE_AFTER makes it exit after that many.

import { appendFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const dieAfter = Number(process.env.FAKE_DIE_AFTER) || Infinity;
let served = 0;

const send = (message, then) => process.stdout.write(`${JSON.stringify(message)}\n`, then);

send({
  ready: true,
  voices: [
    { id: 'Giọng A', description: 'Nữ · Bắc · Phong cách tự nhiên', gender: 'female', featured: 1 },
    { id: 'Giọng B', description: 'Nam · Nam · Phong cách tin tức', gender: 'male', featured: null },
  ],
  default: 'Giọng A',
});

createInterface({ input: process.stdin }).on('line', (line) => {
  const job = JSON.parse(line);
  if (process.env.FAKE_LOG) appendFileSync(process.env.FAKE_LOG, `${job.voice}|${job.text}\n`);
  writeFileSync(job.out, 'ID3');
  served += 1;
  send({ id: job.id, ok: true, seconds: 1, took: 0.1 }, () => {
    if (served >= dieAfter) process.exit(1);
  });
});
