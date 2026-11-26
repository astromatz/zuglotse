import { applyTapMove, squareMapToFen, sanitizeCastling, validateFen, sanitizeEnPassant } from '../lib/chess-utils.ts'
import { Chess } from 'chess.js'
const sq = (fen) => { const c = new Chess(fen); const r = {}; for (const f of 'abcdefgh') for (let k=1;k<=8;k++){const p=c.get(f+k); r[f+k]=p?p.color+p.type.toUpperCase():null}; return r }
// Stellung: schwarzer Bauer d4, weiß zieht e2-e4
let s = sq('rnbqkbnr/ppp1pppp/8/8/3p4/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
let castling = {K:true,Q:true,k:true,q:true}
const fen0 = squareMapToFen(s,'w','KQkq','-')
const r = applyTapMove(fen0, s, castling, 'e2','e4')
console.log('nach e2e4', r.turn, r.enPassant)
const old = (sq, t, ep) => squareMapToFen(sq, t, sanitizeCastling(sq, r.castling), ep || '-')
const neu = (sq, t, ep) => squareMapToFen(sq, t, sanitizeCastling(sq, r.castling), sanitizeEnPassant(sq, t, ep))
const cases = {
  'Am Zug umschalten': [r.squares, 'w'],
  'd4-Bauer entfernen': [{...r.squares, d4:null}, 'b'],
  'e4-Bauer verschieben nach e5': [{...r.squares, e4:null, e5:'wP'}, 'b'],
  'Figur auf e3 setzen': [{...r.squares, e3:'wN'}, 'b'],
}
for (const [k,[s2,t]] of Object.entries(cases)) {
  console.log(k, '| alt:', validateFen(old(s2,t,r.enPassant)).errors, '| neu:', validateFen(neu(s2,t,r.enPassant)).errors)
  try { new Chess(old(s2,t,r.enPassant)) } catch(e) { console.log('   chess.js alt:', e.message) }
}
