import { Chess } from 'chess.js'
import type { SquareMap } from './chess-utils'

type Color = 'w' | 'b'

/** Was die Hauptschaltfläche tun kann, um einen Stellungsfehler zu beheben. */
export type IssueFix =
  /** Zugrecht wechseln */
  | { kind: 'turn'; turn: Color; label: string }
  /** Figuren auf diesen Feldern entfernen */
  | { kind: 'remove'; squares: string[]; label: string }
  /** In „Aufbauen“ wechseln und ein Werkzeug wählen (Figur setzen oder „Figur entfernen“) */
  | { kind: 'tool'; tool: string; label: string }

export interface PositionIssue {
  /** Verständliche Beschreibung (deutsch) */
  message: string
  /** Felder, die auf dem Brett markiert werden */
  squares: string[]
  fix: IssueFix
}

const NAME: Record<Color, string> = { w: 'Weiß', b: 'Schwarz' }
const ADJ: Record<Color, string> = { w: 'weiße', b: 'schwarze' }

const find = (s: SquareMap, piece: string) => Object.keys(s).filter((sq) => s[sq] === piece).sort()

/**
 * Prüft die Stellung auf alles, was eine Analyse verhindern würde, und liefert pro Problem
 * die betroffenen Felder und eine einfache Korrektur. Rochade und En passant werden hier nicht
 * geprüft – sie werden automatisch plausibel gehalten.
 * Deckt alle Fälle ab, die `validateFen` für eine aus dem Brett erzeugte FEN ablehnt.
 */
export function findPositionIssues(squares: SquareMap, turn: Color): PositionIssue[] {
  const s = squares ?? {}
  const issues: PositionIssue[] = []

  for (const c of ['w', 'b'] as Color[]) {
    const kings = find(s, `${c}K`)
    if (kings.length === 0) {
      issues.push({
        message: `Der ${ADJ[c]} König fehlt.`,
        squares: [],
        fix: { kind: 'tool', tool: `${c}K`, label: `${c === 'w' ? 'Weißen' : 'Schwarzen'} König setzen` },
      })
    } else if (kings.length > 1) {
      issues.push({
        message: `${NAME[c]} hat ${kings.length} Könige – es darf nur einer sein.`,
        squares: kings,
        fix: { kind: 'tool', tool: 'delete', label: 'Überzähligen König antippen' },
      })
    }
  }

  const edgePawns = Object.keys(s)
    .filter((sq) => s[sq]?.[1] === 'P' && (sq[1] === '1' || sq[1] === '8'))
    .sort()
  if (edgePawns.length) {
    issues.push({
      message:
        edgePawns.length === 1
          ? `Auf ${edgePawns[0]} steht ein Bauer – auf der ersten und letzten Reihe ist das unmöglich.`
          : `Auf ${edgePawns.join(', ')} stehen Bauern – auf der ersten und letzten Reihe ist das unmöglich.`,
      squares: edgePawns,
      fix: { kind: 'remove', squares: edgePawns, label: edgePawns.length === 1 ? 'Bauer entfernen' : 'Bauern entfernen' },
    })
  }

  for (const c of ['w', 'b'] as Color[]) {
    const pawns = find(s, `${c}P`)
    if (pawns.length > 8) {
      issues.push({
        message: `${NAME[c]} hat ${pawns.length} Bauern – höchstens 8 sind möglich.`,
        squares: pawns,
        fix: { kind: 'tool', tool: 'delete', label: 'Überzähligen Bauern antippen' },
      })
    }
  }

  // Schach-Prüfung nur, wenn beide Seiten genau einen König haben.
  const wk = find(s, 'wK'), bk = find(s, 'bK')
  if (wk.length === 1 && bk.length === 1) {
    const fileDist = Math.abs(wk[0].charCodeAt(0) - bk[0].charCodeAt(0))
    const rankDist = Math.abs(Number(wk[0][1]) - Number(bk[0][1]))
    if (fileDist <= 1 && rankDist <= 1) {
      issues.push({
        message: 'Die beiden Könige stehen direkt nebeneinander – das ist unmöglich.',
        squares: [wk[0], bk[0]],
        fix: { kind: 'tool', tool: 'delete', label: 'Stellung korrigieren' },
      })
      return issues
    }
    try {
      const board = new Chess()
      board.clear()
      for (const sq of Object.keys(s)) {
        const p = s[sq]
        if (p) board.put({ type: p[1].toLowerCase() as any, color: p[0] as Color }, sq as any)
      }
      const other: Color = turn === 'w' ? 'b' : 'w'
      const otherKing = other === 'w' ? wk[0] : bk[0]
      const attackers = board.attackers(otherKing as any, turn)
      if (attackers.length) {
        const ownKing = turn === 'w' ? wk[0] : bk[0]
        const ownAttacked = board.attackers(ownKing as any, other).length > 0
        issues.push(
          ownAttacked
            ? {
                message: 'Beide Könige stehen im Schach – das ist unmöglich.',
                squares: [wk[0], bk[0], ...attackers],
                fix: { kind: 'tool', tool: 'delete', label: 'Stellung korrigieren' },
              }
            : {
                message: `Der ${ADJ[other]} König steht im Schach. Dann muss ${NAME[other]} am Zug sein.`,
                squares: [otherKing, ...attackers],
                fix: { kind: 'turn', turn: other, label: `${NAME[other]} an den Zug` },
              }
        )
      }
    } catch {
      // Fehler beim Aufbau werden von den Prüfungen oben abgedeckt.
    }
  }
  return issues
}
