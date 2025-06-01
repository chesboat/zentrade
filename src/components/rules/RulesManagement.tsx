"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  Edit, 
  Plus, 
  X, 
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Calendar,
  Settings,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react"
import { useAuth } from '@/contexts/AuthContext'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { RulePreferences } from '@/utils/rulePreferences'
import Link from 'next/link'

interface RulesManagementProps {
  variant?: 'dashboard' | 'full'
  className?: string
}

export function RulesManagement({ variant = 'full', className = '' }: RulesManagementProps) {
  const { user } = useAuth()
  const [rulePreferences, setRulePreferences] = useState<RulePreferences | null>(null)
  const [customRules, setCustomRules] = useState<string[]>([])
  const [newRuleText, setNewRuleText] = useState('')
  const [isAddingRule, setIsAddingRule] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')

  useEffect(() => {
    const loadUserRules = async () => {
      if (!user) return

      try {
        const userRef = doc(db, 'users', user.uid)
        const userSnap = await getDoc(userRef)
        
        if (userSnap.exists() && userSnap.data().rulePreferences) {
          const preferences = userSnap.data().rulePreferences as RulePreferences
          setRulePreferences(preferences)
          setCustomRules(preferences.customRules || [])
        }
      } catch (error) {
        console.error('Error loading rules:', error)
        setError('Failed to load rules')
      }
    }

    loadUserRules()
  }, [user])

  const saveRules = async (updatedRules: string[]) => {
    if (!user || !rulePreferences) return

    setIsLoading(true)
    try {
      const updatedPreferences = {
        ...rulePreferences,
        customRules: updatedRules
      }

      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        rulePreferences: updatedPreferences
      })

      setRulePreferences(updatedPreferences)
      setCustomRules(updatedRules)
      setError('')
    } catch (error) {
      console.error('Error saving rules:', error)
      setError('Failed to save rules')
    } finally {
      setIsLoading(false)
    }
  }

  const addCustomRule = async () => {
    if (newRuleText.trim()) {
      const updatedRules = [...customRules, newRuleText.trim()]
      await saveRules(updatedRules)
      setNewRuleText('')
      setIsAddingRule(false)
    }
  }

  const removeCustomRule = async (index: number) => {
    const updatedRules = customRules.filter((_, i) => i !== index)
    await saveRules(updatedRules)
  }

  const updateCustomRule = async (index: number, newText: string) => {
    const updatedRules = [...customRules]
    updatedRules[index] = newText
    await saveRules(updatedRules)
  }

  const getRuleTypeIcon = (rule: string) => {
    const lowerRule = rule.toLowerCase()
    if (lowerRule.includes('trade') && lowerRule.includes('limit')) return Target
    if (lowerRule.includes('stop') || lowerRule.includes('loss')) return AlertTriangle
    if (lowerRule.includes('time') || lowerRule.includes('session')) return Clock
    if (lowerRule.includes('confirmation') || lowerRule.includes('checklist')) return CheckCircle2
    if (lowerRule.includes('reminder') || lowerRule.includes('daily')) return Bell
    if (lowerRule.includes('journal') || lowerRule.includes('review')) return Calendar
    return Shield
  }

  const startEditing = (index: number, text: string) => {
    setEditingIndex(index)
    setEditingText(text)
  }

  const saveEdit = async () => {
    if (editingIndex !== null && editingText.trim()) {
      await updateCustomRule(editingIndex, editingText.trim())
      setEditingIndex(null)
      setEditingText('')
    }
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditingText('')
  }

  // If no rules setup yet, show CTA
  if (!rulePreferences) {
    return (
      <Card className={`border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Settings className="h-6 w-6 text-blue-600" />
            Set Up Your Trading Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-blue-700">
            Define your personal trading discipline system to stay consistent, build good habits, and improve your performance.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Target className="h-4 w-4" />
              <span>Takes only 5 minutes to complete</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Shield className="h-4 w-4" />
              <span>Get personalized rule suggestions</span>
            </div>
          </div>
          <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
            <Link href="/onboarding" className="flex items-center gap-2">
              Start Rule Setup
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Dashboard variant - enhanced expandable view
  if (variant === 'dashboard') {
    const displayRules = isExpanded ? customRules : customRules.slice(0, 3)
    
    return (
      <Card className={className}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Your Trading Rules
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {customRules.length} {customRules.length === 1 ? 'rule' : 'rules'}
              </Badge>
              {customRules.length > 3 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 text-xs"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show All ({customRules.length})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Display rules */}
          <div className="space-y-2">
            {displayRules.map((rule, index) => {
              const IconComponent = getRuleTypeIcon(rule)
              const isEditing = editingIndex === index
              
              return (
                <div key={index} className="group flex items-start gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <IconComponent className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  
                  {isEditing ? (
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} disabled={!editingText.trim() || isLoading}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-700 leading-relaxed">{rule}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(index, rule)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCustomRule(index)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Quick add rule */}
          {isAddingRule && (
            <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="text"
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                placeholder="Enter your new trading rule..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addCustomRule()
                  } else if (e.key === 'Escape') {
                    setIsAddingRule(false)
                    setNewRuleText('')
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addCustomRule} disabled={!newRuleText.trim() || isLoading}>
                  {isLoading ? 'Adding...' : 'Add Rule'}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setIsAddingRule(false)
                    setNewRuleText('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" asChild className="flex-1">
              <Link href="/profile" className="flex items-center gap-1">
                <Edit className="h-3 w-3" />
                Manage Rules
              </Link>
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsAddingRule(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Rule
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Full variant - complete management interface
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Rules Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Your Trading Rules
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {customRules.length} {customRules.length === 1 ? 'rule' : 'rules'}
              </Badge>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsAddingRule(true)}
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Rule
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new rule */}
          {isAddingRule && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="space-y-3">
                <input
                  type="text"
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  placeholder="Enter your new trading rule..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addCustomRule()
                    } else if (e.key === 'Escape') {
                      setIsAddingRule(false)
                      setNewRuleText('')
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addCustomRule} disabled={!newRuleText.trim() || isLoading}>
                    {isLoading ? 'Adding...' : 'Add Rule'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      setIsAddingRule(false)
                      setNewRuleText('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Display rules */}
          {customRules.length > 0 ? (
            <div className="space-y-3">
              {customRules.map((rule, index) => {
                const IconComponent = getRuleTypeIcon(rule)
                return (
                  <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <IconComponent className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => updateCustomRule(index, e.target.value)}
                        className="w-full px-2 py-1 border-0 text-sm focus:ring-0 focus:outline-none bg-transparent"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCustomRule(index)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No custom rules yet</p>
              <Button onClick={() => setIsAddingRule(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Rule
              </Button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Rule Preferences Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rule Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Daily Trade Limit:</span>
              <span className="font-medium">{rulePreferences.maxTradesPerDay} trades</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Stop After Win:</span>
              <span className="font-medium">{rulePreferences.stopAfterWin ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Trading Session:</span>
              <span className="font-medium capitalize">{rulePreferences.session}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Requires Confirmation:</span>
              <span className="font-medium">{rulePreferences.requiresConfirmation ? 'Yes' : 'No'}</span>
            </div>
          </div>
          <div className="pt-2 border-t">
            <Button size="sm" variant="outline" asChild className="w-full">
              <Link href="/onboarding">
                <Edit className="h-3 w-3 mr-2" />
                Edit All Preferences
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 