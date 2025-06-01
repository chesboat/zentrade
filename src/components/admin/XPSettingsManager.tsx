"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { 
  Save, 
  RefreshCw, 
  Settings,
  Target,
  Shield,
  Brain,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { useAuth } from '@/contexts/AuthContext'
import { getXPSettings, updateXPSettings } from '@/lib/services/adminApiService'
import { XPSettings } from '@/types/admin'

interface XPValueInput {
  label: string
  key: keyof XPSettings
  description: string
  category: string
  icon: React.ElementType
  min?: number
  max?: number
}

const XP_CONFIG: XPValueInput[] = [
  // Rule Adherence XP
  {
    label: "All Rules Followed",
    key: "allRulesFollowed",
    description: "Perfect rule adherence for the day",
    category: "Rule Adherence",
    icon: Award,
    min: 0,
    max: 100
  },
  {
    label: "3+ Rules Followed",
    key: "threeOrMoreRulesFollowed", 
    description: "Good rule adherence (3 or more rules)",
    category: "Rule Adherence",
    icon: Target,
    min: 0,
    max: 50
  },
  {
    label: "Honesty Bonus",
    key: "honestyBonus",
    description: "Being honest about rule adherence",
    category: "Rule Adherence", 
    icon: Shield,
    min: 0,
    max: 25
  },
  
  // Trading Activity XP
  {
    label: "Trade Logged",
    key: "tradeLogged",
    description: "Recording a trade in the journal",
    category: "Trading Activity",
    icon: TrendingUp,
    min: 0,
    max: 25
  },
  {
    label: "Emotion Tagged",
    key: "emotionTagged",
    description: "Adding emotional context to trades",
    category: "Trading Activity",
    icon: Brain,
    min: 0,
    max: 25
  },
  {
    label: "Journal Written",
    key: "journalWritten",
    description: "Writing detailed trade notes",
    category: "Trading Activity",
    icon: Brain,
    min: 0,
    max: 25
  },
  {
    label: "Loss Journaled with Emotion",
    key: "lossJournaledWithEmotion",
    description: "Reflecting on losing trades emotionally",
    category: "Trading Activity",
    icon: Brain,
    min: 0,
    max: 50
  },
  {
    label: "Tilt Prevented",
    key: "tiltPrevented",
    description: "Avoiding revenge trading",
    category: "Trading Activity",
    icon: Shield,
    min: 0,
    max: 75
  },
  
  // Learning & Analysis XP
  {
    label: "Backtest Session",
    key: "backtestSession",
    description: "Conducting strategy backtests",
    category: "Learning & Analysis",
    icon: TrendingUp,
    min: 0,
    max: 100
  },
  {
    label: "Re-engineered Trade",
    key: "reengineeredTrade",
    description: "Analyzing and improving trade ideas",
    category: "Learning & Analysis",
    icon: Settings,
    min: 0,
    max: 75
  },
  {
    label: "Post-Trade Analysis",
    key: "postTradeAnalysis",
    description: "Detailed trade review and analysis",
    category: "Learning & Analysis",
    icon: TrendingUp,
    min: 0,
    max: 50
  },
  {
    label: "Daily Quest Completed",
    key: "dailyQuestCompleted",
    description: "Completing daily trading objectives",
    category: "Learning & Analysis",
    icon: Target,
    min: 0,
    max: 50
  },
  
  // Bonus & Streak XP
  {
    label: "Perfect Day Bonus",
    key: "perfectDayBonus",
    description: "Additional bonus for exceptional days",
    category: "Bonus & Streaks",
    icon: Award,
    min: 0,
    max: 50
  },
  {
    label: "Weekly Streak Bonus",
    key: "weeklyStreakBonus",
    description: "Maintaining consistency for 7 days",
    category: "Bonus & Streaks",
    icon: Award,
    min: 0,
    max: 150
  },
  {
    label: "Monthly Streak Bonus",
    key: "monthlyStreakBonus",
    description: "Maintaining consistency for 30 days",
    category: "Bonus & Streaks",
    icon: Award,
    min: 0,
    max: 500
  },
  
  // Level Configuration
  {
    label: "XP Per Level",
    key: "xpPerLevel",
    description: "Experience points required per level",
    category: "Level System",
    icon: TrendingUp,
    min: 100,
    max: 5000
  }
]

export function XPSettingsManager() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<XPSettings | null>(null)
  const [originalSettings, setOriginalSettings] = useState<XPSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    // Check for changes whenever settings update
    if (settings && originalSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings)
      setHasChanges(changed)
    }
  }, [settings, originalSettings])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('🔍 Loading XP settings via API...')
      
      const xpSettings = await getXPSettings()
      console.log('✅ XP settings loaded successfully')
      
      setSettings(xpSettings)
      setOriginalSettings(JSON.parse(JSON.stringify(xpSettings))) // Deep copy
    } catch (error) {
      console.error('❌ Error loading XP settings:', error)
      setError((error as Error).message || 'Failed to load XP settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleValueChange = (key: keyof XPSettings, value: number) => {
    if (!settings) return
    
    const config = XP_CONFIG.find(c => c.key === key)
    if (config) {
      // Validate min/max bounds
      const clampedValue = Math.max(
        config.min || 0, 
        Math.min(config.max || 999999, value)
      )
      
      setSettings({
        ...settings,
        [key]: clampedValue
      })
    }
  }

  const handleSave = async () => {
    if (!settings || !user) return
    
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)
      
      console.log('🔍 Saving XP settings via API...')
      
      // Prepare update data (exclude metadata fields)
      const { lastModified, modifiedBy, version, ...updateData } = settings
      
      const updatedSettings = await updateXPSettings(updateData)
      console.log('✅ XP settings saved successfully')
      
      setSettings(updatedSettings)
      setOriginalSettings(JSON.parse(JSON.stringify(updatedSettings)))
      setSuccess('XP settings saved successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (error) {
      console.error('❌ Error saving XP settings:', error)
      setError((error as Error).message || 'Failed to save XP settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (originalSettings) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)))
      setError(null)
      setSuccess(null)
    }
  }

  // Group XP configs by category
  const groupedConfigs = XP_CONFIG.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = []
    }
    acc[config.category].push(config)
    return acc
  }, {} as Record<string, XPValueInput[]>)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading XP settings...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            Failed to load XP settings. Please try refreshing the page.
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">XP Settings Management</h2>
          <p className="text-gray-600">Configure experience point values for all trading activities</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Version {settings.version}
          </Badge>
          <Badge variant={hasChanges ? "destructive" : "default"}>
            {hasChanges ? "Unsaved Changes" : "Saved"}
          </Badge>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="text-red-800">{error}</div>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <div className="text-green-800">{success}</div>
        </Alert>
      )}

      {/* XP Configuration */}
      <div className="space-y-6">
        {Object.entries(groupedConfigs).map(([category, configs]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {configs.map((config) => {
                  const IconComponent = config.icon
                  const currentValue = settings[config.key] as number
                  
                  return (
                    <div key={config.key} className="space-y-3 p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded">
                          <IconComponent className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <label className="font-medium text-sm">
                            {config.label}
                          </label>
                          <p className="text-xs text-gray-600 mt-1">
                            {config.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={config.min || 0}
                          max={config.max || 1000}
                          value={currentValue}
                          onChange={(e) => handleValueChange(config.key, parseInt(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <div className="text-sm text-gray-500 min-w-[40px]">
                          {currentValue} XP
                        </div>
                      </div>
                      
                      {config.min !== undefined && config.max !== undefined && (
                        <div className="text-xs text-gray-500">
                          Range: {config.min} - {config.max} XP
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div className="text-sm text-gray-500">
          Last modified: {settings.lastModified.toLocaleString()}
          {settings.modifiedBy && ` by ${settings.modifiedBy}`}
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Changes
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
} 