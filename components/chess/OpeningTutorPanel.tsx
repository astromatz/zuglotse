'use client'

import { useMemo, useState } from 'react'
import {
  BookOpen,
  Target,
  Zap,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
} from 'lucide-react'
import {
  analyzeOpeningPrinciples,
  type PrincipleEvaluation,
} from '@/lib/opening-principles'

interface OpeningTutorPanelProps {
  fen: string
}

export function OpeningTutorPanel({ fen }: OpeningTutorPanelProps) {
  const analysis = useMemo(() => {
    try {
      return analyzeOpeningPrinciples(fen)
    } catch {
      return null
    }
  }, [fen])

  const initialSide = fen.split(/\s+/)[1] === 'b' ? 'b' : 'w'
  const [selectedSide, setSelectedSide] = useState<'w' | 'b'>(initialSide)
  const [showTactics, setShowTactics] = useState(false)
  const [expandedPrinciple, setExpandedPrinciple] = useState<string | null>(null)

  if (!analysis) return null

  const report = selectedSide === 'w' ? analysis.whitePrinciples : analysis.blackPrinciples
  const opening = analysis.opening

  const togglePrinciple = (name: string) => {
    setExpandedPrinciple(prev => (prev === name ? null : name))
  }

  const getStatusColor = (status: PrincipleEvaluation['status']) => {
    switch (status) {
      case 'good':
        return 'text-primary bg-primary/[0.08] border-primary/20'
      case 'warning':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/[0.08] border-amber-500/20'
      case 'alert':
        return 'text-destructive bg-destructive/[0.08] border-destructive/20'
    }
  }

  return (
    <section className="zl-panel p-5 sm:p-6" aria-label="Eröffnungs-Tutor & Prinzipien">
      {/* Kopfzeile mit Perspektiven-Umschalter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          <h2 className="font-display font-bold text-lg">Eröffnungs-Tutor</h2>
        </div>

        {/* Umschalter Weiß / Schwarz */}
        <div
          className="inline-flex rounded-xl bg-muted p-1 text-xs"
          role="group"
          aria-label="Perspektive für Prinzipien-Prüfung"
        >
          <button
            type="button"
            aria-pressed={selectedSide === 'w'}
            onClick={() => setSelectedSide('w')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              selectedSide === 'w'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Weiß
          </button>
          <button
            type="button"
            aria-pressed={selectedSide === 'b'}
            onClick={() => setSelectedSide('b')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              selectedSide === 'b'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Schwarz
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-5">
        Theorie, Kernplan & didaktische Stimmigkeits-Prüfung
      </p>

      {/* 1. Erkannte Eröffnung oder Hinweis */}
      {opening ? (
        <div className="rounded-2xl bg-muted/50 p-4 sm:p-5 border border-border/60 mb-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-sm sm:text-base text-foreground">
              {opening.name}
            </h3>
            <span className="font-mono text-[11px] font-semibold bg-primary/[0.08] text-primary px-2.5 py-0.5 rounded-full">
              ECO {opening.eco}
            </span>
          </div>

          <p className="text-xs font-mono text-muted-foreground bg-background/60 rounded-lg px-2.5 py-1 inline-block">
            {opening.moves}
          </p>

          {/* Didaktischer Kernplan */}
          <div className="space-y-1 pt-1">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>🎯</span>
              <span>Strategischer Kernplan:</span>
            </p>
            <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {opening.plan}
            </p>
          </div>

          {/* Aufklappbare typische Taktiken / Motive */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTactics(!showTactics)}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{showTactics ? 'Taktikmotive verbergen' : 'Typische Taktik- & Planmotive anzeigen'}</span>
              {showTactics ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            {showTactics && (
              <ul className="mt-2.5 space-y-1.5 pl-4 list-disc text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-200">
                {opening.tactics.map((tac, i) => (
                  <li key={i}>{tac}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Prägnanter Merksatz */}
          <div className="bg-primary/[0.06] rounded-xl p-3 border border-primary/10 flex items-start gap-2.5 text-xs text-foreground">
            <Lightbulb className="size-4 shrink-0 text-primary mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold">Merksatz: </span>
              {opening.principleTip}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-muted/40 p-3.5 border border-border/40 mb-5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />
          <p className="leading-relaxed">
            Keine katalogisierte Standard-Eröffnung erkannt (freie Stellung oder Übergang ins Mittelspiel). Der Prinzipien-Check unten analysiert die Stimmigkeit der Position für {report.turnLabel}.
          </p>
        </div>
      )}

      {/* 2. Stimmigkeits-Ampel & Lotsen-Tipp */}
      <div className="space-y-4">
        {/* Score & Tipp Header */}
        <div className="rounded-2xl bg-muted/30 p-4 border border-border/50 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-medium text-muted-foreground block">
                Stimmigkeit ({report.turnLabel})
              </span>
              <span className="text-lg font-bold font-display text-foreground">
                {report.overallScore}% Übereinstimmung
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/[0.08] text-primary">
                {report.gamePhaseLabel}
              </span>
            </div>
          </div>

          {/* Balken */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                report.overallScore >= 70
                  ? 'bg-primary'
                  : report.overallScore >= 45
                  ? 'bg-amber-500'
                  : 'bg-destructive'
              }`}
              style={{ width: `${Math.max(5, report.overallScore)}%` }}
            />
          </div>

          {/* Tipp des Lotsen */}
          <div className="flex items-start gap-2 pt-1 text-xs text-foreground leading-relaxed">
            <Sparkles className="size-4 shrink-0 text-primary mt-0.5" />
            <p>
              <span className="font-semibold">Tipp des Lotsen: </span>
              {report.lotseTip}
            </p>
          </div>
        </div>

        {/* 3. Die 4 Prinzipien-Karten */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="region" aria-label="Eröffnungsprinzipien">
          {/* Zentrumskontrolle */}
          <div
            className={`rounded-2xl p-4 border transition-all cursor-pointer ${
              expandedPrinciple === 'center' ? 'ring-1 ring-primary/40 bg-muted/60' : 'bg-muted/40 hover:bg-muted/50'
            }`}
            onClick={() => togglePrinciple('center')}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-primary" />
                <h4 className="text-xs font-semibold">{report.center.title}</h4>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(report.center.status)}`}>
                {report.center.badge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {report.center.summary}
            </p>
            {expandedPrinciple === 'center' && (
              <ul className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-1 list-disc pl-3 animate-in fade-in duration-150">
                {report.center.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Figurenentwicklung */}
          <div
            className={`rounded-2xl p-4 border transition-all cursor-pointer ${
              expandedPrinciple === 'development' ? 'ring-1 ring-primary/40 bg-muted/60' : 'bg-muted/40 hover:bg-muted/50'
            }`}
            onClick={() => togglePrinciple('development')}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                <h4 className="text-xs font-semibold">{report.development.title}</h4>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(report.development.status)}`}>
                {report.development.badge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {report.development.summary}
            </p>
            {expandedPrinciple === 'development' && (
              <ul className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-1 list-disc pl-3 animate-in fade-in duration-150">
                {report.development.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Königssicherheit & Rochade */}
          <div
            className={`rounded-2xl p-4 border transition-all cursor-pointer ${
              expandedPrinciple === 'kingSafety' ? 'ring-1 ring-primary/40 bg-muted/60' : 'bg-muted/40 hover:bg-muted/50'
            }`}
            onClick={() => togglePrinciple('kingSafety')}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                <h4 className="text-xs font-semibold">{report.kingSafety.title}</h4>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(report.kingSafety.status)}`}>
                {report.kingSafety.badge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {report.kingSafety.summary}
            </p>
            {expandedPrinciple === 'kingSafety' && (
              <ul className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-1 list-disc pl-3 animate-in fade-in duration-150">
                {report.kingSafety.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Figurenharmonie */}
          <div
            className={`rounded-2xl p-4 border transition-all cursor-pointer ${
              expandedPrinciple === 'harmony' ? 'ring-1 ring-primary/40 bg-muted/60' : 'bg-muted/40 hover:bg-muted/50'
            }`}
            onClick={() => togglePrinciple('harmony')}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h4 className="text-xs font-semibold">{report.harmony.title}</h4>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(report.harmony.status)}`}>
                {report.harmony.badge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {report.harmony.summary}
            </p>
            {expandedPrinciple === 'harmony' && (
              <ul className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-1 list-disc pl-3 animate-in fade-in duration-150">
                {report.harmony.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
