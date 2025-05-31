"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { 
  Shield, 
  Target, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Calendar, 
  Bell, 
  Settings, 
  Lightbulb,
  Edit,
  ChevronRight,
  Zap,
  X
} from "lucide-react"
import { useAuth } from '@/contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface RulePreferences {
  maxTradesPerDay: number
  stopAfterWin: boolean
  behaviorAfterLoss: "stop" | "break" | "continue" | "prompt"
  session: "london" | "newyork" | "asia" | "custom"
  requiresConfirmation: boolean
  usesChecklist: boolean
  journalReviewFrequency: "daily" | "weekly" | "monthly" | "never"
  dailyRemindersEnabled: boolean
  followUpStyle: "summary" | "checklist" | "manual"
  wantsSuggestedRules: boolean
  customRules: string[]
}

const SUGGESTED_RULES = [
  "Stop trading after one good setup hits TP",
  "No revenge trades after losses",
  "Trade only 8:30–11:30 NY",
  "Must journal before placing a new trade",
  "Maximum 3 consecutive losing trades per day",
  "Take a 15-minute break after each loss",
  "Only trade A+ setups on high-volume stocks",
  "Risk management: Never risk more than 1% per trade"
]

export function RuleSetupForm() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [customRulesText, setCustomRulesText] = useState('')
  
  // New state for customizable suggested rules
  const [selectedSuggestedRules, setSelectedSuggestedRules] = useState<boolean[]>(
    new Array(SUGGESTED_RULES.length).fill(true)
  )
  const [editedSuggestedRules, setEditedSuggestedRules] = useState<string[]>([...SUGGESTED_RULES])
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  
  const totalSteps = 11
  const progress = (currentStep / totalSteps) * 100

  const [preferences, setPreferences] = useState<RulePreferences>({
    maxTradesPerDay: 3,
    stopAfterWin: false,
    behaviorAfterLoss: "break",
    session: "newyork",
    requiresConfirmation: false,
    usesChecklist: false,
    journalReviewFrequency: "daily",
    dailyRemindersEnabled: true,
    followUpStyle: "summary",
    wantsSuggestedRules: false,
    customRules: []
  })

  const handleSubmit = async () => {
    if (!user) {
      setError('You must be logged in to save preferences')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Parse custom rules from textarea
      const customRules = customRulesText
        .split('\n')
        .map(rule => rule.trim())
        .filter(rule => rule.length > 0)

      // Get selected and edited suggested rules if user wants suggestions
      const finalSuggestedRules = preferences.wantsSuggestedRules 
        ? editedSuggestedRules.filter((_, index) => selectedSuggestedRules[index])
        : []

      // Combine suggested rules with custom rules
      const allCustomRules = [...finalSuggestedRules, ...customRules]

      const finalPreferences = {
        ...preferences,
        customRules: allCustomRules
      }

      // Update user document with rule preferences
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        rulePreferences: finalPreferences
      })

      // Show success message briefly before redirect
      setError('')
      
      // Redirect to dashboard after a short delay to show success
      setTimeout(() => {
        router.push('/')
      }, 1000)
      
      // Show success state
      setError('✅ Setup completed successfully! Redirecting...')
    } catch (error) {
      console.error('Error saving preferences:', error)
      setError('Failed to save preferences. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSuggestedRule = (index: number) => {
    const newSelected = [...selectedSuggestedRules]
    newSelected[index] = !newSelected[index]
    setSelectedSuggestedRules(newSelected)
  }

  const updateSuggestedRule = (index: number, newText: string) => {
    const newRules = [...editedSuggestedRules]
    newRules[index] = newText
    setEditedSuggestedRules(newRules)
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Daily Trade Limit</h3>
              <p className="text-muted-foreground">How many trades are you allowed to take per day?</p>
            </div>
            <div className="space-y-3">
              <select 
                value={preferences.maxTradesPerDay}
                onChange={(e) => setPreferences({...preferences, maxTradesPerDay: parseInt(e.target.value)})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(num => (
                  <option key={num} value={num}>{num} trade{num > 1 ? 's' : ''} per day</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Stop After Win</h3>
              <p className="text-muted-foreground">Do you stop trading after your first winning trade?</p>
            </div>
            <div className="space-y-3">
              {[
                { value: true, label: "Yes, stop after first win", description: "Preserve profits and avoid overtrading" },
                { value: false, label: "No, continue trading", description: "Keep going based on other rules" }
              ].map(option => (
                <div 
                  key={option.label}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    preferences.stopAfterWin === option.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPreferences({...preferences, stopAfterWin: option.value})}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      preferences.stopAfterWin === option.value ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`} />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">After a Loss</h3>
              <p className="text-muted-foreground">What do you do after a loss?</p>
            </div>
            <div className="space-y-3">
              {[
                { value: "stop", label: "Stop trading", description: "End the session immediately" },
                { value: "break", label: "Take a break", description: "Pause for 15-30 minutes to reset" },
                { value: "continue", label: "Keep trading", description: "Continue with normal strategy" },
                { value: "prompt", label: "Ask me each time", description: "Get a prompt to decide in the moment" }
              ].map(option => (
                <div 
                  key={option.value}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    preferences.behaviorAfterLoss === option.value 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPreferences({...preferences, behaviorAfterLoss: option.value as RulePreferences['behaviorAfterLoss']})}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      preferences.behaviorAfterLoss === option.value ? 'bg-red-600 border-red-600' : 'border-gray-300'
                    }`} />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Clock className="h-12 w-12 mx-auto text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Trading Session</h3>
              <p className="text-muted-foreground">What session do you primarily trade?</p>
            </div>
            <div className="space-y-3">
              <select 
                value={preferences.session}
                onChange={(e) => setPreferences({...preferences, session: e.target.value as RulePreferences['session']})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="london">London Session (2:00-11:00 AM EST)</option>
                <option value="newyork">New York Session (8:00 AM-5:00 PM EST)</option>
                <option value="asia">Asia Session (7:00 PM-4:00 AM EST)</option>
                <option value="custom">Custom Session</option>
              </select>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Trade Confirmation</h3>
              <p className="text-muted-foreground">Do you require confirmation before entering a trade?</p>
            </div>
            <div className="space-y-3">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  preferences.requiresConfirmation 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setPreferences({...preferences, requiresConfirmation: !preferences.requiresConfirmation})}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 border-2 rounded ${
                    preferences.requiresConfirmation 
                      ? 'bg-orange-600 border-orange-600' 
                      : 'border-gray-300'
                  } flex items-center justify-center`}>
                    {preferences.requiresConfirmation && (
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">Require confirmation before each trade</div>
                    <div className="text-sm text-muted-foreground">
                      Adds a confirmation step to prevent impulse trades
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Pre-Trade Checklist</h3>
              <p className="text-muted-foreground">Do you use a pre-trade checklist?</p>
            </div>
            <div className="space-y-3">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  preferences.usesChecklist 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setPreferences({...preferences, usesChecklist: !preferences.usesChecklist})}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 border-2 rounded ${
                    preferences.usesChecklist 
                      ? 'bg-indigo-600 border-indigo-600' 
                      : 'border-gray-300'
                  } flex items-center justify-center`}>
                    {preferences.usesChecklist && (
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">Use pre-trade checklist</div>
                    <div className="text-sm text-muted-foreground">
                      Go through a checklist before entering each trade
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Journal Review</h3>
              <p className="text-muted-foreground">How often do you review your journal?</p>
            </div>
            <div className="space-y-3">
              <select 
                value={preferences.journalReviewFrequency}
                onChange={(e) => setPreferences({...preferences, journalReviewFrequency: e.target.value as RulePreferences['journalReviewFrequency']})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="daily">Daily - Review every day</option>
                <option value="weekly">Weekly - Review once per week</option>
                <option value="monthly">Monthly - Review once per month</option>
                <option value="never">Never - I don&apos;t review my journal</option>
              </select>
            </div>
          </div>
        )

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Bell className="h-12 w-12 mx-auto text-yellow-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Daily Reminders</h3>
              <p className="text-muted-foreground">Would you like to receive daily nudges to follow your rules?</p>
            </div>
            <div className="space-y-3">
              {[
                { value: true, label: "Yes, send me daily reminders", description: "Get helpful nudges to stay disciplined" },
                { value: false, label: "No, I'll manage on my own", description: "Prefer to self-manage without notifications" }
              ].map(option => (
                <div 
                  key={option.label}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    preferences.dailyRemindersEnabled === option.value 
                      ? 'border-yellow-500 bg-yellow-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPreferences({...preferences, dailyRemindersEnabled: option.value})}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      preferences.dailyRemindersEnabled === option.value ? 'bg-yellow-600 border-yellow-600' : 'border-gray-300'
                    }`} />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 9:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Settings className="h-12 w-12 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Daily Follow-Up</h3>
              <p className="text-muted-foreground">How should we ask if you followed your rules today?</p>
            </div>
            <div className="space-y-3">
              {[
                { value: "summary", label: "One summary question", description: "Simple yes/no: &apos;Did you follow your rules today?&apos;" },
                { value: "checklist", label: "Checklist per rule", description: "Go through each rule individually" },
                { value: "manual", label: "Let me write it manually", description: "Free-form journal entry about rule adherence" }
              ].map(option => (
                <div 
                  key={option.value}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    preferences.followUpStyle === option.value 
                      ? 'border-gray-500 bg-gray-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPreferences({...preferences, followUpStyle: option.value as RulePreferences['followUpStyle']})}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      preferences.followUpStyle === option.value ? 'bg-gray-600 border-gray-600' : 'border-gray-300'
                    }`} />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 10:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Lightbulb className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Suggested Rules</h3>
              <p className="text-muted-foreground">Would you like us to suggest rules based on your answers?</p>
            </div>
            <div className="space-y-3">
              {[
                { value: true, label: "Yes, show me suggested rules", description: "We&apos;ll suggest rules based on best practices" },
                { value: false, label: "No, I&apos;ll create my own", description: "Skip suggestions and add custom rules only" }
              ].map(option => (
                <div 
                  key={option.label}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    preferences.wantsSuggestedRules === option.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPreferences({...preferences, wantsSuggestedRules: option.value})}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      preferences.wantsSuggestedRules === option.value ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`} />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {preferences.wantsSuggestedRules && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Customize Your Rules
                </h4>
                <p className="text-sm text-blue-700 mb-4">
                  Select which rules you want and edit them to fit your style
                </p>
                <div className="space-y-3">
                  {editedSuggestedRules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                      <input
                        type="checkbox"
                        checked={selectedSuggestedRules[index]}
                        onChange={() => toggleSuggestedRule(index)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        {editingRuleIndex === index ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={rule}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSuggestedRule(index, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              onBlur={() => setEditingRuleIndex(null)}
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') {
                                  setEditingRuleIndex(null)
                                }
                              }}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingRuleIndex(null)}
                                className="text-xs h-6"
                              >
                                Done
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={`text-sm cursor-pointer hover:bg-blue-25 p-1 rounded ${
                              selectedSuggestedRules[index] ? 'text-blue-800' : 'text-gray-500'
                            }`}
                            onClick={() => setEditingRuleIndex(index)}
                          >
                            {rule}
                            <Edit className="inline h-3 w-3 ml-2 opacity-50" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded border border-blue-300">
                  <p className="text-xs text-blue-700">
                    <strong>Tip:</strong> Click on any rule to edit it. Uncheck rules you don&apos;t want to include.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {selectedSuggestedRules.filter(Boolean).length} of {SUGGESTED_RULES.length} rules selected
                  </p>
                </div>
              </div>
            )}
          </div>
        )

      case 11:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Edit className="h-12 w-12 mx-auto text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Personal Rules</h3>
              <p className="text-muted-foreground">Add any personal rules that are important to you</p>
            </div>
            <div className="space-y-3">
              <Textarea
                placeholder="Enter each rule on a new line, for example:&#10;&#10;Only trade when RSI is below 30&#10;Take profits at 2:1 risk/reward&#10;No trades during lunch hour (11:30-1:30)"
                value={customRulesText}
                onChange={(e) => setCustomRulesText(e.target.value)}
                className="min-h-32"
              />
              <p className="text-sm text-muted-foreground">
                Each line will become a separate rule. Leave blank if you don&apos;t want to add custom rules.
              </p>
            </div>

            {customRulesText.trim() && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-2">Your Custom Rules:</h4>
                <div className="space-y-1">
                  {customRulesText.split('\n').filter(rule => rule.trim()).map((rule, index) => (
                    <div key={index} className="text-sm text-purple-800 flex items-start gap-2">
                      <span className="text-purple-600 font-medium">{index + 1}.</span>
                      <span>{rule.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Shield className="h-8 w-8 text-blue-600" />
              Rule Setup
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Let&apos;s define your trading discipline system
            </p>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {error && (
              <div className={`border px-4 py-3 rounded ${
                error.startsWith('✅') 
                  ? 'bg-green-100 border-green-400 text-green-700'
                  : 'bg-red-100 border-red-400 text-red-700'
              }`}>
                {error}
              </div>
            )}

            {renderStep()}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="w-24"
              >
                Back
              </Button>
              
              <Button
                onClick={nextStep}
                disabled={isLoading}
                className="w-32 flex items-center gap-2"
              >
                {isLoading ? (
                  'Saving...'
                ) : currentStep === totalSteps ? (
                  'Complete Setup'
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 