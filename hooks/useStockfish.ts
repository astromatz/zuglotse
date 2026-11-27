'use client'

import { useState, useRef } from 'react'
import { Chess } from 'chess.js'
import { toast } from 'sonner'
import { parseInfoLine, type StockfishCandidate } from '@/lib/stockfish-worker'
import { describePosition } from '@/lib/local-commentary'
import { startEngineSession } from '@/lib/engine-session'

export function useStockfish(depth: number) {
  const [candidates, setCandidates] = useState<StockfishCandidate[]>([])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [selectedCandidate, setSelectedCandidate] = useState(0)
  const [commentary, setCommentary] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [analysisDepth, setAnalysisDepth] = useState<number | null>(null)
  const stockfishRef = useRef<Worker | null>(null)
  const sessionRef = useRef<ReturnType<typeof startEngineSession> | null>(null)

  const terminate = () => {
    sessionRef.current?.stop()
    sessionRef.current = null
    stockfishRef.current = null
  }

  const reset = () => {
    setCandidates([])
    setCommentary([])
    setAnalysisProgress(0)
    setSelectedCandidate(0)
    setStatus('idle')
    setError(null)
    setAnalysisDepth(null)
  }

  const startAnalysis = (
    currentFen: string,
    onComplete: (fen: string, candidates: StockfishCandidate[], bestMove: string) => void
  ) => {
    terminate()
    reset()
    setStatus('running')
    setAnalysisDepth(depth)
    const fail = (message: string) => {
      stockfishRef.current = null
      setCandidates([])
      setCommentary([])
      setStatus('error')
      setError(message)
      toast.error(message)
    }
    try {
      const getWorkerUrl = () => {
        if (typeof window === 'undefined') return '/stockfish-lite.js'
        const path = window.location.pathname
        const base = path.endsWith('/') ? path : path.slice(0, path.lastIndexOf('/') + 1)
        return new URL('stockfish-lite.js', window.location.origin + (base || '/')).href
      }
      const worker = new Worker(getWorkerUrl())
      stockfishRef.current = worker

      const tempCandidates: Record<number, StockfishCandidate> = {}

      sessionRef.current = startEngineSession(worker, currentFen, depth, (line) => {

        if (line.startsWith('info') && line.includes('multipv')) {
          const parsed = parseInfoLine(line)
          if (parsed && parsed.multipv && parsed.depth) {
            let san = parsed.move ?? ''
            try {
              const chess = new Chess(currentFen)
              const move = chess.move({
                from: san?.substring(0, 2) ?? '',
                to: san?.substring(2, 4) ?? '',
                promotion: san?.[4] ?? undefined,
              })
              if (move) san = move.san
            } catch {}
            tempCandidates[parsed.multipv] = {
              move: parsed.move ?? '',
              san,
              cp: parsed.cp ?? null,
              mate: parsed.mate ?? null,
              pv: parsed.pv ?? [],
              depth: parsed.depth ?? 0,
              multipv: parsed.multipv ?? 1,
            }
            setAnalysisProgress(Math.min(((parsed.depth ?? 0) / depth) * 100, 99))
            setCandidates(
              Object.values(tempCandidates).sort((a, b) => (a?.multipv ?? 0) - (b?.multipv ?? 0))
            )
          }
        }

        if (line.startsWith('bestmove')) {
          const bestMove = line.split(' ')?.[1] ?? ''
          setAnalysisProgress(100)
          stockfishRef.current = null
          setStatus('done')
          const finalCandidates = Object.values(tempCandidates).sort(
            (a, b) => (a?.multipv ?? 0) - (b?.multipv ?? 0)
          )
          setCandidates(finalCandidates)
          setCommentary(describePosition(currentFen, finalCandidates))
          onComplete(currentFen, finalCandidates, bestMove)
        }
      }, fail)
    } catch (err) {
      terminate()
      fail('Stockfish konnte nicht geladen werden. Bitte starte die Analyse erneut.')
      console.error(err)
    }
  }

  return {
    candidates,
    analysisProgress,
    selectedCandidate,
    setSelectedCandidate,
    commentary,
    status,
    error,
    analysisDepth,
    stockfishRef,
    startAnalysis,
    terminate,
    reset,
  }
}
