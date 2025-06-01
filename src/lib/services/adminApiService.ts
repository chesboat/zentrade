import { auth } from '../firebase'
import { XPSettings, QuestionnaireTemplate } from '../../types/admin'

// Helper to get auth header
const getAuthHeader = async (): Promise<string> => {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User not authenticated')
  }
  
  const idToken = await user.getIdToken()
  return `Bearer ${idToken}`
}

// Helper for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const authHeader = await getAuthHeader()
  
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'API call failed')
  }
  
  return response.json()
}

// Admin authentication
export const checkAdminAccess = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser
    if (!user) return false
    
    const idToken = await user.getIdToken()
    const response = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    })
    
    if (!response.ok) return false
    
    const data = await response.json()
    return data.isAdmin
  } catch (error) {
    console.error('Admin access check failed:', error)
    return false
  }
}

// XP Settings
export const getXPSettings = async (): Promise<XPSettings> => {
  return apiCall('/api/admin/xp-settings')
}

export const updateXPSettings = async (settings: Partial<XPSettings>): Promise<XPSettings> => {
  return apiCall('/api/admin/xp-settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  })
}

// Questionnaires
export const getQuestionnaireTemplates = async (): Promise<QuestionnaireTemplate[]> => {
  return apiCall('/api/admin/questionnaires')
}

export const createQuestionnaireTemplate = async (
  template: Omit<QuestionnaireTemplate, 'id' | 'createdAt' | 'lastModified' | 'createdBy' | 'modifiedBy' | 'usageCount'>
): Promise<QuestionnaireTemplate> => {
  return apiCall('/api/admin/questionnaires', {
    method: 'POST',
    body: JSON.stringify(template)
  })
}

// Basic analytics (placeholder for now)
export const getUserAnalytics = async () => {
  // This would be implemented as a separate API route when needed
  return {
    totalUsers: 0,
    activeUsersLast7Days: 0,
    totalSessions: 0,
    averageSessionsPerUser: 0,
    topPerformers: [],
    recentActivity: []
  }
} 