import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTrades } from '@/contexts/TradesContext'
import { 
  updateUserProgress, 
  getUserActivities, 
  getMotivationalMessage,
  Activity 
} from '@/services/xpService'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface TraderProgressData {
  xp: number
  level: number
  xpToNextLevel: number
  streak: number
  longestStreak: number
  motivationalMessage: string
  todayXP: number
  isLoading: boolean
  activities: Activity[]
  refreshProgress: () => Promise<void>
}

export function useTraderProgress(): TraderProgressData {
  const { user } = useAuth()
  const { trades } = useTrades()
  const [progressData, setProgressData] = useState({
    level: 1,
    xp: 0,
    xpToNextLevel: 1000,
    streak: 0,
    longestStreak: 0,
    todayXP: 0,
    motivationalMessage: "Welcome to your trading journey!",
    activities: [] as Activity[],
    isLoading: true
  })

  const refreshProgress = useCallback(async () => {
    if (!user) return

    try {
      setProgressData(prev => ({ ...prev, isLoading: true }))
      
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      
      if (!userSnap.exists()) return

      const userData = userSnap.data()
      const today = new Date().toISOString().split('T')[0]

      // Get user activities
      const activities = await getUserActivities(user.uid)
      
      // Update user progress based on current trades and activities
      await updateUserProgress(user.uid, trades, activities)

      // Calculate recent behavior for motivational message
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const recentDates = [today, yesterday]

      const recentTrades = trades.filter(trade => 
        recentDates.includes(trade.entryDate) || 
        (trade.exitDate && recentDates.includes(trade.exitDate))
      )

      const recentActivities = activities.filter(activity => 
        recentDates.includes(activity.date)
      )

      const recentBehavior = {
        hasJournaledLoss: recentTrades.some(trade => 
          trade.pnl !== undefined && 
          trade.pnl < 0 && 
          trade.notes && 
          trade.notes.trim().length > 0
        ),
        preventedTilt: false, // This would need more sophisticated detection
        backtested: recentActivities.some(activity => activity.type === 'backtest'),
        reengineered: recentActivities.some(activity => activity.type === 'reengineer')
      }

      const todayXP = userData.dailyXPLog?.[today] || 0
      const message = getMotivationalMessage(
        userData.streak || 0,
        todayXP,
        recentBehavior
      )
      setProgressData({
        level: userData.level || 1,
        xp: userData.xp || 0,
        xpToNextLevel: userData.xpToNextLevel || 1000,
        streak: userData.streak || 0,
        longestStreak: userData.longestStreak || 0,
        todayXP,
        motivationalMessage: message,
        activities,
        isLoading: false
      })
      
    } catch (error) {
      console.error('Error fetching progress:', error)
      setProgressData(prev => ({ ...prev, isLoading: false }))
    }
  }, [user, trades])

  // Auto-refresh when trades change
  useEffect(() => {
    refreshProgress()
  }, [refreshProgress])

  return {
    ...progressData,
    refreshProgress
  }
} 