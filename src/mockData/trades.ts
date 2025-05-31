export interface Trade {
  id: string;
  symbol: string;
  company: string;
  type: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  entryDate: string;
  exitDate?: string;
  pnl?: number;
  status: 'open' | 'closed';
  notes?: string;
  strategy: string;
  screenshot?: string; // base64 image data
  riskAmount?: number; // original risk amount from TradingView
}

// Empty array for production - users will add their own trades
export const mockTrades: Trade[] = [];

export const mockStats = {
  totalPnl: 0,
  winRate: 0,
  totalTrades: 0,
  avgTrade: 0,
  bestTrade: 0,
  worstTrade: 0,
  winningTrades: 0,
  losingTrades: 0,
  sharpeRatio: 0,
  maxDrawdown: 0
}; 