import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTrades } from '@/contexts/TradesContext'
import { 
  updateUserProgress, 
  getMotivationalMessage,
  getUserActivities,
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
  lastActivityDate?: string
  dailyXPLog: Record<string, number>
  activities: Activity[]
}

export const useTraderProgress = () => {
  const { user } = useAuth()
  const { trades } = useTrades() // Get trades to trigger refresh on changes
  const [progressData, setProgressData] = useState<TraderProgressData>({
    xp: 0,
    level: 1,
    xpToNextLevel: 1000,
    streak: 0,
    longestStreak: 0,
    motivationalMessage: 'Welcome to your trading journey!',
    dailyXPLog: {},
    activities: []
  })
  const [isLoading, setIsLoading] = useState(true)

  const refreshProgress = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      
      // Get current user profile
      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        console.warn('User document not found')
        setIsLoading(false)
        return
      }

      // Get user activities
      const activities = await getUserActivities(user.uid)
      
      // Update user progress with current trades and activities
      await updateUserProgress(user.uid, trades, activities)
      
      // Get fresh user data after update
      const freshUserDoc = await getDoc(userDocRef)
      const freshUserData = freshUserDoc.data()
      
      // Generate motivational message
      const today = new Date().toISOString().split('T')[0]
      const todayXP = freshUserData?.dailyXPLog?.[today] || 0
      
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
      
      const motivationalMessage = getMotivationalMessage(
        freshUserData?.streak || 0,
        todayXP,
        recentBehavior
      )

      setProgressData({
        xp: freshUserData?.xp || 0,
        level: freshUserData?.level || 1,
        xpToNextLevel: freshUserData?.xpToNextLevel || 1000,
        streak: freshUserData?.streak || 0,
        longestStreak: freshUserData?.longestStreak || 0,
        motivationalMessage,
        lastActivityDate: freshUserData?.lastActivityDate,
        dailyXPLog: freshUserData?.dailyXPLog || {},
        activities
      })
    } catch (error) {
      console.error('Error fetching trader progress:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, trades])

  // Refresh on mount and when user changes
  useEffect(() => {
    refreshProgress()
  }, [refreshProgress])

  // Auto-refresh when trades change (for real-time updates)
  useEffect(() => {
    if (user && trades.length >= 0) { // Check trades.length >= 0 to trigger on both additions and deletions
      refreshProgress()
    }
  }, [trades, user, refreshProgress])

  return {
    ...progressData,
    isLoading,
    refreshProgress
  }
} 