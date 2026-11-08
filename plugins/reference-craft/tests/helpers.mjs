import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { validate } from '../../standards/tests/schema.mjs';

export { validate };
export const scriptPath = (name) => fileURLToPath(new URL(`../skills/reference-measure/scripts/${name}`, import.meta.url));
export const loadSchema = (name) =>
  JSON.parse(readFileSync(new URL(`../skills/reference-measure/references/schemas/${name}.schema.json`, import.meta.url), 'utf8'));

// Every temp folder a test makes is removed when the test process exits.
const made = [];
process.once('exit', () => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});
export const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'reference-measure-test-'));
  made.push(dir);
  return dir;
};

export const run = (script, args, cwd) => spawnSync(process.execPath, [scriptPath(script), ...args], { cwd, encoding: 'utf8' });
export const resultPath = (stdout) => /^result: (.+)$/m.exec(stdout)?.[1];
export const readResult = (stdout) => JSON.parse(readFileSync(resultPath(stdout), 'utf8'));

// An 8-bit RGB PNG with filter 0 on every row; pixel(x, y) returns [r, g, b].
export function writePng(file, width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw.set([r, g, b], y * (width * 3 + 1) + 1 + x * 3);
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  writeFileSync(file, Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

// A 16-bit PCM mono WAV from a sample function of time in seconds.
export function writeWav(file, { rate = 48000, seconds, sample }) {
  const n = Math.round(rate * seconds);
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample(i / rate) * 32767))), i * 2);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8, 'latin1');
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36, 'latin1');
  head.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([head, data]));
}
