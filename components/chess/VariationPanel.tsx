'use client'

import { getMaterialBalance, isInCheck } from '@/lib/chess-utils'
import { principalVariation } from '@/lib/local-commentary'
import type { StockfishCandidate } from '@/lib/stockfish-worker'

interface VariationPanelProps {
  fen: string
  activeCandidate: StockfishCandidate | undefined
  selectedCandidateIndex: number
  /** Index des Zuges, dessen Folgestellung auf dem Brett gezeigt wird (null = Ausgangsstellung). */
  previewPly: number | null
  onPreview: (ply: number | null) => void
}

export function VariationPanel({
  fen,
  activeCandidate,
  selectedCandidateIndex,
  previewPly,
  onPreview,
}: VariationPanelProps) {
  if (!activeCandidate) return null

  const variation = principalVariation(fen, activeCandidate.pv)
  const balance = getMaterialBalance(fen).balance
  const materialText =
    balance === 0
      ? 'Material: ausgeglichen'
      : `Material: ${balance > 0 ? 'Weiß' : 'Schwarz'} +${Math.abs(balance)}`
  const checkText = isInCheck(fen) ? ' · Schach!' : ''

  return (
    <section className="zl-panel p-5 sm:p-6" aria-label="Hauptvariante">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-semibold text-sm">Hauptvariante</h2>
        <span className="text-xs text-muted-foreground">
          Kandidat {selectedCandidateIndex + 1}
        </span>
      </div>
      {variation.length === 0 ? (
        <p className="text-sm font-mono leading-loose break-words">Keine Hauptvariante vorhanden.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-1 gap-y-1 text-sm font-mono">
            {variation.map((move, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={previewPly === i}
                aria-label={`Stellung nach ${move} auf dem Brett zeigen`}
                onClick={() => onPreview(previewPly === i ? null : i)}
                className={`min-h-9 px-2 rounded-lg transition-colors ${
                  previewPly === i
                    ? 'bg-primary/10 ring-2 ring-primary text-primary font-semibold'
                    : 'hover:bg-muted'
                }`}
              >
                {move}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tippe auf einen Zug, um die Stellung danach auf dem Brett zu sehen.
          </p>
        </>
      )}
      <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
        {materialText}
        {checkText}
      </p>
    </section>
  )
}
