'use client'

import { MessageSquare, Info } from 'lucide-react'

interface CommentaryPanelProps {
  commentary: string[]
}

export function CommentaryPanel({ commentary }: CommentaryPanelProps) {
  if (commentary.length === 0) return null

  return (
    <section className="zl-panel p-5 sm:p-6" aria-label="Stellungskommentar">
      <div className="flex gap-2 items-center mb-1">
        <MessageSquare className="size-5 text-primary" />
        <h2 className="font-display font-bold text-lg">Was die Stellung verrät</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        Regelbasiert · Erklärung zum besten Zug
      </p>

      <div className="space-y-3">
        {commentary.map((line, i) => (
          <p
            key={i}
            className={`text-sm leading-relaxed ${
              i === 0 ? 'font-medium' : 'text-muted-foreground'
            }`}
          >
            {line}
          </p>
        ))}
      </div>

      <div className="bg-muted/70 rounded-xl p-3 mt-5 flex gap-2 items-start text-xs text-muted-foreground leading-relaxed">
        <Info className="size-4 shrink-0" />
        <p>
          Automatisch aus Stockfish-Daten und Schachregeln erstellt. Bewertungen sind keine
          Garantie für den Partieausgang.
        </p>
      </div>
    </section>
  )
}
