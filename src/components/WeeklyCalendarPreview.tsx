"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight, BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import { useTrades } from "@/contexts/TradesContext";
import { useMemo, useState } from "react";
import { Trade } from "@/mockData/trades";

interface DayStats {
  date: string;
  dayName: string;
  dayNumber: number;
  pnl: number;
  tradeCount: number;
  hasJournal: boolean;
  isToday: boolean;
  trades: Trade[];
}

interface CalendarSummaryModalProps {
  date: Date | null;
  trades: Trade[];
  onClose: () => void;
  onTradeClick: (trade: Trade) => void;
}

function CalendarSummaryModal({ date, trades, onClose, onTradeClick }: CalendarSummaryModalProps) {
  if (!date) return null;

  const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const winCount = trades.filter(trade => (trade.pnl || 0) > 0).length;
  const lossCount = trades.filter(trade => (trade.pnl || 0) < 0).length;

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
  );
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

export function WeeklyCalendarPreview() {
  const { trades } = useTrades();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTradeDetail, setSelectedTradeDetail] = useState<Trade | null>(null);

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
      
      const pnl = dayTrades
        .filter(trade => trade.status === 'closed')
        .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      const hasJournal = dayTrades.some(trade => trade.notes && trade.notes.trim().length > 0);
      
      days.push({
        date: dateString,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        pnl,
        tradeCount: dayTrades.length,
        hasJournal,
        isToday: dateString === today.toISOString().split('T')[0],
        trades: dayTrades
      });
    }
    
    return days;
  }, [trades]);

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

  const selectedDateTrades = selectedDate 
    ? weekData.find(day => day.date === selectedDate.toISOString().split('T')[0])?.trades || []
    : [];

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
          <div className="grid grid-cols-7 gap-2">
            {weekData.map((day) => (
              <div
                key={day.date}
                className={`
                  relative p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md
                  ${day.isToday ? 'ring-2 ring-primary ring-offset-2' : ''}
                  ${getPnLColor(day.pnl)}
                `}
                onClick={() => handleDayClick(day)}
              >
                {/* Day Header */}
                <div className="text-center space-y-1">
                  <div className="text-xs font-medium opacity-70">
                    {day.dayName}
                  </div>
                  <div className="text-lg font-bold">
                    {day.dayNumber}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-2 space-y-1">
                  {day.tradeCount > 0 && (
                    <div className="text-center">
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {day.tradeCount}
                      </Badge>
                    </div>
                  )}
                  
                  {day.pnl !== 0 && (
                    <div className="text-center text-xs font-medium">
                      {formatCurrency(day.pnl)}
                    </div>
                  )}
                  
                  {day.hasJournal && (
                    <div className="flex justify-center">
                      <BookOpen className="h-3 w-3 opacity-60" />
                    </div>
                  )}
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
              <span>
                {weekData.reduce((sum, day) => sum + day.tradeCount, 0)} trades this week
              </span>
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
    </>
  );
} 