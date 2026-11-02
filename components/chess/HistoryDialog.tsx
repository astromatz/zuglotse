'use client'

import { History, Grid2X2, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { HistoryItem } from '@/hooks/useHistory'

interface HistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  history: HistoryItem[]
  onSelect: (item: HistoryItem) => void
}

export function HistoryDialog({
  open,
  onOpenChange,
  history,
  onSelect,
}: HistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="zuglotse-sheet">
        <DialogHeader className="text-left space-y-3">
          <span className="zl-icon">
            <History className="size-6" />
          </span>
          <DialogTitle className="text-2xl font-display">Deine letzten Analysen</DialogTitle>
          <DialogDescription>
            Die letzten 10 Stellungen dieses Browsers. Tippe auf eine Analyse, um sie wieder auf
            dem Brett zu öffnen.
          </DialogDescription>
        </DialogHeader>

        {history.length === 0 ? (
          <div className="py-10 text-center">
            <Grid2X2 className="size-8 text-primary mx-auto mb-4" />
            <p className="font-medium">Deine Geschichte beginnt mit einem Zug.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Deine erste Analyse wird hier gespeichert.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item, i) => (
              <button
                key={`${item.date}-${i}`}
                className="w-full rounded-2xl bg-muted/60 hover:bg-muted p-4 text-left flex items-center gap-3 transition-colors"
                onClick={() => onSelect(item)}
              >
                <span className="size-9 rounded-xl bg-background text-primary flex items-center justify-center shrink-0 text-sm font-semibold">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium block">
                    {item.fen.split(' ')[1] === 'b' ? 'Schwarz' : 'Weiß'} am Zug
                  </span>
                  <span className="text-xs text-muted-foreground block mt-1">
                    {item.date && !Number.isNaN(Date.parse(item.date))
                      ? new Date(item.date).toLocaleString('de-DE', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: 'Europe/Berlin',
                        })
                      : 'Gespeicherte Stellung'}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground truncate block mt-1">
                    {item.fen}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
