// Sends the mod's exact Jev payload for each case and checks the level.
// Rerun: bun scripts/eval.ts [out.json]   (reads TYPESAFE_API_KEY)
import { writeFileSync } from 'node:fs'

import { buildRequest, ENDPOINT, parsePick } from '../hooks/jev'
import type { Level } from '../hooks/jev'

const CASES: [string, Level][] = [
  ['give me 15 subject lines for this newsletter', 'low'],
  ['make this email friendlier and half as long', 'low'],
  ['write a follow-up email to the client from these call notes', 'medium'],
  ["check this month's revenue report against the bank export and flag anything that doesn't match", 'high'],
  ['review this contract and flag anything unusual in the payment terms', 'high'],
  [
    "go through every support ticket from last year and give me a full report on why people cancel, I'll be away all afternoon",
    'xhigh',
  ],
]

const key = process.env.TYPESAFE_API_KEY
if (!key) throw new Error('TYPESAFE_API_KEY is not set')

const rows = []
for (const [prompt, expected] of CASES) {
  const request = buildRequest('jev-latest', prompt)
  const started = performance.now()
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(request),
  })
  const ms = Math.round(performance.now() - started)
  const body = await response.json()
  const pick = parsePick(body)
  rows.push({ prompt, expected, pick, ms, model: body.model, probabilities: body.answers?.effort?.probabilities, request })
  console.log(
    `${pick?.level === expected ? 'PASS' : 'MISS'} ${expected.padEnd(6)} -> ${String(pick?.level).padEnd(6)} p=${pick?.probability.toFixed(3)} ${ms}ms ${pick?.inputTokens} tok  ${prompt.slice(0, 60)}`,
  )
}

const passed = rows.filter(r => r.pick?.level === r.expected).length
const tokens = rows.reduce((sum, r) => sum + (r.pick?.inputTokens ?? 0), 0)
console.log(`${passed}/${rows.length} match, ${rows.length} calls, ${tokens} input tokens, model ${rows[0]?.model}`)
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(rows, null, 2))
