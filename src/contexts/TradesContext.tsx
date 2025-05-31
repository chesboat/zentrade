"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Trade } from "@/mockData/trades"
import { useAuth } from './AuthContext'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { updateUserProgress, getUserActivities } from '@/services/xpService'

interface TradesContextType {
  trades: Trade[]
  loading: boolean
  addTrade: (trade: Omit<Trade, 'id'>) => Promise<void>
  updateTrade: (id: string, updates: Partial<Trade>) => Promise<void>
  deleteTrade: (id: string) => Promise<void>
}

const TradesContext = createContext<TradesContextType | undefined>(undefined)

export function TradesProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Listen to user's trades from Firestore
  useEffect(() => {
    if (!user) {
      setTrades([])
      setLoading(false)
      return
    }

    setLoading(true)

    const tradesQuery = query(
      collection(db, 'trades'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      tradesQuery,
      (snapshot) => {
        const tradesData = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            // Convert Firestore Timestamps back to strings if needed
            entryDate: data.entryDate || '',
            exitDate: data.exitDate || undefined,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt
          } as unknown as Trade
        })
        
        setTrades(tradesData)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching trades:', error)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [user])

  const addTrade = async (newTrade: Omit<Trade, 'id'>) => {
    if (!user) {
      throw new Error('User must be authenticated to add trades')
    }

    try {
      // Clean the trade data more thoroughly - properly typed
      const cleanedTrade: Record<string, unknown> = {}
      
      // Only add defined values
      if (newTrade.symbol) cleanedTrade.symbol = newTrade.symbol
      if (newTrade.company) cleanedTrade.company = newTrade.company
      if (newTrade.type) cleanedTrade.type = newTrade.type
      if (newTrade.quantity !== undefined && newTrade.quantity !== null) cleanedTrade.quantity = newTrade.quantity
      if (newTrade.entryPrice !== undefined && newTrade.entryPrice !== null) cleanedTrade.entryPrice = newTrade.entryPrice
      if (newTrade.exitPrice !== undefined && newTrade.exitPrice !== null) cleanedTrade.exitPrice = newTrade.exitPrice
      if (newTrade.entryDate) cleanedTrade.entryDate = newTrade.entryDate
      if (newTrade.exitDate) cleanedTrade.exitDate = newTrade.exitDate
      if (newTrade.pnl !== undefined && newTrade.pnl !== null) cleanedTrade.pnl = newTrade.pnl
      if (newTrade.status) cleanedTrade.status = newTrade.status
      if (newTrade.notes) cleanedTrade.notes = newTrade.notes
      if (newTrade.strategy) cleanedTrade.strategy = newTrade.strategy
      if (newTrade.screenshot) cleanedTrade.screenshot = newTrade.screenshot
      if (newTrade.riskAmount !== undefined && newTrade.riskAmount !== null) cleanedTrade.riskAmount = newTrade.riskAmount
      if (newTrade.riskRewardRatio !== undefined && newTrade.riskRewardRatio !== null) cleanedTrade.riskRewardRatio = newTrade.riskRewardRatio

      // Ensure required fields have values
      if (!cleanedTrade.symbol) throw new Error('Symbol is required')
      if (!cleanedTrade.type) cleanedTrade.type = 'long'
      if (!cleanedTrade.status) cleanedTrade.status = 'open'
      if (!cleanedTrade.strategy) cleanedTrade.strategy = 'Manual Entry'
      if (!cleanedTrade.company) cleanedTrade.company = cleanedTrade.symbol

      await addDoc(collection(db, 'trades'), {
        ...cleanedTrade,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      // Note: XP update will be handled automatically by useTraderProgress hook

    } catch (error) {
      console.error('Error adding trade:', error)
      throw error
    }
  }

  const updateTrade = async (id: string, updates: Partial<Trade>) => {
    if (!user) {
      throw new Error('User must be authenticated to update trades')
    }

    try {
      // Clean the updates to remove undefined values
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      )

      const tradeRef = doc(db, 'trades', id)
      await updateDoc(tradeRef, {
        ...cleanedUpdates,
        updatedAt: serverTimestamp()
      })
      // Note: XP update will be handled automatically by useTraderProgress hook

    } catch (error) {
      console.error('Error updating trade:', error)
      throw error
    }
  }

  const deleteTrade = async (id: string) => {
    if (!user) {
      throw new Error('User must be authenticated to delete trades')
    }

    try {
      await deleteDoc(doc(db, 'trades', id))
      // Note: XP update will be handled automatically by useTraderProgress hook

    } catch (error) {
      console.error('Error deleting trade:', error)
      throw error
    }
  }

  return (
    <TradesContext.Provider value={{ trades, loading, addTrade, updateTrade, deleteTrade }}>
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