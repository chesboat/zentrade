"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Edit
} from "lucide-react"
import { useTrades } from "@/contexts/TradesContext"
import { useTraderProgress } from "@/hooks/useTraderProgress"
import { Trade } from "@/mockData/trades"
import { Activity } from "@/services/xpService"

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
  const { trades } = useTrades()
  const { activities } = useTraderProgress()

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
      <div className="flex items-center space-x-3">
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

      {/* Trade Results */}
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
    </div>
  )

  const renderActivityItem = (activity: Activity, unifiedActivity: UnifiedActivity) => {
    const config = ActivityTypeConfig[activity.type]
    
    return (
      <div 
        key={unifiedActivity.id}
        className="flex items-center justify-between p-4 hover:bg-muted/30 rounded-lg transition-colors cursor-pointer group"
      >
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
              <span>•</span>
              <span className="truncate max-w-48">
                {activity.notes.length > 40 
                  ? `${activity.notes.substring(0, 40)}...` 
                  : activity.notes
                }
              </span>
            </div>
          </div>
        </div>

        {/* Edit indicator */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Edit className="h-4 w-4 text-muted-foreground" />
        </div>
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