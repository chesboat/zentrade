"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  Calendar, 
  TrendingUp,
  BookOpen,
  BarChart3,
  RefreshCw,
  FileText,
  Zap,
  Edit,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Trophy
} from "lucide-react"
import { Trade } from "@/mockData/trades"
import { Activity, updateActivity, deleteActivity, addActivity, ActivityType, XP_RULES } from "@/services/xpService"
import { useAuth } from '@/contexts/AuthContext'
import { useTrades } from '@/contexts/TradesContext'

interface EnhancedCalendarModalProps {
  date: Date | null
  trades: Trade[]
  activities: Activity[]
  onClose: () => void
  onTradeClick: (trade: Trade) => void
}

const ActivityTypeConfig = {
  backtest: {
    icon: <BarChart3 className="h-4 w-4" />,
    label: "Backtest Session",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    xp: 40
  },
  reengineer: {
    icon: <RefreshCw className="h-4 w-4" />,
    label: "Re-engineered Trade",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    xp: 25
  },
  postTradeReview: {
    icon: <FileText className="h-4 w-4" />,
    label: "Post-Trade Analysis",
    color: "bg-green-50 border-green-200 text-green-700",
    xp: 20
  }
}

const ACTIVITY_OPTIONS = [
  {
    type: 'backtest' as ActivityType,
    label: 'Backtest Session',
    description: 'Test your strategy on historical data',
    icon: <BarChart3 className="h-4 w-4" />,
    xpReward: XP_RULES.BACKTEST_SESSION
  },
  {
    type: 'reengineer' as ActivityType,
    label: 'Re-engineer Trade',
    description: 'Analyze and improve a trade setup',
    icon: <RefreshCw className="h-4 w-4" />,
    xpReward: XP_RULES.REENGINEER_TRADE
  },
  {
    type: 'postTradeReview' as ActivityType,
    label: 'Post-Trade Analysis',
    description: 'Deep dive into trade performance',
    icon: <FileText className="h-4 w-4" />,
    xpReward: XP_RULES.POST_TRADE_ANALYSIS
  }
]

export function EnhancedCalendarModal({ 
  date, 
  trades, 
  activities, 
  onClose, 
  onTradeClick
}: EnhancedCalendarModalProps) {
  const { user } = useAuth()
  const { deleteTrade } = useTrades()
  const [editingActivity, setEditingActivity] = useState<string | null>(null)
  const [editedNotes, setEditedNotes] = useState('')
  
  // Add Activity states
  const [isAddingActivity, setIsAddingActivity] = useState(false)
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityType | null>(null)
  const [activityNotes, setActivityNotes] = useState('')
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false)

  if (!date) return null

  const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  
  // Calculate XP from activities
  const activitiesXP = activities.reduce((sum, activity) => {
    const config = ActivityTypeConfig[activity.type]
    return sum + (config?.xp || 0)
  }, 0)
  
  // Calculate XP from trades
  const tradesXP = trades.reduce((sum, trade) => {
    let tradeXP = 0
    
    // Trade logged
    tradeXP += 10 // XP_RULES.TRADE_LOGGED
    
    // Emotion tagged and journal written
    if (trade.notes && trade.notes.trim().length > 0) {
      tradeXP += 10 // XP_RULES.EMOTION_TAGGED
      tradeXP += 10 // XP_RULES.JOURNAL_WRITTEN
      
      // Bonus for journaling a loss
      if (trade.pnl !== undefined && trade.pnl < 0) {
        tradeXP += 20 // XP_RULES.LOSS_JOURNALED_WITH_EMOTION
      }
    }
    
    return sum + tradeXP
  }, 0)
  
  // Add rules followed bonus if applicable (25 XP per day)
  const hasTradesWithJournal = trades.some(trade => trade.notes && trade.notes.trim().length > 0)
  const rulesFollowedXP = (trades.length > 0 && hasTradesWithJournal) ? 25 : 0
  
  const totalXP = activitiesXP + tradesXP + rulesFollowedXP
  
  // Helper function to calculate XP for individual trade
  const getTradeXP = (trade: Trade) => {
    let xp = 10 // Base trade logged XP
    
    if (trade.notes && trade.notes.trim().length > 0) {
      xp += 20 // Emotion tagged + journal written
      
      if (trade.pnl !== undefined && trade.pnl < 0) {
        xp += 20 // Loss journaled bonus
      }
    }
    
    return xp
  }

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity.id || '')
    setEditedNotes(activity.notes)
  }

  const handleSaveActivity = async (activityId: string) => {
    if (!user || !editedNotes.trim()) return

    try {
      await updateActivity(activityId, user.uid, { notes: editedNotes.trim() })
      setEditingActivity(null)
      setEditedNotes('')
      // Note: Data will refresh automatically via useTraderProgress hook
    } catch (error) {
      console.error('Error updating activity:', error)
      alert('Failed to update activity. Please try again.')
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!user) return
    
    if (confirm('Are you sure you want to delete this activity?')) {
      try {
        await deleteActivity(activityId)
        // Note: Data will refresh automatically via useTraderProgress hook
      } catch (error) {
        console.error('Error deleting activity:', error)
        alert('Failed to delete activity. Please try again.')
      }
    }
  }

  const handleDeleteTrade = async (tradeId: string) => {
    if (confirm('Are you sure you want to delete this trade?')) {
      try {
        await deleteTrade(tradeId)
        // Note: Data will refresh automatically via useTraderProgress hook
      } catch (error) {
        console.error('Error deleting trade:', error)
        alert('Failed to delete trade. Please try again.')
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingActivity(null)
    setEditedNotes('')
  }

  const handleAddActivity = async () => {
    if (!user || !selectedActivityType || !activityNotes.trim()) return

    setIsSubmittingActivity(true)
    try {
      const dateString = date.toISOString().split('T')[0]
      await addActivity(user.uid, selectedActivityType, activityNotes.trim(), dateString)
      
      // Reset form
      setIsAddingActivity(false)
      setSelectedActivityType(null)
      setActivityNotes('')
    } catch (error) {
      console.error('Error adding activity:', error)
      alert('Failed to add activity. Please try again.')
    } finally {
      setIsSubmittingActivity(false)
    }
  }

  const handleCancelAddActivity = () => {
    setIsAddingActivity(false)
    setSelectedActivityType(null)
    setActivityNotes('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{trades.length}</div>
              <div className="text-sm text-muted-foreground">Trades</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                totalPnL > 0 ? 'text-green-600' : totalPnL < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">P&L</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{activities.length}</div>
              <div className="text-sm text-muted-foreground">Activities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">+{totalXP}</div>
              <div className="text-sm text-muted-foreground">XP Earned</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* No Data State */}
          {trades.length === 0 && activities.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No activity on this day</p>
              <p className="text-sm">Start trading or log some analysis to see activity here</p>
            </div>
          )}

          {/* Trades Section */}
          {trades.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Trades ({trades.length})
              </h3>
              <div className="space-y-3">
                {trades.map((trade) => (
                  <div 
                    key={trade.id} 
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-grow"
                        onClick={() => onTradeClick(trade)}
                      >
                        <div className={`
                          flex items-center justify-center w-10 h-10 rounded-full
                          ${trade.type === 'long' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                          }
                        `}>
                          {trade.type === 'long' ? (
                            <ArrowUp className="h-5 w-5" />
                          ) : (
                            <ArrowDown className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">{trade.symbol}</Badge>
                            <span className="text-sm font-medium">
                              ${trade.entryPrice.toFixed(2)}
                              {trade.exitPrice && ` → $${trade.exitPrice.toFixed(2)}`}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {trade.quantity} contracts
                            </span>
                            <Badge variant="outline" className="flex items-center gap-1 text-xs">
                              <Zap className="h-3 w-3" />
                              +{getTradeXP(trade)} XP
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {trade.strategy}
                            {trade.screenshot && <span className="ml-2">📸</span>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {trade.pnl !== undefined && (
                          <div className={`font-medium ${
                            trade.pnl > 0 ? 'text-green-600' : trade.pnl < 0 ? 'text-red-600' : 'text-muted-foreground'
                          }`}>
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTrade(trade.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {trade.notes && (
                      <div className="text-sm bg-muted/30 p-3 rounded border-l-2 border-blue-500 cursor-pointer"
                           onClick={() => onTradeClick(trade)}>
                        <div className="flex items-start gap-2">
                          <BookOpen className="h-4 w-4 mt-0.5 text-blue-600" />
                          <span className="text-muted-foreground">
                            {trade.notes.length > 150 ? `${trade.notes.substring(0, 150)}...` : trade.notes}
                          </span>
                        </div>
                        {trade.notes.length > 150 && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            Click to view full journal entry
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activities Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Activities ({activities.length})
              </h3>
              {!isAddingActivity && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingActivity(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Activity
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {/* Empty state when no activities and not adding */}
              {activities.length === 0 && !isAddingActivity && (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No activities logged for this day</p>
                  <p className="text-sm">Click &quot;Add Activity&quot; to log your analysis or training</p>
                </div>
              )}

              {/* Add Activity Form */}
              {isAddingActivity && (
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-primary/5">
                  {!selectedActivityType ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Select Activity Type</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelAddActivity}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        {ACTIVITY_OPTIONS.map((option) => (
                          <Button
                            key={option.type}
                            variant="outline"
                            className="h-auto p-3 justify-start"
                            onClick={() => setSelectedActivityType(option.type)}
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
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {ACTIVITY_OPTIONS.find(opt => opt.type === selectedActivityType)?.icon}
                          <span className="font-medium">
                            {ACTIVITY_OPTIONS.find(opt => opt.type === selectedActivityType)?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            +{ACTIVITY_OPTIONS.find(opt => opt.type === selectedActivityType)?.xpReward} XP
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedActivityType(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Activity Notes</label>
                        <Textarea
                          placeholder={`Describe your ${ACTIVITY_OPTIONS.find(opt => opt.type === selectedActivityType)?.label.toLowerCase()} for ${date.toLocaleDateString()}...`}
                          value={activityNotes}
                          onChange={(e) => setActivityNotes(e.target.value)}
                          className="min-h-20"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddActivity}
                          disabled={!activityNotes.trim() || isSubmittingActivity}
                          className="flex-grow"
                        >
                          {isSubmittingActivity ? 'Adding...' : `Add Activity (+${ACTIVITY_OPTIONS.find(opt => opt.type === selectedActivityType)?.xpReward} XP)`}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancelAddActivity}
                          disabled={isSubmittingActivity}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Existing Activities */}
              {activities.map((activity) => {
                const config = ActivityTypeConfig[activity.type]
                const isEditing = editingActivity === activity.id
                
                return (
                  <div 
                    key={activity.id}
                    className={`border rounded-lg p-4 transition-colors group ${
                      isEditing ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-grow"
                        onClick={() => !isEditing && handleEditActivity(activity)}
                      >
                        <div className={`
                          flex items-center justify-center w-10 h-10 rounded-full border
                          ${config.color}
                        `}>
                          {config.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{config.label}</span>
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              +{config.xp} XP
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Click to edit notes
                          </div>
                        </div>
                      </div>

                      {/* Edit/Delete Controls */}
                      {!isEditing && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditActivity(activity)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteActivity(activity.id!)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Notes Content */}
                    {isEditing ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editedNotes}
                          onChange={(e) => setEditedNotes(e.target.value)}
                          placeholder="Update your activity notes..."
                          className="min-h-24"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSaveActivity(activity.id!)
                            }}
                            disabled={!editedNotes.trim()}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelEdit()
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-sm text-muted-foreground bg-muted/30 p-3 rounded cursor-pointer"
                        onClick={() => handleEditActivity(activity)}
                      >
                        {activity.notes.length > 200 
                          ? `${activity.notes.substring(0, 200)}...` 
                          : activity.notes
                        }
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Daily Bonuses Section */}
          {rulesFollowedXP > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Daily Bonuses
              </h3>
              <div className="space-y-2">
                <div className="border rounded-lg p-3 bg-yellow-50 border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600">
                        <Trophy className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-yellow-800">Rules Followed All Day</div>
                        <div className="text-sm text-yellow-700">Journaled trades with discipline</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1 border-yellow-300 text-yellow-800">
                      <Zap className="h-3 w-3" />
                      +{rulesFollowedXP} XP
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 