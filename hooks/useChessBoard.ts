'use client'

import { useState, useCallback, useMemo } from 'react'
import { Chess, type Square } from 'chess.js'
import { squareMapToFen, sanitizeCastling, validateFen } from '@/lib/chess-utils'
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
    buildFenFromSquares,
    setSquare,
    resetBoard,
    handleManualSetup,
    handleFenImport,
  }
}
