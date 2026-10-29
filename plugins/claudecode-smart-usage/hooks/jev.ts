// The Jev question and the decision it feeds. No `$` here, so a plain
// script can send the exact payload the mod sends.

import type { Level } from '../types'

export type { Level }

export const LEVELS: readonly Level[] = ['low', 'medium', 'high', 'xhigh', 'max']

export type Pick = { level: Level; probability: number; probabilities: Record<string, number>; inputTokens: number }

export const ENDPOINT = 'https://api.typesafe.ai/v1/systemone'

// The rubric from Ben AI's effort video, grounded in Anthropic's effort guidance:
// low keeps the user in the loop, higher levels let Claude decide more alone.
import tiers from './tiers'

export type Criteria = Record<Level, string>

export const DEFAULT_CRITERIA: Criteria = tiers.efforts

// A tiers file is JSON, or a copy of tiers.ts whose object follows `export default`.
export const parseCriteria = (text: string): Criteria => {
  const start = text.indexOf('export default')
  const parsed = JSON.parse(start < 0 ? text : text.slice(start + 'export default'.length))
  const efforts = parsed?.efforts
  if (!efforts || !LEVELS.every(level => typeof efforts[level] === 'string')) throw new Error('efforts must describe every level')
  return efforts
}

export type Previous = { prompt: string; minutesAgo: number }

export const buildRequest = (model: string, prompt: string, previous?: Previous, criteria: Criteria = DEFAULT_CRITERIA) => ({
  model,
  state: {
    prompt: prompt.slice(0, 6000),
    ...(previous && {
      previous_prompt: previous.prompt.slice(0, 1000),
      previous_prompt_sent: `${previous.minutesAgo} minutes earlier in the same session`,
    }),
  },
  questions: {
    effort: {
      type: 'choice',
      instructions: 'How much reasoning effort should Claude spend on the task the user asks for in `prompt`?',
      criteria,
    },
  },
})

export const isLevel = (value: unknown): value is Level => LEVELS.includes(value as Level)

export const parsePick = (body: unknown): Pick | null => {
  const response = body as {
    answers?: { effort?: { choice?: unknown; probabilities?: Record<string, number> } }
    usage?: { input_tokens?: number }
  }
  const answer = response?.answers?.effort
  if (!answer || !isLevel(answer.choice)) return null
  const probability = answer.probabilities?.[answer.choice]
  if (typeof probability !== 'number') return null
  return { level: answer.choice, probability, probabilities: answer.probabilities ?? {}, inputTokens: response.usage?.input_tokens ?? 0 }
}

// The level to move to, or null when the session's effort already fits or Jev
// is not sure enough.
export const decide = (pick: Pick | null, current: unknown, threshold: number): Level | null =>
  pick && isLevel(current) && pick.level !== current && pick.probability >= threshold ? pick.level : null
