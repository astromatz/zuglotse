import { Info } from 'lucide-react'
import { germanSan, formatEvaluation, evaluationPercent, evaluationLabel } from '@/lib/local-commentary'
import type { StockfishCandidate } from '@/lib/stockfish-worker'

interface CandidateListProps {
  fen: string
  candidates: StockfishCandidate[]
  selectedCandidate: number
  analysisProgress: number
  onSelect: (index: number) => void
}

export function CandidateList({ fen, candidates, selectedCandidate, analysisProgress, onSelect }: CandidateListProps) {
  return (
    <section aria-label="Kandidatenzüge">
      <h2 className="font-display text-lg font-bold tracking-tight mb-3">Deine besten Züge</h2>
      {candidates.length === 0 && (
        <div className="zl-panel p-4 text-sm text-muted-foreground">
          {analysisProgress < 100
            ? 'Die Kandidaten erscheinen, sobald Stockfish die Stellung bewertet hat.'
            : 'Für diese Stellung gibt es keine Kandidatenzüge.'}
        </div>
      )}
      <div className="space-y-2">
        {candidates.map((candidate, i) => (
          <button
            key={i}
            aria-pressed={selectedCandidate === i}
            onClick={() => onSelect(i)}
            className="zl-panel zl-candidate w-full text-left px-4 py-3 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`size-6 shrink-0 rounded-lg flex items-center justify-center text-xs font-semibold ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                <span className="font-mono text-lg font-bold">{germanSan(candidate.san || candidate.move)}</span>
                {i === 0 && <span className="text-xs text-primary font-medium">Beste Wahl</span>}
              </div>
              <span className="font-mono text-base font-semibold shrink-0">{formatEvaluation(fen, candidate)}</span>
            </div>
            <div className="h-1 rounded-full bg-gray-800 overflow-hidden ring-1 ring-black/10">
              <div className="bg-white h-full transition-all" style={{ width: `${evaluationPercent(fen, candidate)}%` }} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground mt-2">
              <span>{evaluationLabel(fen, candidate)}</span>
              <span>Tiefe {candidate.depth}</span>
            </div>
          </button>
        ))}
      </div>
      {candidates.length > 0 && <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
        <Info className="size-3 shrink-0 mt-0.5" />
        Bewertung aus Sicht von Weiß: + Weiß, − Schwarz.
      </p>}
    </section>
  )
}
