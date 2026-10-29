// The pick log's line shape and its pruning. No `$` here, so scripts/report.ts
// reads the same shape the mod writes.

import type { Level } from '../types'

export const LOG_DAYS = 14
export const LOG_MAX_LINES = 2000

export type NotApplied = 'below-threshold' | 'same-level' | 'timeout' | 'no-answer'

export type PickLogEntry = {
  ts: string
  session?: string
  mode: 'auto' | 'suggest'
  prompt: string
  previousPrompt: boolean
  level: Level | null
  probability: number | null
  probabilities: Record<string, number> | null
  current: Level
  base: Level
  // In suggest mode, the level the band offered.
  applied: Level | null
  reason: NotApplied | null
  ms: number
  inputTokens: number | null
}

// The log's new text: what it held from the last LOG_DAYS days, at most
// LOG_MAX_LINES lines with `entry` last. A line that doesn't parse is dropped.
export const appendPruned = (text: string, entry: PickLogEntry, now: number): string => {
  const since = now - LOG_DAYS * 86_400_000
  const kept = text.split('\n').filter(line => {
    try {
      return Date.parse(JSON.parse(line).ts) >= since
    } catch {
      return false
    }
  })
  kept.push(JSON.stringify(entry))
  return `${kept.slice(-LOG_MAX_LINES).join('\n')}\n`
}
