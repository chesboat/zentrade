import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { RulePreferences } from '@/utils/rulePreferences'

interface RuleLog {
  date: string
  rulesFollowed: string[]
  rulesBroken: string[]
  honestyConfirmed: boolean
  xpAwarded: number
  timestamp: Date
}

interface RuleCheckInData {
  ruleIndex: number
  rule: string
  followed: boolean | null // null = not answered yet
}

export function useRuleAdherence() {
  const { user } = useAuth()
  const [userRules, setUserRules] = useState<string[]>([])
  const [checkInData, setCheckInData] = useState<RuleCheckInData[]>([])
  const [honestyConfirmed, setHonestyConfirmed] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false)
  const [todaysXP, setTodaysXP] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

  const loadUserRules = useCallback(async () => {
    if (!user) return

    try {
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      
      if (userSnap.exists() && userSnap.data().rulePreferences) {
        const preferences = userSnap.data().rulePreferences as RulePreferences
        const rules = preferences.customRules || []
        setUserRules(rules)
        setCurrentStreak(userSnap.data().streak || 0)
        
        // Initialize check-in data
        setCheckInData(rules.map((rule, index) => ({
          ruleIndex: index,
          rule,
          followed: null
        })))
      }
    } catch (error) {
      console.error('Error loading user rules:', error)
    }
  }, [user])

  const checkTodaysStatus = useCallback(async () => {
    if (!user) return

    try {
      const ruleLogRef = doc(db, 'ruleLogs', `${user.uid}_${today}`)
      const ruleLogSnap = await getDoc(ruleLogRef)
      
      if (ruleLogSnap.exists()) {
        setHasCheckedInToday(true)
        setTodaysXP(ruleLogSnap.data().xpAwarded || 0)
      }
    } catch (error) {
      console.error('Error checking today\'s status:', error)
    }
  }, [user, today])

  useEffect(() => {
    if (user) {
      loadUserRules()
      checkTodaysStatus()
    }
  }, [user, loadUserRules, checkTodaysStatus])

  const markRuleFollowed = (ruleIndex: number, followed: boolean) => {
    setCheckInData(prev => 
      prev.map(item => 
        item.ruleIndex === ruleIndex 
          ? { ...item, followed }
          : item
      )
    )
  }

  const calculateXP = (): number => {
    const followedRules = checkInData.filter(item => item.followed === true)
    const totalRules = checkInData.length

    if (followedRules.length === totalRules && totalRules > 0) {
      return 25 // All rules followed
    } else if (followedRules.length >= 3) {
      return 10 // 3+ rules followed
    } else if (honestyConfirmed === true) {
      return 5 // Honesty bonus even if no rules followed
    }
    
    return 0 // No XP if dishonest or skipped
  }

  const getStreakMessage = (): string => {
    const followedRules = checkInData.filter(item => item.followed === true)
    const totalRules = checkInData.length

    if (followedRules.length === totalRules && totalRules > 0) {
      return `🔥 Perfect discipline! Streak: ${currentStreak + 1} days`
    } else if (followedRules.length > 0) {
      return `👍 Good effort! Streak maintained: ${currentStreak} days`
    } else if (honestyConfirmed === true) {
      return `💪 Honesty counts! Working on improvement.`
    } else {
      return `Streak reset. Tomorrow is a fresh start!`
    }
  }

  const submitRuleCheckIn = async (): Promise<{ success: boolean; xp: number; message: string }> => {
    if (!user || honestyConfirmed === null) {
      return { success: false, xp: 0, message: 'Please complete the honesty check' }
    }

    setIsLoading(true)

    try {
      const followedRules = checkInData.filter(item => item.followed === true).map(item => item.rule)
      const brokenRules = checkInData.filter(item => item.followed === false).map(item => item.rule)
      const xpAwarded = calculateXP()

      // Save rule log
      const ruleLogRef = doc(db, 'ruleLogs', `${user.uid}_${today}`)
      const ruleLogData: RuleLog = {
        date: today,
        rulesFollowed: followedRules,
        rulesBroken: brokenRules,
        honestyConfirmed,
        xpAwarded,
        timestamp: new Date()
      }

      await setDoc(ruleLogRef, ruleLogData)

      // Update user XP and streak
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      const userData = userSnap.data() || {}

      const currentXP = userData.xp || 0
      const newXP = currentXP + xpAwarded

      // Calculate new streak
      let newStreak = userData.streak || 0
      if (followedRules.length === userRules.length && userRules.length > 0) {
        newStreak += 1 // Perfect adherence increases streak
      } else if (followedRules.length === 0 && honestyConfirmed === false) {
        newStreak = 0 // Reset streak if dishonest or skipped
      }
      // Otherwise maintain current streak

      await updateDoc(userRef, {
        xp: newXP,
        streak: newStreak,
        lastRuleLogDate: today
      })

      setTodaysXP(xpAwarded)
      setCurrentStreak(newStreak)
      setHasCheckedInToday(true)

      return { 
        success: true, 
        xp: xpAwarded, 
        message: getStreakMessage() 
      }

    } catch (error) {
      console.error('Error submitting rule check-in:', error)
      return { success: false, xp: 0, message: 'Failed to save check-in' }
    } finally {
      setIsLoading(false)
    }
  }

  const resetCheckIn = () => {
    setCheckInData(userRules.map((rule, index) => ({
      ruleIndex: index,
      rule,
      followed: null
    })))
    setHonestyConfirmed(null)
  }

  return {
    userRules,
    checkInData,
    honestyConfirmed,
    setHonestyConfirmed,
    hasCheckedInToday,
    todaysXP,
    currentStreak,
    isLoading,
    markRuleFollowed,
    calculateXP,
    getStreakMessage,
    submitRuleCheckIn,
    resetCheckIn
  }
} 