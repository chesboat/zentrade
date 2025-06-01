export interface RulePreferences {
  maxTradesPerDay: number
  stopAfterWin: boolean
  behaviorAfterLoss: "stop" | "break" | "continue" | "prompt"
  session: "london" | "newyork" | "asia" | "custom"
  requiresConfirmation: boolean
  usesChecklist: boolean
  journalReviewFrequency: "daily" | "weekly" | "monthly" | "never"
  dailyRemindersEnabled: boolean
  followUpStyle: "summary" | "checklist" | "manual"
  wantsSuggestedRules: boolean
  customRules: string[]
}

export const defaultRulePreferences: RulePreferences = {
  maxTradesPerDay: 3,
  stopAfterWin: false,
  behaviorAfterLoss: "break",
  session: "newyork",
  requiresConfirmation: false,
  usesChecklist: false,
  journalReviewFrequency: "daily",
  dailyRemindersEnabled: true,
  followUpStyle: "summary",
  wantsSuggestedRules: false,
  customRules: []
}

// Utility function to check if user has completed rule setup
export const hasCompletedRuleSetup = (rulePreferences?: RulePreferences | null): boolean => {
  return !!(rulePreferences && Object.keys(rulePreferences).length > 0)
}

// Utility function to get user rule preferences from Firestore
export const getUserRulePreferences = async (uid: string): Promise<RulePreferences | null> => {
  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const { db } = await import('@/lib/firebase')
    
    const userRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userRef)
    
    if (userSnap.exists() && userSnap.data().rulePreferences) {
      return userSnap.data().rulePreferences as RulePreferences
    }
    
    return null
  } catch (error) {
    console.error('Error fetching user rule preferences:', error)
    return null
  }
}

export const getSessionTimeRange = (session: RulePreferences['session']) => {
  switch (session) {
    case 'london':
      return { start: '02:00', end: '11:00', timezone: 'EST' }
    case 'newyork':
      return { start: '08:00', end: '17:00', timezone: 'EST' }
    case 'asia':
      return { start: '19:00', end: '04:00', timezone: 'EST' }
    case 'custom':
      return { start: 'custom', end: 'custom', timezone: 'EST' }
    default:
      return { start: '08:00', end: '17:00', timezone: 'EST' }
  }
}

export const getBehaviorAfterLossMessage = (behavior: RulePreferences['behaviorAfterLoss']) => {
  switch (behavior) {
    case 'stop':
      return 'You should stop trading for today after this loss.'
    case 'break':
      return 'Take a 15-30 minute break to reset your mindset.'
    case 'continue':
      return 'Continue trading but stay focused on your strategy.'
    case 'prompt':
      return 'What would you like to do after this loss?'
    default:
      return 'Follow your predetermined plan.'
  }
}

export const shouldShowTradeConfirmation = (
  rulePreferences: RulePreferences, 
  todayTradeCount: number
): { show: boolean; reason?: string } => {
  // Check if confirmation is required
  if (rulePreferences.requiresConfirmation) {
    return { show: true, reason: 'Trade confirmation is required per your rules' }
  }

  // Check if daily trade limit is reached
  if (todayTradeCount >= rulePreferences.maxTradesPerDay) {
    return { 
      show: true, 
      reason: `You've reached your daily limit of ${rulePreferences.maxTradesPerDay} trades` 
    }
  }

  return { show: false }
}

export const getJournalReminder = (frequency: RulePreferences['journalReviewFrequency']) => {
  switch (frequency) {
    case 'daily':
      return 'Remember to review your journal entries from today'
    case 'weekly':
      return 'Schedule your weekly journal review'
    case 'monthly':
      return 'Schedule your monthly journal review'
    case 'never':
      return null
    default:
      return null
  }
} 