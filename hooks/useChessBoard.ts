'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Chess, type Square } from 'chess.js'
import {
  squareMapToFen,
  sanitizeCastling,
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
  const [photoNotes, setPhotoNotes] = useState<{
    confidence: string
    corrections: string[]
    issues: string[]
  } | null>(null)

  const buildFenFromSquares = useCallback(() => {
    const c = sanitizeCastling(squares, castling)
    return squareMapToFen(squares, turn, c, enPassant.trim().toLowerCase() || '-')
  }, [squares, turn, castling, enPassant])

  const editFen = useMemo(
    () => {
      const c = sanitizeCastling(squares, castling)
      return squareMapToFen(squares, turn, c, enPassant.trim().toLowerCase() || '-')
    },
    [squares, turn, castling, enPassant]
  )

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

  const playMove = (from: string, to: string, promotion?: PromotionPiece) => {
    const result = applyTapMove(editFen, squares, castling, from, to, promotion)
    setSelectedSquare(null)
    setPendingPromotion(null)
    if (!result) return
    setSquares(result.squares)
    setTurn(result.turn)
    setCastling(result.castling)
    setEnPassant(result.enPassant)
    setValidationErrors([])
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
    setSquares(prev => ({ ...prev, [sq]: piece }))
    setValidationErrors([])
  }

  const resetBoard = (start: boolean, undo = true) => {
    const previous = { squares, turn, castling, enPassant, editTool }
    setSquares(start ? squaresFromFen(START_FEN) : {})
    setTurn('w')
    setCastling({ K: start, Q: start, k: start, q: start })
    setEnPassant('')
    setEditTool(null)
    setValidationErrors([])
    if (undo) {
      toast.success(start ? 'Startaufstellung gesetzt' : 'Alle Figuren entfernt', {
        action: {
          label: 'Rückgängig',
          onClick: () => {
            setSquares(previous.squares)
            setTurn(previous.turn)
            setCastling(previous.castling)
            setEnPassant(previous.enPassant)
            setEditTool(previous.editTool)
          },
        },
      })
    }
  }

  const handleManualSetup = (start = false) => {
    resetBoard(start, false)
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
    completePromotion,
    cancelPromotion,
    buildFenFromSquares,
    setSquare,
    resetBoard,
    handleManualSetup,
    handleFenImport,
  }
}
