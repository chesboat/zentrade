import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, verifyAdminAccess } from '../../../../lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()
    
    if (!idToken) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 401 })
    }
    
    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const uid = decodedToken.uid
    
    // Check if user is admin
    const isAdmin = await verifyAdminAccess(uid)
    
    return NextResponse.json({ 
      isAdmin, 
      uid,
      email: decodedToken.email 
    })
    
  } catch (error) {
    console.error('Admin auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }
} 