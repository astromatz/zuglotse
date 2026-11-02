import { Chess } from 'chess.js'

export type Squares = Record<string, string | null>
type Color = 'w' | 'b'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const START_TYPE: Record<string, string> = { a: 'R', b: 'N', c: 'B', d: 'Q', e: 'K', f: 'B', g: 'N', h: 'R' }
const STD: Record<string, number> = { K: 1, Q: 1, R: 2, B: 2, N: 2, P: 8 }
const NAME: Record<string, string> = { K: 'König', Q: 'Dame', R: 'Turm', B: 'Läufer', N: 'Springer', P: 'Bauer' }
const COLOR_NAME: Record<Color, string> = { w: 'Weiß', b: 'Schwarz' }
const VALID = /^[wb][KQRBNP]$/

const sqName = (f: number, r: number) => `${FILES[f]}${r}`
const fileIdx = (sq: string) => FILES.indexOf(sq[0])
const rankOf = (sq: string) => Number(sq[1])
const isDark = (sq: string) => (fileIdx(sq) + rankOf(sq)) % 2 === 0
const label = (p: string) => `${p[0] === 'w' ? 'weißer' : 'schwarzer'} ${NAME[p[1]]}`

/** Keeps only valid squares/pieces. */
export function normalizeSquares(input: any): Squares {
  const out: Squares = {}
  for (let f = 0; f < 8; f++) for (let r = 1; r <= 8; r++) {
    const s = sqName(f, r)
    const v = input?.[s]
    out[s] = typeof v === 'string' && VALID.test(v) ? v : null
  }
  return out
}

/** Converts 8 FEN-like rows (rank 8 first, '.' or digits for empty squares) to a square map. */
export function rowsToSquares(rows: unknown): Squares | null {
  if (!Array.isArray(rows) || rows.length !== 8) return null
  const out: Squares = {}
  for (let i = 0; i < 8; i++) {
    const raw = String(rows[i] ?? '').replace(/\s|\//g, '')
    const cells: string[] = []
    for (const ch of raw) {
      if (/[1-8]/.test(ch)) for (let k = 0; k < Number(ch); k++) cells.push('.')
      else cells.push(ch)
    }
    if (cells.length !== 8) return null
    cells.forEach((ch, f) => {
      const s = sqName(f, 8 - i)
      if (/[KQRBNP]/.test(ch)) out[s] = `w${ch}`
      else if (/[kqrbnp]/.test(ch)) out[s] = `b${ch.toUpperCase()}`
      else out[s] = null
    })
  }
  return out
}

const pieces = (s: Squares, color?: Color, type?: string) =>
  Object.entries(s).filter(([, p]) => p && (!color || p[0] === color) && (!type || p[1] === type)).map(([sq]) => sq)

function counts(s: Squares, c: Color) {
  const n: Record<string, number> = { K: 0, Q: 0, R: 0, B: 0, N: 0, P: 0 }
  for (const sq of pieces(s, c)) n[s[sq]![1]]++
  return n
}

/** Number of pieces exceeding the standard set that cannot be explained by promotions. */
function impossibleExtras(n: Record<string, number>) {
  const extra = Math.max(0, n.Q - 1) + Math.max(0, n.R - 2) + Math.max(0, n.B - 2) + Math.max(0, n.N - 2)
  return Math.max(0, extra - Math.max(0, 8 - n.P))
}

/** Lists remaining obvious problems (German). */
export function findIssues(s: Squares): string[] {
  const issues: string[] = []
  for (const c of ['w', 'b'] as Color[]) {
    const n = counts(s, c)
    if (n.K !== 1) issues.push(`${COLOR_NAME[c]} hat ${n.K} Könige`)
    if (n.P > 8) issues.push(`${COLOR_NAME[c]} hat ${n.P} Bauern`)
    if (impossibleExtras(n) > 0) issues.push(`${COLOR_NAME[c]} hat zu viele Figuren eines Typs (z. B. doppelte Figuren)`)
    if (pieces(s, c).length > 16) issues.push(`${COLOR_NAME[c]} hat mehr als 16 Figuren`)
  }
  const backPawns = pieces(s, undefined, 'P').filter(sq => rankOf(sq) === 1 || rankOf(sq) === 8)
  if (backPawns.length) issues.push(`Bauern auf der Grundreihe: ${backPawns.join(', ')}`)
  const wk = pieces(s, 'w', 'K'), bk = pieces(s, 'b', 'K')
  if (wk.length === 1 && bk.length === 1 &&
    Math.abs(fileIdx(wk[0]) - fileIdx(bk[0])) <= 1 && Math.abs(rankOf(wk[0]) - rankOf(bk[0])) <= 1)
    issues.push('Die Könige stehen nebeneinander')
  return issues
}

/** Moves pieces (of one color or all) by dr ranks; null if a piece would collide or leave the board. */
function shift(s: Squares, color: Color | null, dr: number): Squares | null {
  const out: Squares = {}
  for (const k of Object.keys(s)) out[k] = color && s[k] && s[k]![0] !== color ? s[k] : null
  for (const sq of pieces(s, color ?? undefined)) {
    const r = rankOf(sq) + dr
    if (r < 1 || r > 8) return null
    const t = sqName(fileIdx(sq), r)
    if (out[t]) return null
    out[t] = s[sq]
  }
  return out
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1)

export interface RepairResult {
  squares: Squares
  corrections: string[]
  changedSquares: string[]
  suggestedTurn: Color | null
  remainingIssues: string[]
}

export function repairPosition(input: Squares): RepairResult {
  let s: Squares = { ...normalizeSquares(input) }
  const original = { ...s }
  const corrections: string[] = []

  // 1) Board rotated by 180° (white pawns "above" black pawns)
  const wpR = pieces(s, 'w', 'P').map(rankOf), bpR = pieces(s, 'b', 'P').map(rankOf)
  const wkR = pieces(s, 'w', 'K').map(rankOf), bkR = pieces(s, 'b', 'K').map(rankOf)
  const pawnsFlipped = wpR.length >= 2 && bpR.length >= 2 && avg(wpR) > avg(bpR) + 1
  const kingsFlipped = (wpR.length < 2 || bpR.length < 2) && wkR.length === 1 && bkR.length === 1 && wkR[0] >= 7 && bkR[0] <= 2
  if (pawnsFlipped || kingsFlipped) {
    const rot: Squares = {}
    for (const k of Object.keys(s)) rot[sqName(7 - fileIdx(k), 9 - rankOf(k))] = s[k]
    s = rot
    corrections.push('Brett war um 180° gedreht erkannt – Ausrichtung korrigiert')
  }

  // 2) Whole board shifted by one rank
  const rankEmpty = (r: number) => FILES.every(f => !s[`${f}${r}`])
  if (rankEmpty(8) && pieces(s, 'w', 'P').some(sq => rankOf(sq) === 1)) {
    const t = shift(s, null, 1)
    if (t) { s = t; corrections.push('Gesamte Stellung war eine Reihe zu tief erkannt – um eine Reihe nach oben verschoben') }
  } else if (rankEmpty(1) && pieces(s, 'b', 'P').some(sq => rankOf(sq) === 8)) {
    const t = shift(s, null, -1)
    if (t) { s = t; corrections.push('Gesamte Stellung war eine Reihe zu hoch erkannt – um eine Reihe nach unten verschoben') }
  }

  // 3) One color shifted one rank forward (home rank empty, officers on 2nd rank, no pawns on 2nd rank)
  for (const c of ['b', 'w'] as Color[]) {
    const home = c === 'w' ? 1 : 8, second = c === 'w' ? 2 : 7
    const own = pieces(s, c)
    const onHome = own.filter(sq => rankOf(sq) === home).length
    const officersSecond = own.filter(sq => rankOf(sq) === second && s[sq]![1] !== 'P').length
    const pawnsSecond = own.filter(sq => rankOf(sq) === second && s[sq]![1] === 'P').length
    const kingSecond = own.some(sq => rankOf(sq) === second && s[sq]![1] === 'K')
    if (onHome === 0 && officersSecond >= 2 && pawnsSecond === 0 && (kingSecond || officersSecond >= 3)) {
      const t = shift(s, c, c === 'w' ? -1 : 1)
      if (t) {
        s = t
        corrections.push(`Alle ${c === 'w' ? 'weißen' : 'schwarzen'} Figuren waren eine Reihe zu weit vorne erkannt – zurückgesetzt`)
      }
    }
  }

  // 4) King and queen swapped on their home squares
  for (const c of ['w', 'b'] as Color[]) {
    const r = c === 'w' ? 1 : 8
    if (s[`d${r}`] === `${c}K` && s[`e${r}`] === `${c}Q`) {
      s[`d${r}`] = `${c}Q`; s[`e${r}`] = `${c}K`
      corrections.push(`${c === 'w' ? 'Weißer' : 'Schwarzer'} König und Dame waren vertauscht (d${r}/e${r}) – getauscht`)
    }
  }

  const missingTypes = (c: Color) => {
    const n = counts(s, c)
    return ['Q', 'R', 'B', 'N'].filter(t => n[t] < STD[t])
  }

  // 5) Pawns on rank 1/8 → piece of the start position if that type is missing, otherwise removed
  for (const sq of pieces(s, undefined, 'P').filter(q => rankOf(q) === 1 || rankOf(q) === 8)) {
    const c = s[sq]![0] as Color
    const t = START_TYPE[sq[0]]
    const isHome = rankOf(sq) === (c === 'w' ? 1 : 8)
    if (isHome && (t === 'K' ? counts(s, c).K === 0 : missingTypes(c).includes(t))) {
      s[sq] = `${c}${t}`
      corrections.push(`Bauer auf ${sq} ist unmöglich – als ${label(s[sq]!)} gewertet`)
    } else {
      s[sq] = null
      corrections.push(`Unmöglicher Bauer auf ${sq} entfernt`)
    }
  }

  // 6) Kings: exactly one per side
  for (const c of ['w', 'b'] as Color[]) {
    const home = c === 'w' ? 'e1' : 'e8', homeR = c === 'w' ? 1 : 8
    const kingScore = (sq: string) => (sq === home ? 3 : 0) + (rankOf(sq) === homeR ? 1 : 0) - Math.abs(rankOf(sq) - homeR) * 0.1
    const kings = pieces(s, c, 'K').sort((a, b) => kingScore(b) - kingScore(a))
    if (kings.length > 1) {
      for (const extra of kings.slice(1)) {
        if (counts(s, c).Q === 0) {
          s[extra] = `${c}Q`
          corrections.push(`Doppelter ${c === 'w' ? 'weißer' : 'schwarzer'} König auf ${extra} – als Dame gewertet`)
        } else {
          s[extra] = null
          corrections.push(`Doppelter ${c === 'w' ? 'weißer' : 'schwarzer'} König auf ${extra} entfernt`)
        }
      }
    } else if (kings.length === 0) {
      const n = counts(s, c)
      const excessType = ['Q', 'R', 'B', 'N'].find(t => n[t] > STD[t])
      const pool = excessType ? pieces(s, c, excessType) : pieces(s, c, 'Q').filter(sq => sq === home)
      const pick = pool.sort((a, b) => kingScore(b) - kingScore(a))[0]
      if (pick) {
        corrections.push(`${COLOR_NAME[c]} hatte keinen König – ${label(s[pick]!)} auf ${pick} als König gewertet`)
        s[pick] = `${c}K`
      }
    }
  }

  // 7) Duplicate pieces beyond what promotions allow → convert to a missing type or remove
  for (const c of ['w', 'b'] as Color[]) {
    let guard = 0
    while (impossibleExtras(counts(s, c)) > 0 && guard++ < 16) {
      const n = counts(s, c)
      const type = ['N', 'B', 'R', 'Q'].find(t => n[t] > STD[t])!
      const list = pieces(s, c, type)
      const homeR = c === 'w' ? 1 : 8
      const onHome = (q: string) => Number(rankOf(q) === homeR && START_TYPE[q[0]] === type)
      let candidates = list
      if (type === 'B') {
        const dark = list.filter(isDark), light = list.filter(q => !isDark(q))
        candidates = dark.length > light.length ? dark : light
      }
      const victim = [...candidates].sort((a, b) => onHome(a) - onHome(b))[0]
      const missing = missingTypes(c)
      const prefer = type === 'B' ? 'N' : type === 'N' ? 'B' : type === 'Q' ? 'K' : undefined
      const target = prefer && missing.includes(prefer) ? prefer : missing[0]
      const old = label(s[victim]!)
      if (target) {
        s[victim] = `${c}${target}`
        corrections.push(`Doppelte Figur: ${old} auf ${victim} als ${label(s[victim]!)} gewertet`)
      } else {
        s[victim] = null
        corrections.push(`Doppelte Figur: ${old} auf ${victim} entfernt`)
      }
    }
    // too many pawns → remove the most advanced ones
    let pawns = pieces(s, c, 'P')
    while (pawns.length > 8) {
      pawns.sort((a, b) => c === 'w' ? rankOf(b) - rankOf(a) : rankOf(a) - rankOf(b))
      s[pawns[0]] = null
      corrections.push(`Überzähliger Bauer auf ${pawns[0]} entfernt`)
      pawns = pieces(s, c, 'P')
    }
  }

  // 8) Side to move: if black is in check, black must be to move
  let suggestedTurn: Color | null = null
  try {
    const wk = pieces(s, 'w', 'K'), bk = pieces(s, 'b', 'K')
    if (wk.length === 1 && bk.length === 1) {
      const board = new Chess()
      board.clear()
      for (const sq of pieces(s)) board.put({ type: s[sq]![1].toLowerCase() as any, color: s[sq]![0] as Color }, sq as any)
      const blackInCheck = board.isAttacked(bk[0] as any, 'w')
      const whiteInCheck = board.isAttacked(wk[0] as any, 'b')
      if (blackInCheck && !whiteInCheck) {
        suggestedTurn = 'b'
        corrections.push('Schwarz steht im Schach – Schwarz ist am Zug')
      }
    }
  } catch {}

  const changedSquares = Object.keys(s).filter(k => (s[k] ?? null) !== (original[k] ?? null) && s[k])
  return { squares: s, corrections, changedSquares, suggestedTurn, remainingIssues: findIssues(s) }
}
