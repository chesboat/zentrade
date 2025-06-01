import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
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

// Initialize Firestore with basic configuration
console.log('🔧 Initializing Firestore')
export const db = getFirestore(app)

// Test Firestore connection
if (typeof window !== 'undefined') {
  console.log('🔧 Testing Firestore connection...')
  // Simple connection test
  import('firebase/firestore').then(({ doc, getDoc }) => {
    const testDoc = doc(db, 'test', 'connection')
    getDoc(testDoc)
      .then(() => {
        console.log('✅ Firestore connection successful')
      })
      .catch((error) => {
        console.error('❌ Firestore connection failed:', error)
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details
        })
      })
  })
}

// Initialize Analytics only in browser and if supported
export const analytics = typeof window !== 'undefined' ? 
  isSupported().then(yes => yes ? getAnalytics(app) : null) : 
  null 