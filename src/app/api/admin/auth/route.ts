import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()
    
    if (!idToken) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 401 })
    }

    // Try Firebase Admin SDK first
    try {
      const { adminAuth, verifyAdminAccess } = await import('../../../../lib/firebase-admin')
      
      // Verify the ID token
      const decodedToken = await adminAuth.verifyIdToken(idToken)
      const uid = decodedToken.uid
      
      // Check if user is admin
      const isAdmin = await verifyAdminAccess(uid)
      
      return NextResponse.json({ 
        isAdmin, 
        uid,
        email: decodedToken.email,
        method: 'admin-sdk' 
      })
      
    } catch (adminError) {
      console.log('🔄 Admin SDK failed, falling back to client verification:', adminError)
      
      // Fallback: Basic verification using known admin emails
      // This is a temporary solution while we set up proper service account
      const adminEmails = ['chesboatwright@gmail.com'] // Add your admin emails here
      
      try {
        // Basic token verification (we can't verify the signature without Admin SDK)
        // But we can decode the payload to get the email
        const payload = JSON.parse(atob(idToken.split('.')[1]))
        const email = payload.email
        const uid = payload.sub || payload.user_id
        
        const isAdmin = adminEmails.includes(email)
        
        console.log('🔄 Fallback verification:', { email, isAdmin })
        
        return NextResponse.json({ 
          isAdmin, 
          uid,
          email,
          method: 'fallback' 
        })
        
      } catch (fallbackError) {
        console.error('❌ Fallback verification failed:', fallbackError)
        throw fallbackError
      }
    }
    
  } catch (error) {
    console.error('❌ Admin auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }
} 