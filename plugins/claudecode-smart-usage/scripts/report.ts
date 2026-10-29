// Sums up the mod's pick log. Read-only.
// Rerun: bun scripts/report.ts [--days N] [--threshold P] [--json] [--file path]
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'

import type { PickLogEntry } from '../hooks/log'

const LEVELS = ['low', 'medium', 'high', 'xhigh', 'max', 'none'] as const
const EXAMPLES = 5

export type Summary = {
  file: string
  days: number | null
  total: number
  levels: Record<(typeof LEVELS)[number], { count: number; share: number }>
  applied: number
  notApplied: { count: number; reasons: Record<string, number> }
  probability: { median: number | null; threshold: number; underThreshold: number }
  ms: { median: number | null; timeouts: number }
  // Newest first, per picked level; `none` is a call Jev gave no answer to.
  examples: Record<string, string[]>
}

const median = (values: number[]) => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

const share = (count: number, total: number) => (total ? count / total : 0)

export const parseLog = (text: string): PickLogEntry[] =>
  text.split('\n').flatMap(line => {
    try {
      const entry = JSON.parse(line)
      return entry && typeof entry.ts === 'string' ? [entry] : []
    } catch {
      return []
    }
  })

export const summarize = (all: PickLogEntry[], { file = '', days = null as number | null, threshold = 0.6, now = Date.now() } = {}): Summary => {
  const since = days === null ? -Infinity : now - days * 86_400_000
  const entries = all.filter(entry => Date.parse(entry.ts) >= since)
  const total = entries.length
  const levelOf = (entry: PickLogEntry) => entry.level ?? 'none'
  const levels = Object.fromEntries(
    LEVELS.map(level => {
      const count = entries.filter(entry => levelOf(entry) === level).length
      return [level, { count, share: share(count, total) }]
    }),
  ) as Summary['levels']
  const reasons: Record<string, number> = {}
  for (const entry of entries) if (entry.reason) reasons[entry.reason] = (reasons[entry.reason] ?? 0) + 1
  const probabilities = entries.flatMap(entry => (typeof entry.probability === 'number' ? [entry.probability] : []))
  const newest = [...entries].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
  const examples: Record<string, string[]> = {}
  for (const level of LEVELS) {
    const prompts = newest.filter(entry => levelOf(entry) === level).slice(0, EXAMPLES)
    if (prompts.length) examples[level] = prompts.map(entry => trim(entry.prompt))
  }
  return {
    file,
    days,
    total,
    levels,
    applied: entries.filter(entry => entry.applied).length,
    notApplied: { count: entries.filter(entry => !entry.applied).length, reasons },
    probability: {
      median: median(probabilities),
      threshold,
      underThreshold: share(probabilities.filter(p => p < threshold).length, probabilities.length),
    },
    ms: { median: median(entries.map(entry => entry.ms)), timeouts: reasons.timeout ?? 0 },
    examples,
  }
}

const trim = (prompt: string) => {
  const flat = prompt.replace(/\s+/g, ' ').trim()
  return flat.length > 80 ? `${flat.slice(0, 79)}…` : flat
}

const pct = (value: number) => `${Math.round(value * 100)}%`

export const format = (s: Summary): string => {
  const window = s.days === null ? 'all of the log' : `the last ${s.days} days`
  if (!s.total) return `No picks in ${window} (${s.file || 'no file'}).`
  const lines = [`${s.total} picks in ${window} (${s.file})`, '', 'Picked level']
  for (const level of LEVELS) {
    const { count, share } = s.levels[level]
    if (count) lines.push(`  ${level.padEnd(7)}${String(count).padStart(5)}  ${pct(share).padStart(4)}`)
  }
  lines.push('', `Applied ${s.applied}, not applied ${s.notApplied.count}`)
  for (const [reason, count] of Object.entries(s.notApplied.reasons).sort((a, b) => b[1] - a[1]))
    lines.push(`  ${reason.padEnd(16)}${String(count).padStart(5)}`)
  const { median, threshold, underThreshold } = s.probability
  lines.push(
    '',
    `Probability median ${median === null ? '-' : median.toFixed(2)}, ${pct(underThreshold)} under ${threshold}`,
    `Latency median ${s.ms.median === null ? '-' : `${Math.round(s.ms.median)}ms`}, ${s.ms.timeouts} timeouts`,
  )
  for (const [level, prompts] of Object.entries(s.examples)) {
    lines.push('', `Recent ${level}`)
    for (const prompt of prompts) lines.push(`  ${prompt}`)
  }
  return lines.join('\n')
}

const flag = (args: string[], name: string) => {
  const at = args.indexOf(name)
  return at < 0 ? undefined : args[at + 1]
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const file = flag(args, '--file') ?? `${homedir()}/.claude/smart-usage/picks.jsonl`
  const days = flag(args, '--days')
  const threshold = flag(args, '--threshold')
  const summary = summarize(parseLog(existsSync(file) ? readFileSync(file, 'utf8') : ''), {
    file,
    days: days === undefined ? null : Number(days),
    threshold: threshold === undefined ? 0.6 : Number(threshold),
  })
  console.log(args.includes('--json') ? JSON.stringify(summary, null, 2) : format(summary))
}
