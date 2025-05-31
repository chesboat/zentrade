"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Shield, Trophy } from "lucide-react";
import { TradePaste } from "@/components/TradePaste";
import { CalendarView } from "@/components/CalendarView";
import { TodaySummaryCard } from "@/components/TodaySummaryCard";
import { WeeklyCalendarPreview } from "@/components/WeeklyCalendarPreview";
import { RecentTrades } from "@/components/RecentTrades";
import { SmartNudges } from "@/components/SmartNudges";
import { useTrades } from "@/contexts/TradesContext";
import { calculateTradingStats } from "@/utils/tradingStats";
import { useMemo } from "react";

export default function Home() {
  const { trades } = useTrades();
  const stats = useMemo(() => calculateTradingStats(trades), [trades]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Trading Dashboard
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Track your progress, build consistent habits, and grow as a trader.
        </p>
      </div>

      {/* Today at a Glance */}
      <TodaySummaryCard />

      {/* Weekly Calendar Preview */}
      <WeeklyCalendarPreview />

      {/* Smart Nudges */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Insights & Suggestions</h2>
        <SmartNudges />
      </div>

      {/* Performance Metrics - Grouped */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">Performance Overview</h2>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Performance Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total P&L</span>
                  <span className={`font-medium ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(stats.totalPnL)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="font-medium">{formatPercent(stats.winRate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Profit Factor</span>
                  <span className="font-medium">
                    {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                  <span className="font-medium">{stats.sharpeRatio.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk & Expectancy */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                Risk & Expectancy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Max Drawdown</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(stats.maxDrawdown)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Drawdown</span>
                  <span className="font-medium">
                    {formatCurrency(stats.currentDrawdown)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Expectancy</span>
                  <span className={`font-medium ${stats.expectancy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(stats.expectancy)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Hold Time</span>
                  <span className="font-medium">{stats.averageHoldTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade Behavior */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-600" />
                Trade Behavior
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Streak</span>
                  <span className={`font-medium ${stats.currentStreak > 0 ? 'text-green-600' : stats.currentStreak < 0 ? 'text-red-600' : ''}`}>
                    {stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Win</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(stats.averageWin)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Loss</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(stats.averageLoss)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {stats.topSymbol ? 'Top Symbol' : 'Best Day'}
                  </span>
                  <span className="font-medium text-xs">
                    {stats.topSymbol ? 
                      `${stats.topSymbol.symbol} (${formatCurrency(stats.topSymbol.pnl)})` :
                      stats.bestTradingDay ? 
                        `${formatCurrency(stats.bestTradingDay.pnl)}` : 
                        'N/A'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
        <RecentTrades />
      </div>

      {/* Trade Entry */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Add New Trade</h2>
        <div data-trade-paste>
          <TradePaste />
        </div>
      </div>

      {/* Full Calendar Link */}
      <div className="space-y-4" data-full-calendar>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Trading Calendar</h2>
          <p className="text-sm text-muted-foreground">
            View detailed trade history and journal entries
          </p>
        </div>
        <CalendarView />
      </div>
    </div>
  );
}
