'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Chess, type Square } from 'chess.js'
import {
  squareMapToFen,
  sanitizeCastling,
  sanitizeEnPassant,
  getMoveTargets,
  applyTapMove,
  parseFenLenient,
  type PromotionPiece,
} from '@/lib/chess-utils'
import { findPositionIssues, type IssueFix } from '@/lib/position-issues'
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

/** „Aufbauen“: Figuren frei setzen, verschieben, entfernen. „Spielen“: nur regelkonforme Züge der Seite am Zug. */
export type BoardMode = 'setup' | 'play'

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
  const [mode, setModeState] = useState<BoardMode>('setup')
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
    () =>
      mode === 'play' && selectedSquare && squares[selectedSquare]
        ? getMoveTargets(editFen, selectedSquare)
        : [],
    [mode, selectedSquare, squares, editFen]
  )

  // Alles, was eine Analyse verhindern würde – mit Feldern zum Markieren und einer einfachen Korrektur.
  const issues = useMemo(() => findPositionIssues(squares, turn), [squares, turn])

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

  const setMode = (next: BoardMode) => {
    setModeState(next)
    setSelectedSquare(null)
    setPendingPromotion(null)
    if (next === 'play') setEditTool(null)
  }

  /** Aufbauen: Figur ohne Regelprüfung versetzen (to = null entfernt sie). */
  const moveFree = (from: string, to: string | null) => {
    const piece = squares[from]
    if (!piece || from === to) return false
    pushHistory()
    setSquares((prev) => {
      const next = { ...prev, [from]: null }
      if (to) next[to] = piece
      return next
    })
    setSelectedSquare(null)
    setValidationErrors([])
    return true
  }

  const turnHint = () =>
    toast(`${turn === 'w' ? 'Weiß' : 'Schwarz'} ist am Zug.`, {
      id: 'turn-hint',
      description: 'Zum freien Versetzen von Figuren auf „Aufbauen“ wechseln.',
    })

  /** Tipp auf ein Feld – je nach Modus setzen/versetzen (Aufbauen) oder regelkonform ziehen (Spielen). */
  const handleSquareTap = (square: string) => {
    if (pendingPromotion) return
    const piece = squares[square]
    if (mode === 'setup') {
      if (editTool) {
        setSquare(square, editTool === 'delete' ? null : editTool)
        return
      }
      if (selectedSquare && square !== selectedSquare) {
        moveFree(selectedSquare, square)
        return
      }
      setSelectedSquare(piece && square !== selectedSquare ? square : null)
      return
    }
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
    if (piece && piece[0] !== turn) {
      setSelectedSquare(null)
      turnHint()
      return
    }
    setSelectedSquare(piece && square !== selectedSquare ? square : null)
  }

  /** Figur mit dem Finger/der Maus gezogen. Gibt false zurück, wenn die Figur zurückspringen soll. */
  const handleDrop = (from: string, to: string | null): boolean => {
    if (pendingPromotion) return false
    if (mode === 'setup') return moveFree(from, to)
    const piece = squares[from]
    if (!piece || !to || from === to) return false
    if (piece[0] !== turn) {
      turnHint()
      return false
    }
    const target = getMoveTargets(editFen, from).find((t) => t.square === to)
    if (!target) return false
    if (target.promotion) {
      setPendingPromotion({ from, to, color: piece[0] === 'b' ? 'b' : 'w' })
      return false
    }
    return playMove(from, to)
  }

  /** Führt die vorgeschlagene Korrektur eines Stellungsfehlers aus. */
  const applyFix = (fix: IssueFix) => {
    if (fix.kind === 'turn') {
      pushHistory()
      setTurn(fix.turn)
    } else if (fix.kind === 'remove') {
      pushHistory()
      setSquares((prev) => {
        const next = { ...prev }
        for (const sq of fix.squares) next[sq] = null
        return next
      })
    } else {
      setMode('setup')
      setEditTool(fix.tool)
    }
    setValidationErrors([])
  }

  /** Zugrecht im Aufbau-Modus ändern (mit „Zurücknehmen“). */
  const changeTurn = (next: 'w' | 'b') => {
    if (next === turn) return
    pushHistory()
    setTurn(next)
    setValidationErrors([])
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
    // Leeres Brett: erst aufbauen. Startaufstellung: direkt losspielen.
    setModeState(start ? 'play' : 'setup')
    setSelectedSquare(null)
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
    const parsed = parseFenLenient(input)
    if (!parsed.ok) {
      setValidationErrors([parsed.error])
      return false
    }
    const { value } = parsed
    setSquares(value.squares)
    setTurn(value.turn)
    setCastling(value.castling)
    setEnPassant(value.enPassant)
    setFen(
      squareMapToFen(
        value.squares,
        value.turn,
        sanitizeCastling(value.squares, value.castling),
        value.enPassant || '-'
      )
    )
    // Stellungsfehler (z. B. fehlender König) werden nicht abgelehnt, sondern auf dem Brett gezeigt.
    setModeState(findPositionIssues(value.squares, value.turn).length ? 'setup' : 'play')
    setSelectedSquare(null)
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
    mode, setMode,
    issues,
    applyFix,
    changeTurn,
    handleDrop,
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
