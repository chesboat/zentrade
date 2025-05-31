"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, BookOpen, Target, Copy, BarChart3, RefreshCw, FileText, Zap } from "lucide-react"
import { Trade } from "@/mockData/trades"
import { useTrades } from "@/contexts/TradesContext"
import { useTraderProgress } from "@/hooks/useTraderProgress"
import { Activity } from "@/services/xpService"
import Image from "next/image"

interface DayData {
  date: Date
  trades: Trade[]
  activities: Activity[]
  totalPnL: number
  hasNotes: boolean
  totalXP: number
}

interface CalendarDayCellProps {
  date: Date
  dayData: DayData | null
  isCurrentMonth: boolean
  isToday: boolean
  onClick: () => void
}

interface CalendarSummaryModalProps {
  date: Date | null
  trades: Trade[]
  activities: Activity[]
  onClose: () => void
  onTradeClick: (trade: Trade) => void
  onActivityUpdate: () => void
}

function CalendarDayCell({ date, dayData, isCurrentMonth, isToday, onClick }: CalendarDayCellProps) {
  const pnlColor = dayData && dayData.totalPnL > 0 
    ? 'text-green-600 bg-green-50 border-green-200' 
    : dayData && dayData.totalPnL < 0 
      ? 'text-red-600 bg-red-50 border-red-200'
      : dayData && dayData.totalPnL === 0
        ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
        : ''

  const activityIcons = {
    backtest: <BarChart3 className="h-2.5 w-2.5 text-blue-500" />,
    reengineer: <RefreshCw className="h-2.5 w-2.5 text-purple-500" />,
    postTradeReview: <FileText className="h-2.5 w-2.5 text-green-500" />
  }

  return (
    <div 
      className={`h-24 border cursor-pointer transition-all hover:bg-muted/20 hover:shadow-sm ${
        isCurrentMonth ? 'border-muted/30' : 'border-muted/10 opacity-40'
      } ${isToday ? 'bg-primary/10 border-primary/30' : ''}`}
      onClick={onClick}
    >
      <div className="p-2 h-full flex flex-col justify-between">
        {/* Header row - date and journal icon */}
        <div className="flex items-start justify-between">
          <span className={`text-sm font-medium ${
            isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {date.getDate()}
          </span>
          <div className="flex items-center gap-1">
            {dayData?.hasNotes && (
              <BookOpen className="h-3 w-3 text-blue-500" />
            )}
            {dayData && dayData.totalXP > 0 && (
              <div className="flex items-center">
                <Zap className="h-2.5 w-2.5 text-yellow-500" />
                <span className="text-xs text-yellow-600 font-medium ml-0.5">
                  {dayData.totalXP}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="space-y-1 flex-1 flex flex-col justify-end">
          {/* Activity indicators */}
          {dayData && dayData.activities.length > 0 && (
            <div className="flex items-center gap-1 mb-1">
              {dayData.activities.slice(0, 3).map((activity, index) => (
                <div 
                  key={index}
                  className="p-0.5 rounded-full bg-muted/50 border"
                  title={`${activity.type} activity`}
                >
                  {activityIcons[activity.type]}
                </div>
              ))}
              {dayData.activities.length > 3 && (
                <span className="text-xs text-muted-foreground">+{dayData.activities.length - 3}</span>
              )}
            </div>
          )}

          {/* Trade info */}
          {dayData && dayData.trades.length > 0 && (
            <div className="space-y-1">
              <div className={`text-xs font-medium px-1 py-0.5 rounded border ${pnlColor}`}>
                {dayData.totalPnL >= 0 ? '+' : ''}${dayData.totalPnL.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">
                {dayData.trades.length} trade{dayData.trades.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CalendarSummaryModal({ date, trades, activities, onClose, onTradeClick, onActivityUpdate }: CalendarSummaryModalProps) {
  if (!date) return null

  const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  const winCount = trades.filter(trade => (trade.pnl || 0) > 0).length
  const lossCount = trades.filter(trade => (trade.pnl || 0) < 0).length
  const totalXP = activities.reduce((sum, activity) => {
    const activityXP = { backtest: 40, reengineer: 25, postTradeReview: 20 }
    return sum + (activityXP[activity.type] || 0)
  }, 0)

  const activityConfig = {
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-3xl max-h-[85vh] overflow-y-auto">
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
              ✕
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
              <div className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
                <Zap className="h-5 w-5" />
                +{totalXP}
              </div>
              <div className="text-sm text-muted-foreground">XP Earned</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Activities Section */}
          {activities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Learning Activities ({activities.length})
              </h3>
              <div className="space-y-3">
                {activities.map((activity, index) => {
                  const config = activityConfig[activity.type]
                  
                  return (
                    <div 
                      key={index} 
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`
                            flex items-center justify-center w-10 h-10 rounded-full border
                            ${config.color}
                          `}>
                            {config.icon}
                          </div>
                          <div>
                            <div className="font-medium">{config.label}</div>
                            <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                              <Zap className="h-3 w-3" />
                              +{config.xp} XP
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm bg-muted/30 p-3 rounded">
                        {activity.notes}
                      </div>
                    </div>
                  )
                })}
              </div>
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
                    className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onTradeClick(trade)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{trade.symbol}</Badge>
                        <Badge variant={trade.type === 'long' ? 'default' : 'destructive'}>
                          {trade.type === 'long' ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {trade.type.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">
                          ${trade.entryPrice.toFixed(2)}
                          {trade.exitPrice && ` → $${trade.exitPrice.toFixed(2)}`}
                        </span>
                      </div>
                      {trade.pnl && (
                        <div className={`font-medium ${
                          trade.pnl > 0 ? 'text-green-600' : trade.pnl < 0 ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-2">
                      {trade.quantity} contracts • {trade.strategy}
                      {trade.screenshot && <span className="ml-2">📸</span>}
                    </div>
                    
                    {trade.notes && (
                      <div className="text-sm bg-muted/30 p-2 rounded border-l-2 border-blue-500 relative">
                        <div className="flex items-start gap-1">
                          <span>📒</span>
                          <div className="flex-1 min-w-0">
                            {trade.notes.length > 100 ? (
                              <div className="relative">
                                <div 
                                  className="overflow-hidden relative"
                                  style={{
                                    maxHeight: '2.5rem',
                                    WebkitMask: 'linear-gradient(180deg, black 0%, black 60%, transparent 100%)',
                                    mask: 'linear-gradient(180deg, black 0%, black 60%, transparent 100%)'
                                  }}
                                >
                                  {trade.notes}
                                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-muted/30 pointer-events-none" 
                                       style={{ top: '60%' }} />
                                </div>
                                <div className="absolute bottom-0 right-0 text-muted-foreground text-xs pointer-events-none">
                                  ⋯
                                </div>
                              </div>
                            ) : (
                              <span>{trade.notes}</span>
                            )}
                          </div>
                        </div>
                        {trade.notes.length > 100 && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            Click trade for full journal entry
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {trades.length === 0 && activities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity on this day</p>
              <p className="text-sm">Start trading or log some analysis to see activity here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TradeDetailModal({ trade, onClose, onTradeUpdate }: { 
  trade: Trade | null, 
  onClose: () => void,
  onTradeUpdate: (updatedTrade: Trade) => void
}) {
  const [journalText, setJournalText] = useState('')
  const [isEditingJournal, setIsEditingJournal] = useState(false)
  const [isAddingScreenshot, setIsAddingScreenshot] = useState(false)
  const { updateTrade } = useTrades()
  
  if (!trade) return null

  const formatPrice = (price: number) => `$${price.toFixed(2)}`
  
  // Helper function to calculate trading metrics (same as TradePaste)
  const calculateTradeMetrics = (trade: Trade) => {
    const metrics: {
      riskRewardRatio?: number
      riskAmount?: number
      riskPercentage?: number
      pointsGainedLost?: number
      rMultiple?: number
      returnOnRisk?: number
      tradeDuration?: number
      breakEvenPrice?: number
      maxRisk?: number
      maxReward?: number
    } = {}
    
    // Use stored risk amount if available, otherwise estimate
    if (trade.riskAmount) {
      metrics.riskAmount = trade.riskAmount
    } else if (trade.entryPrice && trade.exitPrice) {
      // Fallback estimation only if no stored risk amount
      const estimatedStopDistance = trade.entryPrice * 0.02
      const riskPerPoint = (trade.pnl && trade.entryPrice && trade.exitPrice) 
        ? Math.abs(trade.pnl / Math.abs(trade.exitPrice - trade.entryPrice))
        : 25 // Default for futures
      metrics.riskAmount = estimatedStopDistance * riskPerPoint * trade.quantity
    }
    
    // Use stored Risk/Reward ratio if available (from TradingView), otherwise calculate if possible
    if (trade.riskRewardRatio) {
      metrics.riskRewardRatio = trade.riskRewardRatio
    }
    
    // Calculate risk/reward and other metrics if we have the necessary data
    if (trade.entryPrice && trade.exitPrice) {
      const pointsGainedLost = trade.type === 'long' 
        ? trade.exitPrice - trade.entryPrice
        : trade.entryPrice - trade.exitPrice
      metrics.pointsGainedLost = pointsGainedLost
      
      // R-Multiple calculation using stored or calculated risk amount
      if (metrics.riskAmount && metrics.riskAmount > 0 && trade.pnl !== undefined) {
        metrics.rMultiple = trade.pnl / metrics.riskAmount
        metrics.returnOnRisk = (trade.pnl / metrics.riskAmount) * 100
      }
      
      // Risk percentage (assuming $10k account - could be made configurable)
      const accountSize = 10000
      if (metrics.riskAmount) {
        metrics.riskPercentage = (metrics.riskAmount / accountSize) * 100
      }
      
      // Calculate max reward potential (estimate based on actual P&L if available)
      if (trade.pnl !== undefined && pointsGainedLost !== 0) {
        const riskPerPoint = Math.abs(trade.pnl / pointsGainedLost)
        metrics.maxReward = Math.abs(pointsGainedLost) * riskPerPoint * trade.quantity
      }
      
      // Only calculate Risk/Reward ratio if not already stored and we have the data
      if (!metrics.riskRewardRatio && metrics.riskAmount && metrics.maxReward) {
        metrics.riskRewardRatio = metrics.maxReward / metrics.riskAmount
      }
    }
    
    // Trade duration calculation
    if (trade.entryDate && trade.exitDate) {
      const entryTime = new Date(trade.entryDate).getTime()
      const exitTime = new Date(trade.exitDate).getTime()
      metrics.tradeDuration = Math.round((exitTime - entryTime) / (1000 * 60 * 60 * 24)) // Days
    }
    
    return metrics
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {trade.symbol}
            </Badge>
            <Badge variant={trade.type === 'long' ? 'default' : 'destructive'} className="text-base px-3 py-1">
              {trade.type === 'long' ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {trade.type === 'long' ? 'Long' : 'Short'}
            </Badge>
            <span className="text-xl font-semibold">{formatPrice(trade.entryPrice)}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </Button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Basic Trade Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Entry Price</label>
              <div className="text-lg font-semibold">{formatPrice(trade.entryPrice)}</div>
            </div>
            {trade.exitPrice && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Exit Price</label>
                <div className="text-lg font-semibold">{formatPrice(trade.exitPrice)}</div>
              </div>
            )}
            {trade.pnl !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">P&L</label>
                <div className={`text-lg font-semibold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${trade.pnl.toFixed(2)}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Quantity</label>
              <div className="text-lg font-semibold">{trade.quantity}</div>
            </div>
          </div>
          
          {/* Trading Metrics Section */}
          {(() => {
            const metrics = calculateTradeMetrics(trade)
            return (
              <>
                {/* Risk Management Metrics */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-500" />
                    Risk Management
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metrics.riskAmount && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Risk Amount</label>
                        <div className="text-base font-semibold text-orange-600">
                          ${metrics.riskAmount.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {metrics.riskPercentage && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Risk %</label>
                        <div className="text-base font-semibold text-orange-600">
                          {metrics.riskPercentage.toFixed(2)}%
                        </div>
                      </div>
                    )}
                    {metrics.riskRewardRatio && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Risk:Reward</label>
                        <div className="text-base font-semibold text-blue-600">
                          {metrics.riskRewardRatio.toFixed(2)}R
                        </div>
                      </div>
                    )}
                    {metrics.rMultiple && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">R-Multiple</label>
                        <div className={`text-base font-semibold ${metrics.rMultiple >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {metrics.rMultiple >= 0 ? '+' : ''}{metrics.rMultiple.toFixed(2)}R
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Performance Metrics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metrics.pointsGainedLost !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Points Moved</label>
                        <div className={`text-base font-semibold ${metrics.pointsGainedLost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {metrics.pointsGainedLost >= 0 ? '+' : ''}{metrics.pointsGainedLost.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {metrics.returnOnRisk && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Return on Risk</label>
                        <div className={`text-base font-semibold ${metrics.returnOnRisk >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {metrics.returnOnRisk >= 0 ? '+' : ''}{metrics.returnOnRisk.toFixed(1)}%
                        </div>
                      </div>
                    )}
                    {metrics.tradeDuration !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Duration</label>
                        <div className="text-base font-semibold text-blue-600">
                          {metrics.tradeDuration === 0 ? 'Same day' : 
                           metrics.tradeDuration === 1 ? '1 day' : 
                           `${metrics.tradeDuration} days`}
                        </div>
                      </div>
                    )}
                    {trade.strategy && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Strategy</label>
                        <div className="text-base font-semibold text-purple-600">
                          {trade.strategy}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Trade Outcome</div>
                    <div className="flex items-center justify-center gap-1">
                      {trade.pnl === undefined ? (
                        <Badge variant="outline" className="bg-blue-50 border-blue-200">
                          <span className="text-blue-700">Open Position</span>
                        </Badge>
                      ) : trade.pnl > 0 ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Winner
                        </Badge>
                      ) : trade.pnl < 0 ? (
                        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Loser
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Breakeven
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <Badge variant={trade.status === 'open' ? 'default' : 'secondary'}>
                      {trade.status === 'open' ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Entry Date</div>
                    <div className="text-sm font-medium">{trade.entryDate}</div>
                    {trade.exitDate && (
                      <div className="text-xs text-muted-foreground">Exit: {trade.exitDate}</div>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
          
          {/* Screenshot Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">Screenshot</label>
              {!trade.screenshot && !isAddingScreenshot && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddingScreenshot(true)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Add Screenshot
                </Button>
              )}
            </div>
            
            {isAddingScreenshot ? (
              <div className="space-y-4">
                <div 
                  className="relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer group border-primary/50 bg-primary/5"
                  onClick={() => document.getElementById('calendar-modal-paste-input')?.focus()}
                >
                  <div className="space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full flex items-center justify-center bg-primary/20 text-primary">
                      <Copy className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium">Paste Screenshot Here</p>
                    <p className="text-xs text-muted-foreground">
                      Copy your screenshot and paste it here ({navigator.platform.toLowerCase().includes('mac') ? '⌘ V' : 'Ctrl + V'})
                    </p>
                  </div>
                  
                  <input
                    id="calendar-modal-paste-input"
                    type="text"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onPaste={async (e) => {
                      e.preventDefault()
                      const clipboardData = e.clipboardData
                      const items = Array.from(clipboardData.items)
                      const imageItem = items.find(item => item.type.startsWith('image/'))
                      
                      if (imageItem) {
                        const imageFile = imageItem.getAsFile()
                        if (imageFile) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const base64Image = event.target?.result as string
                            const updatedTrade = { ...trade, screenshot: base64Image }
                            updateTrade(trade.id, updatedTrade)
                            onTradeUpdate(updatedTrade)
                            setIsAddingScreenshot(false)
                          }
                          reader.readAsDataURL(imageFile)
                        }
                      }
                    }}
                    autoComplete="off"
                  />
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsAddingScreenshot(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : trade.screenshot ? (
              <div className="relative group">
                <Image 
                  src={trade.screenshot} 
                  alt="Trade screenshot" 
                  className="w-full rounded-lg border shadow-sm cursor-pointer max-h-96 object-contain bg-muted/20"
                  width={600}
                  height={400}
                  onClick={() => {
                    const newWindow = window.open()
                    if (newWindow) {
                      newWindow.document.write(`
                        <html>
                          <head><title>Trade Screenshot - ${trade.symbol}</title></head>
                          <body style="margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5;">
                            <img src="${trade.screenshot}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                          </body>
                        </html>
                      `)
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white text-sm bg-black/50 px-3 py-2 rounded">Click to view full size</span>
                </div>
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center text-muted-foreground">
                <Copy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No screenshot attached</p>
              </div>
            )}
          </div>
          
          {/* Journal Entry */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">Journal Entry</label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setJournalText(trade.notes || '')
                  setIsEditingJournal(true)
                }}
              >
                Edit
              </Button>
            </div>
            
            {isEditingJournal ? (
              <div className="space-y-3">
                <textarea
                  placeholder="Add your trading notes, analysis, emotions, and lessons learned..."
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  className="w-full min-h-32 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                />
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsEditingJournal(false)
                      setJournalText('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      const updatedTrade = { ...trade, notes: journalText }
                      updateTrade(trade.id, updatedTrade)
                      onTradeUpdate(updatedTrade)
                      setIsEditingJournal(false)
                      setJournalText('')
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="min-h-24 p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setJournalText(trade.notes || '')
                  setIsEditingJournal(true)
                }}
              >
                {trade.notes ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {trade.notes}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm italic">
                    Click to add journal entry... Record your thoughts, analysis, and lessons learned.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CalendarGrid({ currentDate, dayDataMap, onDayClick }: {
  currentDate: Date
  dayDataMap: Map<string, DayData>
  onDayClick: (date: Date) => void
}) {
  const today = new Date()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  // Get the first day of the calendar grid (might be from previous month)
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay())
  
  // Get the last day of the calendar grid (might be from next month)
  const endDate = new Date(lastDayOfMonth)
  const daysToAdd = 6 - lastDayOfMonth.getDay()
  endDate.setDate(endDate.getDate() + daysToAdd)
  
  // Generate all days for the calendar grid
  const calendarDays = []
  const currentDatePointer = new Date(startDate)
  
  while (currentDatePointer <= endDate) {
    calendarDays.push(new Date(currentDatePointer))
    currentDatePointer.setDate(currentDatePointer.getDate() + 1)
  }

  // Calculate weekly totals
  const weeks = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    const weekDays = calendarDays.slice(i, i + 7)
    const weekTotal = weekDays.reduce((sum, day) => {
      const dayKey = day.toISOString().split('T')[0]
      const dayData = dayDataMap.get(dayKey)
      return sum + (dayData?.totalPnL || 0)
    }, 0)
    weeks.push({ days: weekDays, total: weekTotal })
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header with day names */}
      <div className="grid grid-cols-8 bg-muted/20">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Week'].map((day) => (
          <div key={day} className="p-3 text-center text-sm font-medium border-r border-muted/20 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-8 border-t border-muted/20">
          {week.days.map((day) => {
            const dayKey = day.toISOString().split('T')[0]
            const dayData = dayDataMap.get(dayKey) || null
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isToday = day.toDateString() === today.toDateString()
            
            return (
              <CalendarDayCell
                key={dayKey}
                date={day}
                dayData={dayData}
                isCurrentMonth={isCurrentMonth}
                isToday={isToday}
                onClick={() => onDayClick(day)}
              />
            )
          })}
          
          {/* Week total */}
          <div className="h-24 border-l border-muted/20 bg-muted/10 p-2 flex flex-col justify-center items-center">
            <div className={`text-sm font-medium ${
              week.total > 0 ? 'text-green-600' : week.total < 0 ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              {week.total >= 0 ? '+' : ''}${week.total.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">week</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTradeDetail, setSelectedTradeDetail] = useState<Trade | null>(null)
  const { trades } = useTrades()
  const { activities } = useTraderProgress()

  // Process trades and activities into day data
  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>()
    
    // Process trades
    trades.forEach((trade: Trade) => {
      if (trade.exitDate && trade.pnl !== undefined) {
        const dateKey = trade.exitDate
        
        if (!map.has(dateKey)) {
          map.set(dateKey, {
            date: new Date(dateKey),
            trades: [],
            activities: [],
            totalPnL: 0,
            hasNotes: false,
            totalXP: 0
          })
        }
        
        const dayData = map.get(dateKey)!
        dayData.trades.push(trade)
        dayData.totalPnL += trade.pnl
        if (trade.notes) {
          dayData.hasNotes = true
        }
      }
    })

    // Process activities
    activities.forEach((activity: Activity) => {
      const dateKey = activity.date
      
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: new Date(dateKey),
          trades: [],
          activities: [],
          totalPnL: 0,
          hasNotes: false,
          totalXP: 0
        })
      }
      
      const dayData = map.get(dateKey)!
      dayData.activities.push(activity)
      
      // Add XP based on activity type
      const activityXP = {
        backtest: 40,
        reengineer: 25,
        postTradeReview: 20
      }
      dayData.totalXP += activityXP[activity.type] || 0
    })
    
    return map
  }, [trades, activities])

  // Calculate monthly total
  const monthlyTotal = useMemo(() => {
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    return Array.from(dayDataMap.values())
      .filter(dayData => {
        const date = dayData.date
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear
      })
      .reduce((sum, dayData) => sum + dayData.totalPnL, 0)
  }, [dayDataMap, currentDate])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }

  const selectedDateTrades = selectedDate 
    ? dayDataMap.get(selectedDate.toISOString().split('T')[0])?.trades || []
    : []

  const selectedDateActivities = selectedDate 
    ? dayDataMap.get(selectedDate.toISOString().split('T')[0])?.activities || []
    : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Trading Calendar
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-medium min-w-40 text-center">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Monthly total */}
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Monthly Total</div>
              <div className={`text-lg font-semibold ${
                monthlyTotal > 0 ? 'text-green-600' : monthlyTotal < 0 ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {monthlyTotal >= 0 ? '+' : ''}${monthlyTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <CalendarGrid 
            currentDate={currentDate}
            dayDataMap={dayDataMap}
            onDayClick={setSelectedDate}
          />
        </CardContent>
      </Card>

      {/* Modal */}
      {selectedDate && (
        <CalendarSummaryModal
          date={selectedDate}
          trades={selectedDateTrades}
          activities={selectedDateActivities}
          onClose={() => setSelectedDate(null)}
          onTradeClick={(trade) => {
            setSelectedTradeDetail(trade)
            setSelectedDate(null) // Close calendar modal when trade detail opens
          }}
          onActivityUpdate={() => {}}
        />
      )}

      {/* Trade Detail Modal */}
      {selectedTradeDetail && (
        <TradeDetailModal
          trade={selectedTradeDetail}
          onClose={() => setSelectedTradeDetail(null)}
          onTradeUpdate={(updatedTrade) => {
            setSelectedTradeDetail(updatedTrade)
          }}
        />
      )}
    </div>
  )
}