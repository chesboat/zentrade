"use client"

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowUp, 
  ArrowDown, 
  BookOpen,
  BarChart3,
  RefreshCw,
  FileText,
  Zap,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Save,
  X
} from "lucide-react"
import { useTrades } from "@/contexts/TradesContext"
import { useTraderProgress } from "@/hooks/useTraderProgress"
import { useAuth } from "@/contexts/AuthContext"
import { Trade } from "@/mockData/trades"
import { Activity, updateActivity, deleteActivity } from "@/services/xpService"

interface UnifiedActivity {
  id: string
  type: 'trade' | 'activity'
  date: string
  time: string
  data: Trade | Activity
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

export function RecentActivity() {
  const { trades, deleteTrade } = useTrades()
  const { activities, refreshProgress } = useTraderProgress()
  const { user } = useAuth()
  const [editingActivity, setEditingActivity] = useState<string | null>(null)
  const [editedNotes, setEditedNotes] = useState('')

  const unifiedActivities = useMemo(() => {
    const tradeActivities: UnifiedActivity[] = trades.slice(0, 10).map(trade => ({
      id: trade.id,
      type: 'trade' as const,
      date: trade.exitDate || trade.entryDate,
      time: new Date().toLocaleTimeString(), // We don't have time data, so using current time as placeholder
      data: trade
    }))

    const logActivities: UnifiedActivity[] = activities.slice(0, 10).map(activity => ({
      id: activity.id || Math.random().toString(),
      type: 'activity' as const,
      date: activity.date,
      time: new Date().toLocaleTimeString(), // Placeholder time
      data: activity
    }))

    return [...tradeActivities, ...logActivities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8) // Show top 8 most recent
  }, [trades, activities])

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity.id || '')
    setEditedNotes(activity.notes)
  }

  const handleSaveActivity = async (activityId: string) => {
    if (!user || !editedNotes.trim()) return

    try {
      await updateActivity(activityId, user.uid, { notes: editedNotes.trim() })
      await refreshProgress() // Refresh to get updated data
      setEditingActivity(null)
      setEditedNotes('')
    } catch (error) {
      console.error('Error updating activity:', error)
      alert('Failed to update activity. Please try again.')
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!user) return
    
    if (confirm('Are you sure you want to delete this activity?')) {
      try {
        await deleteActivity(activityId, user.uid)
        await refreshProgress() // Refresh to get updated data
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
        await refreshProgress() // Refresh to get updated data
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const renderTradeItem = (trade: Trade, activity: UnifiedActivity) => (
    <div 
      key={activity.id}
      className="flex items-center justify-between p-4 hover:bg-muted/30 rounded-lg transition-colors cursor-pointer group"
    >
      <div 
        className="flex items-center space-x-3 flex-grow"
        onClick={() => {/* Trade click handler could be added here */}}
      >
        {/* Trade Direction Icon */}
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

        {/* Trade Info */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{trade.symbol}</span>
            <span className="text-sm text-muted-foreground">
              {trade.quantity} contracts
            </span>
            {trade.notes && trade.notes.trim().length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                Journal
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(activity.date)} • {trade.strategy}</span>
          </div>
        </div>
      </div>

      {/* Trade Results and Controls */}
      <div className="flex items-center gap-3">
        <div className="text-right space-y-1">
          {trade.pnl !== undefined && (
            <div className={`font-medium ${
              trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(trade.pnl)}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            {formatCurrency(trade.entryPrice)}
          </div>
        </div>
        
        {/* Delete Button */}
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
  )

  const renderActivityItem = (activity: Activity, unifiedActivity: UnifiedActivity) => {
    const config = ActivityTypeConfig[activity.type]
    const isEditing = editingActivity === activity.id
    
    return (
      <div 
        key={unifiedActivity.id}
        className={`p-4 rounded-lg transition-colors cursor-pointer group border ${
          isEditing ? 'border-primary bg-primary/5' : 'hover:bg-muted/30 border-transparent'
        }`}
        onClick={() => !isEditing && handleEditActivity(activity)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {/* Activity Icon */}
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full border
              ${config.color}
            `}>
              {config.icon}
            </div>

            {/* Activity Info */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{config.label}</span>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  +{config.xp} XP
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(unifiedActivity.date)}</span>
              </div>
            </div>
          </div>

          {/* Edit/Delete Controls */}
          {!isEditing && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
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
              className="min-h-20"
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
          <div className="text-sm text-muted-foreground">
            {activity.notes.length > 100 
              ? `${activity.notes.substring(0, 100)}...` 
              : activity.notes
            }
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {unifiedActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">Start trading or log some analysis to see activity here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unifiedActivities.map((activity) => (
              activity.type === 'trade' 
                ? renderTradeItem(activity.data as Trade, activity)
                : renderActivityItem(activity.data as Activity, activity)
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 