'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Camera,
  CameraOff,
  Check,
  KeyRound,
  ChevronDown,
  Code2,
  Compass,
  Cpu,
  Download,
  Grid2X2,
  History,
  Loader2,
  PenTool,
  Settings2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { Chess } from 'chess.js'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { validateFen } from '@/lib/chess-utils'
import { AI_KEY_STORAGE, PROVIDER_LABEL, imageToDataUrl, recognizeBoard, type AiSettings } from '@/lib/ai-providers'
import { repairPosition, rowsToSquares } from '@/lib/position-repair'
import { ClientOnly } from '@/components/client-only'
import { ModeSheet } from './mode-sheet'
import { PiecePalette } from './piece-palette'

import { useChessBoard } from '@/hooks/useChessBoard'
import { useStockfish } from '@/hooks/useStockfish'
import { useAiExplanation } from '@/hooks/useAiExplanation'
import { useHistory, type HistoryItem } from '@/hooks/useHistory'

import { BoardPanel } from '@/components/chess/BoardPanel'
import { CandidateList } from '@/components/chess/CandidateList'
import { VariationPanel } from '@/components/chess/VariationPanel'
import { OpeningTutorPanel } from '@/components/chess/OpeningTutorPanel'
import { AiExplanationPanel } from '@/components/chess/AiExplanationPanel'
import { CommentaryPanel } from '@/components/chess/CommentaryPanel'
import { FenDialog } from '@/components/chess/FenDialog'
import { HistoryDialog } from '@/components/chess/HistoryDialog'

const PREFERENCES_KEY = 'zuglotse_preferences_v1'
type Step = 'start' | 'correct' | 'analyze'

export default function ChessApp() {
  const [step, setStep] = useState<Step>('start')
  const [depth, setDepth] = useState(18)
  const [boardWidth, setBoardWidth] = useState(350)
  const [onboarding, setOnboarding] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [fenOpen, setFenOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [aiSettings, setAiSettings] = useState<AiSettings>({
    mode: 'none',
    provider: 'gemini',
    apiKey: '',
    model: '',
    skillLevel: 'beginner',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const boardContainerRef = useRef<HTMLDivElement>(null)

  const board = useChessBoard()
  const stockfish = useStockfish(depth)
  const ai = useAiExplanation()
  const hist = useHistory()

  const aiActive = aiSettings.mode === 'key' && aiSettings.apiKey.trim().length > 0

  useEffect(() => {
    const container = boardContainerRef.current
    if (!container) return
    const update = () => setBoardWidth(Math.min(container.clientWidth, 500))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    return () => observer.disconnect()
  }, [step])

  useEffect(() => {
    try {
      hist.loadHistory()
      const prefs = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? 'null')
      const key = JSON.parse(localStorage.getItem(AI_KEY_STORAGE) ?? 'null')
      const provider = key?.provider === 'openai' ? 'openai' : 'gemini'
      const apiKey = typeof key?.apiKey === 'string' ? key.apiKey : ''
      const skillLevel = ['beginner', 'intermediate', 'advanced'].includes(prefs?.skillLevel)
        ? prefs.skillLevel
        : 'beginner'
      setAiSettings({
        mode: prefs?.mode === 'key' && apiKey ? 'key' : 'none',
        provider,
        apiKey,
        model: typeof key?.model === 'string' ? key.model : '',
        skillLevel,
      })
      if (prefs?.mode !== 'none' && prefs?.mode !== 'key') setOnboarding(true)
      if ([10, 14, 18, 22, 26].includes(prefs?.depth)) setDepth(prefs.depth)
    } catch (error) {
      console.error('Lokale Einstellungen konnten nicht geladen werden:', error)
      setOnboarding(true)
    }
    return () => stockfish.terminate()
  }, [])

  const saveSettings = (next: AiSettings) => {
    setAiSettings(next)
    if (next.mode === 'none') ai.reset()
    try {
      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({ mode: next.mode, depth, skillLevel: next.skillLevel ?? 'beginner' })
      )
      if (next.apiKey.trim())
        localStorage.setItem(
          AI_KEY_STORAGE,
          JSON.stringify({ provider: next.provider, apiKey: next.apiKey.trim(), model: next.model })
        )
      else localStorage.removeItem(AI_KEY_STORAGE)
    } catch (error) {
      console.error('Einstellungen konnten nicht gespeichert werden:', error)
      toast.error(
        'Dein Browser erlaubt das Speichern der Einstellungen nicht. Du kannst trotzdem fortfahren.'
      )
    }
    setOnboarding(false)
    setSettingsOpen(false)
    if (next.mode === 'key') toast.success(`KI aktiv: ${PROVIDER_LABEL[next.provider]}`)
  }

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return
    if (!aiActive) {
      setSettingsOpen(true)
      return
    }
    setRecognizing(true)
    try {
      const image = await imageToDataUrl(file)
      const recognition = await recognizeBoard(aiSettings, image)
      const raw = rowsToSquares(recognition.ranks)
      if (!raw)
        throw new Error(
          'Die erkannte Stellung war unvollständig. Bitte versuche ein schärferes Foto oder baue die Stellung manuell auf.'
        )
      const repaired = repairPosition(raw)
      const nextTurn = repaired.suggestedTurn ?? recognition.turn ?? 'w'
      board.setSquares(repaired.squares)
      board.setTurn(nextTurn)
      board.setCastling({ K: true, Q: true, k: true, q: true })
      board.setEnPassant('')
      board.setEditTool(null)
      board.setValidationErrors([])
      board.setOrientation('white')
      board.setPhotoNotes({
        confidence: repaired.remainingIssues.length ? 'low' : recognition.confidence,
        corrections: repaired.corrections,
        issues: repaired.remainingIssues,
      })
      setStep('correct')
      toast.success('Stellung erkannt – bitte kurz prüfen')
    } catch (error) {
      console.error('Foto-Erkennung fehlgeschlagen:', error)
      toast.error(error instanceof Error ? error.message : 'Die Foto-Erkennung ist fehlgeschlagen.')
    } finally {
      setRecognizing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const startAnalysis = async () => {
    const currentFen = board.buildFenFromSquares()
    board.setFen(currentFen)
    const val = validateFen(currentFen)
    if (!val.valid) {
      board.setValidationErrors(val.errors)
      toast.error(val.errors?.[0] ?? 'Ungültige Stellung')
      return
    }
    board.setValidationErrors([])
    setStep('analyze')
    ai.reset()

    stockfish.startAnalysis(currentFen, (finalFen, finalCandidates, bestMove) => {
      hist.saveHistory(finalFen, { candidates: finalCandidates, fen: finalFen, bestMove })
      ai.requestAiExplanation(aiSettings, finalFen, finalCandidates)
    })
  }

  const downloadText = (content: string, name: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const exportFen = () => {
    downloadText(step === 'correct' ? board.editFen : board.fen, 'stellung.fen')
    toast.success('FEN exportiert')
  }

  const exportPgn = () => {
    const best = stockfish.candidates[0]
    const chess = new Chess(board.fen)
    chess.header('Event', 'Analyse', 'Site', 'Zuglotse')
    for (const uci of best?.pv ?? []) {
      try {
        chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      } catch {
        break
      }
    }
    downloadText(chess.pgn(), 'analyse.pgn')
    toast.success('PGN exportiert')
  }

  const loadFromHistory = (item: HistoryItem) => {
    stockfish.terminate()
    board.setFenInput(item.fen)
    if (board.handleFenImport(item.fen)) {
      setStep('correct')
    }
    setShowHistory(false)
  }

  const errors = board.validationErrors.length > 0 && (
    <div role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm text-foreground space-y-2">
      {board.validationErrors.map((error, i) => (
        <p key={i} className="flex items-start gap-2">
          <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
          {error}
        </p>
      ))}
    </div>
  )

  return (
    <ClientOnly
      fallback={
        <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-background">
          <Compass className="size-10 text-primary" />
          <p className="text-lg font-semibold">Zuglotse</p>
          <p className="text-sm text-muted-foreground">Dein Brett wird vorbereitet …</p>
        </div>
      }
    >
      <div className="zuglotse-app min-h-screen bg-muted/35 text-foreground flex flex-col">
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 h-[76px] flex items-center justify-between gap-3">
            <button
              className="flex items-center gap-2.5 rounded-xl text-left min-h-11"
              aria-label="Zuglotse – Startseite"
              onClick={() => {
                stockfish.terminate()
                setStep('start')
              }}
            >
              <span className="size-10 flex items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-sm">
                <Compass className="size-6" />
              </span>
              <span className="font-display font-bold text-xl tracking-tight">
                Zuglotse<span className="text-primary">.</span>
              </span>
            </button>
            <nav aria-label="App-Menü" className="flex items-center gap-1 sm:gap-2">
              <button
                className="hidden sm:flex text-xs font-medium bg-primary/[0.07] text-primary rounded-full px-3 py-2 mr-2 items-center gap-1.5"
                onClick={() => setSettingsOpen(true)}
              >
                <span className="size-1.5 bg-primary rounded-full" />
                {aiActive ? `KI: ${PROVIDER_LABEL[aiSettings.provider]}` : 'Ohne KI'}
              </button>
              <Button
                variant="ghost"
                className="size-11 rounded-full p-0"
                title="Verlauf"
                aria-label="Verlauf öffnen"
                onClick={() => setShowHistory(true)}
              >
                <History className="size-5" />
              </Button>
              <Button
                variant="ghost"
                className="size-11 rounded-full p-0"
                title="Einstellungen"
                aria-label="Einstellungen öffnen"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="size-5" />
              </Button>
            </nav>
          </div>
        </header>

        <main className="w-full max-w-6xl mx-auto px-4 sm:px-8 flex-1 pb-12">
          {step === 'start' ? (
            <div className="pb-4">
              <section className="hero-gradient text-center pt-12 sm:pt-20 pb-10 sm:pb-14">
                <p className="zl-eyebrow text-primary mb-5">Dein persönlicher Schachkompass</p>
                <h1 className="font-display text-[2.6rem] sm:text-6xl font-bold tracking-[-0.045em] leading-[1.08]">
                  Dein nächster Zug.
                  <br />
                  <span className="text-primary">Klar vor Augen.</span>
                </h1>
                <p className="text-muted-foreground mt-6 max-w-md mx-auto leading-relaxed text-base sm:text-lg">
                  Jede Stellung hat Möglichkeiten. Entdecke deine besten Züge – und verstehe, was
                  sie stark macht.
                </p>
                <div className="flex justify-center flex-wrap gap-4 sm:gap-6 text-xs text-muted-foreground mt-7">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="size-4 text-primary" />
                    Stockfish an Bord
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-primary" />
                    Ohne Registrierung
                  </span>
                </div>
              </section>

              <section
                aria-label="Neue Analyse"
                className="grid md:grid-cols-[1.18fr_1fr] gap-4 max-w-4xl mx-auto"
              >
                <div className="zl-panel p-6 sm:p-8 flex flex-col items-start">
                  <span className="zl-icon mb-5">
                    <Grid2X2 className="size-6" />
                  </span>
                  <p className="zl-eyebrow mb-2">Ein Brett. Deine Ideen.</p>
                  <h2 className="font-display text-2xl font-bold tracking-tight">
                    Stellung aufbauen
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3 mb-7">
                    Platziere deine Figuren ganz einfach per Fingertipp. Oder starte mit dem
                    kompletten Schachspiel.
                  </p>
                  <Button
                    className="zl-primary w-full mt-auto"
                    size="lg"
                    onClick={() => {
                      board.handleManualSetup(false)
                      setStep('correct')
                    }}
                  >
                    <PenTool className="size-4 mr-2" />
                    Brett öffnen
                    <ArrowRight className="size-4 ml-auto" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full rounded-xl min-h-11 mt-2 text-primary"
                    onClick={() => {
                      board.handleManualSetup(true)
                      setStep('correct')
                    }}
                  >
                    Mit Startaufstellung beginnen
                  </Button>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    className="zl-panel p-6 sm:p-7 text-left group hover:shadow-md transition-shadow flex-1"
                    onClick={() => {
                      board.setValidationErrors([])
                      setFenOpen(true)
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <span className="zl-icon">
                        <Code2 className="size-6" />
                      </span>
                      <ArrowUpRight className="size-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <h2 className="text-xl font-display font-bold tracking-tight mt-5">
                      FEN einfügen
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                      Du hast schon eine Stellung? Übernimm sie direkt als FEN-Zeichenkette.
                    </p>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-label="Foto einer Schachstellung wählen"
                    onChange={(e) => handlePhoto(e.target.files?.[0])}
                  />

                  {aiActive ? (
                    <button
                      className="zl-panel p-6 sm:p-7 text-left group hover:shadow-md transition-shadow flex-1 disabled:opacity-70"
                      disabled={recognizing}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex justify-between items-start">
                        <span className="zl-icon">
                          {recognizing ? (
                            <Loader2 className="size-6 animate-spin" />
                          ) : (
                            <Camera className="size-6" />
                          )}
                        </span>
                        <ArrowUpRight className="size-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <h2 className="text-xl font-display font-bold tracking-tight mt-5">
                        {recognizing ? 'Stellung wird erkannt …' : 'Foto analysieren'}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                        {recognizing
                          ? `${PROVIDER_LABEL[aiSettings.provider]} liest das Brett. Das dauert meist wenige Sekunden.`
                          : 'Fotografiere das Brett oder wähle einen Screenshot. Du prüfst die Stellung danach auf dem Brett.'}
                      </p>
                    </button>
                  ) : (
                    <div className="rounded-3xl p-6 bg-muted/65 flex items-start gap-4">
                      <CameraOff className="size-5 mt-1 text-muted-foreground shrink-0" />
                      <div>
                        <h2 className="font-semibold text-sm">Foto-Erkennung</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                          Verfügbar mit eigenem Gemini- oder OpenAI-Schlüssel.
                        </p>
                        <Button
                          variant="ghost"
                          className="min-h-11 rounded-xl -ml-3 mt-1 text-primary"
                          onClick={() => setSettingsOpen(true)}
                        >
                          <KeyRound className="size-4 mr-2" />
                          Schlüssel hinterlegen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <p className="text-center text-xs text-muted-foreground mt-8 leading-relaxed">
                Stellung aufbauen <span className="mx-2 text-primary">→</span> Züge analysieren{' '}
                <span className="mx-2 text-primary">→</span> Besser verstehen
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 py-6 sm:py-8">
                <Button
                  variant="ghost"
                  className="rounded-xl min-h-11 -ml-3"
                  onClick={() => {
                    stockfish.terminate()
                    setStep(step === 'analyze' ? 'correct' : 'start')
                  }}
                >
                  <ArrowLeft className="size-4 mr-2" />
                  {step === 'analyze' ? 'Zum Brett' : 'Zurück'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  <span className={step === 'correct' ? 'text-primary font-semibold' : ''}>
                    01 Stellung
                  </span>
                  <span className="mx-2 sm:mx-4">/</span>
                  <span className={step === 'analyze' ? 'text-primary font-semibold' : ''}>
                    02 Analyse
                  </span>
                </p>
              </div>

              <div className="mb-7 sm:mb-9">
                <p className="zl-eyebrow text-primary mb-2">
                  {step === 'correct' ? 'Du gibst die Richtung vor' : 'Dein Zugkompass'}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                  {step === 'correct'
                    ? 'Bring deine Stellung aufs Brett.'
                    : 'Die besten Wege nach vorn.'}
                </h1>
                <p className="text-muted-foreground text-sm mt-3">
                  {step === 'correct'
                    ? 'Setze die Figuren, wähle das Zugrecht und starte die Analyse.'
                    : 'Drei Kandidaten. Klare Bewertungen. Nachvollziehbare Varianten.'}
                </p>
              </div>

              <div className="grid lg:grid-cols-[1.12fr_1fr] gap-6 lg:gap-9 items-start">
                <div className="space-y-4 lg:sticky lg:top-24 min-w-0">
                  <BoardPanel
                    step={step}
                    editFen={board.editFen}
                    fen={board.fen}
                    orientation={board.orientation}
                    boardWidth={boardWidth}
                    boardContainerRef={boardContainerRef}
                    turn={board.turn}
                    editTool={board.editTool}
                    candidates={stockfish.candidates}
                    selectedCandidate={stockfish.selectedCandidate}
                    analysisProgress={stockfish.analysisProgress}
                    squares={board.squares}
                    onOrientationToggle={() =>
                      board.setOrientation((o) => (o === 'white' ? 'black' : 'white'))
                    }
                    onPieceDrop={(sourceSquare, targetSquare, piece) => {
                      board.setSquares((prev) => {
                        const next = { ...prev, [sourceSquare]: null }
                        if (targetSquare) next[targetSquare] = piece
                        return next
                      })
                      board.setValidationErrors([])
                      return true
                    }}
                    onSquareClick={(square) => {
                      board.setSquare(
                        square,
                        board.editTool === 'delete' ? null : board.editTool
                      )
                    }}
                  />

                  {step === 'analyze' && (
                    <div className="zl-panel p-5">
                      <div
                        className="flex items-center justify-between gap-3 text-sm mb-3"
                        role="status"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          {stockfish.analysisProgress < 100 ? (
                            <Loader2 className="size-4 animate-spin text-primary" />
                          ) : (
                            <CheckCircle2 className="size-4 text-primary" />
                          )}
                          {stockfish.analysisProgress < 100
                            ? 'Stockfish analysiert …'
                            : 'Analyse abgeschlossen'}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {Math.round(stockfish.analysisProgress)} %
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label="Analysefortschritt"
                        aria-valuenow={Math.round(stockfish.analysisProgress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-1.5 rounded-full bg-muted overflow-hidden"
                      >
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${stockfish.analysisProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Stockfish · Suchtiefe {depth} · Berechnung auf deinem Gerät
                      </p>
                    </div>
                  )}

                  {step === 'analyze' && stockfish.analysisProgress >= 100 && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" className="min-h-11 rounded-xl" onClick={exportFen}>
                        <Download className="size-4 mr-2" />
                        FEN exportieren
                      </Button>
                      <Button variant="secondary" className="min-h-11 rounded-xl" onClick={exportPgn}>
                        <Download className="size-4 mr-2" />
                        PGN exportieren
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-11 rounded-xl"
                        onClick={() => setStep('correct')}
                      >
                        <PenTool className="size-4 mr-2" />
                        Bearbeiten
                      </Button>
                    </div>
                  )}
                </div>

                {step === 'correct' ? (
                  <div className="space-y-4 min-w-0">
                    {board.photoNotes && (
                      <section
                        className="zl-panel p-5 sm:p-6"
                        aria-label="Ergebnis der Foto-Erkennung"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Camera className="size-5 text-primary" />
                          <h2 className="font-semibold text-sm">Vom Foto erkannt</h2>
                          <span className="ml-auto text-xs text-muted-foreground">
                            Sicherheit:{' '}
                            {board.photoNotes.confidence === 'high'
                              ? 'hoch'
                              : board.photoNotes.confidence === 'medium'
                              ? 'mittel'
                              : 'niedrig'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Vergleiche das Brett mit deinem Foto und korrigiere einzelne Felder mit
                          der Figurenpalette.
                        </p>
                        {board.photoNotes.corrections.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-xs font-semibold">Automatisch korrigiert</p>
                            {board.photoNotes.corrections.map((c, i) => (
                              <p key={i} className="text-xs text-muted-foreground flex gap-2">
                                <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                                {c}
                              </p>
                            ))}
                          </div>
                        )}
                        {board.photoNotes.issues.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-xs font-semibold">Bitte prüfen</p>
                            {board.photoNotes.issues.map((c, i) => (
                              <p key={i} className="text-xs text-muted-foreground flex gap-2">
                                <AlertTriangle className="size-3.5 text-destructive shrink-0 mt-0.5" />
                                {c}
                              </p>
                            ))}
                          </div>
                        )}
                      </section>
                    )}

                    <PiecePalette
                      tool={board.editTool}
                      onTool={board.setEditTool}
                      onClear={() => board.resetBoard(false)}
                      onStart={() => board.resetBoard(true)}
                    />

                    <section className="zl-panel p-5 sm:p-6 space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="font-semibold text-sm">Wer ist am Zug?</h2>
                        <div className="flex bg-muted p-1 rounded-xl" role="group" aria-label="Am Zug">
                          {(['w', 'b'] as const).map((color) => (
                            <button
                              key={color}
                              className={`min-h-10 px-4 rounded-lg text-sm font-medium transition-shadow ${
                                board.turn === color
                                  ? 'bg-card shadow-sm text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                              aria-pressed={board.turn === color}
                              onClick={() => board.setTurn(color)}
                            >
                              {color === 'w' ? 'Weiß' : 'Schwarz'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <details className="group border-t border-border/60 pt-4">
                        <summary className="list-none cursor-pointer min-h-11 flex items-center justify-between text-sm font-medium">
                          Weitere Stellungsdetails
                          <ChevronDown className="size-4 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="pt-4 space-y-5">
                          <fieldset>
                            <legend className="text-sm font-medium mb-3">Rochaderechte</legend>
                            <div className="grid grid-cols-2 gap-2">
                              {(
                                [
                                  ['K', 'Weiß 0–0'],
                                  ['Q', 'Weiß 0–0–0'],
                                  ['k', 'Schwarz 0–0'],
                                  ['q', 'Schwarz 0–0–0'],
                                ] as const
                              ).map(([key, label]) => (
                                <label
                                  key={key}
                                  className="flex items-center gap-2 min-h-11 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    className="size-4 accent-primary"
                                    checked={board.castling[key]}
                                    onChange={() =>
                                      board.setCastling((previous) => ({
                                        ...previous,
                                        [key]: !previous[key],
                                      }))
                                    }
                                  />
                                  {label}
                                </label>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                              Unmögliche Rochaderechte werden automatisch entfernt. Bereits
                              gezogene Könige oder Türme musst du selbst berücksichtigen.
                            </p>
                          </fieldset>

                          <label className="block text-sm font-medium">
                            En-passant-Feld
                            <input
                              className="zl-input mt-2 font-mono"
                              value={board.enPassant}
                              onChange={(e) => board.setEnPassant(e.target.value)}
                              placeholder="– (zum Beispiel e3)"
                              maxLength={2}
                              autoCapitalize="none"
                              spellCheck={false}
                            />
                          </label>

                          <label className="block text-sm font-medium">
                            Aktuelle FEN
                            <textarea
                              className="zl-input mt-2 font-mono text-xs resize-none"
                              rows={3}
                              value={board.editFen}
                              readOnly
                            />
                          </label>

                          <Button
                            variant="secondary"
                            className="min-h-11 rounded-xl"
                            onClick={exportFen}
                          >
                            <Download className="size-4 mr-2" />
                            FEN exportieren
                          </Button>
                        </div>
                      </details>

                      <label className="flex items-center justify-between text-sm font-medium gap-4">
                        Suchtiefe
                        <select
                          value={depth}
                          onChange={(e) => setDepth(Number(e.target.value))}
                          className="zl-input w-auto"
                        >
                          {[10, 14, 18, 22, 26].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>

                      {errors}

                      <Button className="zl-primary w-full" size="lg" onClick={startAnalysis}>
                        <BarChart3 className="size-5 mr-2" />
                        Stellung analysieren
                        <ArrowRight className="size-4 ml-auto" />
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        {aiActive
                          ? `Stockfish auf deinem Gerät · Erklärung von ${PROVIDER_LABEL[aiSettings.provider]}`
                          : 'Ohne KI · Keine API nötig'}
                      </p>
                    </section>
                  </div>
                ) : (
                  <div className="space-y-5 min-w-0">
                    <CandidateList
                      fen={board.fen}
                      candidates={stockfish.candidates}
                      selectedCandidate={stockfish.selectedCandidate}
                      analysisProgress={stockfish.analysisProgress}
                      onSelect={(i) => stockfish.setSelectedCandidate(i)}
                    />

                    <VariationPanel
                      fen={board.fen}
                      activeCandidate={stockfish.candidates[stockfish.selectedCandidate]}
                      selectedCandidateIndex={stockfish.selectedCandidate}
                    />

                    <OpeningTutorPanel fen={board.fen} />

                    <AiExplanationPanel
                      aiSettings={aiSettings}
                      aiText={ai.aiText}
                      onRetry={() =>
                        ai.requestAiExplanation(aiSettings, board.fen, stockfish.candidates)
                      }
                      onOpenSettings={() => setSettingsOpen(true)}
                      onSkillLevelChange={(level) => {
                        const updated = { ...aiSettings, skillLevel: level }
                        saveSettings(updated)
                        ai.requestAiExplanation(updated, board.fen, stockfish.candidates)
                      }}
                    />

                    <CommentaryPanel commentary={stockfish.commentary} />
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        <footer className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Zuglotse</span> · Dein nächster Zug
            zählt.
          </p>
          <p>
            Stockfish (GPL-Lizenz) ·{' '}
            {aiActive
              ? `KI: ${PROVIDER_LABEL[aiSettings.provider]} (eigener Schlüssel)`
              : 'Ohne KI'}
          </p>
        </footer>

        <ModeSheet
          open={onboarding || settingsOpen}
          onboarding={onboarding}
          settings={aiSettings}
          depth={depth}
          onDepthChange={setDepth}
          onOpenChange={setSettingsOpen}
          onConfirm={saveSettings}
        />

        <FenDialog
          open={fenOpen}
          onOpenChange={setFenOpen}
          fenInput={board.fenInput}
          onFenInputChange={(val) => {
            board.setFenInput(val)
            board.setValidationErrors([])
          }}
          validationErrors={board.validationErrors}
          onSubmit={() => {
            if (board.handleFenImport()) {
              setFenOpen(false)
              setStep('correct')
            }
          }}
        />

        <HistoryDialog
          open={showHistory}
          onOpenChange={setShowHistory}
          history={hist.history}
          onSelect={loadFromHistory}
        />
      </div>
    </ClientOnly>
  )
}
