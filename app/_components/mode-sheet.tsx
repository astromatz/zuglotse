'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, CheckCircle2, Copy, Cpu, ExternalLink, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DEFAULT_MODELS, KEY_URL, PROVIDER_LABEL, verifyKey, type AiProvider, type AiSettings } from '@/lib/ai-providers'

interface ModeSheetProps {
  open: boolean
  onboarding: boolean
  settings: AiSettings
  depth: number
  onDepthChange: (depth: number) => void
  onOpenChange: (open: boolean) => void
  onConfirm: (settings: AiSettings) => void
}

export function ModeSheet({ open, onboarding, settings, depth, onDepthChange, onOpenChange, onConfirm }: ModeSheetProps) {
  const [draft, setDraft] = useState<AiSettings>(settings)
  const [showKey, setShowKey] = useState(false)
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  const [linkHint, setLinkHint] = useState(false)

  useEffect(() => { if (open) { setDraft(settings); setStatus(null); setShowKey(false); setLinkHint(false) } }, [open, settings])

  // Google/OpenAI verbieten das Einbetten ihrer Seiten. In eingebetteten Vorschauen darf der Link daher
  // nie im aktuellen Rahmen landen: immer einen neuen Tab öffnen, sonst die Adresse anzeigen.
  const openKeyPage = (e: React.MouseEvent) => {
    e.preventDefault()
    let win: Window | null = null
    try { win = window.open(KEY_URL[draft.provider], '_blank') } catch (error) { console.error('Neuer Tab konnte nicht geöffnet werden:', error) }
    if (win) { try { win.opener = null } catch {} } else { setLinkHint(true); void copyKeyUrl() }
  }
  const copyKeyUrl = async () => {
    setLinkHint(true)
    try { await navigator.clipboard.writeText(KEY_URL[draft.provider]); toast.success('Adresse kopiert – füge sie in einem neuen Tab ein.') }
    catch (error) { console.error('Kopieren nicht möglich:', error) }
  }

  const update = (patch: Partial<AiSettings>) => { setDraft(d => ({ ...d, ...patch })); setStatus(null) }
  const keyMode = draft.mode === 'key'
  const hasKey = draft.apiKey.trim().length > 0

  const check = async (): Promise<AiSettings | null> => {
    setChecking(true); setStatus(null)
    try {
      const model = await verifyKey(draft.provider, draft.apiKey)
      const next = { ...draft, apiKey: draft.apiKey.trim(), model: draft.model.trim() || model }
      setDraft(next)
      setStatus({ ok: true, text: `Schlüssel funktioniert · Modell ${next.model}` })
      return next
    } catch (error) {
      setStatus({ ok: false, text: error instanceof Error ? error.message : 'Der Schlüssel konnte nicht geprüft werden.' })
      return null
    } finally { setChecking(false) }
  }

  const confirm = async () => {
    if (!keyMode) { onConfirm({ ...draft, mode: 'none' }); return }
    if (status?.ok) { onConfirm(draft); return }
    const verified = await check()
    if (verified) onConfirm(verified)
  }

  const option = (mode: AiSettings['mode'], icon: React.ReactNode, title: string, subtitle: string, text: string) => (
    <button type="button" role="radio" aria-checked={draft.mode === mode} onClick={() => update({ mode })}
      className={`w-full text-left rounded-2xl p-5 transition-shadow ${draft.mode === mode ? 'bg-primary/[0.06] ring-2 ring-primary' : 'bg-muted/65 hover:bg-muted'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">{icon}<h3 className="font-semibold">{title}</h3></div>
        {draft.mode === mode && <span className="flex items-center gap-1 text-xs font-semibold text-primary"><Check className="size-4" /> Gewählt</span>}
      </div>
      <p className="text-xs text-muted-foreground mt-1 ml-8">{subtitle}</p>
      <p className="text-sm leading-relaxed mt-3">{text}</p>
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={onboarding ? undefined : onOpenChange}>
      <DialogContent className="zuglotse-sheet" data-onboarding={onboarding ? '' : undefined}
        onInteractOutside={e => { if (onboarding) e.preventDefault() }}
        onEscapeKeyDown={e => { if (onboarding) e.preventDefault() }}>
        <DialogHeader className="text-left space-y-3">
          <span className="zl-icon"><Sparkles className="size-6" /></span>
          <p className="zl-eyebrow">{onboarding ? 'Willkommen bei Zuglotse' : 'Deine Einstellungen'}</p>
          <DialogTitle className="text-2xl sm:text-3xl font-display leading-tight">{onboarding ? 'Wie soll Zuglotse KI nutzen?' : 'Analyse, wie du sie brauchst.'}</DialogTitle>
          <DialogDescription className="leading-relaxed">Stockfish rechnet immer auf deinem Gerät. Mit eigenem Schlüssel kommen Foto-Erkennung und KI-Erklärungen dazu. Du kannst jederzeit wechseln.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 my-2" role="radiogroup" aria-label="KI-Modus">
          {option('none', <Cpu className="size-5 text-primary" />, 'Ohne KI', 'Stufe 1 · Kein Schlüssel nötig',
            'Stellung aufbauen oder FEN eingeben. Drei beste Züge, Hauptvarianten und deutsche Erklärungen aus den Stockfish-Daten.')}
          {option('key', <KeyRound className="size-5 text-primary" />, 'Mit eigenem API-Schlüssel', 'Stufe 2 · Google Gemini oder OpenAI',
            'Alles aus Stufe 1, dazu Stellung per Foto erkennen und ausführliche KI-Erklärungen zum besten Zug.')}
        </div>
        {keyMode && <div className="rounded-2xl bg-muted/50 p-4 sm:p-5 space-y-4">
          <div className="flex bg-muted p-1 rounded-xl" role="group" aria-label="Anbieter">
            {(['gemini', 'openai'] as AiProvider[]).map(p => <button key={p} type="button" aria-pressed={draft.provider === p}
              className={`flex-1 min-h-10 rounded-lg text-sm font-medium ${draft.provider === p ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              onClick={() => update({ provider: p, apiKey: p === settings.provider ? settings.apiKey : '', model: p === settings.provider ? settings.model : '' })}>{PROVIDER_LABEL[p]}</button>)}
          </div>
          <label className="block text-sm font-medium" htmlFor="zl-api-key">{PROVIDER_LABEL[draft.provider]}-Schlüssel</label>
          <div className="flex gap-2 -mt-2">
            <input id="zl-api-key" className="zl-input font-mono text-sm" type={showKey ? 'text' : 'password'} value={draft.apiKey} autoComplete="off" spellCheck={false} autoCapitalize="none"
              placeholder={draft.provider === 'gemini' ? 'AIza…' : 'sk-…'} onChange={e => update({ apiKey: e.target.value, model: '' })} />
            <Button type="button" variant="ghost" className="size-11 rounded-xl p-0 shrink-0" aria-label={showKey ? 'Schlüssel verbergen' : 'Schlüssel anzeigen'} onClick={() => setShowKey(v => !v)}>{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a href={KEY_URL[draft.provider]} target="_blank" rel="noopener noreferrer" onClick={openKeyPage} className="inline-flex items-center gap-1.5 text-xs text-primary font-medium min-h-8">Schlüssel bei {PROVIDER_LABEL[draft.provider]} erstellen<ExternalLink className="size-3" /></a>
            <button type="button" onClick={copyKeyUrl} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground min-h-8"><Copy className="size-3" />Adresse kopieren</button>
          </div>
          {linkHint && <p className="text-xs text-muted-foreground -mt-2">Öffne diese Adresse in einem neuen Browser-Tab: <span className="font-mono select-all text-foreground">{KEY_URL[draft.provider]}</span></p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="min-h-11 rounded-xl" disabled={!hasKey || checking} onClick={check}>{checking ? <Loader2 className="size-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}Schlüssel prüfen</Button>
            {hasKey && <Button type="button" variant="ghost" className="min-h-11 rounded-xl text-destructive" onClick={() => update({ apiKey: '', model: '' })}><Trash2 className="size-4 mr-2" />Schlüssel löschen</Button>}
          </div>
          {status && <p role="status" className={`text-sm ${status.ok ? 'text-primary' : 'text-destructive'}`}>{status.text}</p>}
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground min-h-8 flex items-center">Erweitert: Modell wählen</summary>
            <input className="zl-input font-mono text-sm mt-2" value={draft.model} placeholder={`automatisch (z. B. ${DEFAULT_MODELS[draft.provider]})`} spellCheck={false} autoCapitalize="none" onChange={e => update({ model: e.target.value })} />
          </details>
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Erklärungsstil</label>
              <span className="text-xs text-muted-foreground">Sprachniveau der KI</span>
            </div>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Erklärungsstil">
              {(
                [
                  ['beginner', 'Anfänger', 'Kurz & einfach'],
                  ['intermediate', 'Fortgeschritten', 'Mit Taktik'],
                  ['advanced', 'Experte', 'Tief & kompakt'],
                ] as const
              ).map(([lvl, label, sub]) => (
                <button
                  key={lvl}
                  type="button"
                  aria-pressed={(draft.skillLevel ?? 'beginner') === lvl}
                  onClick={() => update({ skillLevel: lvl })}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    (draft.skillLevel ?? 'beginner') === lvl
                      ? 'border-primary bg-primary/[0.08] text-foreground font-semibold ring-1 ring-primary'
                      : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="text-xs font-semibold">{label}</div>
                  <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{sub}</div>
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed flex gap-2"><ShieldCheck className="size-4 shrink-0 mt-0.5" /><span>Dein Schlüssel wird nur in diesem Browser gespeichert und bei jeder KI-Anfrage direkt an {PROVIDER_LABEL[draft.provider]} gesendet – nie an Zuglotse. Fotos und Stellungen gehen zur Auswertung ebenfalls an {PROVIDER_LABEL[draft.provider]}. Eventuelle Kosten rechnet der Anbieter über dein Konto ab.</span></p>
        </div>}
        {!onboarding && <label className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 p-4 text-sm font-medium">
          Suchtiefe
          <select className="zl-input w-auto" value={depth} onChange={e => onDepthChange(Number(e.target.value))}>
            {[10, 14, 18, 22, 26].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>}
        <Button size="lg" className="zl-primary w-full" disabled={checking || (keyMode && !hasKey)} onClick={confirm}>
          {checking && <Loader2 className="size-4 mr-2 animate-spin" />}
          {keyMode ? (onboarding ? 'Mit KI starten' : 'Speichern') : (onboarding ? 'Ohne KI starten' : 'Fertig')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
