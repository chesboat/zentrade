"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Target, Flame } from "lucide-react";
import { useTrades } from "@/contexts/TradesContext";
import { useTraderProgress } from "@/hooks/useTraderProgress";
import { MotivatorCard } from "@/components/gamification/MotivatorCard";
import { useMemo } from "react";

export function TodaySummaryCard() {
  const { trades } = useTrades();
  const { 
    streak, 
    longestStreak,
    motivationalMessage,
    dailyXPLog,
    isLoading
  } = useTraderProgress();
  
  // Calculate today XP from daily log
  const todayXP = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return dailyXPLog[today] || 0;
  }, [dailyXPLog]);
  
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

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/10 bg-gradient-to-br from-background to-muted/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading today&apos;s activity...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Motivational Message Card */}
      <MotivatorCard 
        message={motivationalMessage}
        streak={streak}
        todayXP={todayXP}
        level={0} // Not needed here anymore
      />

      {/* Today's Performance Card */}
      <Card className="border-2 border-primary/10 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
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
              <div className="flex justify-center items-center gap-1">
                <Flame className={`h-6 w-6 ${streak >= 3 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                <span className="text-2xl font-bold">{streak}</span>
              </div>
              <p className="text-sm text-muted-foreground">Streak</p>
            </div>
          </div>

          {/* Longest Streak Display */}
          {longestStreak > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <span className="text-sm text-muted-foreground">
                  Personal Best: {longestStreak} day{longestStreak !== 1 ? 's' : ''} streak 🏆
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 