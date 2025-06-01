import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, verifyAdminAccess } from '../../../../lib/firebase-admin'

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
    
    // Get questionnaire templates
    const templatesSnapshot = await adminDb.collection('questionnaireTemplates')
      .orderBy('name')
      .get()
    
    const templates = templatesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    return NextResponse.json(templates)
    
  } catch (error) {
    console.error('Questionnaires GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    
    const templateData = await request.json()
    
    // Create new template
    const newTemplate = {
      ...templateData,
      createdAt: new Date(),
      lastModified: new Date(),
      createdBy: decodedToken.uid,
      modifiedBy: decodedToken.uid,
      usageCount: 0
    }
    
    const docRef = await adminDb.collection('questionnaireTemplates').add(newTemplate)
    
    // Log the action
    await adminDb.collection('adminAuditLogs').add({
      adminUserId: decodedToken.uid,
      action: 'create_questionnaire',
      targetId: docRef.id,
      data: newTemplate,
      timestamp: new Date(),
      userAgent: request.headers.get('user-agent') || 'Unknown'
    })
    
    return NextResponse.json({ id: docRef.id, ...newTemplate })
    
  } catch (error) {
    console.error('Questionnaires POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 