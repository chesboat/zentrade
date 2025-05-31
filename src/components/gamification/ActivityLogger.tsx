"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  BarChart3, 
  RefreshCw, 
  FileText, 
  Plus, 
  Calendar,
  Zap 
} from "lucide-react"
import { addActivity, ActivityType, XP_RULES } from '@/services/xpService'
import { useAuth } from '@/contexts/AuthContext'
import { useTraderProgress } from '@/hooks/useTraderProgress'

interface ActivityOption {
  type: ActivityType
  label: string
  description: string
  icon: React.ReactNode
  xpReward: number
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    type: 'backtest',
    label: 'Backtest Session',
    description: 'Test your strategy on historical data',
    icon: <BarChart3 className="h-4 w-4" />,
    xpReward: XP_RULES.BACKTEST_SESSION
  },
  {
    type: 'reengineer',
    label: 'Re-engineer Trade',
    description: 'Analyze and improve a trade setup',
    icon: <RefreshCw className="h-4 w-4" />,
    xpReward: XP_RULES.REENGINEER_TRADE
  },
  {
    type: 'postTradeReview',
    label: 'Post-Trade Analysis',
    description: 'Deep dive into trade performance',
    icon: <FileText className="h-4 w-4" />,
    xpReward: XP_RULES.POST_TRADE_ANALYSIS
  }
]

export function ActivityLogger() {
  const { user } = useAuth()
  const { refreshProgress } = useTraderProgress()
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!selectedActivity || !notes.trim() || !user) return

    setIsLoading(true)
    try {
      await addActivity(user.uid, selectedActivity, notes.trim())
      await refreshProgress()
      
      setShowSuccess(true)
      setSelectedActivity(null)
      setNotes('')
      
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error adding activity:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedOption = ACTIVITY_OPTIONS.find(option => option.type === selectedActivity)

  if (showSuccess) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-green-600 text-lg font-semibold">
              🎉 Activity Logged!
            </div>
            <div className="text-sm text-green-700">
              +{selectedOption?.xpReward} XP earned
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Log Trading Activity
        </CardTitle>
        <CardDescription>
          Earn XP by tracking your learning and analysis sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedActivity ? (
          <div className="grid gap-3">
            {ACTIVITY_OPTIONS.map((option) => (
              <Button
                key={option.type}
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => setSelectedActivity(option.type)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-shrink-0">
                    {option.icon}
                  </div>
                  <div className="text-left flex-grow">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    +{option.xpReward}
                  </Badge>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected Activity Header */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {selectedOption?.icon}
                <span className="font-medium">{selectedOption?.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  +{selectedOption?.xpReward} XP
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedActivity(null)
                    setNotes('')
                  }}
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Notes Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Activity Notes
              </label>
              <Textarea
                placeholder={`Describe your ${selectedOption?.label.toLowerCase()} session... What did you learn? What patterns did you discover?`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-24"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!notes.trim() || isLoading}
                className="flex-grow"
              >
                {isLoading ? 'Logging...' : `Log Activity (+${selectedOption?.xpReward} XP)`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 