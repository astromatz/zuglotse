import { Chess } from 'chess.js'

export interface SquareMap {
  [square: string]: string | null
}

export function squareMapToFen(squares: SquareMap, turn: 'w' | 'b', castling: string, enPassant: string): string {
  const rows: string[] = []
  for (let rank = 8; rank >= 1; rank--) {
    let row = ''
    let empty = 0
    for (const file of ['a','b','c','d','e','f','g','h']) {
      const sq = `${file}${rank}`
      const piece = squares?.[sq]
      if (!piece) {
        empty++
      } else {
        if (empty > 0) { row += empty; empty = 0 }
        const map: Record<string, string> = {
          wK:'K',wQ:'Q',wR:'R',wB:'B',wN:'N',wP:'P',
          bK:'k',bQ:'q',bR:'r',bB:'b',bN:'n',bP:'p'
        }
        row += map[piece] ?? 'P'
      }
    }
    if (empty > 0) row += empty
    rows.push(row)
  }
  const c = castling || '-'
  const ep = enPassant || '-'
  return `${rows.join('/')} ${turn} ${c} ${ep} 0 1`
}

/** Removes castling flags whose king/rook are not on their home squares. */
export function sanitizeCastling(squares: SquareMap, flags: { K: boolean; Q: boolean; k: boolean; q: boolean }): string {
  const s = squares ?? {}
  const res = [
    flags.K && s.e1 === 'wK' && s.h1 === 'wR' ? 'K' : '',
    flags.Q && s.e1 === 'wK' && s.a1 === 'wR' ? 'Q' : '',
    flags.k && s.e8 === 'bK' && s.h8 === 'bR' ? 'k' : '',
    flags.q && s.e8 === 'bK' && s.a8 === 'bR' ? 'q' : '',
  ].join('')
  return res || '-'
}

/**
 * Behält das En-passant-Feld nur, wenn es zur Stellung passt; sonst "-".
 * Plausibel heißt: richtige Reihe passend zum Zugrecht, gegnerischer Bauer direkt davor,
 * Zielfeld und Ausgangsfeld des Doppelschritts leer und ein eigener Bauer, der schlagen kann.
 */
export function sanitizeEnPassant(squares: SquareMap, turn: 'w' | 'b', enPassant: string): string {
  const ep = (enPassant ?? '').trim().toLowerCase()
  if (!/^[a-h][36]$/.test(ep)) return '-'
  const s = squares ?? {}
  const file = ep[0]
  const rank = Number(ep[1])
  if (rank !== (turn === 'w' ? 6 : 3)) return '-'
  const dir = turn === 'w' ? -1 : 1 // vom Zielfeld zum Bauern, der den Doppelschritt gemacht hat
  const opponent = turn === 'w' ? 'b' : 'w'
  if (s[`${file}${rank + dir}`] !== `${opponent}P`) return '-'
  if (s[ep] || s[`${file}${rank - dir}`]) return '-'
  const fi = file.charCodeAt(0)
  const capturer = [fi - 1, fi + 1]
    .filter((f) => f >= 97 && f <= 104)
    .some((f) => s[`${String.fromCharCode(f)}${rank + dir}`] === `${turn}P`)
  return capturer ? ep : '-'
}

export function validateFen(fen: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const parts = fen?.trim().split(/\s+/) ?? []
  const rowsCheck = (parts[0] ?? '').split('/')
  if (parts.length < 2 || rowsCheck.length !== 8) {
    return { valid: false, errors: ['Ungültige FEN: Es müssen 8 Reihen und die Angabe, wer am Zug ist, vorhanden sein'] }
  }
  const board = parts[0] ?? ''
  let wK = 0, bK = 0, wP = 0, bP = 0
  for (const ch of board) {
    if (ch === 'K') wK++
    if (ch === 'k') bK++
    if (ch === 'P') wP++
    if (ch === 'p') bP++
  }
  if (wK !== 1) errors.push(`Weiß hat ${wK} König(e) – es muss genau 1 sein`)
  if (bK !== 1) errors.push(`Schwarz hat ${bK} König(e) – es muss genau 1 sein`)
  if (wP > 8) errors.push(`Weiß hat ${wP} Bauern – maximal 8 erlaubt`)
  if (bP > 8) errors.push(`Schwarz hat ${bP} Bauern – maximal 8 erlaubt`)
  const rows = board?.split('/') ?? []
  const firstRow = rows?.[rows.length - 1] ?? ''
  const lastRow = rows?.[0] ?? ''
  if (/[Pp]/.test(firstRow) || /[Pp]/.test(lastRow)) {
    errors.push('Bauern dürfen nicht auf Reihe 1 oder 8 stehen')
  }
  const ep = parts[3] ?? '-'
  if (ep !== '-' && !(parts[1] === 'w' ? /^[a-h]6$/ : /^[a-h]3$/).test(ep)) {
    errors.push(`En-passant-Feld "${ep}" ist ungültig – bei ${parts[1] === 'w' ? 'Weiß' : 'Schwarz'} am Zug muss es auf Reihe ${parts[1] === 'w' ? '6' : '3'} liegen (oder leer bleiben)`)
  }
  if (errors.length > 0) return { valid: false, errors }
  let chess: Chess
  try {
    chess = new Chess(fen)
  } catch (e: any) {
    const msg = String(e?.message ?? '')
    if (msg.includes('en-passant')) errors.push('En-passant-Feld passt nicht zur Stellung – bitte leeren')
    else if (msg.includes('side-to-move')) errors.push('Ungültiges Zugrecht: Verwende „w“ für Weiß oder „b“ für Schwarz.')
    else if (msg.includes('castling')) errors.push('Ungültige Rochaderechte: Erlaubt sind KQkq oder ein Bindestrich.')
    else if (msg.includes('move number')) errors.push('Die Zugnummer am Ende der FEN muss eine positive ganze Zahl sein.')
    else if (msg.includes('half move')) errors.push('Der Halbzugzähler muss eine ganze Zahl ab null sein.')
    else errors.push('Ungültige FEN: Prüfe die acht Brettreihen, die Figurensymbole und die sechs durch Leerzeichen getrennten Angaben.')
    return { valid: false, errors }
  }
  // Side NOT to move must not be in check
  try {
    const flipped = fen.trim().split(/\s+/)
    flipped[1] = flipped[1] === 'w' ? 'b' : 'w'
    flipped[3] = '-'
    if (new Chess(flipped.join(' ')).isCheck()) {
      const side = parts[1] === 'w' ? 'Schwarz' : 'Weiß'
      errors.push(`${side} steht im Schach, obwohl ${parts[1] === 'w' ? 'Weiß' : 'Schwarz'} am Zug ist – prüfe „Am Zug“ oder die Figurenstellung`)
    }
  } catch {}
  void chess
  return { valid: errors.length === 0, errors }
}

export interface MoveTarget {
  square: string
  capture: boolean
  promotion: boolean
}

export type PromotionPiece = 'q' | 'r' | 'b' | 'n'

export interface TapMoveResult {
  squares: SquareMap
  turn: 'w' | 'b'
  castling: { K: boolean; Q: boolean; k: boolean; q: boolean }
  enPassant: string
}

function pieceColorAt(placement: string, square: string): 'w' | 'b' | null {
  const rows = placement.split('/')
  const row = rows[8 - Number(square[1])] ?? ''
  const fileIndex = square.charCodeAt(0) - 97
  let col = 0
  for (const ch of row) {
    if (ch >= '1' && ch <= '8') {
      col += Number(ch)
      continue
    }
    if (col === fileIndex) return ch === ch.toUpperCase() ? 'w' : 'b'
    col++
  }
  return null
}

/** Lädt die Stellung so, dass die Figur auf `square` am Zug ist (Zugrecht wird bei Bedarf getauscht). */
function loadForPiece(fen: string, square: string): { chess: Chess; strict: boolean; color: 'w' | 'b' } | null {
  const parts = fen.trim().split(/\s+/)
  const color = pieceColorAt(parts[0] ?? '', square)
  if (!color) return null
  const adjusted = [...parts]
  if (adjusted[1] !== color) {
    adjusted[1] = color
    adjusted[3] = '-'
  }
  const text = adjusted.join(' ')
  try {
    return { chess: new Chess(text), strict: true, color }
  } catch {
    // Unvollständige Stellung (z. B. fehlender König): Züge ohne Schach-Prüfung berechnen.
    try {
      return { chess: new Chess(text, { skipValidation: true }), strict: false, color }
    } catch {
      return null
    }
  }
}

/** Zielfelder der Figur auf `square` (regelkonform, bei unvollständiger Stellung ohne Schach-Prüfung). */
export function getMoveTargets(fen: string, square: string): MoveTarget[] {
  const loaded = loadForPiece(fen, square)
  if (!loaded) return []
  try {
    const targets = new Map<string, MoveTarget>()
    for (const move of loaded.chess.moves({ square: square as any, verbose: true })) {
      const existing = targets.get(move.to)
      targets.set(move.to, {
        square: move.to,
        capture: (existing?.capture ?? false) || move.isCapture() || move.isEnPassant(),
        promotion: (existing?.promotion ?? false) || !!move.promotion,
      })
    }
    return [...targets.values()]
  } catch {
    return []
  }
}

function squaresFromPlacement(placement: string): SquareMap {
  const result: SquareMap = {}
  const rows = placement.split('/')
  for (let r = 0; r < 8; r++) {
    let col = 0
    for (const ch of rows[r] ?? '') {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < Number(ch); i++) result[`${'abcdefgh'[col + i]}${8 - r}`] = null
        col += Number(ch)
      } else {
        result[`${'abcdefgh'[col]}${8 - r}`] = `${ch === ch.toUpperCase() ? 'w' : 'b'}${ch.toUpperCase()}`
        col++
      }
    }
  }
  return result
}

/**
 * Führt einen Zug der Figur auf `from` nach `to` aus und liefert die neue Stellung.
 * Zugrecht, Rochaderechte und En-passant-Feld werden dabei automatisch angepasst.
 */
export function applyTapMove(
  fen: string,
  squares: SquareMap,
  castling: { K: boolean; Q: boolean; k: boolean; q: boolean },
  from: string,
  to: string,
  promotion?: PromotionPiece
): TapMoveResult | null {
  const loaded = loadForPiece(fen, from)
  if (!loaded) return null
  const { chess, strict, color } = loaded

  if (strict) {
    try {
      chess.move({ from, to, promotion })
    } catch {
      return null
    }
    const parts = chess.fen().split(' ')
    const flags = parts[2] ?? '-'
    return {
      squares: squaresFromPlacement(parts[0] ?? ''),
      turn: parts[1] === 'b' ? 'b' : 'w',
      castling: { K: flags.includes('K'), Q: flags.includes('Q'), k: flags.includes('k'), q: flags.includes('q') },
      enPassant: parts[3] && parts[3] !== '-' ? parts[3] : '',
    }
  }

  // Unvollständige Stellung: Figur einfach versetzen.
  const piece = squares[from]
  if (!piece) return null
  const next: SquareMap = { ...squares, [from]: null }
  const lastRank = color === 'w' ? '8' : '1'
  next[to] = piece[1] === 'P' && to[1] === lastRank ? `${color}${(promotion ?? 'q').toUpperCase()}` : piece
  const flags = { ...castling }
  const touched = [from, to]
  if (piece[1] === 'K') {
    if (color === 'w') { flags.K = false; flags.Q = false } else { flags.k = false; flags.q = false }
  }
  if (touched.includes('a1')) flags.Q = false
  if (touched.includes('h1')) flags.K = false
  if (touched.includes('a8')) flags.q = false
  if (touched.includes('h8')) flags.k = false
  return { squares: next, turn: color === 'w' ? 'b' : 'w', castling: flags, enPassant: '' }
}

export function getMaterialBalance(fen: string): { white: Record<string,number>; black: Record<string,number>; balance: number } {
  const board = fen?.split(' ')?.[0] ?? ''
  const values: Record<string, number> = { P:1, N:3, B:3, R:5, Q:9, K:0 }
  const white: Record<string,number> = { P:0,N:0,B:0,R:0,Q:0,K:0 }
  const black: Record<string,number> = { P:0,N:0,B:0,R:0,Q:0,K:0 }
  for (const ch of board) {
    if (ch >= 'A' && ch <= 'Z' && white[ch] !== undefined) white[ch]++
    if (ch >= 'a' && ch <= 'z') { const u = ch.toUpperCase(); if (black[u] !== undefined) black[u]++ }
  }
  let bal = 0
  for (const p of Object.keys(values)) bal += (white[p] ?? 0) * (values[p] ?? 0) - (black[p] ?? 0) * (values[p] ?? 0)
  return { white, black, balance: bal }
}

export function isInCheck(fen: string): boolean {
  try {
    const chess = new Chess(fen)
    return chess?.isCheck?.() ?? false
  } catch { return false }
}

export function getEvalCategory(cp: number): string {
  const abs = Math.abs(cp)
  if (abs <= 50) return 'Ausgeglichen'
  if (abs <= 150) return 'Leichter Vorteil'
  if (abs <= 300) return 'Klarer Vorteil'
  return 'Entscheidender Vorteil'
}
