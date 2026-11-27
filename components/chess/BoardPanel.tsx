import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, Maximize2, Minimize2, PenTool, Play, RotateCcw, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EvalBar } from './EvalBar'
import { evaluationPercent } from '@/lib/local-commentary'
import type { StockfishCandidate } from '@/lib/stockfish-worker'
import type { MoveTarget, PromotionPiece } from '@/lib/chess-utils'
import type { BoardMode } from '@/hooks/useChessBoard'
import type { PositionIssue } from '@/lib/position-issues'

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

// Stellungsfehler: rötlicher Rahmen und leichte Tönung auf den betroffenen Feldern
const ISSUE_STYLE = {
  boxShadow: 'inset 0 0 0 3px rgba(220, 38, 38, 0.9)',
  backgroundColor: 'rgba(220, 38, 38, 0.28)',
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

/** idle: noch nie analysiert · stale: Stellung seit der Analyse verändert · running/done: Analyse der aktuellen Stellung */
export type AnalyzeState = 'idle' | 'stale' | 'running' | 'done' | 'error'

/** Die eine wichtigste Aktion – abhängig vom Zustand (korrigieren, analysieren, abbrechen, Zug spielen). */
export interface MainAction {
  /** Art der Aktion; wechselt sie, ist die Schaltfläche kurz gesperrt (kein versehentlicher Tipp). */
  kind: 'fix' | 'analyze' | 'cancel' | 'play' | 'over'
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'secondary'
  disabled?: boolean
}

/** Partiezustand für die Anzeige „Wer ist am Zug?“ im Spielen-Modus. */
export type GameStatus = 'normal' | 'check' | 'checkmate' | 'stalemate'

interface BoardPanelProps {
  /** Analyse gehört zur Stellung auf dem Brett: Pfeile, Bewertung und Kandidaten gelten. */
  analysisActive: boolean
  mode: BoardMode
  issues: PositionIssue[]
  mainAction: MainAction
  gameStatus: GameStatus
  canUndo: boolean
  showSizeToggle: boolean
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
  boardSize: 'large' | 'compact'
  preview: BoardPreview | null
  selectedSquare: string | null
  moveTargets: MoveTarget[]
  promotion: { color: 'w' | 'b'; onPick: (piece: PromotionPiece) => void; onCancel: () => void } | null
  onOrientationToggle: () => void
  onBoardSizeToggle: () => void
  onPreviewClear: () => void
  onModeChange: (mode: BoardMode) => void
  onTurnChange: (turn: 'w' | 'b') => void
  onUndo: () => void
  /** target = null: Figur wurde neben das Brett gezogen */
  onPieceDrop: (source: string, target: string | null) => boolean
  onSquareClick: (square: string) => void
}

export function BoardPanel({
  analysisActive,
  mode,
  issues,
  mainAction,
  gameStatus,
  canUndo,
  showSizeToggle,
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
  boardSize,
  preview,
  selectedSquare,
  moveTargets,
  promotion,
  onOrientationToggle,
  onBoardSizeToggle,
  onPreviewClear,
  onModeChange,
  onTurnChange,
  onUndo,
  onPieceDrop,
  onSquareClick,
}: BoardPanelProps) {
  // Bearbeiten ist immer möglich – nur nicht, solange eine Vorschau-Variante gezeigt wird.
  const editable = !preview
  const dockRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dock = dockRef.current
    const wrap = boardContainerRef.current
    if (!dock || !wrap) return
    let frame = 0
    const update = () => {
      // Include wrapping labels, position errors and promotion controls in the height budget.
      const overhead = dock.getBoundingClientRect().height - wrap.getBoundingClientRect().height
      dock.style.setProperty('--zl-board-overhead', `${Math.ceil(overhead + 64)}px`)
    }
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    })
    observer.observe(dock)
    observer.observe(wrap)
    update()
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [boardContainerRef])
  const bestCandidate = candidates[0]
  const evalPercent = analysisActive && bestCandidate ? evaluationPercent(fen, bestCandidate) : 50

  // Pfeile und Feldmarkierungen: Vorschau-Zug oder alle Kandidaten (ausgewählter kräftig, oben)
  const arrows: { startSquare: string; endSquare: string; color: string }[] = []
  const squareStyles: Record<string, React.CSSProperties> = {}

  if (analysisActive) {
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

  if (!preview) {
    for (const issue of issues) for (const sq of issue.squares) squareStyles[sq] = ISSUE_STYLE
  }

  if (editable && !editTool && selectedSquare) {
    squareStyles[selectedSquare] = TO_STYLE
    for (const target of moveTargets) {
      squareStyles[target.square] = target.capture ? TARGET_CAPTURE_STYLE : TARGET_DOT_STYLE
    }
  }

  const position = preview ? preview.fen : editFen

  // Wechselt die Hauptaktion (z. B. „Abbrechen“ → „Zug spielen“, weil die Analyse gerade fertig wurde),
  // nimmt die Schaltfläche für einen Moment keine Tipps an – sonst löst ein Tipp die falsche Aktion aus.
  const [guard, setGuard] = useState(false)
  const lastKind = useRef(mainAction.kind)
  useEffect(() => {
    if (lastKind.current === mainAction.kind) return
    lastKind.current = mainAction.kind
    setGuard(true)
    const t = setTimeout(() => setGuard(false), 600)
    return () => clearTimeout(t)
  }, [mainAction.kind])

  return (
    <div ref={dockRef} className="zl-panel zl-board-dock p-3 sm:p-4" data-mode={mode}>
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
      <div className="zl-board-strip flex items-center justify-between gap-2 mb-2 md:mb-4">
        {preview ? (
          <span className="text-sm font-semibold truncate px-1">Vorschau · {preview.label}</span>
        ) : (
          <div
            role="radiogroup"
            aria-label="Modus"
            className="flex bg-muted p-1 rounded-xl min-w-0"
          >
            {(
              [
                ['setup', 'Aufbauen', <PenTool key="i" className="size-4 shrink-0" />],
                ['play', 'Spielen', <Play key="i" className="size-4 shrink-0" />],
              ] as const
            ).map(([key, label, icon]) => (
              <button
                key={key}
                role="radio"
                aria-checked={mode === key}
                className={`min-h-10 px-1.5 sm:px-3 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                  mode === key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => onModeChange(key)}
              >
                <span className="max-[360px]:hidden">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
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
          {showSizeToggle && (
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
          {!preview && (
            <Button
              variant="ghost"
              className="size-11 rounded-xl p-0"
              aria-label="Letzte Änderung zurücknehmen"
              title="Zurücknehmen"
              disabled={!canUndo}
              onClick={onUndo}
            >
              <Undo2 className="size-4" />
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
        {/* Bewertungsbalken ist immer da (neutral ohne gültige Analyse), damit das Brett nicht springt */}
        <EvalBar percent={evalPercent} isAnalyzing={!analysisActive || analysisProgress < 100} />

        <div
          ref={boardContainerRef}
          data-size={showSizeToggle ? boardSize : 'large'}
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
                allowDragging: editable,
                darkSquareStyle: { backgroundColor: '#5D8A66' },
                lightSquareStyle: { backgroundColor: '#EEEED2' },
                boardStyle: { width: boardWidth, maxWidth: '100%' },
                onPieceDrop: ({ sourceSquare, targetSquare }) => {
                  if (!editable || targetSquare === sourceSquare) return false
                  return onPieceDrop(sourceSquare, targetSquare ?? null)
                },
                onSquareClick: ({ square }) => {
                  if (editable) onSquareClick(square)
                },
                arrows,
                squareStyles,
              }}
            />
          </div>
        </div>
      </div>

      {!preview && issues.length > 0 && (
        <p
          role="alert"
          className="mt-2 md:mt-3 flex items-start gap-2 text-sm font-medium text-red-700 dark:text-red-400 px-1"
        >
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <span>
            {issues[0].message}
            {issues.length > 1 && (
              <span className="text-muted-foreground font-normal">
                {' '}· noch {issues.length - 1} Hinweis{issues.length > 2 ? 'e' : ''}
              </span>
            )}
          </span>
        </p>
      )}

      <div className="zl-turn-actions mt-2 md:mt-3 flex items-stretch gap-2">
        <TurnControl mode={mode} turn={turn} gameStatus={issues.length ? 'normal' : gameStatus} onTurnChange={onTurnChange} />
        <Button
          className="zl-primary flex-1 min-w-0 h-auto whitespace-normal leading-tight px-3 py-2"
          variant={mainAction.variant ?? 'default'}
          disabled={mainAction.disabled}
          aria-disabled={guard || undefined}
          onClick={() => {
            if (!guard) mainAction.onClick()
          }}
        >
          {mainAction.icon}
          <span className="min-w-0">{mainAction.label}</span>
        </Button>
      </div>

    </div>
  )
}

const SIDE = { w: 'Weiß', b: 'Schwarz' } as const

/** „Wer ist am Zug?“ – groß und eindeutig. Im Aufbau umschaltbar, beim Spielen nur Anzeige. */
function TurnControl({
  mode,
  turn,
  gameStatus,
  onTurnChange,
}: {
  mode: BoardMode
  turn: 'w' | 'b'
  gameStatus: GameStatus
  onTurnChange: (turn: 'w' | 'b') => void
}) {
  const dot = (c: 'w' | 'b') => (
    <span
      aria-hidden="true"
      className={`size-4 rounded-full ring-1 ring-foreground/40 shrink-0 ${c === 'w' ? 'bg-white' : 'bg-gray-900'}`}
    />
  )
  if (mode === 'setup') {
    return (
      <div className="shrink-0 flex flex-col justify-center">
        <span className="zl-eyebrow text-muted-foreground mb-1 px-1" id="turn-label">
          Am Zug
        </span>
        <div role="radiogroup" aria-labelledby="turn-label" className="flex bg-muted p-1 rounded-xl">
          {(['w', 'b'] as const).map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={turn === c}
              className={`min-h-10 px-2 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors ${
                turn === c ? 'bg-card shadow-sm text-foreground ring-2 ring-primary' : 'text-muted-foreground'
              }`}
              onClick={() => onTurnChange(c)}
            >
              {dot(c)}
              {SIDE[c]}
            </button>
          ))}
        </div>
      </div>
    )
  }
  const other = turn === 'w' ? 'b' : 'w'
  const title =
    gameStatus === 'checkmate' ? 'Schachmatt' : gameStatus === 'stalemate' ? 'Patt' : SIDE[turn]
  const caption =
    gameStatus === 'checkmate'
      ? `${SIDE[other]} gewinnt`
      : gameStatus === 'stalemate'
      ? 'Remis'
      : gameStatus === 'check'
      ? 'am Zug · Schach!'
      : 'ist am Zug'
  return (
    <div
      className="shrink-0 flex items-center gap-2.5 rounded-xl bg-muted px-3 min-h-[52px]"
      role="status"
      aria-label={`${title} ${caption}`}
    >
      {gameStatus === 'normal' || gameStatus === 'check' ? dot(turn) : null}
      <div className="leading-tight">
        <p className="text-base font-bold">{title}</p>
        <p className={`text-xs ${gameStatus === 'check' ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-muted-foreground'}`}>
          {caption}
        </p>
      </div>
    </div>
  )
}
