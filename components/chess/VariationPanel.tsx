'use client'

import { getMaterialBalance, isInCheck } from '@/lib/chess-utils'
import { principalVariation } from '@/lib/local-commentary'
import type { StockfishCandidate } from '@/lib/stockfish-worker'

interface VariationPanelProps {
  fen: string
  activeCandidate: StockfishCandidate | undefined
  selectedCandidateIndex: number
}

export function VariationPanel({
  fen,
  activeCandidate,
  selectedCandidateIndex,
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
      <p className="text-sm font-mono leading-loose break-words">
        {variation.join(' ') || 'Keine Hauptvariante vorhanden.'}
      </p>
      <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
        {materialText}
        {checkText}
      </p>
    </section>
  )
}
