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

export function CandidateList({
  fen,
  candidates,
  selectedCandidate,
  analysisProgress,
  onSelect,
}: CandidateListProps) {
  return (
    <section aria-label="Kandidatenzüge">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold tracking-tight">Deine besten Züge</h2>
        <span className="zl-eyebrow">Stockfish</span>
      </div>

      {candidates.length === 0 && (
        <div className="zl-panel p-6 text-sm text-muted-foreground">
          {analysisProgress < 100
            ? 'Die Kandidaten erscheinen, sobald Stockfish die Stellung bewertet hat.'
            : 'Für diese Stellung gibt es keine Kandidatenzüge.'}
        </div>
      )}

      <div className="space-y-3">
        {candidates.map((candidate, i) => (
          <button
            key={i}
            aria-pressed={selectedCandidate === i}
            onClick={() => onSelect(i)}
            className={`zl-panel w-full text-left p-5 transition-shadow ${
              selectedCandidate === i ? 'ring-2 ring-primary' : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <span
                  className={`size-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                    i === 0
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <span className="font-mono text-xl font-bold">
                    {germanSan(candidate.san || candidate.move)}
                  </span>
                  {i === 0 && (
                    <p className="text-[11px] text-primary font-medium">Beste Wahl</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-semibold">
                  {formatEvaluation(fen, candidate)}
                </p>
                <p className="text-[11px] text-muted-foreground">Tiefe {candidate.depth}</p>
              </div>
            </div>

            <div className="h-2 rounded-full bg-gray-800 overflow-hidden ring-1 ring-black/10">
              <div
                className="bg-white h-full transition-all"
                style={{ width: `${evaluationPercent(fen, candidate)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {evaluationLabel(fen, candidate)}
            </p>
          </button>
        ))}
      </div>

      {candidates.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <Info className="size-3 shrink-0" />
          Bewertung aus Sicht von Weiß: + Weiß, − Schwarz.
        </p>
      )}
    </section>
  )
}
