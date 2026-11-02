'use client'

import dynamic from 'next/dynamic'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EvalBar } from './EvalBar'
import { evaluationPercent } from '@/lib/local-commentary'
import type { StockfishCandidate } from '@/lib/stockfish-worker'
import type { Board } from '@/hooks/useChessBoard'

const Chessboard = dynamic(() => import('react-chessboard').then(m => m.Chessboard), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-square bg-muted rounded-xl animate-pulse flex items-center justify-center text-sm text-muted-foreground">
      Zuglotse lädt das Brett …
    </div>
  ),
})

// Arrow colors per candidate rank (Phase 2)
const ARROW_COLORS = [
  'rgba(27, 94, 32, 0.85)',   // 1st: green
  'rgba(245, 158, 11, 0.70)', // 2nd: amber
  'rgba(234, 88, 12, 0.60)',  // 3rd: orange
]

interface BoardPanelProps {
  step: 'correct' | 'analyze'
  editFen: string
  fen: string
  orientation: 'white' | 'black'
  boardWidth: number
  boardContainerRef: React.RefObject<HTMLDivElement | null>
  turn: 'w' | 'b'
  editTool: string | null
  candidates: StockfishCandidate[]
  selectedCandidate: number
  analysisProgress: number
  squares: Board
  onOrientationToggle: () => void
  onPieceDrop: (source: string, target: string, piece: string | null) => boolean
  onSquareClick: (square: string) => void
}

export function BoardPanel({
  step,
  editFen,
  fen,
  orientation,
  boardWidth,
  boardContainerRef,
  turn,
  editTool,
  candidates,
  selectedCandidate,
  analysisProgress,
  squares,
  onOrientationToggle,
  onPieceDrop,
  onSquareClick,
}: BoardPanelProps) {
  const bestCandidate = candidates[0]
  const evalPercent = bestCandidate
    ? evaluationPercent(fen, bestCandidate)
    : 50

  // Phase 2: show all candidate arrows with distinct colors
  const arrows =
    step === 'analyze'
      ? candidates
          .filter(c => (c.move?.length ?? 0) >= 4)
          .map((c, i) => ({
            startSquare: c.move.slice(0, 2),
            endSquare: c.move.slice(2, 4),
            color: ARROW_COLORS[i] ?? ARROW_COLORS[2],
          }))
      : []

  return (
    <div className="zl-panel p-3 sm:p-5">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm font-semibold flex items-center gap-2">
          <span
            className={`size-3 rounded-full ring-1 ring-foreground/30 ${
              turn === 'w' ? 'bg-white' : 'bg-gray-900'
            }`}
          />
          {turn === 'w' ? 'Weiß' : 'Schwarz'} am Zug
        </span>
        <Button
          variant="ghost"
          className="size-11 rounded-xl p-0"
          aria-label="Brett drehen"
          title="Brett drehen"
          onClick={onOrientationToggle}
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>

      {/* Board + EvalBar row */}
      <div className="flex items-stretch gap-2">
        {/* Eval bar only in analyze step */}
        {step === 'analyze' && (
          <EvalBar percent={evalPercent} isAnalyzing={analysisProgress < 100} />
        )}

        <div ref={boardContainerRef} className="flex-1 flex justify-center min-w-0">
          <div
            className="chess-board-shadow rounded-lg overflow-hidden max-w-full"
            style={{ width: boardWidth }}
          >
            <Chessboard
              options={{
                position: step === 'correct' ? editFen : fen,
                boardOrientation: orientation,
                allowDragging: step === 'correct',
                darkSquareStyle: { backgroundColor: '#5D8A66' },
                lightSquareStyle: { backgroundColor: '#EEEED2' },
                boardStyle: { width: boardWidth, maxWidth: '100%' },
                onPieceDrop: ({ sourceSquare, targetSquare }) => {
                  if (step !== 'correct' || !targetSquare || targetSquare === sourceSquare) return false
                  const piece = squares[sourceSquare] ?? null
                  return onPieceDrop(sourceSquare, targetSquare, piece)
                },
                onSquareClick: ({ square }) => {
                  if (step === 'correct' && editTool) onSquareClick(square)
                },
                arrows,
              }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        {step === 'correct'
          ? 'Deine Änderungen werden sofort in die FEN übernommen.'
          : 'Tippe auf einen Kandidaten, um seinen Zug auf dem Brett zu sehen.'}
      </p>
    </div>
  )
}
