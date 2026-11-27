import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startEngineSession } from '../lib/engine-session.ts'
import { runRequest, RequestTimeoutError } from '../lib/async-request.ts'

class EngineStub {
  commands: string[] = []
  terminated = false
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onmessageerror: (() => void) | null = null
  postMessage(message: string) { this.commands.push(message) }
  terminate() { this.terminated = true }
  emit(data: string) { this.onmessage?.({ data }) }
  port() { return this as unknown as Worker }
}

test('Engine wartet auf UCI und Bereitschaft, beendet sich nach dem Ergebnis', () => {
  const engine = new EngineStub()
  const lines: string[] = []
  startEngineSession(engine.port(), 'test-fen', 18, line => lines.push(line), assert.fail)
  assert.deepEqual(engine.commands, ['uci'])
  engine.emit('uciok')
  assert.deepEqual(engine.commands, ['uci', 'setoption name MultiPV value 3', 'isready'])
  engine.emit('readyok')
  assert.deepEqual(engine.commands.slice(-2), ['position fen test-fen', 'go depth 18'])
  const queuedMessage = engine.onmessage!
  engine.emit('info depth 18\nbestmove e2e4')
  assert.deepEqual(lines, ['info depth 18', 'bestmove e2e4'])
  assert.equal(engine.terminated, true)
  queuedMessage({ data: 'bestmove d2d4' })
  assert.equal(lines.length, 2, 'verspätete Ergebnisse werden verworfen')
})

test('Abbruch verhindert jeden späteren Start und jedes Ergebnis', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const engine = new EngineStub()
  const errors: string[] = []
  const lines: string[] = []
  const session = startEngineSession(engine.port(), 'test-fen', 26, line => lines.push(line), message => errors.push(message))
  const queuedMessage = engine.onmessage!
  session.stop()
  queuedMessage({ data: 'uciok' })
  t.mock.timers.tick(16000)
  assert.deepEqual(engine.commands, ['uci'])
  assert.deepEqual(errors, [])
  assert.deepEqual(lines, [])
})

test('Startzeitüberschreitung beendet den Worker; eine neue Sitzung funktioniert', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const engine = new EngineStub()
  const errors: string[] = []
  startEngineSession(engine.port(), 'test-fen', 18, assert.fail, message => errors.push(message))
  t.mock.timers.tick(15000)
  assert.equal(errors.length, 1)
  assert.equal(engine.terminated, true)
  const retry = new EngineStub()
  startEngineSession(retry.port(), 'test-fen', 10, () => {}, assert.fail)
  retry.emit('uciok\nreadyok\nbestmove e2e4')
  assert.ok(retry.commands.includes('go depth 10'))
  assert.equal(retry.terminated, true)
})

test('Worker-Fehler werden genau einmal gemeldet und räumen die Sitzung auf', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const engine = new EngineStub()
  const errors: string[] = []
  startEngineSession(engine.port(), 'test-fen', 18, assert.fail, message => errors.push(message))
  const queuedError = engine.onerror!
  queuedError()
  queuedError()
  t.mock.timers.tick(16000)
  assert.equal(errors.length, 1)
  assert.equal(engine.terminated, true)
})

test('KI-Anfrage wird während des Wartens nach Ablauf der Frist abgebrochen', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const pending = runRequest(signal => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  }), undefined, 500)
  const rejected = assert.rejects(pending, RequestTimeoutError)
  t.mock.timers.tick(500)
  await rejected
})

test('Ein externer Abbruch beendet die zugehörige Anfrage', async () => {
  const controller = new AbortController()
  const pending = runRequest(signal => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  }), controller.signal)
  const rejected = assert.rejects(pending, { name: 'AbortError' })
  controller.abort()
  await rejected
  let started = false
  await assert.rejects(runRequest(async () => { started = true }, controller.signal), { name: 'AbortError' })
  assert.equal(started, false)
})

test('Erfolgreiche Anfragen entfernen Timer und Abbruchbeobachter', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const controller = new AbortController()
  let requestSignal: AbortSignal | undefined
  assert.equal(await runRequest(async signal => { requestSignal = signal; return 42 }, controller.signal, 500), 42)
  t.mock.timers.tick(1000)
  controller.abort()
  assert.equal(requestSignal?.aborted, false)
})
