"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  BookOpen,
  ChevronRight,
  Target,
  Copy,
  BarChart3,
  RefreshCw,
  FileText,
  Zap
} from "lucide-react";
import { useTrades } from "@/contexts/TradesContext";
import { useTraderProgress } from "@/hooks/useTraderProgress";
import { Trade } from "@/mockData/trades";
import { Activity } from "@/services/xpService";
import Image from "next/image";
import { EnhancedCalendarModal } from "./EnhancedCalendarModal";

interface DayStats {
  date: string;
  dayName: string;
  dayNumber: number;
  pnl: number;
  tradeCount: number;
  activityCount: number;
  hasJournal: boolean;
  isToday: boolean;
  trades: Trade[];
  activities: Activity[];
  totalXP: number;
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
                  onClick={() => document.getElementById('weekly-modal-paste-input')?.focus()}
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
                    id="weekly-modal-paste-input"
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

export function WeeklyCalendarPreview() {
  const { trades } = useTrades();
  const { activities } = useTraderProgress();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTradeDetail, setSelectedTradeDetail] = useState<Trade | null>(null);

  // Activity icons to match main calendar
  const activityIcons = {
    backtest: <BarChart3 className="h-2.5 w-2.5 text-blue-500" />,
    reengineer: <RefreshCw className="h-2.5 w-2.5 text-purple-500" />,
    postTradeReview: <FileText className="h-2.5 w-2.5 text-green-500" />
  }

  const weekData = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday

    const days: DayStats[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const dayTrades = trades.filter(trade => 
        trade.entryDate === dateString || trade.exitDate === dateString
      );

      const dayActivities = activities.filter(activity => 
        activity.date === dateString
      );
      
      const pnl = dayTrades
        .filter(trade => trade.status === 'closed')
        .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      const hasJournal = dayTrades.some(trade => trade.notes && trade.notes.trim().length > 0) ||
                         dayActivities.length > 0;
      
      // Calculate XP for activities (matching main calendar logic)
      const totalXP = dayActivities.reduce((sum, activity) => {
        const activityXP = {
          backtest: 40,
          reengineer: 25,
          postTradeReview: 20
        }
        return sum + (activityXP[activity.type] || 0)
      }, 0)
      
      days.push({
        date: dateString,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        pnl,
        tradeCount: dayTrades.length,
        activityCount: dayActivities.length,
        hasJournal,
        isToday: dateString === today.toISOString().split('T')[0],
        trades: dayTrades,
        activities: dayActivities,
        totalXP
      });
    }
    
    return days;
  }, [trades, activities]);

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600 bg-green-50 border-green-200';
    if (pnl < 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-muted-foreground bg-muted/30 border-border';
  };

  const handleDayClick = (day: DayStats) => {
    const date = new Date(day.date);
    setSelectedDate(date);
  };

  const handleViewFullCalendar = () => {
    // Scroll to the full calendar section
    const calendarSection = document.querySelector('[data-full-calendar]');
    if (calendarSection) {
      calendarSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const selectedDateData = selectedDate 
    ? weekData.find(day => day.date === selectedDate.toISOString().split('T')[0])
    : null;

  const selectedDateTrades = selectedDateData?.trades || [];
  const selectedDateActivities = selectedDateData?.activities || [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              This Week
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-sm" onClick={handleViewFullCalendar}>
              View Full Calendar
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekData.map((day) => (
              <div key={`header-${day.date}`} className="text-center">
                <div className="text-xs font-medium text-muted-foreground">
                  {day.dayName}
                </div>
              </div>
            ))}
          </div>
          
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-2">
            {weekData.map((day) => (
              <div
                key={day.date}
                className={`
                  relative p-2 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md h-24
                  ${day.isToday ? 'ring-2 ring-primary ring-offset-2' : ''}
                  ${getPnLColor(day.pnl)}
                `}
                onClick={() => handleDayClick(day)}
              >
                <div className="h-full flex flex-col justify-between">
                  {/* Header row - date and indicators */}
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium">
                      {day.dayNumber}
                    </span>
                    <div className="flex items-center gap-1">
                      {day.hasJournal && (
                        <BookOpen className="h-3 w-3 text-blue-500" />
                      )}
                      {day.totalXP > 0 && (
                        <div className="flex items-center">
                          <Zap className="h-2.5 w-2.5 text-yellow-500" />
                          <span className="text-xs text-yellow-600 font-medium ml-0.5">
                            {day.totalXP}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content area */}
                  <div className="space-y-1 flex-1 flex flex-col justify-end">
                    {/* Activity indicators */}
                    {day.activities.length > 0 && (
                      <div className="flex items-center gap-1 mb-1">
                        {day.activities.slice(0, 3).map((activity, index) => (
                          <div 
                            key={index}
                            className="p-0.5 rounded-full bg-muted/50 border"
                            title={`${activity.type} activity`}
                          >
                            {activityIcons[activity.type]}
                          </div>
                        ))}
                        {day.activities.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{day.activities.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Trade info */}
                    {day.trades.length > 0 && (
                      <div className="space-y-1">
                        <div className={`text-xs font-medium px-1 py-0.5 rounded border ${
                          day.pnl > 0 ? 'text-green-600 bg-green-50 border-green-200' :
                          day.pnl < 0 ? 'text-red-600 bg-red-50 border-red-200' :
                          'text-yellow-600 bg-yellow-50 border-yellow-200'
                        }`}>
                          {day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {day.tradeCount} trade{day.tradeCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Today indicator */}
                {day.isToday && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full"></div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  {weekData.reduce((sum, day) => sum + day.tradeCount, 0)} trades
                </span>
                <span>
                  {weekData.reduce((sum, day) => sum + day.activityCount, 0)} activities
                </span>
              </div>
              <span className={
                weekData.reduce((sum, day) => sum + day.pnl, 0) >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }>
                {formatCurrency(weekData.reduce((sum, day) => sum + day.pnl, 0))} total
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Summary Modal */}
      {selectedDate && (
        <EnhancedCalendarModal
          date={selectedDate}
          trades={selectedDateTrades}
          activities={selectedDateActivities}
          onClose={() => setSelectedDate(null)}
          onTradeClick={(trade) => {
            setSelectedTradeDetail(trade)
            setSelectedDate(null) // Close calendar modal when trade detail opens
          }}
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
    </>
  );
} 