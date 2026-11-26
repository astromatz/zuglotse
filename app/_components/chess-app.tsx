'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
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
  RefreshCw,
  Settings2,
  ShieldCheck,
  Square as StopIcon,
  Wrench,
  Play,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { Chess } from 'chess.js'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { validateFen, plausibleEnPassantSquares, sanitizeEnPassant, type PromotionPiece } from '@/lib/chess-utils'
import { germanSan, principalVariation } from '@/lib/local-commentary'
import { AI_KEY_STORAGE, PROVIDER_LABEL, imageToDataUrl, recognizeBoard, type AiSettings } from '@/lib/ai-providers'
import { repairPosition, rowsToSquares } from '@/lib/position-repair'
import { ClientOnly } from '@/components/client-only'
import { ModeSheet } from './mode-sheet'
import { PiecePalette } from './piece-palette'

import { useChessBoard } from '@/hooks/useChessBoard'
import { useStockfish } from '@/hooks/useStockfish'
import { useAiExplanation } from '@/hooks/useAiExplanation'
import { useHistory, type HistoryItem } from '@/hooks/useHistory'

import { BoardPanel, type AnalyzeState, type BoardPreview, type GameStatus, type MainAction } from '@/components/chess/BoardPanel'
import { CandidateList } from '@/components/chess/CandidateList'
import { VariationPanel } from '@/components/chess/VariationPanel'
import { OpeningTutorPanel } from '@/components/chess/OpeningTutorPanel'
import { AiExplanationPanel } from '@/components/chess/AiExplanationPanel'
import { CommentaryPanel } from '@/components/chess/CommentaryPanel'
import { FenDialog } from '@/components/chess/FenDialog'
import { HistoryDialog } from '@/components/chess/HistoryDialog'

const PREFERENCES_KEY = 'zuglotse_preferences_v1'
type Step = 'start' | 'work'

export default function ChessApp() {
  const [step, setStep] = useState<Step>('start')
  // Stellung (FEN), für die zuletzt eine Analyse gestartet wurde. Weicht das Brett davon ab, ist die Analyse veraltet.
  const [analysisFen, setAnalysisFen] = useState<string | null>(null)
  const [depth, setDepth] = useState(18)
  const [boardWidth, setBoardWidth] = useState(350)
  const [boardSize, setBoardSize] = useState<'large' | 'compact'>('large')
  const [previewPly, setPreviewPly] = useState<number | null>(null)
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

  // Die Analyse gilt nur, solange das Brett genau die analysierte Stellung zeigt.
  const fresh = analysisFen !== null && analysisFen === board.editFen
  const analyzeState: AnalyzeState =
    analysisFen === null
      ? 'idle'
      : !fresh
      ? 'stale'
      : stockfish.analysisProgress < 100
      ? 'running'
      : 'done'

  // Wird die Stellung verändert, während Stockfish noch rechnet, wird die laufende Analyse abgebrochen.
  useEffect(() => {
    if (analysisFen !== null && analysisFen !== board.editFen && stockfish.analysisProgress < 100) {
      stockfish.terminate()
      stockfish.reset()
      setAnalysisFen(null)
    }
  }, [board.editFen, analysisFen])

  useEffect(() => {
    const container = boardContainerRef.current
    if (!container) return
    const update = () => setBoardWidth(Math.min(container.clientWidth, 500))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    return () => observer.disconnect()
  }, [step])

  // Vorschau (Stellung nach einem Zug der Hauptvariante) zurücksetzen, wenn sich Schritt,
  // Stellung oder ausgewählter Kandidat ändern.
  useEffect(() => {
    setPreviewPly(null)
  }, [step, fresh, board.fen, stockfish.selectedCandidate])

  useEffect(() => {
    board.setSelectedSquare(null)
    board.cancelPromotion()
  }, [step])

  const preview = useMemo<BoardPreview | null>(() => {
    if (!fresh || previewPly === null) return null
    const pv = stockfish.candidates[stockfish.selectedCandidate]?.pv ?? []
    try {
      const chess = new Chess(board.fen)
      let last: { from: string; to: string } | null = null
      let played = 0
      for (let i = 0; i <= previewPly && i < pv.length; i++) {
        last = chess.move({ from: pv[i].slice(0, 2), to: pv[i].slice(2, 4), promotion: pv[i][4] })
        played = i
      }
      if (!last) return null
      const label = principalVariation(board.fen, pv)[played] ?? ''
      return { fen: chess.fen(), from: last.from, to: last.to, label: `nach ${label}` }
    } catch {
      return null
    }
  }, [fresh, previewPly, board.fen, stockfish.candidates, stockfish.selectedCandidate])

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

  /** Öffnet den Arbeitsbildschirm mit frischem Stand (keine alte Analyse). */
  const openWorkspace = () => {
    stockfish.terminate()
    stockfish.reset()
    ai.reset()
    setAnalysisFen(null)
    setStep('work')
  }

  const goToStart = () => {
    stockfish.terminate()
    stockfish.reset()
    setAnalysisFen(null)
    setStep('start')
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
      board.clearHistory()
      board.setMode('setup')
      openWorkspace()
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
      board.setMode('setup')
      toast.error(val.errors?.[0] ?? 'Ungültige Stellung')
      return
    }
    board.setValidationErrors([])
    stockfish.terminate()
    setAnalysisFen(currentFen)
    // Nach dem Start der Analyse geht es ans Spielen: Kandidaten ansehen, Zug ausführen, weiterziehen.
    board.setMode('play')
    ai.reset()
    window.scrollTo({ top: 0 })

    stockfish.startAnalysis(currentFen, (finalFen, finalCandidates, bestMove) => {
      hist.saveHistory(finalFen, { candidates: finalCandidates, fen: finalFen, bestMove })
      ai.requestAiExplanation(aiSettings, finalFen, finalCandidates)
    })
  }

  const cancelAnalysis = () => {
    stockfish.terminate()
    stockfish.reset()
    setAnalysisFen(null)
    toast('Analyse abgebrochen')
  }

  /** Spielt den Zug eines Kandidaten auf dem Brett; die Analyse gilt danach als veraltet. */
  const playCandidate = (index: number) => {
    const move = stockfish.candidates[index]?.move ?? ''
    if (move.length < 4) return
    const promotion = move.length > 4 ? (move[4] as PromotionPiece) : undefined
    board.playMove(move.slice(0, 2), move.slice(2, 4), promotion)
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
    downloadText(board.editFen, 'stellung.fen')
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
      openWorkspace()
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

  // Partiezustand der Brettstellung (für „Wer ist am Zug?“ und die Hauptschaltfläche)
  const gameStatus = useMemo<GameStatus>(() => {
    if (board.issues.length) return 'normal'
    try {
      const chess = new Chess(board.editFen)
      if (chess.isCheckmate()) return 'checkmate'
      if (chess.isStalemate()) return 'stalemate'
      if (chess.isCheck()) return 'check'
    } catch {}
    return 'normal'
  }, [board.editFen, board.issues])

  // Die eine Hauptaktion – sie richtet sich nach dem Zustand.
  const mainAction: MainAction = (() => {
    const issue = board.issues[0]
    if (issue) {
      const fix = issue.fix
      const toolActive = fix.kind === 'tool' && board.mode === 'setup' && board.editTool === fix.tool
      return toolActive
        ? { label: 'Jetzt aufs markierte Feld tippen', icon: <Wrench className="size-5" />, onClick: () => {}, disabled: true }
        : { label: fix.label, icon: <Wrench className="size-5" />, onClick: () => board.applyFix(fix) }
    }
    if (analyzeState === 'running') {
      return {
        label: `Abbrechen · ${Math.round(stockfish.analysisProgress)} %`,
        icon: <StopIcon className="size-4" />,
        onClick: cancelAnalysis,
        variant: 'secondary',
      }
    }
    if (analyzeState === 'done') {
      const cand = stockfish.candidates[stockfish.selectedCandidate]
      if (cand && (cand.move?.length ?? 0) >= 4) {
        const san = germanSan(cand.san || cand.move)
        return {
          label: stockfish.selectedCandidate === 0 ? `Besten Zug spielen: ${san}` : `Zug spielen: ${san}`,
          icon: <Play className="size-5" />,
          onClick: () => playCandidate(stockfish.selectedCandidate),
        }
      }
    }
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate') {
      return {
        label: 'Partie beendet',
        icon: <CheckCircle2 className="size-5" />,
        onClick: () => {},
        disabled: true,
      }
    }
    return {
      label: analyzeState === 'stale' ? 'Neu analysieren' : 'Analysieren',
      icon: analyzeState === 'stale' ? <RefreshCw className="size-5" /> : <BarChart3 className="size-5" />,
      onClick: startAnalysis,
    }
  })()

  const castlingPossible = {
    K: board.squares.e1 === 'wK' && board.squares.h1 === 'wR',
    Q: board.squares.e1 === 'wK' && board.squares.a1 === 'wR',
    k: board.squares.e8 === 'bK' && board.squares.h8 === 'bR',
    q: board.squares.e8 === 'bK' && board.squares.a8 === 'bR',
  }
  const epOptions = plausibleEnPassantSquares(board.squares, board.turn)
  const epValue = sanitizeEnPassant(board.squares, board.turn, board.enPassant)

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
        <header className="md:sticky md:top-0 z-40 bg-background/85 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 md:h-[76px] flex items-center justify-between gap-3">
            <button
              className="flex items-center gap-2.5 rounded-xl text-left min-h-11"
              aria-label="Zuglotse – Startseite"
              onClick={goToStart}
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
                      openWorkspace()
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
                      openWorkspace()
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
              <div className="flex items-center justify-between gap-4 py-2 md:py-8">
                <Button variant="ghost" className="rounded-xl min-h-11 -ml-3" onClick={goToStart}>
                  <ArrowLeft className="size-4 mr-2" />
                  Zurück
                </Button>
                <p className="text-xs text-muted-foreground">Arbeitsbrett</p>
              </div>

              <div className="max-md:sr-only md:mb-9">
                <p className="zl-eyebrow text-primary mb-2">Dein Arbeitsbrett</p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                  Aufbauen, analysieren, weiterspielen.
                </h1>
                <p className="text-muted-foreground text-sm mt-3">
                  Verändere die Stellung jederzeit – die Analyse gilt immer für das, was du auf dem
                  Brett siehst.
                </p>
              </div>

              <div className="md:grid md:grid-cols-[1.12fr_1fr] gap-6 lg:gap-9 md:items-start">
                <BoardPanel
                  analysisActive={fresh}
                  mode={board.mode}
                  issues={board.issues}
                  mainAction={mainAction}
                  gameStatus={gameStatus}
                  canUndo={board.canUndo}
                  showSizeToggle={fresh}
                  onUndo={board.undo}
                  editFen={board.editFen}
                  fen={board.fen}
                  orientation={board.orientation}
                  boardWidth={boardWidth}
                  boardContainerRef={boardContainerRef}
                  turn={board.turn}
                  editTool={board.mode === 'setup' ? board.editTool : null}
                  candidates={stockfish.candidates}
                  selectedCandidate={stockfish.selectedCandidate}
                  analysisProgress={stockfish.analysisProgress}
                  boardSize={boardSize}
                  preview={preview}
                  selectedSquare={board.selectedSquare}
                  moveTargets={board.moveTargets}
                  promotion={
                    board.pendingPromotion
                      ? {
                          color: board.pendingPromotion.color,
                          onPick: board.completePromotion,
                          onCancel: board.cancelPromotion,
                        }
                      : null
                  }
                  onOrientationToggle={() =>
                    board.setOrientation((o) => (o === 'white' ? 'black' : 'white'))
                  }
                  onBoardSizeToggle={() =>
                    setBoardSize((size) => (size === 'large' ? 'compact' : 'large'))
                  }
                  onPreviewClear={() => setPreviewPly(null)}
                  onModeChange={board.setMode}
                  onTurnChange={board.changeTurn}
                  onPieceDrop={board.handleDrop}
                  onSquareClick={board.handleSquareTap}
                />

                <div className="space-y-4 min-w-0 max-md:mt-4">
                {board.mode === 'setup' ? (
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

                    <section className="zl-panel p-5 sm:p-6 space-y-4">
                      <details className="group">
                        <summary className="list-none cursor-pointer min-h-11 flex items-center justify-between text-sm font-semibold">
                          <span>
                            Details
                            <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                              Rochade, En passant, FEN, Suchtiefe – wird automatisch passend gesetzt
                            </span>
                          </span>
                          <ChevronDown className="size-4 group-open:rotate-180 transition-transform shrink-0" />
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
                                  className={`flex items-center gap-2 min-h-11 text-sm ${
                                    castlingPossible[key] ? '' : 'text-muted-foreground'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="size-4 accent-primary"
                                    disabled={!castlingPossible[key]}
                                    checked={castlingPossible[key] && board.castling[key]}
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
                              Ausgegraut: König oder Turm stehen nicht auf ihrem Ausgangsfeld. Ob sie
                              schon gezogen haben, kann das Brett nicht wissen – das kannst du hier
                              abwählen.
                            </p>
                          </fieldset>

                          <label className="block text-sm font-medium">
                            En passant
                            {epOptions.length ? (
                              <select
                                className="zl-input mt-2 font-mono"
                                value={epValue === '-' ? '' : epValue}
                                onChange={(e) => board.setEnPassant(e.target.value)}
                              >
                                <option value="">kein En-passant-Schlag</option>
                                {epOptions.map((sq) => (
                                  <option key={sq} value={sq}>
                                    {sq}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="block text-xs font-normal text-muted-foreground mt-1">
                                In dieser Stellung ist kein En-passant-Schlag möglich. Nach einem
                                Bauern-Doppelschritt im Modus „Spielen“ wird das Feld automatisch
                                gesetzt.
                              </span>
                            )}
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

                      {errors}

                      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-4">
                        Fertig aufgebaut? Unter dem Brett auf „Analysieren“ tippen oder zu
                        „Spielen“ wechseln, um regelgerecht weiterzuziehen.
                        {aiActive
                          ? ` Stockfish rechnet auf deinem Gerät, die Erklärung kommt von ${PROVIDER_LABEL[aiSettings.provider]}.`
                          : ' Stockfish rechnet auf deinem Gerät, ohne KI und ohne API.'}
                      </p>
                    </section>
                  </div>
                ) : analysisFen === null ? (
                  <div className="zl-panel p-6 space-y-3">
                    <h2 className="font-display text-xl font-bold tracking-tight">Noch keine Analyse</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Ziehe abwechselnd für beide Seiten oder tippe unter dem Brett auf
                      „Analysieren“, damit Stockfish die besten Züge sucht.
                    </p>
                  </div>
                ) : !fresh ? (
                  <div className="zl-panel p-6 space-y-3" role="status">
                    <h2 className="font-display text-xl font-bold tracking-tight">
                      Die Stellung hat sich geändert
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Die bisherige Analyse passt nicht mehr zum Brett und ist ausgeblendet. Tippe
                      unter dem Brett auf „Neu analysieren“ – oder geh mit „Zurücknehmen“ zur
                      analysierten Stellung zurück.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5 min-w-0">
                    {(
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

                    <CandidateList
                      fen={board.fen}
                      candidates={stockfish.candidates}
                      selectedCandidate={stockfish.selectedCandidate}
                      analysisProgress={stockfish.analysisProgress}
                      onSelect={(i) => stockfish.setSelectedCandidate(i)}
                      onPlay={playCandidate}
                    />

                    <VariationPanel
                      fen={board.fen}
                      activeCandidate={stockfish.candidates[stockfish.selectedCandidate]}
                      selectedCandidateIndex={stockfish.selectedCandidate}
                      previewPly={previewPly}
                      onPreview={setPreviewPly}
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

                    {stockfish.analysisProgress >= 100 && (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" className="min-h-11 rounded-xl" onClick={exportFen}>
                          <Download className="size-4 mr-2" />
                          FEN exportieren
                        </Button>
                        <Button variant="secondary" className="min-h-11 rounded-xl" onClick={exportPgn}>
                          <Download className="size-4 mr-2" />
                          PGN exportieren
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                </div>
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
              openWorkspace()
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
