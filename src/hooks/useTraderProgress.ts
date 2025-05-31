import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTrades } from '@/contexts/TradesContext'
import { 
  updateUserProgress, 
  getUserActivities, 
  getMotivationalMessage,
  Activity 
} from '@/services/xpService'

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

export const useTraderProgress = (): TraderProgressData => {
  const { user, userProfile } = useAuth()
  const { trades } = useTrades()
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [motivationalMessage, setMotivationalMessage] = useState('')

  // Refresh progress data
  const refreshProgress = useCallback(async () => {
    if (!user || !userProfile) return

    setIsLoading(true)
    try {
      // Get user activities
      const userActivities = await getUserActivities(user.uid)
      setActivities(userActivities)

      // Update user progress based on current trades and activities
      await updateUserProgress(user.uid, trades, userActivities)

      // Calculate recent behavior for motivational message
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const recentDates = [today, yesterday]

      const recentTrades = trades.filter(trade => 
        recentDates.includes(trade.entryDate) || 
        (trade.exitDate && recentDates.includes(trade.exitDate))
      )

      const recentActivities = userActivities.filter(activity => 
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

      const todayXP = userProfile.dailyXPLog?.[today] || 0
      const message = getMotivationalMessage(
        userProfile.streak,
        todayXP,
        recentBehavior
      )
      setMotivationalMessage(message)

    } catch (error) {
      console.error('Error refreshing progress:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, userProfile, trades])

  // Auto-refresh when trades change
  useEffect(() => {
    refreshProgress()
  }, [refreshProgress])

  // Calculate today's XP
  const todayXP = userProfile?.dailyXPLog?.[new Date().toISOString().split('T')[0]] || 0

  return {
    xp: userProfile?.xp || 0,
    level: userProfile?.level || 1,
    xpToNextLevel: userProfile?.xpToNextLevel || 100,
    streak: userProfile?.streak || 0,
    longestStreak: userProfile?.longestStreak || 0,
    motivationalMessage,
    todayXP,
    isLoading,
    activities,
    refreshProgress
  }
} 