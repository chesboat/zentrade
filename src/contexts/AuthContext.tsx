"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export interface UserProfile {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  createdAt: unknown
  // Gamification fields
  level: number
  xp: number
  xpToNextLevel: number
  streak: number
  longestStreak: number
  lastActivityDate: string | null
  titlesUnlocked: string[]
  dailyXPLog: Record<string, number> // { "2025-05-30": 45 }
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithFacebook: () => Promise<void>
  signInWithDiscord: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Create or get user profile in Firestore
  const createUserProfile = async (user: User, additionalData?: Record<string, unknown>) => {
    if (!user) return
    
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)
    
    if (!userSnap.exists()) {
      const { displayName, email, photoURL } = user
      try {
        await setDoc(userRef, {
          displayName,
          email,
          photoURL,
          createdAt: serverTimestamp(),
          // Initialize gamification fields
          level: 1,
          xp: 0,
          xpToNextLevel: 100, // Level 1 requires 100 XP
          streak: 0,
          longestStreak: 0,
          lastActivityDate: null,
          titlesUnlocked: [],
          dailyXPLog: {},
          ...additionalData
        })
      } catch (error) {
        console.error('Error creating user profile:', error)
      }
    }
    
    // Fetch the user profile
    const updatedUserSnap = await getDoc(userRef)
    if (updatedUserSnap.exists()) {
      setUserProfile({ uid: user.uid, ...updatedUserSnap.data() } as UserProfile)
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string, displayName?: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName })
    }
    await createUserProfile(result.user, { displayName })
  }

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    await createUserProfile(result.user)
  }

  // Sign in with Facebook
  const signInWithFacebook = async () => {
    const provider = new FacebookAuthProvider()
    const result = await signInWithPopup(auth, provider)
    await createUserProfile(result.user)
  }

  // Sign in with Discord
  // Note: Discord OAuth requires additional setup in Firebase
  // This is a placeholder - Discord OAuth support depends on Firebase configuration
  const signInWithDiscord = async () => {
    try {
      // Discord OAuth is not natively supported by Firebase
      // You would need to implement custom OAuth flow or use a different approach
      // For now, we'll throw an informative error
      throw new Error('Discord OAuth requires custom implementation. Please use Google or Facebook for now.')
    } catch (error) {
      console.error('Discord OAuth not implemented:', error)
      throw error
    }
  }

  // Logout
  const logout = async () => {
    await signOut(auth)
    setUserProfile(null)
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        await createUserProfile(user)
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signInWithDiscord,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 