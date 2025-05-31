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
      // Clean the trade data to remove undefined values
      const cleanedTrade = Object.fromEntries(
        Object.entries(newTrade).filter(([_, value]) => value !== undefined)
      )

      await addDoc(collection(db, 'trades'), {
        ...cleanedTrade,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Ensure required fields have defaults
        notes: cleanedTrade.notes || '',
        strategy: cleanedTrade.strategy || '',
        status: cleanedTrade.status || 'open',
        type: cleanedTrade.type || 'long'
      })
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
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      )

      const tradeRef = doc(db, 'trades', id)
      await updateDoc(tradeRef, {
        ...cleanedUpdates,
        updatedAt: serverTimestamp()
      })
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