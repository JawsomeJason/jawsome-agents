import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ffmpeg, loadSchema, py, readResult, resultPath, run, scriptsDir, skip, tempDir, validate } from './helpers.mjs';

const valid = (name, env) => assert.deepEqual(validate(loadSchema(name), env), []);

// A 3 s clip: a hard cut from black to white at 1.0 s and an 880 Hz beep at 1.0 s.
function clip(dir) {
  const file = join(dir, 'clip.mp4');
  ffmpeg([
    '-f', 'lavfi', '-i', 'color=c=black:s=160x120:r=30:d=1', '-f', 'lavfi', '-i', 'color=c=white:s=160x120:r=30:d=2',
    '-f', 'lavfi', '-i', 'sine=frequency=880:duration=0.3,adelay=1000|1000,apad=whole_dur=3',
    '-filter_complex', '[0:v][1:v]concat=n=2:v=1[v]', '-map', '[v]', '-map', '2:a', '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', file,
  ]);
  return file;
}

// Whole frame goes black to white linearly over frames 10..40 of 60 at 30 fps, lossless.
function ramp(dir) {
  const file = join(dir, 'ramp.mkv');
  const frames = Buffer.concat(Array.from({ length: 60 }, (_, i) => Buffer.alloc(64 * 64, Math.round(255 * Math.min(1, Math.max(0, (i - 10) / 30))))));
  ffmpeg(['-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '64x64', '-r', '30', '-i', '-', '-c:v', 'ffv1', file], frames);
  return file;
}

// 200x400: ground #e4eaf4, a surface panel and a red panel, written losslessly.
function boxes(dir) {
  const file = join(dir, 'boxes.png');
  const code = [
    'import sys',
    'from PIL import Image, ImageDraw',
    "im = Image.new('RGB', (200, 400), (228, 234, 244))",
    'd = ImageDraw.Draw(im)',
    'd.rectangle([20, 40, 179, 139], fill=(240, 244, 248))',
    'd.rectangle([20, 200, 179, 299], fill=(255, 0, 0))',
    'im.save(sys.argv[1])',
  ].join('\n');
  const r = py(['-c', code, file], dir);
  if (r.status !== 0) throw new Error(r.stderr);
  return file;
}

test('every script prints usage for --help', { skip }, () => {
  for (const s of readdirSync(scriptsDir).filter((f) => f.endsWith('.py'))) {
    const r = run(s, ['--help'], tempDir());
    assert.equal(r.status, 0, `${s}: ${r.stderr}`);
    assert.match(r.stdout, /^usage: /, s);
  }
});

test('keyframes find the cut, cache the result, and plan one sheet', { skip }, () => {
  const dir = tempDir();
  const file = clip(dir);
  const first = run('keyframes.py', [file, '--sheet'], dir);
  assert.equal(first.status, 0, first.stderr);
  const env = readResult(first.stdout, dir);
  valid('keyframes', env);
  assert.ok(env.result.keyframes.some((k) => Math.abs(k.t_seconds - 1) < 0.05), JSON.stringify(env.result.keyframes));
  const folder = join(dir, resultPath(first.stdout), '..');
  const sheets = JSON.parse(readFileSync(join(folder, 'sheets.json'), 'utf8'));
  valid('keyframes.sheets', sheets);
  assert.equal(sheets.length, 1);
  assert.ok(existsSync(join(folder, sheets[0].path)));
  const mtime = statSync(join(folder, 'result.json')).mtimeMs;
  const again = run('keyframes.py', [file], dir);
  assert.match(again.stdout, /^\[cached\]/);
  assert.equal(statSync(join(folder, 'result.json')).mtimeMs, mtime);
  assert.doesNotMatch(run('keyframes.py', [file, '--force'], dir).stdout, /\[cached\]/);
  assert.notEqual(resultPath(run('keyframes.py', [file, '--threshold', '0.1'], dir).stdout), resultPath(first.stdout));
});

test('timing fits a linear ramp from video and from a CSV', { skip }, () => {
  const dir = tempDir();
  const r = run('timing.py', [ramp(dir)], dir);
  assert.equal(r.status, 0, r.stderr);
  const env = readResult(r.stdout, dir);
  valid('timing', env);
  assert.equal(env.result.best_fit.name, 'linear', JSON.stringify(env.result.fits));
  assert.ok(Math.abs(env.result.best_fit.duration_ms - 1000) <= 2 * env.result.frame_ms, String(env.result.best_fit.duration_ms));
  const csv = join(dir, 'motion.csv');
  writeFileSync(csv, `frame,progress\n${Array.from({ length: 40 }, (_, i) => `${i},${1 - (1 - Math.min(1, Math.max(0, (i - 5) / 18))) ** 3}`).join('\n')}\n`);
  const c = run('timing.py', ['--csv', csv, '--fps', '60'], dir);
  assert.equal(c.status, 0, c.stderr);
  const ce = readResult(c.stdout, dir);
  valid('timing', ce);
  assert.equal(ce.result.best_fit.name, 'ease-out-cubic');
});

test('colors match box medians to tokens and flag a box across an edge', { skip }, () => {
  const dir = tempDir();
  const tokens = join(dir, 'tokens.json');
  writeFileSync(tokens, JSON.stringify({ surface: '#f0f4f8', accent: '#f01010', ground: '#e4eaf4' }));
  const r = run('colors.py', [boxes(dir), '--tokens', tokens, '--box', 's:0.15,0.12,0.5,0.15', '--box', 'p:0.15,0.55,0.5,0.15', '--box', 'edge:0.05,0.3,0.9,0.25', '--auto', '--crops'], dir);
  assert.equal(r.status, 0, r.stderr);
  const env = readResult(r.stdout, dir);
  valid('colors', env);
  const [s, p, edge] = env.result.boxes;
  assert.equal(s.token, 'surface');
  assert.equal(s.verdict, 'exact');
  assert.equal(p.hex, '#ff0000');
  assert.equal(p.token, 'accent');
  assert.match(edge.warnings.join(' '), /edge, text or gradient/);
  assert.ok(env.result.auto.some((c) => c.hex === '#ff0000'));
});

test('layout finds both panels in points at the design width', { skip }, () => {
  const dir = tempDir();
  const r = run('layout.py', [boxes(dir), '--design-width', '100'], dir);
  assert.equal(r.status, 0, r.stderr);
  const env = readResult(r.stdout, dir);
  valid('layout', env);
  const red = env.result.boxes.find((b) => b.color === '#ff0000');
  assert.ok(red, JSON.stringify(env.result.boxes));
  assert.ok(Math.abs(red.w_pt - 80) <= red.error_pt && Math.abs(red.h_pt - 50) <= red.error_pt && Math.abs(red.x_pct - 10) <= 1, JSON.stringify(red));
  assert.ok(env.result.boxes.some((b) => b.color === '#f0f4f8'));
});

test('audio finds the beep, measures ducking and aligns to the cut', { skip }, () => {
  const dir = tempDir();
  const file = clip(dir);
  const kf = run('keyframes.py', [file], dir);
  const kfJson = join(dir, resultPath(kf.stdout));
  const r = run('audio.py', [file, '--align', kfJson, '--window', 'beep:1.05,1.3', '--window', 'quiet:2.2,2.9', '--baseline', 'beep'], dir);
  assert.equal(r.status, 0, r.stderr);
  const env = readResult(r.stdout, dir);
  valid('audio', env);
  const near = env.result.onsets.find((o) => Math.abs(o.t_seconds - 1) < 0.1);
  assert.ok(near, JSON.stringify(env.result.onsets));
  assert.ok(near.centroid_hz > 800 && near.centroid_hz < 1000, String(near.centroid_hz));
  assert.ok(env.result.integrated_lufs !== null);
  assert.equal(env.result.windows[0].ducking_db, 0);
  assert.ok(env.result.windows[1].lufs === null || env.result.windows[1].ducking_db < -20, JSON.stringify(env.result.windows));
  const m = env.result.alignment.matches.find((x) => x.onset === near.index);
  assert.ok(Math.abs(m.keyframe_dt_ms) <= 50, JSON.stringify(m));
});

test('the cache CLI gives hand-run steps the same slots', { skip }, () => {
  const dir = tempDir();
  const input = join(dir, 'clip.bin');
  writeFileSync(input, 'bytes');
  const args = ['--input', input, '--step', 'scenes', '--version', '2', '--params', '{"threshold":0.2}'];
  const miss = JSON.parse(run('common.py', ['lookup', ...args], dir).stdout);
  valid('common.lookup', miss);
  assert.equal(miss.status, 'miss');
  assert.match(miss.key.folder, /^clip-[0-9a-f]{12}\/scenes-v2-[0-9a-f]{8}$/);
  const result = join(dir, 'r.json');
  writeFileSync(result, JSON.stringify({ count: 3 }));
  assert.equal(run('common.py', ['commit', ...args, '--result', result], dir).status, 0);
  valid('common.result', JSON.parse(readFileSync(join(dir, miss.file), 'utf8')));
  assert.equal(JSON.parse(run('common.py', ['lookup', ...args], dir).stdout).status, 'hit');
  assert.equal(JSON.parse(run('common.py', ['lookup', ...args, '--force'], dir).stdout).status, 'miss');
});

test('bad input exits 2 with one line on stderr', { skip }, () => {
  const dir = tempDir();
  const bad = join(dir, 'frame.png');
  writeFileSync(bad, 'not an image');
  const r = run('colors.py', [bad, '--box', 'a:0,0,0.5,0.5'], dir);
  assert.equal(r.status, 2);
  assert.equal(r.stderr.trim().split('\n').length, 1, r.stderr);
  assert.equal(run('timing.py', [join(dir, 'missing.mp4')], dir).status, 2);
  assert.equal(run('common.py', ['lookup', '--input', join(dir, 'nope'), '--step', 's', '--version', '1'], dir).status, 2);
});
