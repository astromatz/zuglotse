'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { StockfishCandidate } from '@/lib/stockfish-worker'

export interface HistoryItem {
  fen: string
  date: string
  result?: { candidates?: StockfishCandidate[]; bestMove?: string }
}

const HISTORY_KEY = 'chess_history'

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])

  const loadHistory = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
      if (Array.isArray(stored)) {
        setHistory(stored.filter(item => typeof item?.fen === 'string').slice(0, 10))
      }
    } catch (error) {
      console.error('Verlauf konnte nicht geladen werden:', error)
    }
  }

  const saveHistory = (
    analysisFen: string,
    result: { candidates: StockfishCandidate[]; fen: string; bestMove: string }
  ) => {
    try {
      const item: HistoryItem = { fen: analysisFen, result, date: new Date().toISOString() }
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
      const updated = [item, ...(Array.isArray(stored) ? stored : [])].slice(0, 10)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
      setHistory(updated)
      // Lokale Speicherung ist primär für die Webapp (kein Server-Backend erforderlich)
    } catch (error) {
      console.error('Verlauf konnte nicht gespeichert werden:', error)
      toast.error('Der Verlauf konnte nicht gespeichert werden.')
    }
  }

  return { history, setHistory, loadHistory, saveHistory }
}
