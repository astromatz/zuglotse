// Stockfish worker communication helper
export interface StockfishCandidate {
  move: string
  san: string
  cp: number | null
  mate: number | null
  pv: string[]
  depth: number
  multipv: number
}

export interface StockfishResult {
  candidates: StockfishCandidate[]
  bestMove: string
  fen: string
}

export function parseInfoLine(line: string): Partial<StockfishCandidate> | null {
  if (!line?.startsWith?.('info') || !line?.includes?.('multipv')) return null
  const parts = line.split(' ')
  const get = (key: string) => {
    const idx = parts.indexOf(key)
    return idx >= 0 && idx + 1 < parts.length ? parts[idx + 1] : null
  }
  const pvIdx = parts.indexOf('pv')
  const pv = pvIdx >= 0 ? parts.slice(pvIdx + 1) : []
  const scoreType = get('score') === 'cp' ? 'cp' : get('score') === 'mate' ? 'mate' : null
  // Actually parse score differently
  const scoreIdx = parts.indexOf('score')
  let cp: number | null = null
  let mate: number | null = null
  if (scoreIdx >= 0 && scoreIdx + 2 < parts.length) {
    if (parts[scoreIdx + 1] === 'cp') cp = parseInt(parts[scoreIdx + 2] ?? '0', 10)
    if (parts[scoreIdx + 1] === 'mate') mate = parseInt(parts[scoreIdx + 2] ?? '0', 10)
  }
  return {
    multipv: parseInt(get('multipv') ?? '1', 10),
    depth: parseInt(get('depth') ?? '0', 10),
    cp,
    mate,
    pv,
    move: pv?.[0] ?? ''
  }
}
