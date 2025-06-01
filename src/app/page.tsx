"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Shield, Trophy, Calendar, ChevronDown, Copy } from "lucide-react";
import { TradePaste } from "@/components/TradePaste";
import { CalendarView } from "@/components/CalendarView";
import { TodaySummaryCard } from "@/components/TodaySummaryCard";
import { WeeklyCalendarPreview } from "@/components/WeeklyCalendarPreview";
import { RecentActivity } from "@/components/RecentActivity";
import { SmartNudges } from "@/components/SmartNudges";
import { ActivityLogger } from "@/components/gamification/ActivityLogger";
import { XPProgressCard } from "@/components/gamification/XPProgressCard";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useTrades } from "@/contexts/TradesContext";
import { calculateTradingStats } from "@/utils/tradingStats";
import { useMemo, useState, useEffect, useRef } from "react";
import { RulesManagement } from "@/components/rules/RulesManagement";
import { EndSessionButton } from "@/components/rules/EndSessionButton";
import { XPFeedbackBanner } from "@/components/gamification/XPFeedbackBanner";
import { useAuth } from "@/contexts/AuthContext";

type DateFilterOption = 'all' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

interface DateFilter {
  label: string;
  value: DateFilterOption;
  getDateRange: () => { start: Date; end: Date };
}

const dateFilters: DateFilter[] = [
  {
    label: 'All Time',
    value: 'all',
    getDateRange: () => ({ start: new Date(2020, 0, 1), end: new Date() })
  },
  {
    label: 'This Week',
    value: 'thisWeek',
    getDateRange: () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date();
      endOfWeek.setHours(23, 59, 59, 999);
      return { start: startOfWeek, end: endOfWeek };
    }
  },
  {
    label: 'Last Week',
    value: 'lastWeek',
    getDateRange: () => {
      const now = new Date();
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);
      return { start: startOfLastWeek, end: endOfLastWeek };
    }
  },
  {
    label: 'This Month',
    value: 'thisMonth',
    getDateRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  },
  {
    label: 'Last Month',
    value: 'lastMonth',
    getDateRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }
];

export default function Home() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}

function Dashboard() {
  const { trades } = useTrades();
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilterOption>('all');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
      }
    };

    if (showDateDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateDropdown]);

  const filteredTrades = useMemo(() => {
    if (selectedDateFilter === 'all') {
      return trades;
    }

    if (selectedDateFilter === 'custom') {
      if (!customDateRange.start || !customDateRange.end) {
        return trades;
      }
      
      const start = new Date(customDateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customDateRange.end);
      end.setHours(23, 59, 59, 999);
      
      return trades.filter(trade => {
        const tradeDate = new Date(trade.exitDate || trade.entryDate);
        return tradeDate >= start && tradeDate <= end;
      });
    }

    const filter = dateFilters.find(f => f.value === selectedDateFilter);
    if (!filter) return trades;

    const { start, end } = filter.getDateRange();
    
    return trades.filter(trade => {
      const tradeDate = new Date(trade.exitDate || trade.entryDate);
      return tradeDate >= start && tradeDate <= end;
    });
  }, [trades, selectedDateFilter, customDateRange]);

  const stats = useMemo(() => calculateTradingStats(filteredTrades), [filteredTrades]);

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

  const getSelectedFilterLabel = () => {
    if (selectedDateFilter === 'custom') {
      if (customDateRange.start && customDateRange.end) {
        const start = new Date(customDateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const end = new Date(customDateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${start} - ${end}`;
      }
      return 'Custom Range';
    }
    const filter = dateFilters.find(f => f.value === selectedDateFilter);
    return filter?.label || 'All Time';
  };

  const applyCustomDateRange = () => {
    if (customDateRange.start && customDateRange.end) {
      setSelectedDateFilter('custom');
      setShowDateDropdown(false);
    }
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

      {/* XP Progress Card */}
      <XPProgressCard />

      {/* XP Feedback Banner - shows after rule check-in */}
      <XPFeedbackBanner />

      {/* Rules Management - replaces Rules Setup CTA */}
      <RulesManagement variant="dashboard" />

      {/* End Session Button */}
      <EndSessionButton />

      {/* Today at a Glance */}
      <TodaySummaryCard />

      {/* Weekly Calendar Preview */}
      <WeeklyCalendarPreview />

      {/* Smart Nudges */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Insights & Suggestions</h2>
        <SmartNudges />
        <ActivityLogger />
      </div>

      {/* Performance Metrics - Grouped */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Performance Overview</h2>
          
          {/* Date Filter Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="outline"
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {getSelectedFilterLabel()}
              <ChevronDown className="h-4 w-4" />
            </Button>
            
            {showDateDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-background border rounded-lg shadow-lg z-10">
                <div className="p-2 space-y-1">
                  {dateFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => {
                        setSelectedDateFilter(filter.value);
                        setShowDateDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedDateFilter === filter.value
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  
                  {/* Custom Date Range Option */}
                  <div className="border-t pt-2 mt-2">
                    <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                      Custom Range
                    </div>
                    <div className="px-3 py-2 space-y-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">From</label>
                        <input
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">To</label>
                        <input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={applyCustomDateRange}
                        className="w-full text-xs"
                        disabled={!customDateRange.start || !customDateRange.end}
                      >
                        Apply Range
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter Summary Badge */}
        {selectedDateFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Showing {getSelectedFilterLabel()} • {filteredTrades.filter(t => t.status === 'closed').length} trades
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDateFilter('all')}
              className="text-xs"
            >
              View All Time
            </Button>
          </div>
        )}
        
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
        <RecentActivity />
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
