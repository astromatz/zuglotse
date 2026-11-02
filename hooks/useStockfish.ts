'use client'

import { useState, useRef } from 'react'
import { Chess } from 'chess.js'
import { toast } from 'sonner'
import { parseInfoLine, type StockfishCandidate } from '@/lib/stockfish-worker'
import { describePosition } from '@/lib/local-commentary'

export function useStockfish(depth: number) {
  const [candidates, setCandidates] = useState<StockfishCandidate[]>([])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [selectedCandidate, setSelectedCandidate] = useState(0)
  const [commentary, setCommentary] = useState<string[]>([])
  const stockfishRef = useRef<Worker | null>(null)

  const terminate = () => {
    stockfishRef.current?.terminate()
    stockfishRef.current = null
  }

  const reset = () => {
    setCandidates([])
    setCommentary([])
    setAnalysisProgress(0)
    setSelectedCandidate(0)
  }

  const startAnalysis = (
    currentFen: string,
    onComplete: (fen: string, candidates: StockfishCandidate[], bestMove: string) => void
  ) => {
    reset()
    try {
      const getWorkerUrl = () => {
        if (typeof window === 'undefined') return '/stockfish-lite.js'
        const path = window.location.pathname
        const base = path.endsWith('/') ? path : path.slice(0, path.lastIndexOf('/') + 1)
        return new URL('stockfish-lite.js', window.location.origin + (base || '/')).href
      }
      const worker = new Worker(getWorkerUrl())
      stockfishRef.current = worker

      worker.onerror = (ev) => {
        console.error('Stockfish worker error', ev?.message ?? ev)
        toast.error('Die Schach-Engine konnte nicht gestartet werden. Bitte Seite neu laden.')
        worker.terminate()
      }

      const tempCandidates: Record<number, StockfishCandidate> = {}

      worker.onmessage = (e: MessageEvent) => {
        const line = e?.data ?? ''
        if (typeof line !== 'string') return

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
          worker.terminate()
          const finalCandidates = Object.values(tempCandidates).sort(
            (a, b) => (a?.multipv ?? 0) - (b?.multipv ?? 0)
          )
          setCandidates(finalCandidates)
          setCommentary(describePosition(currentFen, finalCandidates))
          onComplete(currentFen, finalCandidates, bestMove)
        }
      }

      worker.postMessage('uci')
      setTimeout(() => {
        worker.postMessage('isready')
        worker.postMessage(`setoption name MultiPV value 3`)
        worker.postMessage(`position fen ${currentFen}`)
        worker.postMessage(`go depth ${depth}`)
      }, 100)
    } catch (err: any) {
      toast.error('Stockfish konnte nicht geladen werden')
      console.error(err)
    }
  }

  return {
    candidates,
    analysisProgress,
    selectedCandidate,
    setSelectedCandidate,
    commentary,
    stockfishRef,
    startAnalysis,
    terminate,
    reset,
  }
}
