"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, ChevronRight, BookOpen, Expand, TrendingUp, TrendingDown, Target, Copy } from "lucide-react";
import { useTrades } from "@/contexts/TradesContext";
import { useMemo, useState } from "react";
import { Trade } from "@/mockData/trades";
import Image from "next/image";

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
                  onClick={() => document.getElementById('recent-trades-modal-paste-input')?.focus()}
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
                    id="recent-trades-modal-paste-input"
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

export function RecentTrades() {
  const { trades } = useTrades();
  const [selectedTradeDetail, setSelectedTradeDetail] = useState<Trade | null>(null);

  const recentTrades = useMemo(() => {
    return trades
      .filter(trade => trade.status === 'closed')
      .sort((a, b) => {
        const dateA = new Date(b.exitDate || b.entryDate).getTime();
        const dateB = new Date(a.exitDate || a.entryDate).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [trades]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (recentTrades.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No trades yet</p>
            <p className="text-sm">Your recent trades will appear here once you start trading.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Recent Trades
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-sm">
              View Full Journal
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentTrades.map((trade) => (
            <div
              key={trade.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border hover:shadow-sm transition-all cursor-pointer group"
              onClick={() => setSelectedTradeDetail(trade)}
            >
              <div className="flex items-center space-x-3">
                {/* Direction Icon */}
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full
                  ${trade.type === 'long' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                  }
                `}>
                  {trade.type === 'long' ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
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
                  <div className="text-sm text-muted-foreground">
                    {formatDate(trade.exitDate || trade.entryDate)} • {trade.strategy}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* P&L */}
                <div className={`
                  text-right font-medium
                  ${(trade.pnl || 0) > 0 ? 'text-green-600' : 
                    (trade.pnl || 0) < 0 ? 'text-red-600' : 
                    'text-muted-foreground'
                  }
                `}>
                  {formatCurrency(trade.pnl || 0)}
                </div>

                {/* Expand Icon */}
                <Expand className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}

          {/* Summary */}
          {recentTrades.length > 0 && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  Last {recentTrades.length} trades
                </span>
                <span className={
                  recentTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) >= 0 
                    ? 'text-green-600 font-medium' 
                    : 'text-red-600 font-medium'
                }>
                  {formatCurrency(recentTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0))}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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