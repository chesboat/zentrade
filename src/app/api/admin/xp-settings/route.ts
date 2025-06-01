import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, verifyAdminAccess } from '../../../../lib/firebase-admin'
import { DEFAULT_XP_SETTINGS } from '../../../../types/admin'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const idToken = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const isAdmin = await verifyAdminAccess(decodedToken.uid)
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get XP settings
    const xpDoc = await adminDb.collection('adminConfig').doc('xpSettings').get()
    
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
      
      await adminDb.collection('adminConfig').doc('xpSettings').set(defaultSettings)
      return NextResponse.json(defaultSettings)
    }
    
  } catch (error) {
    console.error('XP settings GET error:', error)
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
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const isAdmin = await verifyAdminAccess(decodedToken.uid)
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const updates = await request.json()
    
    // Get current settings
    const xpDoc = await adminDb.collection('adminConfig').doc('xpSettings').get()
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
      modifiedBy: decodedToken.uid,
      version: ((currentSettings as { version?: number })?.version || 0) + 1
    }
    
    await adminDb.collection('adminConfig').doc('xpSettings').set(updatedSettings)
    
    // Log the action
    await adminDb.collection('adminAuditLogs').add({
      adminUserId: decodedToken.uid,
      action: 'update_xp_settings',
      targetId: 'xpSettings',
      data: updates,
      timestamp: new Date(),
      userAgent: request.headers.get('user-agent') || 'Unknown'
    })
    
    return NextResponse.json(updatedSettings)
    
  } catch (error) {
    console.error('XP settings PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 