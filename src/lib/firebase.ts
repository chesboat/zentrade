import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

// Get environment variables with fallbacks
const getEnvVar = (name: string): string => {
  if (typeof window !== 'undefined') {
    // Client-side: Access from window object if available
    return (window as any).__NEXT_DATA__?.buildId ? 
      process.env[name] || '' : 
      process.env[name] || ''
  }
  // Server-side: Direct access
  return process.env[name] || ''
}

const firebaseConfig = {
  apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID'),
  measurementId: getEnvVar('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID')
}

// Debug logging
console.log('Firebase config values:', {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING',
  authDomain: firebaseConfig.authDomain || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
  storageBucket: firebaseConfig.storageBucket || 'MISSING',
  messagingSenderId: firebaseConfig.messagingSenderId || 'MISSING',
  appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 10)}...` : 'MISSING',
  measurementId: firebaseConfig.measurementId || 'MISSING'
})

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Critical Firebase config missing:', {
    apiKey: !!firebaseConfig.apiKey,
    authDomain: !!firebaseConfig.authDomain,
    projectId: !!firebaseConfig.projectId
  })
  
  // Fallback config for development/testing
  if (process.env.NODE_ENV === 'development' || !firebaseConfig.apiKey) {
    console.warn('Using fallback Firebase config')
    Object.assign(firebaseConfig, {
      apiKey: "AIzaSyDZMHOjsrU4JoTMpfETVIWZD2XE6AvvNm4",
      authDomain: "zentrade-47b22.firebaseapp.com",
      projectId: "zentrade-47b22",
      storageBucket: "zentrade-47b22.firebasestorage.app",
      messagingSenderId: "387938157784",
      appId: "1:387938157784:web:a792e40a28e6f5e02843ad",
      measurementId: "G-M9Q0F59WHZ"
    })
  }
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Initialize Analytics only in browser and if supported
export const analytics = typeof window !== 'undefined' ? 
  isSupported().then(yes => yes ? getAnalytics(app) : null) : 
  null 