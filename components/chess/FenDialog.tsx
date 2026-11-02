'use client'

import { Code2, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface FenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fenInput: string
  onFenInputChange: (value: string) => void
  validationErrors: string[]
  onSubmit: () => void
}

export function FenDialog({
  open,
  onOpenChange,
  fenInput,
  onFenInputChange,
  validationErrors,
  onSubmit,
}: FenDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="zuglotse-sheet">
        <DialogHeader className="text-left space-y-3">
          <span className="zl-icon">
            <Code2 className="size-6" />
          </span>
          <DialogTitle className="text-2xl font-display">Eine Stellung übernehmen</DialogTitle>
          <DialogDescription>
            Füge die vollständige FEN-Zeichenkette ein. Anschließend kannst du die Stellung auf
            dem Brett prüfen.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="space-y-4"
        >
          <label className="text-sm font-medium block" htmlFor="fen-import">
            FEN-Stellung
          </label>
          <textarea
            id="fen-import"
            rows={4}
            className="zl-input font-mono text-sm resize-none"
            value={fenInput}
            onChange={(e) => onFenInputChange(e.target.value)}
            placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            spellCheck={false}
            autoCapitalize="none"
          />

          {validationErrors.length > 0 && (
            <div role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm text-foreground space-y-2">
              {validationErrors.map((error, i) => (
                <p key={i} className="flex items-start gap-2">
                  <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
                  {error}
                </p>
              ))}
            </div>
          )}

          <Button type="submit" className="zl-primary w-full">
            <Check className="size-4 mr-2" />
            Stellung übernehmen
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
