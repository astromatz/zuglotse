'use client'

import { useState, useRef } from 'react'
import { explainPosition, type AiSettings } from '@/lib/ai-providers'
import { germanSan, formatEvaluation, principalVariation, describePosition } from '@/lib/local-commentary'
import type { StockfishCandidate } from '@/lib/stockfish-worker'

export type AiTextState =
  | { status: 'idle'; lines: [] }
  | { status: 'loading'; lines: [] }
  | { status: 'done'; lines: string[] }
  | { status: 'error'; lines: []; error: string }

export function useAiExplanation() {
  const [aiText, setAiText] = useState<AiTextState>({ status: 'idle', lines: [] })
  const aiRequestRef = useRef(0)

  const reset = () => {
    aiRequestRef.current++
    setAiText({ status: 'idle', lines: [] })
  }

  const requestAiExplanation = async (
    aiSettings: AiSettings,
    analysisFen: string,
    cands: StockfishCandidate[]
  ) => {
    const aiActive = aiSettings.mode === 'key' && aiSettings.apiKey.trim().length > 0
    if (!aiActive || cands.length === 0) return

    const id = ++aiRequestRef.current
    setAiText({ status: 'loading', lines: [] })
    try {
      const lines = await explainPosition(aiSettings, {
        fen: analysisFen,
        sideToMove: analysisFen.split(' ')[1] === 'b' ? 'Schwarz' : 'Weiß',
        candidates: cands.map(c => ({
          san: germanSan(c.san || c.move),
          evaluation: formatEvaluation(analysisFen, c),
          line: principalVariation(analysisFen, c.pv.slice(0, 8)).join(' '),
        })),
        facts: describePosition(analysisFen, cands),
        skillLevel: aiSettings.skillLevel ?? 'beginner',
      })
      if (id === aiRequestRef.current) setAiText({ status: 'done', lines })
    } catch (error) {
      console.error('KI-Erklärung fehlgeschlagen:', error)
      if (id === aiRequestRef.current)
        setAiText({
          status: 'error',
          lines: [],
          error:
            error instanceof Error ? error.message : 'Die KI-Erklärung ist fehlgeschlagen.',
        })
    }
  }

  return { aiText, setAiText, requestAiExplanation, reset }
}
