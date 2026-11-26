'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Chess, type Square } from 'chess.js'
import {
  squareMapToFen,
  sanitizeCastling,
  sanitizeEnPassant,
  validateFen,
  getMoveTargets,
  applyTapMove,
  type PromotionPiece,
} from '@/lib/chess-utils'
import { toast } from 'sonner'

export type Board = Record<string, string | null>

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function squaresFromFen(value: string): Board {
  const chess = new Chess(value)
  const result: Board = {}
  for (const file of 'abcdefgh') {
    for (let rank = 1; rank <= 8; rank++) {
      const square = `${file}${rank}` as Square
      const piece = chess.get(square)
      result[square] = piece ? `${piece.color}${piece.type.toUpperCase()}` : null
    }
  }
  return result
}

/** Stand der Stellung für „Zurück“ (ohne Auswahl- und Werkzeugzustand). */
interface PositionSnapshot {
  squares: Board
  turn: 'w' | 'b'
  castling: { K: boolean; Q: boolean; k: boolean; q: boolean }
  enPassant: string
}

const MAX_HISTORY = 100

export function useChessBoard() {
  const [squares, setSquares] = useState<Board>({})
  const [turn, setTurn] = useState<'w' | 'b'>('w')
  const [castling, setCastling] = useState({ K: true, Q: true, k: true, q: true })
  const [enPassant, setEnPassant] = useState('')
  const [fen, setFen] = useState(START_FEN)
  const [fenInput, setFenInput] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [editTool, setEditTool] = useState<string | null>(null)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string
    to: string
    color: 'w' | 'b'
  } | null>(null)
  // Der Verlauf liegt in einem Ref, damit auch der „Rückgängig“-Knopf eines Hinweises den aktuellen Stand sieht.
  const historyRef = useRef<PositionSnapshot[]>([])
  const [historyLength, setHistoryLength] = useState(0)
  const [photoNotes, setPhotoNotes] = useState<{
    confidence: string
    corrections: string[]
    issues: string[]
  } | null>(null)

  // Rochade und En passant werden immer automatisch auf plausible Werte reduziert, damit nach
  // manuellem Setzen/Entfernen/Verschieben oder Umschalten von „Am Zug“ keine unmögliche Stellung entsteht.
  const editFen = useMemo(
    () =>
      squareMapToFen(
        squares,
        turn,
        sanitizeCastling(squares, castling),
        sanitizeEnPassant(squares, turn, enPassant)
      ),
    [squares, turn, castling, enPassant]
  )

  const buildFenFromSquares = useCallback(() => editFen, [editFen])

  // Zielfelder der angetippten Figur (Punkte auf dem Brett)
  const moveTargets = useMemo(
    () => (selectedSquare && squares[selectedSquare] ? getMoveTargets(editFen, selectedSquare) : []),
    [selectedSquare, squares, editFen]
  )

  useEffect(() => {
    if (selectedSquare && !squares[selectedSquare]) setSelectedSquare(null)
  }, [squares, selectedSquare])

  useEffect(() => {
    if (editTool) {
      setSelectedSquare(null)
      setPendingPromotion(null)
    }
  }, [editTool])

  /** Merkt sich die aktuelle Stellung, bevor sie verändert wird. */
  const pushHistory = () => {
    historyRef.current = [
      ...historyRef.current.slice(-(MAX_HISTORY - 1)),
      { squares, turn, castling, enPassant },
    ]
    setHistoryLength(historyRef.current.length)
  }

  const clearHistory = () => {
    historyRef.current = []
    setHistoryLength(0)
  }

  /** Nimmt die letzte Änderung (Zug, Figur setzen) zurück. */
  const undo = () => {
    const last = historyRef.current[historyRef.current.length - 1]
    if (!last) return
    historyRef.current = historyRef.current.slice(0, -1)
    setHistoryLength(historyRef.current.length)
    setSquares(last.squares)
    setTurn(last.turn)
    setCastling(last.castling)
    setEnPassant(last.enPassant)
    setSelectedSquare(null)
    setPendingPromotion(null)
    setValidationErrors([])
  }

  const playMove = (from: string, to: string, promotion?: PromotionPiece): boolean => {
    const result = applyTapMove(editFen, squares, castling, from, to, promotion)
    setSelectedSquare(null)
    setPendingPromotion(null)
    if (!result) return false
    pushHistory()
    setSquares(result.squares)
    setTurn(result.turn)
    setCastling(result.castling)
    setEnPassant(result.enPassant)
    setValidationErrors([])
    return true
  }

  /** Tipp auf ein Feld ohne Werkzeug: Figur wählen, Zielfeld antippen = Zug ausführen. */
  const handleSquareTap = (square: string) => {
    if (pendingPromotion) return
    const piece = squares[square]
    const target = selectedSquare ? moveTargets.find((t) => t.square === square) : undefined
    if (selectedSquare && target) {
      const mover = squares[selectedSquare]
      if (target.promotion && mover) {
        setPendingPromotion({ from: selectedSquare, to: square, color: mover[0] === 'b' ? 'b' : 'w' })
      } else {
        playMove(selectedSquare, square)
      }
      return
    }
    setSelectedSquare(piece && square !== selectedSquare ? square : null)
  }

  const completePromotion = (promotion: PromotionPiece) => {
    if (pendingPromotion) playMove(pendingPromotion.from, pendingPromotion.to, promotion)
  }

  const cancelPromotion = () => setPendingPromotion(null)

  const setSquare = (sq: string, piece: string | null) => {
    if ((squares[sq] ?? null) === piece) return
    pushHistory()
    setSquares(prev => ({ ...prev, [sq]: piece }))
    setValidationErrors([])
  }

  const resetBoard = (start: boolean, withUndo = true) => {
    if (withUndo) pushHistory()
    setSquares(start ? squaresFromFen(START_FEN) : {})
    setTurn('w')
    setCastling({ K: start, Q: start, k: start, q: start })
    setEnPassant('')
    setEditTool(null)
    setValidationErrors([])
    if (withUndo) {
      toast.success(start ? 'Startaufstellung gesetzt' : 'Alle Figuren entfernt', {
        action: { label: 'Rückgängig', onClick: undo },
      })
    }
  }

  const handleManualSetup = (start = false) => {
    resetBoard(start, false)
    clearHistory()
    setPhotoNotes(null)
    setOrientation('white')
  }

  /** Returns true on success, false on validation failure */
  const handleFenImport = (fenOverride?: string): boolean => {
    const input = (fenOverride ?? fenInput).trim().replace(/\s+/g, ' ')
    if (!input) {
      setValidationErrors(['Bitte gib eine FEN-Stellung ein.'])
      return false
    }
    const validation = validateFen(input)
    if (!validation.valid) {
      setValidationErrors(validation.errors)
      return false
    }
    setFen(input)
    setSquares(squaresFromFen(input))
    const parts = input.split(' ')
    setTurn(parts[1] as 'w' | 'b')
    const c = parts[2] ?? '-'
    setCastling({ K: c.includes('K'), Q: c.includes('Q'), k: c.includes('k'), q: c.includes('q') })
    setEnPassant(parts[3] !== '-' ? parts[3] ?? '' : '')
    setEditTool(null)
    setValidationErrors([])
    setPhotoNotes(null)
    clearHistory()
    return true
  }

  return {
    squares, setSquares,
    turn, setTurn,
    castling, setCastling,
    enPassant, setEnPassant,
    fen, setFen,
    fenInput, setFenInput,
    validationErrors, setValidationErrors,
    orientation, setOrientation,
    editTool, setEditTool,
    photoNotes, setPhotoNotes,
    editFen,
    selectedSquare, setSelectedSquare,
    moveTargets,
    pendingPromotion,
    handleSquareTap,
    playMove,
    pushHistory,
    undo,
    clearHistory,
    canUndo: historyLength > 0,
    completePromotion,
    cancelPromotion,
    buildFenFromSquares,
    setSquare,
    resetBoard,
    handleManualSetup,
    handleFenImport,
  }
}
