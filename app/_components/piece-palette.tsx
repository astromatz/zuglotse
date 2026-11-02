'use client'

import { Eraser, Grid2X2, Trash2, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'

const pieces = ['K', 'Q', 'R', 'B', 'N', 'P']
const glyphs: Record<string, string> = { wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙', bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟' }
const names: Record<string, string> = { K: 'König', Q: 'Dame', R: 'Turm', B: 'Läufer', N: 'Springer', P: 'Bauer' }

export function PiecePalette({ tool, onTool, onClear, onStart }: {
  tool: string | null
  onTool: (tool: string | null) => void
  onClear: () => void
  onStart: () => void
}) {
  return <section className="zl-panel p-5 sm:p-6" aria-label="Figurenauswahl">
    <h3 className="font-semibold text-lg tracking-tight">Deine Figuren</h3>
    <p className="text-sm text-muted-foreground mt-1 mb-5">Figur wählen, dann auf ein Feld tippen.</p>
    {(['w', 'b'] as const).map(color => <div key={color} className="mb-4">
      <p className="zl-eyebrow mb-2">{color === 'w' ? 'Weiß' : 'Schwarz'}</p>
      <div className="grid grid-cols-6 gap-1.5">
        {pieces.map(type => {
          const id = color + type
          const label = `${color === 'w' ? 'Weißer' : 'Schwarzer'} ${names[type]}`
          return <button type="button" key={id} title={label} aria-label={label} aria-pressed={tool === id}
            onClick={() => onTool(tool === id ? null : id)}
            className={`zl-piece ${tool === id ? 'bg-primary/10 ring-2 ring-primary text-primary' : 'bg-muted/70 text-foreground hover:bg-muted'}`}>
            <span className="chess-glyph" aria-hidden="true">{glyphs[id]}</span>
          </button>
        })}
      </div>
    </div>)}
    <div className="grid grid-cols-2 gap-2 mt-2 mb-5">
      <Button variant={tool === null ? 'secondary' : 'ghost'} aria-pressed={tool === null} className="min-h-11 rounded-xl" onClick={() => onTool(null)}><Move className="size-4 mr-2" /> Verschieben</Button>
      <Button variant={tool === 'delete' ? 'secondary' : 'ghost'} aria-pressed={tool === 'delete'} className="min-h-11 rounded-xl" onClick={() => onTool(tool === 'delete' ? null : 'delete')}><Eraser className="size-4 mr-2" /> Figur entfernen</Button>
    </div>
    <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-5">
      <Button variant="secondary" className="min-h-12 rounded-xl gap-2 px-2 max-[360px]:flex-col max-[360px]:py-3" onClick={onClear}><Trash2 className="size-4 shrink-0" /> Feld leeren</Button>
      <Button variant="secondary" className="min-h-12 rounded-xl gap-2 px-2 max-[360px]:flex-col max-[360px]:py-3" onClick={onStart}><Grid2X2 className="size-4 shrink-0" /> Startaufstellung</Button>
    </div>
    <p className="text-xs text-muted-foreground leading-relaxed mt-4" aria-live="polite">{tool === 'delete' ? 'Tippe auf eine Figur, um sie zu entfernen.' : tool ? 'Tippe auf das gewünschte Zielfeld. Erneutes Antippen der Figur beendet das Werkzeug.' : 'Ziehe Figuren auf andere Felder. Vom Brett ziehen entfernt eine Figur.'}</p>
  </section>
}
