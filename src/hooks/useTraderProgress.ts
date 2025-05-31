import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTrades } from '@/contexts/TradesContext'
import { 
  updateUserProgress, 
  getMotivationalMessage,
  getUserActivities,
  Activity 
} from '@/services/xpService'
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
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
  const [activities, setActivities] = useState<Activity[]>([])

  // Listen to activities in real-time
  useEffect(() => {
    if (!user) {
      setActivities([])
      return
    }

    const activitiesQuery = query(
      collection(db, 'activities'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        const activitiesData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Activity))
        setActivities(activitiesData)
      },
      (error) => {
        console.error('Error fetching activities:', error)
        // Fallback to simple query if composite index not ready
        try {
          const simpleQuery = query(
            collection(db, 'activities'),
            where('userId', '==', user.uid)
          )
          const fallbackUnsubscribe = onSnapshot(simpleQuery, (snapshot) => {
            const activitiesData = snapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            } as Activity))
            // Manual sort by createdAt
            activitiesData.sort((a, b) => {
              const aTime = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt 
                ? (a.createdAt as { seconds: number }).seconds 
                : 0
              const bTime = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt 
                ? (b.createdAt as { seconds: number }).seconds 
                : 0
              return bTime - aTime
            })
            setActivities(activitiesData)
          })
          return fallbackUnsubscribe
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError)
          setActivities([])
        }
      }
    )

    return unsubscribe
  }, [user])

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
  }, [user, trades, activities])

  // Refresh on mount and when user changes
  useEffect(() => {
    refreshProgress()
  }, [refreshProgress])

  // Auto-refresh when trades or activities change (for real-time updates)
  useEffect(() => {
    if (user && (trades.length >= 0 || activities.length >= 0)) {
      refreshProgress()
    }
  }, [trades, activities, user, refreshProgress])

  return {
    ...progressData,
    isLoading,
    refreshProgress
  }
} 