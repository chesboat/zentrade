"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  XCircle, 
  Shield, 
  Target,
  Clock,
  AlertTriangle,
  Bell,
  Calendar,
  Star,
  Zap,
  X
} from "lucide-react"
import { useRuleAdherence } from '@/hooks/useRuleAdherence'

interface RuleCheckInModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (xp: number, message: string) => void
}

export function RuleCheckInModal({ isOpen, onClose, onSuccess }: RuleCheckInModalProps) {
  const {
    userRules,
    checkInData,
    honestyConfirmed,
    setHonestyConfirmed,
    isLoading,
    markRuleFollowed,
    calculateXP,
    submitRuleCheckIn
  } = useRuleAdherence()

  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState<{ xp: number; message: string } | null>(null)

  if (!isOpen) return null

  const getRuleIcon = (rule: string) => {
    const lowerRule = rule.toLowerCase()
    if (lowerRule.includes('trade') && lowerRule.includes('limit')) return Target
    if (lowerRule.includes('stop') || lowerRule.includes('loss')) return AlertTriangle
    if (lowerRule.includes('time') || lowerRule.includes('session')) return Clock
    if (lowerRule.includes('confirmation') || lowerRule.includes('checklist')) return CheckCircle2
    if (lowerRule.includes('reminder') || lowerRule.includes('daily')) return Bell
    if (lowerRule.includes('journal') || lowerRule.includes('review')) return Calendar
    return Shield
  }

  const handleSubmit = async () => {
    const response = await submitRuleCheckIn()
    
    if (response.success) {
      setResult({ xp: response.xp, message: response.message })
      setShowResult(true)
      onSuccess?.(response.xp, response.message)
    }
  }

  const handleClose = () => {
    setShowResult(false)
    setResult(null)
    onClose()
  }

  const projectedXP = calculateXP()
  const answeredRules = checkInData.filter(item => item.followed !== null).length
  const allRulesAnswered = answeredRules === userRules.length
  const canSubmit = allRulesAnswered && honestyConfirmed !== null && !isLoading

  // Success/Result Screen
  if (showResult && result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <Zap className="h-8 w-8 text-green-600" />
            </div>
            
            <h2 className="text-xl font-semibold">Session Complete!</h2>
            <p className="text-gray-600">{result.message}</p>
            
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold text-yellow-800">
                <Star className="h-5 w-5" />
                +{result.xp} XP Earned
              </div>
            </div>
            
            <Button onClick={handleClose} className="w-full">
              Continue Trading Journey
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Main Check-In Screen
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              End Session Check-In
            </h2>
            <p className="text-gray-600 mt-1">
              Let's review how well you followed your trading rules today. Your honesty helps build better habits.
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Rules Review */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">How did you do with your rules?</h3>
            
            <div className="space-y-3">
              {checkInData.map((item) => {
                const IconComponent = getRuleIcon(item.rule)
                
                return (
                  <div key={item.ruleIndex} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <IconComponent className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{item.rule}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={item.followed === true ? "default" : "outline"}
                        onClick={() => markRuleFollowed(item.ruleIndex, true)}
                        className={`flex items-center gap-2 ${
                          item.followed === true 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'hover:bg-green-50 hover:border-green-300'
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Followed
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={item.followed === false ? "default" : "outline"}
                        onClick={() => markRuleFollowed(item.ruleIndex, false)}
                        className={`flex items-center gap-2 ${
                          item.followed === false 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'hover:bg-red-50 hover:border-red-300'
                        }`}
                      >
                        <XCircle className="h-3 w-3" />
                        Broke This Rule
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Honesty Check */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-3">Final Question: Were you honest?</h3>
            <p className="text-sm text-blue-700 mb-4">
              Being truthful about your performance is the first step to improvement. You get XP just for being honest.
            </p>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={honestyConfirmed === true ? "default" : "outline"}
                onClick={() => setHonestyConfirmed(true)}
                className={honestyConfirmed === true ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                Yes, I was honest
              </Button>
              
              <Button
                size="sm"
                variant={honestyConfirmed === false ? "default" : "outline"}
                onClick={() => setHonestyConfirmed(false)}
                className={honestyConfirmed === false ? 'bg-gray-600 hover:bg-gray-700' : ''}
              >
                No, I wasn't completely honest
              </Button>
            </div>
          </div>

          {/* XP Preview */}
          {allRulesAnswered && honestyConfirmed !== null && (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">XP Preview</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  +{projectedXP} XP
                </Badge>
              </div>
              
              {projectedXP > 0 && (
                <p className="text-sm text-yellow-700 mt-2">
                  {projectedXP === 25 && "Perfect! All rules followed."}
                  {projectedXP === 10 && "Great job following most rules!"}
                  {projectedXP === 5 && "Thanks for being honest. Keep improving!"}
                </p>
              )}
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Progress: {answeredRules}/{userRules.length} rules reviewed</span>
            {honestyConfirmed !== null && (
              <span className="text-green-600">✓ Honesty confirmed</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Skip for Now
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : 'Complete Check-In'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 