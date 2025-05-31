"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, TrendingDown, BarChart3, Target } from "lucide-react";
import { useTrades } from "@/contexts/TradesContext";
import { useMemo } from "react";

export function TodaySummaryCard() {
  const { trades } = useTrades();
  
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = trades.filter(trade => 
      trade.entryDate === today || trade.exitDate === today
    );
    
    const todayPnL = todayTrades
      .filter(trade => trade.status === 'closed')
      .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    const tradesCount = todayTrades.length;
    const hasJournal = todayTrades.some(trade => trade.notes && trade.notes.trim().length > 0);
    
    return {
      tradesCount,
      todayPnL,
      hasJournal,
      emotion: 'calm', // Placeholder - could be extracted from journal sentiment
      rulesFollowed: tradesCount > 0 // Placeholder logic
    };
  }, [trades]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const currentStreak = 3; // Hardcoded as requested

  return (
    <Card className="border-2 border-primary/10 bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="h-5 w-5 text-primary" />
          Today at a Glance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Trades Today */}
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold">{todayStats.tradesCount}</div>
            <p className="text-sm text-muted-foreground">Trades</p>
          </div>

          {/* PnL Today */}
          <div className="text-center space-y-1">
            <div className={`text-2xl font-bold ${
              todayStats.todayPnL > 0 ? 'text-green-600' : 
              todayStats.todayPnL < 0 ? 'text-red-600' : 
              'text-muted-foreground'
            }`}>
              {formatCurrency(todayStats.todayPnL)}
            </div>
            <p className="text-sm text-muted-foreground">P&L</p>
          </div>

          {/* Rules Followed */}
          <div className="text-center space-y-1">
            <div className="flex justify-center">
              {todayStats.rulesFollowed ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">Rules</p>
          </div>

          {/* Emotion */}
          <div className="text-center space-y-1">
            <Badge variant={todayStats.emotion === 'calm' ? 'default' : 'destructive'} className="text-sm">
              {todayStats.emotion}
            </Badge>
            <p className="text-sm text-muted-foreground">Emotion</p>
          </div>

          {/* Current Streak */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">+{currentStreak}</span>
            </div>
            <p className="text-sm text-muted-foreground">Streak</p>
          </div>
        </div>

        {/* Journal Indicator */}
        {todayStats.hasJournal && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              Journal entries added today
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 