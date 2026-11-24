import dynamic from 'next/dynamic'
import { BarChart3, Maximize2, Minimize2, RotateCcw, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EvalBar } from './EvalBar'
import { evaluationPercent } from '@/lib/local-commentary'
import type { StockfishCandidate } from '@/lib/stockfish-worker'
import type { Board } from '@/hooks/useChessBoard'
import type { MoveTarget, PromotionPiece } from '@/lib/chess-utils'

const Chessboard = dynamic(() => import('react-chessboard').then(m => m.Chessboard), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-square bg-muted rounded-xl animate-pulse flex items-center justify-center text-sm text-muted-foreground">
      Zuglotse lädt das Brett …
    </div>
  ),
})

// Pfeilfarben je Kandidat: kräftig = ausgewählt, blass = nicht ausgewählt
const ARROW_RGB = ['27, 94, 32', '245, 158, 11', '234, 88, 12'] // 1.: grün, 2.: gelb-orange, 3.: orange
const arrowColor = (index: number, active: boolean) =>
  `rgba(${ARROW_RGB[index] ?? ARROW_RGB[2]}, ${active ? 1 : 0.3})`

// Feldmarkierung (gelber Innenrahmen, damit das Schachbrettmuster sichtbar bleibt)
const FROM_STYLE = { boxShadow: 'inset 0 0 0 3px rgba(250, 204, 21, 0.55)' }
const TO_STYLE = { boxShadow: 'inset 0 0 0 3px rgba(250, 204, 21, 0.95)' }

// Zielfelder der angetippten Figur: hellgrauer Punkt, bei Schlagfeldern ein Ring
const TARGET_DOT_STYLE = {
  backgroundImage:
    'radial-gradient(circle closest-side, rgba(150, 150, 150, 0.75) 0, rgba(150, 150, 150, 0.75) 28%, transparent 30%)',
}
const TARGET_CAPTURE_STYLE = {
  backgroundImage:
    'radial-gradient(circle closest-side, transparent 0, transparent 70%, rgba(150, 150, 150, 0.75) 72%, rgba(150, 150, 150, 0.75) 90%, transparent 92%)',
}

const PROMOTION_GLYPHS: Record<'w' | 'b', Record<PromotionPiece, string>> = {
  w: { q: '♕', r: '♖', b: '♗', n: '♘' },
  b: { q: '♛', r: '♜', b: '♝', n: '♞' },
}
const PROMOTION_NAMES: Record<PromotionPiece, string> = {
  q: 'Dame',
  r: 'Turm',
  b: 'Läufer',
  n: 'Springer',
}

/** Vorschau: Stellung nach einem Zug der Hauptvariante. */
export interface BoardPreview {
  fen: string
  from: string
  to: string
  label: string
}

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
  boardSize: 'large' | 'compact'
  preview: BoardPreview | null
  selectedSquare: string | null
  moveTargets: MoveTarget[]
  promotion: { color: 'w' | 'b'; onPick: (piece: PromotionPiece) => void; onCancel: () => void } | null
  onOrientationToggle: () => void
  onBoardSizeToggle: () => void
  onPreviewClear: () => void
  onAnalyze: () => void
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
  boardSize,
  preview,
  selectedSquare,
  moveTargets,
  promotion,
  onOrientationToggle,
  onBoardSizeToggle,
  onPreviewClear,
  onAnalyze,
  onPieceDrop,
  onSquareClick,
}: BoardPanelProps) {
  const bestCandidate = candidates[0]
  const evalPercent = bestCandidate
    ? evaluationPercent(fen, bestCandidate)
    : 50

  // Pfeile und Feldmarkierungen: Vorschau-Zug oder alle Kandidaten (ausgewählter kräftig, oben)
  const arrows: { startSquare: string; endSquare: string; color: string }[] = []
  const squareStyles: Record<string, React.CSSProperties> = {}

  if (step === 'analyze') {
    if (preview) {
      arrows.push({ startSquare: preview.from, endSquare: preview.to, color: arrowColor(0, true) })
      squareStyles[preview.from] = FROM_STYLE
      squareStyles[preview.to] = TO_STYLE
    } else {
      const usable = candidates
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => (c.move?.length ?? 0) >= 4)
      // Der ausgewählte Kandidat wird zuletzt gezeichnet und liegt damit obenauf.
      const ordered = [
        ...usable.filter(({ i }) => i !== selectedCandidate),
        ...usable.filter(({ i }) => i === selectedCandidate),
      ]
      for (const { c, i } of ordered) {
        const active = i === selectedCandidate
        arrows.push({
          startSquare: c.move.slice(0, 2),
          endSquare: c.move.slice(2, 4),
          color: arrowColor(i, active),
        })
        if (active) {
          squareStyles[c.move.slice(0, 2)] = FROM_STYLE
          squareStyles[c.move.slice(2, 4)] = TO_STYLE
        }
      }
    }
  }

  if (step === 'correct' && !editTool && selectedSquare) {
    squareStyles[selectedSquare] = TO_STYLE
    for (const target of moveTargets) {
      squareStyles[target.square] = target.capture ? TARGET_CAPTURE_STYLE : TARGET_DOT_STYLE
    }
  }

  const position = step === 'correct' ? editFen : preview ? preview.fen : fen

  return (
    <div className="zl-panel zl-board-dock p-3 sm:p-5">
      {promotion ? (
        <div className="zl-board-strip flex items-center justify-between gap-2 mb-2 md:mb-4 px-1">
          <span className="text-sm font-semibold truncate">Umwandeln in</span>
          <div className="flex items-center gap-1 shrink-0">
            {(['q', 'r', 'b', 'n'] as const).map((piece) => (
              <Button
                key={piece}
                variant="secondary"
                className="size-11 rounded-xl p-0"
                aria-label={PROMOTION_NAMES[piece]}
                title={PROMOTION_NAMES[piece]}
                onClick={() => promotion.onPick(piece)}
              >
                <span className="chess-glyph" aria-hidden="true">
                  {PROMOTION_GLYPHS[promotion.color][piece]}
                </span>
              </Button>
            ))}
            <Button
              variant="ghost"
              className="size-11 rounded-xl p-0"
              aria-label="Umwandlung abbrechen"
              title="Abbrechen"
              onClick={promotion.onCancel}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
      <div className="zl-board-strip flex items-center justify-between gap-2 mb-2 md:mb-4 px-1">
        <span className="text-sm font-semibold flex items-center gap-2 min-w-0">
          {preview ? (
            <span className="truncate">Vorschau · {preview.label}</span>
          ) : (
            <>
              <span
                className={`size-3 rounded-full ring-1 ring-foreground/30 shrink-0 ${
                  turn === 'w' ? 'bg-white' : 'bg-gray-900'
                }`}
              />
              <span className="truncate">{turn === 'w' ? 'Weiß' : 'Schwarz'} am Zug</span>
            </>
          )}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {preview && (
            <Button
              variant="ghost"
              className="h-11 rounded-xl px-3"
              aria-label="Zurück zur Ausgangsstellung"
              onClick={onPreviewClear}
            >
              <Undo2 className="size-4" />
              Zurück
            </Button>
          )}
          {step === 'analyze' && (
            <Button
              variant="ghost"
              className="size-11 rounded-xl p-0 md:hidden"
              aria-label={boardSize === 'large' ? 'Brett verkleinern' : 'Brett vergrößern'}
              title={boardSize === 'large' ? 'Brett verkleinern' : 'Brett vergrößern'}
              onClick={onBoardSizeToggle}
            >
              {boardSize === 'large' ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </Button>
          )}
          {step === 'correct' && (
            <Button className="h-11 rounded-xl px-4" onClick={onAnalyze}>
              <BarChart3 className="size-4" />
              Analysieren
            </Button>
          )}
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
      </div>
      )}

      {/* Board + EvalBar row */}
      <div className="flex items-stretch justify-center gap-2">
        {/* Eval bar only in analyze step */}
        {step === 'analyze' && (
          <EvalBar percent={evalPercent} isAnalyzing={analysisProgress < 100} />
        )}

        <div
          ref={boardContainerRef}
          data-size={step === 'analyze' ? boardSize : 'large'}
          className="zl-board-wrap flex-1 flex justify-center min-w-0"
        >
          <div
            className="chess-board-shadow rounded-lg overflow-hidden max-w-full"
            style={{ width: boardWidth }}
          >
            <Chessboard
              options={{
                position,
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
                  if (step === 'correct') onSquareClick(square)
                },
                arrows,
                squareStyles,
              }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4 max-md:hidden">
        {step === 'correct'
          ? 'Figur antippen zeigt ihre Züge, Zielfeld antippen führt den Zug aus. Ziehen setzt Figuren frei um.'
          : 'Tippe auf einen Kandidaten oder einen Zug der Hauptvariante, um ihn auf dem Brett zu sehen.'}
      </p>
    </div>
  )
}
