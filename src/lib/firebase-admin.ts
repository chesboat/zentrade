import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Firebase Admin SDK configuration
const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "zentrade-47b22",
  // For production, you'd use a service account key
  // For now, we'll use the project ID and let Vercel handle auth via environment
}

// Initialize Firebase Admin (avoid multiple initialization)
let adminApp;
if (getApps().length === 0) {
  adminApp = initializeApp(firebaseAdminConfig, 'admin')
} else {
  adminApp = getApps().find(app => app.name === 'admin') || getApps()[0]
}

// Export admin services
export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)

// Admin helper functions
export const verifyAdminAccess = async (uid: string): Promise<boolean> => {
  try {
    const adminDoc = await adminDb.collection('admins').doc(uid).get()
    
    if (!adminDoc.exists) {
      return false
    }
    
    const adminData = adminDoc.data()
    return adminData?.isActive === true && ['admin', 'superAdmin'].includes(adminData?.role)
  } catch (error) {
    console.error('Admin verification error:', error)
    return false
  }
}

export default adminApp 