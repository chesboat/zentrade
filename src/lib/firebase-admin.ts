import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Firebase Admin SDK configuration
const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "zentrade-47b22",
  credential: applicationDefault(),
}

// Initialize Firebase Admin (avoid multiple initialization)
let adminApp;
try {
  if (getApps().length === 0) {
    console.log('🔧 Initializing Firebase Admin with Application Default Credentials')
    adminApp = initializeApp(firebaseAdminConfig, 'admin')
  } else {
    adminApp = getApps().find(app => app.name === 'admin') || getApps()[0]
  }
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error)
  // Fallback to basic config for development
  if (getApps().length === 0) {
    console.log('🔧 Falling back to basic Firebase Admin config')
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "zentrade-47b22",
    }, 'admin')
  } else {
    adminApp = getApps()[0]
  }
}

// Export admin services
export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)

// Admin helper functions
export const verifyAdminAccess = async (uid: string): Promise<boolean> => {
  try {
    console.log('🔍 Verifying admin access for UID:', uid)
    const adminDoc = await adminDb.collection('admins').doc(uid).get()
    
    if (!adminDoc.exists) {
      console.log('❌ Admin document does not exist for user:', uid)
      return false
    }
    
    const adminData = adminDoc.data()
    console.log('📄 Admin document data:', adminData)
    
    const isActive = adminData?.isActive === true
    const hasValidRole = ['admin', 'superAdmin'].includes(adminData?.role)
    
    console.log('🔍 Admin validation result:', { isActive, hasValidRole, role: adminData?.role })
    
    return isActive && hasValidRole
  } catch (error) {
    console.error('❌ Admin verification error:', error)
    return false
  }
}

export default adminApp 