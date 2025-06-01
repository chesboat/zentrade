import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  Timestamp,
  DocumentData 
} from 'firebase/firestore'
import { db, withFirestoreRetry } from '../firebase'
import { 
  XPSettings, 
  QuestionnaireTemplate, 
  AdminUser, 
  AdminAuditLog, 
  DEFAULT_XP_SETTINGS 
} from '../../types/admin'

// Helper function to get default XP settings with metadata
const getDefaultXPSettings = (): XPSettings => ({
  ...DEFAULT_XP_SETTINGS,
  lastModified: new Date(),
  modifiedBy: 'system',
  version: 1
})

// Check if user is admin
export const checkAdminAccess = async (userId: string): Promise<boolean> => {
  try {
    console.log('🔍 Admin Debug - Starting admin access check')
    console.log('🔍 User state:', { userId })
    
    const result = await withFirestoreRetry(async () => {
      const adminDocRef = doc(db, 'admins', userId)
      const adminDoc = await getDoc(adminDocRef)
      
      if (!adminDoc.exists()) {
        console.log('❌ Admin document does not exist for user:', userId)
        return false
      }
      
      const adminData = adminDoc.data()
      console.log('📄 Admin document data:', adminData)
      
      const isActive = adminData?.isActive === true
      const hasValidRole = ['admin', 'superAdmin'].includes(adminData?.role)
      
      console.log('🔍 Admin validation:', { isActive, hasValidRole, role: adminData?.role })
      
      return isActive && hasValidRole
    }, 'Admin access check')
    
    console.log('✅ Admin access result:', result)
    return result
    
  } catch (error) {
    console.error('❌ Error checking admin access:', error)
    return false
  }
}

// Get XP settings
export const getXPSettings = async (): Promise<XPSettings> => {
  try {
    return await withFirestoreRetry(async () => {
      const xpDocRef = doc(db, 'adminConfig', 'xpSettings')
      const xpDoc = await getDoc(xpDocRef)
      
      if (xpDoc.exists()) {
        return xpDoc.data() as XPSettings
      }
      
      console.log('🔧 Creating default XP settings')
      const defaultSettings = getDefaultXPSettings()
      await setDoc(xpDocRef, defaultSettings)
      return defaultSettings
    }, 'Get XP settings')
  } catch (error) {
    console.error('❌ Error getting XP settings:', error)
    return getDefaultXPSettings()
  }
}

// Update XP settings
export const updateXPSettings = async (settings: Partial<XPSettings>, adminUserId: string): Promise<void> => {
  await withFirestoreRetry(async () => {
    const xpDocRef = doc(db, 'adminConfig', 'xpSettings')
    const currentDoc = await getDoc(xpDocRef)
    
    const updatedSettings = {
      ...(currentDoc.exists() ? currentDoc.data() : getDefaultXPSettings()),
      ...settings,
      lastUpdated: Timestamp.now(),
      updatedBy: adminUserId
    }
    
    await setDoc(xpDocRef, updatedSettings)
    
    // Log the action
    await logAdminAction(adminUserId, 'update_xp_settings', 'xpSettings', updatedSettings)
  }, 'Update XP settings')
}

// Get questionnaire templates
export const getQuestionnaireTemplates = async (): Promise<QuestionnaireTemplate[]> => {
  try {
    return await withFirestoreRetry(async () => {
      const templatesRef = collection(db, 'questionnaireTemplates')
      const templatesQuery = query(templatesRef, orderBy('name'))
      const snapshot = await getDocs(templatesQuery)
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as QuestionnaireTemplate))
    }, 'Get questionnaire templates')
  } catch (error) {
    console.error('❌ Error getting questionnaire templates:', error)
    return []
  }
}

// Create questionnaire template
export const createQuestionnaireTemplate = async (
  template: Omit<QuestionnaireTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  adminUserId: string
): Promise<string> => {
  return await withFirestoreRetry(async () => {
    const templatesRef = collection(db, 'questionnaireTemplates')
    const newTemplate = {
      ...template,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: adminUserId
    }
    
    const docRef = await addDoc(templatesRef, newTemplate)
    
    await logAdminAction(adminUserId, 'create_questionnaire', docRef.id, newTemplate)
    
    return docRef.id
  }, 'Create questionnaire template')
}

// Update questionnaire template
export const updateQuestionnaireTemplate = async (
  templateId: string,
  updates: Partial<QuestionnaireTemplate>,
  adminUserId: string
): Promise<void> => {
  await withFirestoreRetry(async () => {
    const templateRef = doc(db, 'questionnaireTemplates', templateId)
    const updatedData = {
      ...updates,
      updatedAt: Timestamp.now(),
      updatedBy: adminUserId
    }
    
    await updateDoc(templateRef, updatedData)
    
    await logAdminAction(adminUserId, 'update_questionnaire', templateId, updatedData)
  }, 'Update questionnaire template')
}

// Delete questionnaire template
export const deleteQuestionnaireTemplate = async (templateId: string, adminUserId: string): Promise<void> => {
  await withFirestoreRetry(async () => {
    const templateRef = doc(db, 'questionnaireTemplates', templateId)
    await deleteDoc(templateRef)
    
    await logAdminAction(adminUserId, 'delete_questionnaire', templateId, {})
  }, 'Delete questionnaire template')
}

// Get admin users
export const getAdminUsers = async (): Promise<AdminUser[]> => {
  try {
    return await withFirestoreRetry(async () => {
      const adminsRef = collection(db, 'admins')
      const adminsQuery = query(adminsRef, orderBy('email'))
      const snapshot = await getDocs(adminsQuery)
      
      return snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as AdminUser))
    }, 'Get admin users')
  } catch (error) {
    console.error('❌ Error getting admin users:', error)
    return []
  }
}

// Update admin user
export const updateAdminUser = async (
  adminId: string,
  updates: Partial<AdminUser>,
  updaterUserId: string
): Promise<void> => {
  await withFirestoreRetry(async () => {
    const adminRef = doc(db, 'admins', adminId)
    const updatedData = {
      ...updates,
      updatedAt: Timestamp.now(),
      updatedBy: updaterUserId
    }
    
    await updateDoc(adminRef, updatedData)
    
    await logAdminAction(updaterUserId, 'update_admin_user', adminId, updatedData)
  }, 'Update admin user')
}

// Get audit logs
export const getAuditLogs = async (limitCount: number = 50): Promise<AdminAuditLog[]> => {
  try {
    return await withFirestoreRetry(async () => {
      const logsRef = collection(db, 'adminAuditLogs')
      const logsQuery = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount))
      const snapshot = await getDocs(logsQuery)
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AdminAuditLog))
    }, 'Get audit logs')
  } catch (error) {
    console.error('❌ Error getting audit logs:', error)
    return []
  }
}

// Log admin action
export const logAdminAction = async (
  adminUserId: string,
  action: string,
  targetId: string,
  data: DocumentData
): Promise<void> => {
  try {
    await withFirestoreRetry(async () => {
      const logsRef = collection(db, 'adminAuditLogs')
      const logEntry = {
        adminUserId,
        action,
        targetId,
        data,
        timestamp: Timestamp.now(),
        ipAddress: 'N/A', // Could be enhanced to capture actual IP
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'
      }
      
      await addDoc(logsRef, logEntry)
    }, 'Log admin action')
  } catch (error) {
    console.error('❌ Error logging admin action:', error)
    // Don't throw - logging failures shouldn't break main operations
  }
}

// Get user analytics
export const getUserAnalytics = async () => {
  try {
    return await withFirestoreRetry(async () => {
      // Get total users count (from authentication - this is a simplified approach)
      // In a real implementation, you'd want to maintain user counts in Firestore
      
      // Get recent activity metrics
      // const now = new Date()
      // const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      // Sample analytics structure - you can enhance this based on your needs
      return {
        totalUsers: 0, // Would need to track this in Firestore
        activeUsersLast7Days: 0,
        totalSessions: 0,
        averageSessionsPerUser: 0,
        topPerformers: [],
        recentActivity: []
      }
    }, 'Get user analytics')
  } catch (error) {
    console.error('❌ Error getting user analytics:', error)
    return {
      totalUsers: 0,
      activeUsersLast7Days: 0,
      totalSessions: 0,
      averageSessionsPerUser: 0,
      topPerformers: [],
      recentActivity: []
    }
  }
} 