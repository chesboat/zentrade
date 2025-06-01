import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

// Get environment variables - Next.js automatically makes NEXT_PUBLIC_ vars available on client
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDZMHOjsrU4JoTMpfETVIWZD2XE6AvvNm4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "zentrade-47b22.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "zentrade-47b22",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "zentrade-47b22.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "387938157784",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:387938157784:web:a792e40a28e6f5e02843ad",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-M9Q0F59WHZ"
}

// Debug logging
console.log('🔧 Firebase config validation:', {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING',
  authDomain: firebaseConfig.authDomain || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
  storageBucket: firebaseConfig.storageBucket || 'MISSING',
  messagingSenderId: firebaseConfig.messagingSenderId || 'MISSING',
  appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 10)}...` : 'MISSING',
  measurementId: firebaseConfig.measurementId || 'MISSING'
})

// Initialize Firebase app (avoid multiple initialization)
let app;
if (getApps().length === 0) {
  console.log('🔧 Initializing new Firebase app')
  app = initializeApp(firebaseConfig)
} else {
  console.log('🔧 Using existing Firebase app')
  app = getApps()[0]
}

// Initialize Auth
console.log('🔧 Initializing Firebase Auth')
export const auth = getAuth(app)

// Initialize Firestore with enhanced error handling
console.log('🔧 Initializing Firestore with connection management')
export const db = getFirestore(app)

// Connection management utilities
let isFirestoreOnline = true
let connectionRetryCount = 0
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY = 2000

// Enhanced connection test with retry logic
async function testFirestoreConnection(retryCount = 0): Promise<boolean> {
  try {
    console.log(`🔧 Testing Firestore connection (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`)
    
    const { doc, getDoc } = await import('firebase/firestore')
    
    // Force network enable before testing
    try {
      await enableNetwork(db)
      console.log('🔧 Network enabled successfully')
    } catch (networkError: unknown) {
      console.log('🔧 Network enable failed (may already be enabled):', networkError)
    }
    
    // Test with a simple document read
    const testDoc = doc(db, 'test', 'connection')
    await getDoc(testDoc)
    
    console.log('✅ Firestore connection successful')
    isFirestoreOnline = true
    connectionRetryCount = 0
    return true
    
  } catch (error: unknown) {
    const firebaseError = error as { code?: string }
    console.error(`❌ Firestore connection failed (attempt ${retryCount + 1}):`, error)
    
    if (firebaseError.code === 'unavailable' && retryCount < MAX_RETRY_ATTEMPTS - 1) {
      console.log(`🔄 Retrying connection in ${RETRY_DELAY}ms...`)
      
      // Try to reset network connection
      try {
        await disableNetwork(db)
        await new Promise(resolve => setTimeout(resolve, 1000))
        await enableNetwork(db)
        console.log('🔧 Network reset completed')
      } catch (resetError) {
        console.log('🔧 Network reset failed:', resetError)
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return testFirestoreConnection(retryCount + 1)
    }
    
    isFirestoreOnline = false
    connectionRetryCount = retryCount + 1
    return false
  }
}

// Enhanced Firebase operation wrapper with retry logic
export async function withFirestoreRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'Firestore operation'
): Promise<T> {
  let retryCount = 0
  
  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      // Ensure network is enabled before operation
      if (!isFirestoreOnline) {
        await enableNetwork(db)
        isFirestoreOnline = true
      }
      
      const result = await operation()
      
      // Reset retry count on success
      connectionRetryCount = 0
      return result
      
    } catch (error: unknown) {
      const firebaseError = error as { code?: string }
      console.error(`❌ ${operationName} failed (attempt ${retryCount + 1}):`, error)
      
      if (firebaseError.code === 'unavailable' && retryCount < MAX_RETRY_ATTEMPTS - 1) {
        console.log(`🔄 Retrying ${operationName} in ${RETRY_DELAY}ms...`)
        
        // Mark as offline and try to reconnect
        isFirestoreOnline = false
        
        try {
          await disableNetwork(db)
          await new Promise(resolve => setTimeout(resolve, 1000))
          await enableNetwork(db)
          isFirestoreOnline = true
          console.log('🔧 Network reconnection completed')
        } catch (reconnectError) {
          console.log('🔧 Network reconnection failed:', reconnectError)
        }
        
        retryCount++
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount))
      } else {
        throw error
      }
    }
  }
  
  throw new Error(`${operationName} failed after ${MAX_RETRY_ATTEMPTS} attempts`)
}

// Test connection on client side with enhanced retry
if (typeof window !== 'undefined') {
  // Wait a bit for Firebase to fully initialize
  setTimeout(() => {
    testFirestoreConnection().then(success => {
      if (success) {
        console.log('🎉 Firebase is ready for operations')
      } else {
        console.warn('⚠️ Firebase connection issues detected - operations will use retry logic')
      }
    })
  }, 1000)
}

// Initialize Analytics only in browser and if supported
export const analytics = typeof window !== 'undefined' ? 
  isSupported().then(yes => yes ? getAnalytics(app) : null) : 
  null

// Export connection status utilities
export const getFirestoreConnectionStatus = () => ({
  isOnline: isFirestoreOnline,
  retryCount: connectionRetryCount
}) 