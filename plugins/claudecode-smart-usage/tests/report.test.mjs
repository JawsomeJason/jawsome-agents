// Rerun: node --test plugins/claudecode-smart-usage/tests/report.test.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { format, parseLog, summarize } from '../scripts/report.ts'

const fixture = new URL('./fixtures/picks.jsonl', import.meta.url).pathname
const script = new URL('../scripts/report.ts', import.meta.url).pathname
const entries = parseLog(readFileSync(fixture, 'utf8'))

test('counts levels, reasons, probabilities and latency', () => {
  const s = summarize(entries)
  assert.equal(s.total, 6)
  assert.deepEqual(
    Object.fromEntries(Object.entries(s.levels).map(([level, { count }]) => [level, count])),
    { low: 2, medium: 1, high: 2, xhigh: 0, max: 0, none: 1 },
  )
  assert.equal(s.levels.low.share, 2 / 6)
  assert.equal(s.applied, 2)
  assert.deepEqual(s.notApplied, { count: 4, reasons: { 'below-threshold': 1, 'same-level': 1, timeout: 1, 'no-answer': 1 } })
  assert.deepEqual(s.probability, { median: 0.8, threshold: 0.6, underThreshold: 1 / 5 })
  assert.deepEqual(s.ms, { median: 390, timeouts: 1 })
})

test('examples are newest first, trimmed to 80 characters', () => {
  const s = summarize(entries)
  assert.deepEqual(s.examples.low, ['make this email friendlier and half as long', 'give me 15 subject lines for this newsletter'])
  assert.equal(s.examples.high[0].length, 80)
  assert.ok(s.examples.high[0].endsWith('…'))
  assert.deepEqual(s.examples.none, ['go through every support ticket'])
})

test('--days keeps only the window', () => {
  const s = summarize(entries, { days: 2, now: Date.parse('2026-10-06T12:00:00.000Z') })
  assert.equal(s.total, 2)
  assert.deepEqual(s.notApplied.reasons, { timeout: 1, 'no-answer': 1 })
})

test('the CLI prints text and JSON from a file', () => {
  const text = execFileSync(process.execPath, [script, '--file', fixture], { encoding: 'utf8' })
  assert.match(text, /^6 picks in all of the log/)
  assert.match(text, /below-threshold\s+1/)
  const json = JSON.parse(execFileSync(process.execPath, [script, '--file', fixture, '--json'], { encoding: 'utf8' }))
  assert.equal(json.total, 6)
})

test('a missing or empty log reports no picks', () => {
  const text = execFileSync(process.execPath, [script, '--file', '/nonexistent/picks.jsonl'], { encoding: 'utf8' })
  assert.match(text, /^No picks in all of the log/)
  assert.equal(format(summarize([])), 'No picks in all of the log (no file).')
})
