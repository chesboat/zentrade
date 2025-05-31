"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, BookOpen, Plus, Target, Lightbulb } from "lucide-react";
import { useTrades } from "@/contexts/TradesContext";
import { useMemo } from "react";

interface Nudge {
  id: string;
  type: 'info' | 'success' | 'warning' | 'motivational';
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function SmartNudges() {
  const { trades } = useTrades();

  const nudges = useMemo(() => {
    const activeNudges: Nudge[] = [];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Check for trades today
    const todayTrades = trades.filter(trade => 
      trade.entryDate === today || trade.exitDate === today
    );
    
    // Check for trades yesterday
    const yesterdayTrades = trades.filter(trade => 
      trade.entryDate === yesterday || trade.exitDate === yesterday
    );

    // Recent closed trades
    const recentClosedTrades = trades
      .filter(trade => trade.status === 'closed')
      .sort((a, b) => new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime())
      .slice(0, 3);

    // Nudge 1: No trades today
    if (todayTrades.length === 0) {
      activeNudges.push({
        id: 'no-trades-today',
        type: 'info',
        icon: <Plus className="h-4 w-4" />,
        title: "Ready to trade?",
        message: "You haven't added a trade today yet. Paste one from TradingView when you're ready!",
        action: {
          label: "Add Trade",
          onClick: () => {
            // Scroll to trade paste section
            document.querySelector('[data-trade-paste]')?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }

    // Nudge 2: Yesterday's trade missing journal
    const yesterdayTradesWithoutJournal = yesterdayTrades.filter(trade => 
      !trade.notes || trade.notes.trim().length === 0
    );
    
    if (yesterdayTradesWithoutJournal.length > 0) {
      activeNudges.push({
        id: 'missing-journal',
        type: 'warning',
        icon: <BookOpen className="h-4 w-4" />,
        title: "Journal incomplete",
        message: `Yesterday's ${yesterdayTradesWithoutJournal.length > 1 ? 'trades are' : 'trade is'} missing journal entries. Reflection helps improve performance!`,
        action: {
          label: "Add Notes",
          onClick: () => {
            // Navigate to calendar or recent trades
            console.log('Navigate to add journal notes');
          }
        }
      });
    }

    // Nudge 3: Winning streak motivation
    const winningTrades = recentClosedTrades.filter(trade => (trade.pnl || 0) > 0);
    if (winningTrades.length >= 2) {
      activeNudges.push({
        id: 'winning-streak',
        type: 'success',
        icon: <TrendingUp className="h-4 w-4" />,
        title: "Great momentum!",
        message: `You're on a roll with ${winningTrades.length} recent winners. Keep following your strategy!`,
      });
    }

    // Nudge 4: Rules compliance (placeholder)
    if (recentClosedTrades.length >= 3) {
      const hasGoodNotes = recentClosedTrades.filter(trade => 
        trade.notes && trade.notes.trim().length > 20
      );
      
      if (hasGoodNotes.length >= 2) {
        activeNudges.push({
          id: 'good-habits',
          type: 'motivational',
          icon: <Target className="h-4 w-4" />,
          title: "Building great habits!",
          message: "You've been consistent with your trade documentation. This discipline will pay off long-term.",
        });
      }
    }

    // Nudge 5: Performance insight
    if (recentClosedTrades.length >= 5) {
      const totalPnL = recentClosedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const winRate = (recentClosedTrades.filter(trade => (trade.pnl || 0) > 0).length / recentClosedTrades.length) * 100;
      
      if (winRate >= 60 && totalPnL > 0) {
        activeNudges.push({
          id: 'performance-insight',
          type: 'motivational',
          icon: <Lightbulb className="h-4 w-4" />,
          title: "Strong performance",
          message: `${winRate.toFixed(0)}% win rate in recent trades. Your strategy is working well!`,
        });
      }
    }

    // Return maximum 2 nudges to avoid clutter
    return activeNudges.slice(0, 2);
  }, [trades]);

  const getTypeStyles = (type: Nudge['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'motivational':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-border bg-muted/30 text-foreground';
    }
  };

  if (nudges.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {nudges.map((nudge) => (
        <Card key={nudge.id} className={`border ${getTypeStyles(nudge.type)}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {nudge.icon}
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <h4 className="font-medium">{nudge.title}</h4>
                  <p className="text-sm opacity-90">{nudge.message}</p>
                </div>
                {nudge.action && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={nudge.action.onClick}
                    className="text-xs"
                  >
                    {nudge.action.label}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 