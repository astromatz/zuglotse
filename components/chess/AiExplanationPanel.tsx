'use client'

import { Sparkles, Loader2, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PROVIDER_LABEL, SKILL_LEVEL_LABEL, type AiSettings, type SkillLevel } from '@/lib/ai-providers'
import type { AiTextState } from '@/hooks/useAiExplanation'

interface AiExplanationPanelProps {
  aiSettings: AiSettings
  aiText: AiTextState
  onRetry: () => void
  onOpenSettings: () => void
  onSkillLevelChange?: (level: SkillLevel) => void
}

export function AiExplanationPanel({
  aiSettings,
  aiText,
  onRetry,
  onOpenSettings,
  onSkillLevelChange,
}: AiExplanationPanelProps) {
  const aiActive = aiSettings.mode === 'key' && aiSettings.apiKey.trim().length > 0
  if (!aiActive || aiText.status === 'idle') return null

  const currentLevel = aiSettings.skillLevel ?? 'beginner'

  return (
    <section className="zl-panel p-5 sm:p-6" aria-live="polite">
      <div className="flex gap-2 items-center mb-1">
        <Sparkles className="size-5 text-primary" />
        <h2 className="font-display font-bold text-lg">KI-Erklärung</h2>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-muted-foreground">
          {PROVIDER_LABEL[aiSettings.provider]} · auf Basis der Stockfish-Analyse
        </p>

        {onSkillLevelChange && (
          <div
            className="inline-flex rounded-xl bg-muted p-1 text-xs"
            role="group"
            aria-label="Erklärungsstil"
          >
            {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => {
              const active = currentLevel === lvl
              return (
                <button
                  key={lvl}
                  type="button"
                  disabled={aiText.status === 'loading'}
                  aria-pressed={active}
                  onClick={() => onSkillLevelChange(lvl)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    active
                      ? 'bg-card text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  } disabled:opacity-50`}
                >
                  {SKILL_LEVEL_LABEL[lvl]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {aiText.status === 'loading' && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-primary" />
          Die Erklärung wird geschrieben …
        </p>
      )}

      {aiText.status === 'error' && (
        <div className="rounded-xl bg-destructive/10 p-4 text-sm space-y-3">
          <p className="flex gap-2">
            <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
            {aiText.error}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="min-h-11 rounded-xl" onClick={onRetry}>
              Erneut versuchen
            </Button>
            <Button variant="ghost" className="min-h-11 rounded-xl" onClick={onOpenSettings}>
              Einstellungen
            </Button>
          </div>
        </div>
      )}

      {aiText.status === 'done' && (
        <div className="space-y-3">
          {aiText.lines.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      )}

      {aiText.status === 'done' && (
        <div className="bg-muted/70 rounded-xl p-3 mt-5 flex gap-2 items-start text-xs text-muted-foreground leading-relaxed">
          <Info className="size-4 shrink-0" />
          <p>
            KI-Texte können Fehler enthalten. Maßgeblich sind die Züge und Bewertungen von
            Stockfish.
          </p>
        </div>
      )}
    </section>
  )
}
