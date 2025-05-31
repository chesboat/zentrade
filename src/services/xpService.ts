import { doc, updateDoc, getDoc, addDoc, collection, query, where, getDocs, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Trade } from '@/mockData/trades'

// XP Rules as defined in the specification
export const XP_RULES = {
  TRADE_LOGGED: 10,
  RULES_FOLLOWED_ALL_DAY: 25,
  EMOTION_TAGGED: 10,
  JOURNAL_WRITTEN: 10,
  LOSS_JOURNALED_WITH_EMOTION: 20,
  TILT_PREVENTED: 30,
  BACKTEST_SESSION: 40,
  REENGINEER_TRADE: 25,
  POST_TRADE_ANALYSIS: 20,
  DAILY_QUEST_COMPLETED: 20
}

// Level progression - each level requires 1000 * level XP
export const calculateXPForLevel = (level: number): number => {
  return 1000 * level
}

export const calculateLevelFromXP = (totalXP: number): { level: number; xpToNextLevel: number } => {
  let level = 1
  let xpNeeded = calculateXPForLevel(level)
  
  while (totalXP >= xpNeeded) {
    totalXP -= xpNeeded
    level++
    xpNeeded = calculateXPForLevel(level)
  }
  
  return {
    level,
    xpToNextLevel: xpNeeded - totalXP
  }
}

// Activity types for the activities collection
export type ActivityType = 'backtest' | 'reengineer' | 'postTradeReview'

export interface Activity {
  id?: string
  userId: string
  date: string
  type: ActivityType
  notes: string
  xpAwarded?: number
  createdAt?: unknown
}

// Motivational messages based on behavior
export const getMotivationalMessage = (
  streak: number,
  todayXP: number,
  recentBehavior: {
    hasJournaledLoss: boolean
    preventedTilt: boolean
    backtested: boolean
    reengineered: boolean
  }
): string => {
  const messages = [
    // Streak messages
    ...(streak >= 7 ? [`🔥 ${streak} days of clarity — you're leveling up as a trader.`] : []),
    ...(streak >= 3 && streak < 7 ? [`🎯 ${streak} days strong! Consistency is building your edge.`] : []),
    
    // Behavioral messages
    ...(recentBehavior.hasJournaledLoss ? ["You journaled a red day. That's what real growth looks like."] : []),
    ...(recentBehavior.preventedTilt ? ["Skipped the revenge trade? That's discipline in action."] : []),
    ...(recentBehavior.backtested ? ["Backtesting shows you're building a foundation, not just chasing entries."] : []),
    ...(recentBehavior.reengineered ? ["Reworking your trade ideas? That's how you evolve."] : []),
    
    // General motivational messages
    "Losses happen. Showing up anyway is what separates pros.",
    "You're not just trading — you're evolving.",
    "Today's progress sets up tomorrow's profits.",
    "Every journal entry is an investment in your future success.",
    "Discipline in the small things builds edge in the big moments.",
    
    // XP-based messages
    ...(todayXP >= 50 ? ["Crushing your daily targets! This momentum is building something special."] : []),
    ...(todayXP >= 30 ? ["Solid progress today! Your consistency is your competitive advantage."] : [])
  ]
  
  return messages[Math.floor(Math.random() * messages.length)]
}

// Check if a day qualifies for streak continuation
export const qualifiesForStreak = (
  trades: Trade[],
  activities: Activity[],
  date: string
): boolean => {
  const dayTrades = trades.filter(trade => 
    trade.entryDate === date || trade.exitDate === date
  )
  
  const dayActivities = activities.filter(activity => activity.date === date)
  
  // Must have at least 1 trade or activity
  if (dayTrades.length === 0 && dayActivities.length === 0) {
    return false
  }
  
  // If there are trades, check rule adherence (for now, assume rules followed if journaled)
  if (dayTrades.length > 0) {
    const hasRuleBreaks = dayTrades.some(trade => 
      // For now, we consider a rule break if it's a loss without any journal or emotion tracking
      trade.pnl !== undefined && trade.pnl < 0 && (!trade.notes || trade.notes.trim().length === 0)
    )
    
    if (hasRuleBreaks) {
      return false
    }
    
    // Must have emotion or journal on at least one trade
    const hasEmotionOrJournal = dayTrades.some(trade => 
      trade.notes && trade.notes.trim().length > 0
    )
    
    if (!hasEmotionOrJournal) {
      return false
    }
  }
  
  return true
}

// Calculate XP for a trading day
export const calculateDailyXP = (
  trades: Trade[],
  activities: Activity[],
  date: string
): number => {
  let totalXP = 0
  
  const dayTrades = trades.filter(trade => 
    trade.entryDate === date || trade.exitDate === date
  )
  
  const dayActivities = activities.filter(activity => activity.date === date)
  
  // Trade-based XP
  dayTrades.forEach(trade => {
    // Trade logged
    totalXP += XP_RULES.TRADE_LOGGED
    
    // Emotion tagged (we consider any note as emotional awareness)
    if (trade.notes && trade.notes.trim().length > 0) {
      totalXP += XP_RULES.EMOTION_TAGGED
      totalXP += XP_RULES.JOURNAL_WRITTEN
      
      // Bonus for journaling a loss
      if (trade.pnl !== undefined && trade.pnl < 0) {
        totalXP += XP_RULES.LOSS_JOURNALED_WITH_EMOTION
      }
    }
  })
  
  // Check if all rules were followed for the day (bonus XP)
  if (dayTrades.length > 0 && qualifiesForStreak(trades, activities, date)) {
    totalXP += XP_RULES.RULES_FOLLOWED_ALL_DAY
  }
  
  // Activity-based XP
  dayActivities.forEach(activity => {
    switch (activity.type) {
      case 'backtest':
        totalXP += XP_RULES.BACKTEST_SESSION
        break
      case 'reengineer':
        totalXP += XP_RULES.REENGINEER_TRADE
        break
      case 'postTradeReview':
        totalXP += XP_RULES.POST_TRADE_ANALYSIS
        break
    }
  })
  
  return totalXP
}

// Update user progress in Firestore
export const updateUserProgress = async (
  userId: string,
  trades: Trade[],
  activities: Activity[] = []
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)
    
    if (!userSnap.exists()) {
      throw new Error('User profile not found')
    }
    
    const userData = userSnap.data()
    const today = new Date().toISOString().split('T')[0]
    
    // Calculate today's XP
    const todayXP = calculateDailyXP(trades, activities, today)
    
    // Update daily XP log
    const dailyXPLog = userData.dailyXPLog || {}
    dailyXPLog[today] = todayXP
    
    // Calculate total XP
    const totalXP = Object.values(dailyXPLog).reduce((sum: number, xp: unknown) => 
      sum + (typeof xp === 'number' ? xp : 0), 0
    )
    
    // Calculate new level
    const { level, xpToNextLevel } = calculateLevelFromXP(totalXP)
    
    // Calculate streak
    let currentStreak = 0
    let longestStreak = userData.longestStreak || 0
    
    // Calculate streak by checking backwards from today
    const sortedDates = Object.keys(dailyXPLog).sort().reverse()
    for (const date of sortedDates) {
      if (qualifiesForStreak(trades, activities, date)) {
        currentStreak++
      } else {
        break
      }
    }
    
    longestStreak = Math.max(longestStreak, currentStreak)
    
    // Check for new titles
    const titlesUnlocked = userData.titlesUnlocked || []
    const newTitles = checkForNewTitles(currentStreak, totalXP, level, titlesUnlocked)
    
    // Update user profile
    await updateDoc(userRef, {
      level,
      xp: totalXP,
      xpToNextLevel,
      streak: currentStreak,
      longestStreak,
      lastActivityDate: today,
      titlesUnlocked: [...titlesUnlocked, ...newTitles],
      dailyXPLog,
      updatedAt: serverTimestamp()
    })
    
  } catch (error) {
    console.error('Error updating user progress:', error)
    throw error
  }
}

// Check for new titles to unlock
export const checkForNewTitles = (
  streak: number,
  totalXP: number,
  level: number,
  existingTitles: string[]
): string[] => {
  const newTitles: string[] = []
  
  const titleConditions = [
    { title: "First Steps", condition: totalXP >= 100 },
    { title: "Clarity Seeker", condition: streak >= 7 },
    { title: "Steady Hand", condition: streak >= 30 },
    { title: "Rule Follower", condition: streak >= 14 },
    { title: "Growth Mindset", condition: totalXP >= 1000 },
    { title: "Level Master", condition: level >= 5 },
    { title: "Consistency King", condition: streak >= 60 },
    { title: "XP Crusher", condition: totalXP >= 5000 },
  ]
  
  titleConditions.forEach(({ title, condition }) => {
    if (condition && !existingTitles.includes(title)) {
      newTitles.push(title)
    }
  })
  
  return newTitles
}

// Add activity to the activities collection
export const addActivity = async (
  userId: string,
  type: ActivityType,
  notes: string,
  date?: string
): Promise<void> => {
  try {
    const activity: Activity = {
      userId,
      type,
      notes,
      date: date || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    }
    
    await addDoc(collection(db, 'activities'), activity)
    // Note: Progress update will be handled automatically by useTraderProgress hook
    
  } catch (error) {
    console.error('Error adding activity:', error)
    throw error
  }
}

// Helper function to get user trades
export const getUserTrades = async (userId: string): Promise<Trade[]> => {
  try {
    const tradesQuery = query(
      collection(db, 'trades'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(tradesQuery)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade))
  } catch (error) {
    console.error('Error fetching user trades:', error)
    
    // If the composite index is not ready, try a simpler query
    if (error && typeof error === 'object' && 'code' in error && error.code === 'failed-precondition') {
      console.warn('Composite index not ready for trades, falling back to simple query')
      try {
        const simpleQuery = query(
          collection(db, 'trades'),
          where('userId', '==', userId)
        )
        const snapshot = await getDocs(simpleQuery)
        const trades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade))
        
        // Manual sort by entryDate in memory
        return trades.sort((a, b) => {
          const aDate = new Date(a.entryDate).getTime()
          const bDate = new Date(b.entryDate).getTime()
          return bDate - aDate // Most recent first
        })
      } catch (fallbackError) {
        console.error('Fallback query for trades also failed:', fallbackError)
        return []
      }
    }
    
    return []
  }
}

// Helper function to get user activities
export const getUserActivities = async (userId: string): Promise<Activity[]> => {
  try {
    const activitiesQuery = query(
      collection(db, 'activities'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(activitiesQuery)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity))
  } catch (error) {
    console.error('Error fetching user activities:', error)
    
    // If the composite index is not ready, try a simpler query
    if (error && typeof error === 'object' && 'code' in error && error.code === 'failed-precondition') {
      console.warn('Composite index not ready, falling back to simple query')
      try {
        const simpleQuery = query(
          collection(db, 'activities'),
          where('userId', '==', userId)
        )
        const snapshot = await getDocs(simpleQuery)
        const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity))
        
        // Manual sort by createdAt in memory
        return activities.sort((a, b) => {
          const aTime = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt 
            ? (a.createdAt as { seconds: number }).seconds 
            : 0
          const bTime = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt 
            ? (b.createdAt as { seconds: number }).seconds 
            : 0
          return bTime - aTime
        })
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError)
        return []
      }
    }
    
    return []
  }
}

// Update activity in the activities collection
export const updateActivity = async (
  activityId: string,
  userId: string,
  updates: Partial<Pick<Activity, 'notes' | 'type'>>
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'activities', activityId), {
      ...updates,
      updatedAt: serverTimestamp()
    })
    // Note: Progress update will be handled automatically by useTraderProgress hook
    
  } catch (error) {
    console.error('Error updating activity:', error)
    throw error
  }
}

// Delete activity from the activities collection
export const deleteActivity = async (activityId: string, userId: string): Promise<void> => {
  try {
    // Delete the activity
    await deleteDoc(doc(db, 'activities', activityId))
    // Note: Progress update will be handled automatically by useTraderProgress hook
    
  } catch (error) {
    console.error('Error deleting activity:', error)
    throw error
  }
} 