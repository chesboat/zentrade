"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, BookOpen } from "lucide-react"
import { Trade } from "@/mockData/trades"
import { useTrades } from "@/contexts/TradesContext"

interface DayData {
  date: Date
  trades: Trade[]
  totalPnL: number
  hasNotes: boolean
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
  onClose: () => void
  onTradeClick: (trade: Trade) => void
}

function CalendarDayCell({ date, dayData, isCurrentMonth, isToday, onClick }: CalendarDayCellProps) {
  const pnlColor = dayData && dayData.totalPnL > 0 
    ? 'text-green-600 bg-green-50 border-green-200' 
    : dayData && dayData.totalPnL < 0 
      ? 'text-red-600 bg-red-50 border-red-200'
      : dayData && dayData.totalPnL === 0
        ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
        : ''

  return (
    <div 
      className={`h-24 border cursor-pointer transition-all hover:bg-muted/20 ${
        isCurrentMonth ? 'border-muted/30' : 'border-muted/10 opacity-40'
      } ${isToday ? 'bg-primary/10 border-primary/30' : ''}`}
      onClick={onClick}
    >
      <div className="p-2 h-full flex flex-col justify-between">
        {/* Date number - always show */}
        <div className="flex items-start justify-between">
          <span className={`text-sm font-medium ${
            isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {date.getDate()}
          </span>
          {dayData?.hasNotes && (
            <BookOpen className="h-3 w-3 text-blue-500" />
          )}
        </div>

        {/* Trade info - only show if there are trades */}
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
  )
}

function CalendarSummaryModal({ date, trades, onClose, onTradeClick }: CalendarSummaryModalProps) {
  if (!date) return null

  const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  const winCount = trades.filter(trade => (trade.pnl || 0) > 0).length
  const lossCount = trades.filter(trade => (trade.pnl || 0) < 0).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
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
          
          {trades.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <div className={`font-medium ${
                totalPnL > 0 ? 'text-green-600' : totalPnL < 0 ? 'text-red-600' : 'text-yellow-600'
              }`}>
                Total P&L: {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </div>
              <div className="text-muted-foreground">
                {trades.length} trades • {winCount}W {lossCount}L
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {trades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trades on this day
            </div>
          ) : (
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
                                {/* Fallback gradient overlay for browsers without mask support */}
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
  const { updateTrade } = useTrades()
  
  if (!trade) return null

  const formatPrice = (price: number) => `$${price.toFixed(2)}`

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
          {/* Trade Details */}
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
                  {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Quantity</label>
              <div className="text-lg font-semibold">{trade.quantity}</div>
            </div>
          </div>

          {/* Additional Trade Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Entry Date</label>
              <div className="text-base font-medium">{trade.entryDate}</div>
            </div>
            {trade.exitDate && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Exit Date</label>
                <div className="text-base font-medium">{trade.exitDate}</div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Strategy</label>
              <div className="text-base font-medium">{trade.strategy}</div>
            </div>
          </div>
          
          {/* Screenshot */}
          {trade.screenshot && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Screenshot</label>
              <div className="relative group">
                <img 
                  src={trade.screenshot} 
                  alt="Trade screenshot" 
                  className="w-full rounded-lg border shadow-sm cursor-pointer max-h-96 object-contain bg-muted/20"
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
            </div>
          )}
          
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
                      updateTrade(trade.id, { notes: journalText })
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

  // Process trades into day data
  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>()
    
    trades.forEach((trade: Trade) => {
      if (trade.exitDate && trade.pnl !== undefined) {
        const dateKey = trade.exitDate
        
        if (!map.has(dateKey)) {
          map.set(dateKey, {
            date: new Date(dateKey),
            trades: [],
            totalPnL: 0,
            hasNotes: false
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
    
    return map
  }, [trades])

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
    </div>
  )
}