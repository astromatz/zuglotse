// Ausführen mit: npm test  (Node ≥ 22, nutzt --experimental-strip-types)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'
import {
  applyTapMove,
  getMoveTargets,
  parseFenLenient,
  plausibleEnPassantSquares,
  sanitizeCastling,
  sanitizeEnPassant,
  squareMapToFen,
  validateFen,
  type SquareMap,
} from '../lib/chess-utils.ts'
import { findPositionIssues } from '../lib/position-issues.ts'

const ALL = [...'abcdefgh'].flatMap((f) => [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${f}${r}`))
const sq = (fen: string): SquareMap => {
  const c = new Chess(fen, { skipValidation: true })
  const r: SquareMap = {}
  for (const s of ALL) {
    const p = c.get(s as any)
    r[s] = p ? p.color + p.type.toUpperCase() : null
  }
  return r
}
type State = { squares: SquareMap; turn: 'w' | 'b'; castling: { K: boolean; Q: boolean; k: boolean; q: boolean }; ep: string }
/** Baut die FEN genau so wie useChessBoard (editFen). */
const editFen = (s: State) =>
  squareMapToFen(s.squares, s.turn, sanitizeCastling(s.squares, s.castling), sanitizeEnPassant(s.squares, s.turn, s.ep))
const ALL_CASTLING = { K: true, Q: true, k: true, q: true }

test('En passant: nach Doppelschritt gesetzt, nach manuellen Änderungen automatisch verworfen', () => {
  const s0: State = { squares: sq('rnbqkbnr/ppp1pppp/8/8/3p4/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), turn: 'w', castling: ALL_CASTLING, ep: '' }
  const r = applyTapMove(editFen(s0), s0.squares, s0.castling, 'e2', 'e4')!
  assert.equal(r.turn, 'b')
  assert.equal(r.enPassant, 'e3')
  const after: State = { squares: r.squares, turn: r.turn, castling: r.castling, ep: r.enPassant }
  assert.match(editFen(after), / b KQkq e3 /)

  const cases: Record<string, State> = {
    'Zugrecht umgeschaltet': { ...after, turn: 'w' },
    'schlagender Bauer entfernt': { ...after, squares: { ...after.squares, d4: null } },
    'Doppelschritt-Bauer versetzt': { ...after, squares: { ...after.squares, e4: null, e5: 'wP' } },
    'Figur auf das En-passant-Feld gesetzt': { ...after, squares: { ...after.squares, e3: 'wN' } },
  }
  for (const [name, st] of Object.entries(cases)) {
    const fen = editFen(st)
    assert.equal(fen.split(' ')[3], '-', name)
    assert.deepEqual(validateFen(fen).errors, [], name)
  }
})

test('En passant: Schlag en passant bleibt spielbar', () => {
  const s: State = { squares: sq('rnbqkbnr/ppp1pppp/8/8/3pP3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'), turn: 'b', castling: ALL_CASTLING, ep: 'e3' }
  const fen = editFen(s)
  assert.ok(getMoveTargets(fen, 'd4').some((t) => t.square === 'e3' && t.capture))
  const r = applyTapMove(fen, s.squares, s.castling, 'd4', 'e3')!
  assert.equal(r.squares.e4, null)
  assert.equal(r.squares.e3, 'bP')
  assert.deepEqual(plausibleEnPassantSquares(s.squares, 'b'), ['e3'])
})

test('Ein König kann nie geschlagen werden', () => {
  // Schwarz am Zug und im Schach durch den Springer c7; Weiß darf den König nicht „schlagen“.
  const fen = 'rN1qkb2/1nN1p3/3pbn2/5pB1/2PP2Pr/5PP1/PP1PQ3/RN3K1R b q - 0 1'
  const s = sq(fen)
  assert.ok(!getMoveTargets(fen, 'c7').some((t) => t.square === 'e8'))
  assert.equal(applyTapMove(fen, s, ALL_CASTLING, 'c7', 'e8'), null)
  // Auch in unvollständigen Stellungen (ohne Schach-Prüfung)
  const broken = '4k3/8/8/8/8/8/8/4R3 w - - 0 1'
  assert.equal(applyTapMove(broken, sq(broken), ALL_CASTLING, 'e1', 'e8'), null)
})

test('FEN-Import ist tolerant bei fehlenden oder unplausiblen Zusatzangaben', () => {
  const short = parseFenLenient('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3')
  assert.ok(short.ok)
  const onlyBoard = parseFenLenient('8/8/8/4k3/8/8/8/4K3')
  assert.ok(onlyBoard.ok && onlyBoard.value.turn === 'w')
  // e3 bei Weiß am Zug ist unmöglich → wird verworfen statt abgelehnt
  const badEp = parseFenLenient('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e3 0 1')
  assert.ok(badEp.ok && badEp.value.enPassant === '')
  // Rochaderecht ohne Turm auf h1 → verworfen
  const badCastle = parseFenLenient('4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1')
  assert.ok(badCastle.ok && !badCastle.value.castling.K && !badCastle.value.castling.q)
  // Strukturell kaputt → verständliche Meldung
  const bad = parseFenLenient('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP')
  assert.ok(!bad.ok && /acht/.test(bad.error))
  const badRow = parseFenLenient('rnbqkbnr/ppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1')
  assert.ok(!badRow.ok && /Reihe 7 hat 7/.test(badRow.error))
})

test('Stellungsfehler: Meldung, markierte Felder und Korrektur', () => {
  const noKing = findPositionIssues(sq('8/8/8/4k3/8/8/8/8 w - - 0 1'), 'w')
  assert.equal(noKing[0].fix.kind, 'tool')
  assert.match(noKing[0].message, /weiße König fehlt/)

  const edge = findPositionIssues(sq('4k2P/8/8/8/8/8/8/4K3 w - - 0 1'), 'w')
  assert.deepEqual(edge[0].squares, ['h8'])
  assert.deepEqual(edge[0].fix, { kind: 'remove', squares: ['h8'], label: 'Bauer entfernen' })

  const check = findPositionIssues(sq('4k3/8/8/8/8/8/8/4K2r w - - 0 1'), 'b')
  assert.equal(check.length, 1)
  assert.deepEqual(check[0].squares.sort(), ['e1', 'h1'])
  assert.deepEqual(check[0].fix, { kind: 'turn', turn: 'w', label: 'Weiß an den Zug' })

  const adjacent = findPositionIssues(sq('8/8/8/8/8/8/3k4/4K3 w - - 0 1'), 'w')
  assert.match(adjacent[0].message, /nebeneinander/)

  assert.deepEqual(findPositionIssues(sq('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), 'w'), [])
})

test('Zufällige Abfolgen manueller Änderungen erzeugen nie eine ungültige FEN ohne sichtbaren Hinweis', () => {
  let seed = 12345
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed % n
  }
  let steps = 0
  for (let g = 0; g < 400; g++) {
    let st: State = { squares: sq('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), turn: 'w', castling: ALL_CASTLING, ep: '' }
    for (let i = 0; i < 40; i++) {
      const fen = editFen(st)
      const a = rnd(10)
      if (a < 6) {
        // Spielen: nur die Seite am Zug
        const own = ALL.filter((s) => st.squares[s]?.[0] === st.turn)
        const from = own[rnd(own.length)]
        const t = getMoveTargets(fen, from)
        if (!t.length) continue
        const r = applyTapMove(fen, st.squares, st.castling, from, t[rnd(t.length)].square, 'q')
        if (r) st = { squares: r.squares, turn: r.turn, castling: r.castling, ep: r.enPassant }
      } else if (a === 6) {
        st = { ...st, turn: st.turn === 'w' ? 'b' : 'w' }
      } else if (a === 7) {
        const s = ALL[rnd(64)]
        st = { ...st, squares: { ...st.squares, [s]: null } }
      } else if (a === 8) {
        const s = ALL[rnd(64)]
        st = { ...st, squares: { ...st.squares, [s]: (rnd(2) ? 'w' : 'b') + 'KQRBNP'[rnd(6)] } }
      } else {
        const occ = ALL.filter((s) => st.squares[s])
        const from = occ[rnd(occ.length)], to = ALL[rnd(64)]
        if (from !== to) st = { ...st, squares: { ...st.squares, [from]: null, [to]: st.squares[from] } }
      }
      steps++
      const f2 = editFen(st)
      const valid = validateFen(f2).valid
      const issues = findPositionIssues(st.squares, st.turn)
      // Ohne Hinweis auf dem Brett muss die FEN gültig sein – und umgekehrt.
      assert.equal(valid, issues.length === 0, `${f2} → ${validateFen(f2).errors.join('; ')} / ${issues.map((x) => x.message).join('; ')}`)
      if (issues.length) break
    }
  }
  assert.ok(steps > 1000)
})
