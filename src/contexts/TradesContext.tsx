"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { mockTrades, Trade } from "@/mockData/trades"

interface TradesContextType {
  trades: Trade[]
  addTrade: (trade: Omit<Trade, 'id'>) => void
  updateTrade: (id: string, updates: Partial<Trade>) => void
  deleteTrade: (id: string) => void
}

const TradesContext = createContext<TradesContextType | undefined>(undefined)

export function TradesProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>(mockTrades)

  const addTrade = (newTrade: Omit<Trade, 'id'>) => {
    const trade: Trade = {
      ...newTrade,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }
    setTrades(prev => [trade, ...prev])
  }

  const updateTrade = (id: string, updates: Partial<Trade>) => {
    setTrades(prev => prev.map(trade => 
      trade.id === id ? { ...trade, ...updates } : trade
    ))
  }

  const deleteTrade = (id: string) => {
    setTrades(prev => prev.filter(trade => trade.id !== id))
  }

  return (
    <TradesContext.Provider value={{ trades, addTrade, updateTrade, deleteTrade }}>
      {children}
    </TradesContext.Provider>
  )
}

export function useTrades() {
  const context = useContext(TradesContext)
  if (context === undefined) {
    throw new Error('useTrades must be used within a TradesProvider')
  }
  return context
} 