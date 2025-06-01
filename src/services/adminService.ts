import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { 
  XPSettings, 
  QuestionnaireTemplate, 
  AdminAuditLog, 
  AdminUser,
  DEFAULT_XP_SETTINGS,
  DEFAULT_TRADING_RULES_TEMPLATE
} from '@/types/admin'

// Admin Authentication
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const adminRef = doc(db, 'admins', userId)
    const adminSnap = await getDoc(adminRef)
    return adminSnap.exists() && adminSnap.data()?.isActive === true
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

export const getAdminUser = async (userId: string): Promise<AdminUser | null> => {
  try {
    const adminRef = doc(db, 'admins', userId)
    const adminSnap = await getDoc(adminRef)
    
    if (adminSnap.exists()) {
      return adminSnap.data() as AdminUser
    }
    return null
  } catch (error) {
    console.error('Error getting admin user:', error)
    return null
  }
}

// XP Settings Management
export const getXPSettings = async (): Promise<XPSettings> => {
  try {
    const settingsRef = doc(db, 'adminConfig', 'xpSettings')
    const settingsSnap = await getDoc(settingsRef)
    
    if (settingsSnap.exists()) {
      const data = settingsSnap.data()
      return {
        ...data,
        lastModified: data.lastModified?.toDate() || new Date()
      } as XPSettings
    } else {
      // Create default settings if they don't exist
      const defaultSettings = {
        ...DEFAULT_XP_SETTINGS,
        lastModified: serverTimestamp(),
        modifiedBy: 'system',
        version: 1
      }
      await setDoc(settingsRef, defaultSettings)
      return {
        ...defaultSettings,
        lastModified: new Date()
      } as XPSettings
    }
  } catch (error) {
    console.error('Error getting XP settings:', error)
    throw error
  }
}

export const updateXPSettings = async (
  newSettings: Partial<XPSettings>, 
  adminUserId: string
): Promise<void> => {
  try {
    const settingsRef = doc(db, 'adminConfig', 'xpSettings')
    const currentSettings = await getXPSettings()
    
    const updatedData = {
      ...currentSettings,
      ...newSettings,
      lastModified: serverTimestamp(),
      modifiedBy: adminUserId,
      version: currentSettings.version + 1
    }
    
    await updateDoc(settingsRef, updatedData)
    
    // Log the change
    await logAdminAction(
      adminUserId,
      'update',
      'xp-settings',
      'xpSettings',
      currentSettings,
      { ...updatedData, lastModified: new Date() }
    )
  } catch (error) {
    console.error('Error updating XP settings:', error)
    throw error
  }
}

// Questionnaire Template Management
export const getQuestionnaireTemplates = async (): Promise<QuestionnaireTemplate[]> => {
  try {
    const templatesRef = collection(db, 'questionnaireTemplates')
    const templatesSnap = await getDocs(query(templatesRef, orderBy('name')))
    
    return templatesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as QuestionnaireTemplate))
  } catch (error) {
    console.error('Error getting questionnaire templates:', error)
    throw error
  }
}

export const getQuestionnaireTemplate = async (templateId: string): Promise<QuestionnaireTemplate | null> => {
  try {
    const templateRef = doc(db, 'questionnaireTemplates', templateId)
    const templateSnap = await getDoc(templateRef)
    
    if (templateSnap.exists()) {
      return {
        id: templateSnap.id,
        ...templateSnap.data()
      } as QuestionnaireTemplate
    }
    return null
  } catch (error) {
    console.error('Error getting questionnaire template:', error)
    throw error
  }
}

export const createQuestionnaireTemplate = async (
  template: Omit<QuestionnaireTemplate, 'id' | 'createdAt' | 'lastModified' | 'usageCount'>,
  adminUserId: string
): Promise<string> => {
  try {
    const templatesRef = collection(db, 'questionnaireTemplates')
    const templateDoc = doc(templatesRef)
    
    const newTemplate: QuestionnaireTemplate = {
      ...template,
      id: templateDoc.id,
      createdAt: new Date(),
      lastModified: new Date(),
      usageCount: 0
    }
    
    await setDoc(templateDoc, newTemplate)
    
    // Log the change
    await logAdminAction(
      adminUserId,
      'create',
      'questionnaire-template',
      templateDoc.id,
      null,
      newTemplate
    )
    
    return templateDoc.id
  } catch (error) {
    console.error('Error creating questionnaire template:', error)
    throw error
  }
}

export const updateQuestionnaireTemplate = async (
  templateId: string,
  updates: Partial<QuestionnaireTemplate>,
  adminUserId: string
): Promise<void> => {
  try {
    const templateRef = doc(db, 'questionnaireTemplates', templateId)
    const currentTemplate = await getQuestionnaireTemplate(templateId)
    
    if (!currentTemplate) {
      throw new Error('Template not found')
    }
    
    const updatedTemplate = {
      ...currentTemplate,
      ...updates,
      lastModified: new Date(),
      modifiedBy: adminUserId
    }
    
    await updateDoc(templateRef, updatedTemplate)
    
    // Log the change
    await logAdminAction(
      adminUserId,
      'update',
      'questionnaire-template',
      templateId,
      currentTemplate,
      updatedTemplate
    )
  } catch (error) {
    console.error('Error updating questionnaire template:', error)
    throw error
  }
}

export const deleteQuestionnaireTemplate = async (
  templateId: string,
  adminUserId: string
): Promise<void> => {
  try {
    const templateRef = doc(db, 'questionnaireTemplates', templateId)
    const currentTemplate = await getQuestionnaireTemplate(templateId)
    
    if (!currentTemplate) {
      throw new Error('Template not found')
    }
    
    // Don't allow deletion of default templates
    if (currentTemplate.isDefault) {
      throw new Error('Cannot delete default templates')
    }
    
    await deleteDoc(templateRef)
    
    // Log the change
    await logAdminAction(
      adminUserId,
      'delete',
      'questionnaire-template',
      templateId,
      currentTemplate,
      null
    )
  } catch (error) {
    console.error('Error deleting questionnaire template:', error)
    throw error
  }
}

// Initialize default data
export const initializeDefaultData = async (adminUserId: string): Promise<void> => {
  try {
    const batch = writeBatch(db)
    
    // Create default XP settings
    const xpSettingsRef = doc(db, 'adminConfig', 'xpSettings')
    const xpSettingsSnap = await getDoc(xpSettingsRef)
    
    if (!xpSettingsSnap.exists()) {
      const defaultSettings: XPSettings = {
        ...DEFAULT_XP_SETTINGS,
        lastModified: new Date(),
        modifiedBy: adminUserId,
        version: 1
      }
      batch.set(xpSettingsRef, defaultSettings)
    }
    
    // Create default trading rules template
    const templatesRef = collection(db, 'questionnaireTemplates')
    const defaultTemplateQuery = query(templatesRef, where('isDefault', '==', true))
    const defaultTemplateSnap = await getDocs(defaultTemplateQuery)
    
    if (defaultTemplateSnap.empty) {
      const templateDoc = doc(templatesRef)
      const defaultTemplate: QuestionnaireTemplate = {
        ...DEFAULT_TRADING_RULES_TEMPLATE,
        id: templateDoc.id,
        createdAt: new Date(),
        lastModified: new Date(),
        createdBy: adminUserId,
        modifiedBy: adminUserId,
        usageCount: 0
      }
      batch.set(templateDoc, defaultTemplate)
    }
    
    await batch.commit()
  } catch (error) {
    console.error('Error initializing default data:', error)
    throw error
  }
}

// Audit Logging
export const logAdminAction = async (
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  oldValue?: unknown,
  newValue?: unknown
): Promise<void> => {
  try {
    const logsRef = collection(db, 'adminAuditLogs')
    const logDoc = doc(logsRef)
    
    const logEntry: AdminAuditLog = {
      id: logDoc.id,
      userId,
      userEmail: '', // Will be filled by admin user context
      action,
      resource,
      resourceId,
      oldValue,
      newValue,
      timestamp: new Date()
    }
    
    await setDoc(logDoc, logEntry)
  } catch (error) {
    console.error('Error logging admin action:', error)
    // Don't throw error - logging shouldn't break the main operation
  }
}

export const getAuditLogs = async (limit: number = 100): Promise<AdminAuditLog[]> => {
  try {
    const logsRef = collection(db, 'adminAuditLogs')
    const logsSnap = await getDocs(query(logsRef, orderBy('timestamp', 'desc')))
    
    return logsSnap.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AdminAuditLog))
  } catch (error) {
    console.error('Error getting audit logs:', error)
    throw error
  }
}

// User Analytics for Admin
export const getUserAnalytics = async () => {
  try {
    // Get user count
    const usersRef = collection(db, 'users')
    const usersSnap = await getDocs(usersRef)
    const totalUsers = usersSnap.size
    
    // Get active users (logged in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const activeUsersQuery = query(
      usersRef, 
      where('lastLoginDate', '>=', thirtyDaysAgo)
    )
    const activeUsersSnap = await getDocs(activeUsersQuery)
    const activeUsers = activeUsersSnap.size
    
    // Get rule logs for engagement metrics
    const ruleLogsRef = collection(db, 'ruleLogs')
    const ruleLogsSnap = await getDocs(ruleLogsRef)
    const totalRuleCheckIns = ruleLogsSnap.size
    
    return {
      totalUsers,
      activeUsers,
      totalRuleCheckIns,
      engagementRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
    }
  } catch (error) {
    console.error('Error getting user analytics:', error)
    throw error
  }
} 