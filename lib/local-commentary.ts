import { Chess, type Square } from 'chess.js'
import type { StockfishCandidate } from './stockfish-worker'

const germanPieces: Record<string, string> = { K: 'K', Q: 'D', R: 'T', B: 'L', N: 'S' }
const pieceNames: Record<string, string> = { p: 'Bauer', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König' }
const center: Square[] = ['d4', 'e4', 'd5', 'e5']

export function germanSan(san: string): string {
  return san.replace(/^[KQRBN]/, p => germanPieces[p]).replace(/=([QRBN])/, (_, p: string) => `=${germanPieces[p]}`)
}

/** UCI scores are relative to the side to move; the UI always uses White's perspective. */
export function whiteScore(fen: string, cp: number): number {
  return fen.split(/\s+/)[1] === 'b' ? -cp : cp
}

export function evaluationLabel(fen: string, candidate?: StockfishCandidate): string {
  if (!candidate) return 'Noch keine Bewertung'
  const side = fen.split(/\s+/)[1] === 'b' ? 'Schwarz' : 'Weiß'
  if (candidate.mate != null) {
    const winner = candidate.mate > 0 ? side : side === 'Weiß' ? 'Schwarz' : 'Weiß'
    return `Matt für ${winner}`
  }
  if (candidate.cp == null) return 'Noch keine Bewertung'
  const cp = whiteScore(fen, candidate.cp)
  if (Math.abs(cp) <= 30) return 'Ausgeglichen'
  return `Vorteil für ${cp > 0 ? 'Weiß' : 'Schwarz'}`
}

export function formatEvaluation(fen: string, candidate: StockfishCandidate): string {
  if (candidate.mate != null) return `M${Math.abs(candidate.mate)}`
  if (candidate.cp == null) return '–'
  const cp = whiteScore(fen, candidate.cp) / 100
  return `${cp > 0 ? '+' : ''}${cp.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
}

export function evaluationPercent(fen: string, candidate: StockfishCandidate): number {
  if (candidate.mate != null) return whiteScore(fen, candidate.mate) > 0 ? 100 : 0
  return 50 + Math.max(-500, Math.min(500, whiteScore(fen, candidate.cp ?? 0))) / 10
}

export function principalVariation(fen: string, pv: string[]): string[] {
  const chess = new Chess(fen)
  const result: string[] = []
  for (const uci of pv) {
    try {
      const number = chess.moveNumber()
      const black = chess.turn() === 'b'
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      result.push(`${!black ? `${number}. ` : result.length === 0 ? `${number}… ` : ''}${germanSan(move.san)}`)
    } catch { break }
  }
  return result
}

/** Deterministic commentary: no network, LLM or credentials. */
export function describePosition(fen: string, candidates: StockfishCandidate[]): string[] {
  const chess = new Chess(fen)
  if (chess.isCheckmate()) return ['Die Stellung ist bereits Schachmatt. Es gibt keinen legalen Zug mehr.']
  if (chess.isStalemate()) return ['Patt: Es gibt keinen legalen Zug, aber der König steht nicht im Schach. Die Partie ist remis.']
  if (chess.isInsufficientMaterial()) return ['Das Material reicht nicht zum Mattsetzen aus. Die Stellung ist remis.']
  const best = candidates[0]
  if (!best) return ['Die Erklärung erscheint, sobald die Analyse abgeschlossen ist.']
  const sentences: string[] = []
  if (best.mate != null) {
    if (best.mate === 0) return ['Die Engine meldet Schachmatt.']
    const side = chess.turn() === 'w' ? 'Weiß' : 'Schwarz'
    const winner = best.mate > 0 ? side : side === 'Weiß' ? 'Schwarz' : 'Weiß'
    sentences.push(`Matt in ${Math.abs(best.mate)} Zügen ist erzwungen. ${winner} setzt matt.`)
  } else if (best.cp != null && Number.isFinite(best.cp)) {
    const cp = whiteScore(fen, best.cp)
    const value = Math.abs(cp) / 100
    const side = cp > 0 ? 'Weiß' : 'Schwarz'
    if (value <= 0.3) sentences.push('Die Stellung ist ausgeglichen. Beide Seiten haben annähernd gleiche Chancen.')
    else if (value < 1.5) sentences.push(`${side} hat einen leichten Vorteil. Präzises Spiel bleibt wichtig.`)
    else if (value <= 3) sentences.push(`${side} steht klar besser – der Vorsprung entspricht etwa ${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Bauern.`)
    else sentences.push(`${side} hat einen entscheidenden Vorteil.`)
  }
  try {
    const mover = chess.turn()
    const move = chess.move({ from: best.move.slice(0, 2), to: best.move.slice(2, 4), promotion: best.move[4] })
    sentences.push(`Der beste Zug ist ${germanSan(move.san)}.`)
    if (move.captured) sentences.push(`Der beste Zug schlägt eine gegnerische Figur (${pieceNames[move.captured]}). Ein Schlagzug allein garantiert noch keinen dauerhaften Materialgewinn.`)
    if (move.promotion) sentences.push(`Der Bauer wird in eine neue Figur umgewandelt: ${pieceNames[move.promotion]}.`)
    if (move.isKingsideCastle() || move.isQueensideCastle()) sentences.push('Die Rochade bringt den König aus dem Zentrum und den Turm ins Spiel.')
    if (chess.isCheckmate()) sentences.push('Dieser Zug setzt sofort matt.')
    else if (chess.isCheck()) sentences.push('Der Zug gibt Schach. Der Gegner muss zuerst die Bedrohung seines Königs abwehren.')
    if (center.includes(move.to)) sentences.push('Der Zug besetzt ein zentrales Feld und stärkt den Einfluss im Zentrum.')
    else if (center.some(sq => chess.attackers(sq, mover).includes(move.to))) sentences.push('Der Zug kontrolliert ein zentrales Feld und schränkt die gegnerischen Figuren ein.')
  } catch {
    sentences.push('Für diesen Zug liegt keine auswertbare Zugbeschreibung vor.')
  }
  return sentences
}
