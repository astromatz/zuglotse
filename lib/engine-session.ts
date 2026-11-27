/** One UCI session. Stopped or failed workers can never publish late results. */
export function startEngineSession(
  worker: Worker,
  fen: string,
  depth: number,
  onLine: (line: string) => void,
  onError: (message: string) => void,
  startupTimeout = 15000
) {
  let active = true
  let phase: 'uci' | 'ready' | 'search' = 'uci'
  const stop = () => {
    active = false
    clearTimeout(timer)
    worker.onmessage = null
    worker.onerror = null
    worker.onmessageerror = null
    worker.terminate()
  }
  const fail = (message: string) => {
    if (!active) return
    stop()
    onError(message)
  }
  const timer = setTimeout(() => fail('Die Engine antwortet nicht. Bitte starte die Analyse erneut.'), startupTimeout)
  worker.onerror = () => fail('Die Engine wurde unterbrochen. Bitte starte die Analyse erneut.')
  worker.onmessageerror = () => fail('Die Engine-Antwort konnte nicht gelesen werden. Bitte versuche es erneut.')
  worker.onmessage = (event: MessageEvent) => {
    if (!active || typeof event.data !== 'string') return
    try {
      for (const line of event.data.split('\n').map((line: string) => line.trim())) {
        if (!active) break
        if (line === 'uciok' && phase === 'uci') {
          phase = 'ready'
          worker.postMessage('setoption name MultiPV value 3')
          worker.postMessage('isready')
        } else if (line === 'readyok' && phase === 'ready') {
          phase = 'search'
          clearTimeout(timer)
          worker.postMessage(`position fen ${fen}`)
          worker.postMessage(`go depth ${depth}`)
        } else if (phase === 'search') {
          if (line.startsWith('bestmove')) stop()
          onLine(line)
        }
      }
    } catch {
      fail('Die Engine-Antwort konnte nicht verarbeitet werden. Bitte versuche es erneut.')
    }
  }
  try { worker.postMessage('uci') }
  catch { fail('Die Engine konnte nicht gestartet werden. Bitte versuche es erneut.') }
  return { stop }
}
