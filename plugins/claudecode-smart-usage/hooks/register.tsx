import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Suggestion } from '../types'
import { buildRequest, decide, DEFAULT_CRITERIA, ENDPOINT, isLevel, parseCriteria, parsePick } from './jev'
import type { Criteria, Level, Pick, Previous } from './jev'
import { appendPruned } from './log'
import type { NotApplied, PickLogEntry } from './log'

const MODEL = 'jev-latest'
// Auto mode holds the turn's first request at most this long after Enter.
const AUTO_WAIT_MS = 900
const FOLLOW_UP_MINUTES = 15

const suggestion = atom({ plugin: 'claudecode-smart-usage', key: 'suggestion' } as const, null)

type Mode = 'suggest' | 'auto' | 'off'

const percent = (p: number) => `${Math.round(p * 100)}%`

// A tiers file that can't be read or parsed falls back to the plugin's own tiers.ts.
const loadCriteria = async ($: EngineInterface, path: string): Promise<Criteria> => {
  if (!path) return DEFAULT_CRITERIA
  try {
    return parseCriteria(await $.fs.read(path))
  } catch (error) {
    $.ui.log(`tiers file ${path} ignored: ${String(error)}`, { to: 'debug' })
    return DEFAULT_CRITERIA
  }
}

// What one Jev call came to: its pick, or null when it gave none, and how long it took.
type Asked = { pick: Pick | null; ms: number }

// Null when there is no key, so nothing was asked.
const classify = async ($: EngineInterface, criteria: Promise<Criteria>, text: string, previous?: Previous): Promise<Asked | null> => {
  const key = await $.env.get('TYPESAFE_API_KEY')
  if (!key) return null
  const started = await $.clock.now()
  try {
    const response = await $.http.fetch(ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(buildRequest(MODEL, text, previous, await criteria)),
    })
    const pick = response.ok ? parsePick(JSON.parse(response.text)) : null
    const ms = (await $.clock.now()) - started
    $.ui.log(
      `jev ${response.status} in ${ms}ms: ${pick ? `${pick.level} ${percent(pick.probability)}, ${pick.inputTokens} input tokens` : 'no answer'}`,
      { to: 'debug' },
    )
    return { pick, ms }
  } catch (error) {
    $.ui.log(`jev failed: ${String(error)}`, { to: 'debug' })
    return { pick: null, ms: (await $.clock.now()) - started }
  }
}

// Why `decide` gave no level.
const notApplied = (pick: Pick | null, current: Level): NotApplied =>
  !pick ? 'no-answer' : pick.level === current ? 'same-level' : 'below-threshold'

// Writes queue behind each other, so two picks never read the same old log.
let logging = Promise.resolve()

// A log that can't be read or written costs only a debug line; the pick never waits on it.
const writeLog = ($: EngineInterface, entry: Omit<PickLogEntry, 'ts' | 'session'>) => {
  logging = logging.then(async () => {
    try {
      const home = await $.env.get('HOME')
      if (!home) throw new Error('HOME is not set')
      const path = `${home}/.claude/smart-usage/picks.jsonl`
      const now = await $.clock.now()
      const session = await $.session.id().catch(() => undefined)
      const text = (await $.fs.exists(path)) ? await $.fs.read(path) : ''
      await $.fs.write(path, appendPruned(text, { ts: new Date(now).toISOString(), session, ...entry }, now))
    } catch (error) {
      $.ui.log(`pick log not written: ${String(error)}`, { to: 'debug' })
    }
  })
}

let previous: { text: string; at: number } | undefined
let pending: { asked: Promise<Asked | null>; at: number; prompt: string; previousPrompt: boolean } | undefined
// The session's own effort on the last main request, before this mod touched it.
let sessionEffort: Level | undefined
// Auto mode's pick, kept through short follow-ups.
let turnLevel: Level | undefined
// An applied level, put on every main request until the person changes the session's effort.
// The mod API has no call that sets the session's effort setting itself.
let hold: { level: Level; base: Level } | undefined

async function apply($: EngineInterface, s: Suggestion) {
  await update($, suggestion, () => null)
  if (sessionEffort) hold = { level: s.level, base: sessionEffort }
  $.ui.status(`effort ${s.level} (picker; /effort to reset)`)
}

export const register: Register = (on, options) => {
  const mode: Mode = options.mode === 'auto' || options.mode === 'off' ? options.mode : 'suggest'
  const threshold = Math.min(Math.max(Number(options.threshold) || 0.6, 0), 1)
  const skipUnder = Math.max(Number(options.skipUnder) || 0, 0)
  const tiersFile = typeof options.tiersFile === 'string' ? options.tiersFile.trim() : ''
  const isLogging = options.log !== false
  let criteria: Promise<Criteria> | undefined

  on('prompt.submit', async ($, e, next) => {
    const isTyped = e.origin.kind === 'composer' || e.origin.kind === 'bridge'
    if (mode === 'off' || !isTyped || e.command || e.isMeta) return next(e)
    const text = e.text.trim()
    const now = await $.clock.now()
    const isRecent = previous && now - previous.at < FOLLOW_UP_MINUTES * 60_000
    const prior = previous && isRecent ? { prompt: previous.text, minutesAgo: Math.round((now - previous.at) / 60_000) } : undefined
    previous = { text, at: now }
    // A short follow-up keeps whatever level the last prompt got.
    if (!text || (prior && text.length < skipUnder)) return next(e)
    turnLevel = undefined
    await update($, suggestion, () => null)
    criteria ??= loadCriteria($, tiersFile)
    pending = { asked: classify($, criteria, text, prior), at: now, prompt: text.slice(0, 500), previousPrompt: Boolean(prior) }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined || !isLevel(e.effort)) return yield* next(e)
    if (hold && e.effort !== hold.base) {
      hold = undefined
      $.ui.status(undefined)
    }
    sessionEffort = e.effort
    const current = hold?.level ?? e.effort

    if (e.index === 0 && pending) {
      const { asked, at, prompt, previousPrompt } = pending
      pending = undefined
      const pick = asked.then(result => result?.pick ?? null)
      const base = e.effort
      const log = (applied: Level | null, reason: NotApplied | null) =>
        void asked.then(result => {
          if (!isLogging || !result) return
          const { pick, ms } = result
          writeLog($, {
            mode: mode === 'auto' ? 'auto' : 'suggest',
            prompt,
            previousPrompt,
            level: pick?.level ?? null,
            probability: pick?.probability ?? null,
            probabilities: pick?.probabilities ?? null,
            current,
            base,
            applied,
            reason,
            ms,
            inputTokens: pick?.inputTokens ?? null,
          })
        })
      if (mode === 'auto') {
        const left = AUTO_WAIT_MS - ((await $.clock.now()) - at)
        const timeout = $.clock.sleep(Math.max(left, 0)).then(() => undefined)
        const answer = await Promise.race([pick, timeout])
        const level = decide(answer ?? null, current, threshold)
        if (level) turnLevel = level
        $.ui.status(level && answer ? `effort ${level} (auto, Jev ${percent(answer.probability)})` : undefined)
        log(level, level ? null : answer === undefined ? 'timeout' : notApplied(answer, current))
      } else {
        void pick.then(answer => {
          const level = decide(answer, current, threshold)
          log(level, level ? null : notApplied(answer, current))
          if (level && answer) return update($, suggestion, () => ({ level, probability: answer.probability, from: current }))
        })
      }
    }

    const want = turnLevel ?? hold?.level
    return yield* next(want && want !== e.effort ? { ...e, effort: want } : e)
  })

  on('command.run', { command: 'effort' }, ($, e, next) => {
    hold = undefined
    $.ui.status(undefined)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, suggestion)
    if (!s || mode !== 'suggest' || e.props.hasSurvey) return next(e)
    const rest = await next(e)
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {rest}
        <Box flexDirection="row" gap={1}>
          <Text>
            Effort <Text bold>{s.level}</Text> fits this prompt
            <Text dimColor>
              {' '}
              (Jev {percent(s.probability)}, now {s.from})
            </Text>
          </Text>
          <Button key="apply" label={`Apply ${s.level}`} onPress={() => apply($, s)} />
          <Button key="dismiss" label="Dismiss" onPress={() => update($, suggestion, () => null)} />
        </Box>
      </Box>
    )
  })
}
