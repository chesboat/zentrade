"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, ChevronRight, BookOpen, Expand } from "lucide-react";
import { useTrades } from "@/contexts/TradesContext";
import { useMemo } from "react";

export function RecentTrades() {
  const { trades } = useTrades();

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
  );
} 