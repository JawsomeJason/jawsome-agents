import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = {
  plugin: 'claudecode-smart-usage',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const PROMPT = {
  text: "check this month's revenue report against the bank export and flag anything that doesn't match",
  wait: false,
  origin: { kind: 'composer' },
} as const

const STEP = { turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'medium', messageCount: 1 } as const

const jevSays = (on: On, level: string, probability: number, sent: string[]) =>
  on('http.fetch', (_, e) => {
    sent.push(e.url)
    const body = { model: 'jev-1.14.0', answers: { effort: { type: 'choice', choice: level, confidence: probability, probabilities: { [level]: probability } } }, usage: { input_tokens: 595, output_tokens: 1 } }
    return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify(body) } }
  })

// Stands for the model: records the effort each request went out with.
const modelRecords = (on: On, efforts: unknown[]) =>
  on('turn.step', async function* (_, e) {
    efforts.push(e.effort)
    return { turnId: e.turnId, index: e.index, answer: 'ok', toolUses: [], stopReason: 'end_turn', usage: null }
  })

const runStep = async (stream: AsyncGenerator<unknown, unknown>) => {
  for await (const _ of stream) {
  }
}

const engineAnswers = (on: On) => {
  mock.clock(on)
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
}

test('suggest mode shows the band and Apply holds the level until /effort moves', { options: { mode: 'suggest' } }, async ($, on) => {
  const sent: string[] = []
  const efforts: unknown[] = []
  const statuses: unknown[] = []
  engineAnswers(on)
  mock.env(on, { TYPESAFE_API_KEY: 'test-key' })
  jevSays(on, 'high', 0.97, sent)
  modelRecords(on, efforts)
  on('ui.status', (_, e) => (statuses.push(e.text), { value: undefined }) as never)

  await $.prompt.submit(PROMPT)
  await runStep($.turn.step(STEP))

  expect(sent).toEqual(['https://api.typesafe.ai/v1/systemone'])
  expect(efforts).toEqual(['medium'])

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /high/ }))?.text).toContain('high fits this prompt')
  await ui.press({ key: 'apply' })
  expect(await ui.find({ type: 'Text', text: /fits this prompt/ })).toBeUndefined()
  await ui.unmount()

  await runStep($.turn.step({ ...STEP, index: 1 }))
  await runStep($.turn.step({ ...STEP, turnId: 't2' }))
  await runStep($.turn.step({ ...STEP, turnId: 't3', effort: 'low' }))
  expect(efforts).toEqual(['medium', 'high', 'high', 'low'])
  expect(statuses).toEqual(['effort high (picker; /effort to reset)', undefined])
})

test('running /effort drops an applied level even at the same session effort', { options: { mode: 'suggest' } }, async ($, on) => {
  const efforts: unknown[] = []
  engineAnswers(on)
  mock.env(on, { TYPESAFE_API_KEY: 'test-key' })
  jevSays(on, 'high', 0.97, [])
  modelRecords(on, efforts)
  on('ui.status', () => ({ value: undefined }))
  on('command.run', () => ({ text: 'Effort set to medium' }))

  await $.prompt.submit(PROMPT)
  await runStep($.turn.step(STEP))
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'apply' })
  await ui.unmount()
  await $.command.run({ command: 'effort', args: 'medium', origin: { kind: 'composer' }, presentation: { layout: 'main', columns: 100 } } as never)
  await runStep($.turn.step({ ...STEP, turnId: 't2' }))

  expect(efforts).toEqual(['medium', 'medium'])
})

test('auto mode sends the first request at the picked level', { options: { mode: 'auto' } }, async ($, on) => {
  const sent: string[] = []
  const efforts: unknown[] = []
  engineAnswers(on)
  mock.env(on, { TYPESAFE_API_KEY: 'test-key' })
  jevSays(on, 'high', 0.97, sent)
  modelRecords(on, efforts)
  on('ui.status', () => ({ value: undefined }))

  await $.prompt.submit(PROMPT)
  await runStep($.turn.step(STEP))

  expect(efforts).toEqual(['high'])
})

test('a pick under the threshold changes nothing', { options: { mode: 'auto', threshold: 0.9 } }, async ($, on) => {
  const efforts: unknown[] = []
  engineAnswers(on)
  mock.env(on, { TYPESAFE_API_KEY: 'test-key' })
  jevSays(on, 'high', 0.8, [])
  modelRecords(on, efforts)
  on('ui.status', () => ({ value: undefined }))

  await $.prompt.submit(PROMPT)
  await runStep($.turn.step(STEP))

  expect(efforts).toEqual(['medium'])
})

test('without a key nothing is sent and the effort stays', { options: { mode: 'auto' } }, async ($, on) => {
  const sent: string[] = []
  const efforts: unknown[] = []
  engineAnswers(on)
  mock.env(on, {})
  jevSays(on, 'high', 0.97, sent)
  modelRecords(on, efforts)
  on('ui.status', () => ({ value: undefined }))

  await $.prompt.submit(PROMPT)
  await runStep($.turn.step(STEP))

  expect(sent).toEqual([])
  expect(efforts).toEqual(['medium'])
})

test('a short follow-up is not sent to Jev', async ($, on) => {
  const sent: string[] = []
  engineAnswers(on)
  mock.env(on, { TYPESAFE_API_KEY: 'test-key' })
  jevSays(on, 'low', 0.97, sent)
  modelRecords(on, [])

  await $.prompt.submit(PROMPT)
  await $.prompt.submit({ ...PROMPT, text: 'yes, go ahead' })

  expect(sent).toHaveLength(1)
})

test('the tiersFile option replaces the effort criteria sent to Jev', { options: { mode: 'auto', tiersFile: '/tmp/tiers.json' } }, async ($, on) => {
  const read: string[] = []
  const bodies: string[] = []
  const efforts = { low: 'Quick asks.', medium: 'Normal work.', high: 'Costly mistakes.', xhigh: 'Long hand-offs.', max: 'Rare.' }
  engineAnswers(on)
  mock.env(on, { TYPESAFE_API_KEY: 'test-key' })
  on('fs.read', (_, e) => (read.push(e.path), { value: JSON.stringify({ efforts }) }))
  on('http.fetch', (_, e) => {
    bodies.push(String(e.init?.body))
    return { value: { status: 200, ok: true, headers: {}, text: '{}' } }
  })
  modelRecords(on, [])
  on('ui.status', () => ({ value: undefined }))

  await $.prompt.submit(PROMPT)
  await runStep($.turn.step(STEP))

  expect(read).toEqual(['/tmp/tiers.json'])
  expect(bodies.map(body => JSON.parse(body).questions.effort.criteria)).toEqual([efforts])
})
