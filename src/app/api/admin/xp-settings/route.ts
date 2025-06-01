import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_XP_SETTINGS } from '../../../../types/admin'

// Helper function to verify admin access with fallback
async function verifyAdminWithFallback(idToken: string) {
  try {
    // Try Admin SDK first
    const { adminAuth, verifyAdminAccess } = await import('../../../../lib/firebase-admin')
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const isAdmin = await verifyAdminAccess(decodedToken.uid)
    return { isAdmin, uid: decodedToken.uid, method: 'admin-sdk' }
  } catch {
    console.log('🔄 Admin SDK failed, using fallback verification')
    // Fallback verification
    const adminEmails = ['chesbo@gmail.com']
    const payload = JSON.parse(atob(idToken.split('.')[1]))
    const isAdmin = adminEmails.includes(payload.email)
    return { isAdmin, uid: payload.sub || payload.user_id, method: 'fallback' }
  }
}

// Helper function to get Firestore with fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFirestoreWithFallback(): Promise<{ db: any; method: string }> {
  try {
    const { adminDb } = await import('../../../../lib/firebase-admin')
    return { db: adminDb, method: 'admin-sdk' }
  } catch {
    console.log('🔄 Using client-side Firestore as fallback')
    const { db } = await import('../../../../lib/firebase')
    return { db, method: 'client-sdk' }
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const idToken = authHeader.substring(7)
    const { isAdmin } = await verifyAdminWithFallback(idToken)
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { db } = await getFirestoreWithFallback()
    
    // Get XP settings
    const xpDoc = await db.collection('adminConfig').doc('xpSettings').get()
    
    if (xpDoc.exists) {
      return NextResponse.json(xpDoc.data())
    } else {
      // Create default settings
      const defaultSettings = {
        ...DEFAULT_XP_SETTINGS,
        lastModified: new Date(),
        modifiedBy: 'system',
        version: 1
      }
      
      await db.collection('adminConfig').doc('xpSettings').set(defaultSettings)
      return NextResponse.json(defaultSettings)
    }
    
  } catch (error) {
    console.error('❌ XP settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const idToken = authHeader.substring(7)
    const { isAdmin, uid } = await verifyAdminWithFallback(idToken)
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const updates = await request.json()
    const { db } = await getFirestoreWithFallback()
    
    // Get current settings
    const xpDoc = await db.collection('adminConfig').doc('xpSettings').get()
    const currentSettings = xpDoc.exists ? xpDoc.data() : {
      ...DEFAULT_XP_SETTINGS,
      lastModified: new Date(),
      modifiedBy: 'system',
      version: 0
    }
    
    // Update settings
    const updatedSettings = {
      ...currentSettings,
      ...updates,
      lastModified: new Date(),
      modifiedBy: uid,
      version: ((currentSettings as { version?: number })?.version || 0) + 1
    }
    
    await db.collection('adminConfig').doc('xpSettings').set(updatedSettings)
    
    // Try to log the action (optional, won't fail if it doesn't work)
    try {
      await db.collection('adminAuditLogs').add({
        adminUserId: uid,
        action: 'update_xp_settings',
        targetId: 'xpSettings',
        data: updates,
        timestamp: new Date(),
        userAgent: request.headers.get('user-agent') || 'Unknown'
      })
    } catch (logError) {
      console.log('⚠️ Could not log admin action (non-critical):', logError)
    }
    
    return NextResponse.json(updatedSettings)
    
  } catch (error) {
    console.error('❌ XP settings PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 