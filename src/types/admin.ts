// Admin System Types

export interface XPConfig {
  id: string
  category: string
  action: string
  description: string
  baseValue: number
  isActive: boolean
  lastModified: Date
  modifiedBy: string
}

export interface XPSettings {
  // Rule Adherence XP
  allRulesFollowed: number
  threeOrMoreRulesFollowed: number
  honestyBonus: number
  
  // Trading Activity XP
  tradeLogged: number
  emotionTagged: number
  journalWritten: number
  lossJournaledWithEmotion: number
  tiltPrevented: number
  
  // Learning & Analysis XP
  backtestSession: number
  reengineeredTrade: number
  postTradeAnalysis: number
  dailyQuestCompleted: number
  
  // Bonus & Streak XP
  perfectDayBonus: number
  weeklyStreakBonus: number
  monthlyStreakBonus: number
  
  // Level Configuration
  xpPerLevel: number
  
  // Metadata
  lastModified: Date
  modifiedBy: string
  version: number
}

export interface QuestionnaireTemplate {
  id: string
  name: string
  description: string
  category: 'trading-rules' | 'post-trade-reflection' | 'daily-review' | 'weekly-review' | 'custom'
  questions: QuestionTemplate[]
  isActive: boolean
  isDefault: boolean
  createdAt: Date
  lastModified: Date
  createdBy: string
  modifiedBy: string
  usageCount: number // How many users are using this template
}

export interface QuestionTemplate {
  id: string
  text: string
  type: 'boolean' | 'scale' | 'multiple-choice' | 'text' | 'number'
  isRequired: boolean
  order: number
  options?: string[] // For multiple-choice questions
  minValue?: number // For scale/number questions
  maxValue?: number // For scale/number questions
  placeholder?: string // For text questions
  helpText?: string
  category?: string
  icon?: string // Icon name for display
}

export interface AdminUser {
  uid: string
  email: string
  displayName: string
  role: 'super-admin' | 'admin' | 'moderator'
  permissions: AdminPermission[]
  lastLogin: Date
  isActive: boolean
}

export interface AdminPermission {
  resource: 'xp-settings' | 'questionnaires' | 'users' | 'analytics' | 'system'
  actions: ('read' | 'write' | 'delete' | 'publish')[]
}

export interface AdminAuditLog {
  id: string
  userId: string
  userEmail: string
  action: string
  resource: string
  resourceId: string
  oldValue?: unknown
  newValue?: unknown
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

// Default XP Configuration
export const DEFAULT_XP_SETTINGS: Omit<XPSettings, 'lastModified' | 'modifiedBy' | 'version'> = {
  // Rule Adherence XP
  allRulesFollowed: 25,
  threeOrMoreRulesFollowed: 10,
  honestyBonus: 5,
  
  // Trading Activity XP
  tradeLogged: 10,
  emotionTagged: 10,
  journalWritten: 10,
  lossJournaledWithEmotion: 20,
  tiltPrevented: 30,
  
  // Learning & Analysis XP
  backtestSession: 40,
  reengineeredTrade: 25,
  postTradeAnalysis: 20,
  dailyQuestCompleted: 20,
  
  // Bonus & Streak XP
  perfectDayBonus: 15,
  weeklyStreakBonus: 50,
  monthlyStreakBonus: 200,
  
  // Level Configuration
  xpPerLevel: 1000
}

// Default Rule Adherence Questions
export const DEFAULT_TRADING_RULES_TEMPLATE: Omit<QuestionnaireTemplate, 'id' | 'createdAt' | 'lastModified' | 'createdBy' | 'modifiedBy' | 'usageCount'> = {
  name: "Daily Trading Rules Check-In",
  description: "Standard trading discipline questionnaire for end-of-session review",
  category: 'trading-rules',
  isActive: true,
  isDefault: true,
  questions: [
    {
      id: 'rule-1',
      text: "I only traded my pre-planned setups",
      type: 'boolean',
      isRequired: true,
      order: 1,
      category: 'discipline',
      icon: 'target',
      helpText: "Did you stick to your predetermined entry criteria?"
    },
    {
      id: 'rule-2', 
      text: "I used proper position sizing",
      type: 'boolean',
      isRequired: true,
      order: 2,
      category: 'risk-management',
      icon: 'shield',
      helpText: "Did you risk the appropriate amount per trade?"
    },
    {
      id: 'rule-3',
      text: "I set stop losses before entering trades",
      type: 'boolean',
      isRequired: true,
      order: 3,
      category: 'risk-management',
      icon: 'alert-triangle',
      helpText: "Did you define your exit strategy before entry?"
    },
    {
      id: 'rule-4',
      text: "I honored my stop losses",
      type: 'boolean',
      isRequired: true,
      order: 4,
      category: 'discipline',
      icon: 'check-circle',
      helpText: "Did you exit when your stop was hit?"
    },
    {
      id: 'rule-5',
      text: "I avoided revenge trading",
      type: 'boolean',
      isRequired: true,
      order: 5,
      category: 'emotional-control',
      icon: 'brain',
      helpText: "Did you stay disciplined after losses?"
    }
  ]
} 