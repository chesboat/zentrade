import { Trade } from "@/mockData/trades"

export interface TradingStats {
  // Core Performance
  totalPnL: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  profitFactor: number
  
  // P&L Analysis
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  averageTrade: number
  
  // Risk Metrics
  maxDrawdown: number
  maxDrawdownPercent: number
  currentDrawdown: number
  sharpeRatio: number
  expectancy: number
  
  // Streaks
  currentStreak: number
  maxWinningStreak: number
  maxLosingStreak: number
  
  // Time Analysis
  averageHoldTime: string
  bestTradingDay: { date: string; pnl: number } | null
  worstTradingDay: { date: string; pnl: number } | null
  
  // Strategy Analysis
  topStrategy: { strategy: string; pnl: number; trades: number } | null
  worstStrategy: { strategy: string; pnl: number; trades: number } | null
  
  // Symbol Analysis
  topSymbol: { symbol: string; pnl: number; trades: number } | null
  
  // Monthly Performance
  monthlyStats: Array<{
    month: string
    pnl: number
    trades: number
    winRate: number
  }>
  
  // Equity Curve Data
  equityCurve: Array<{
    date: string
    cumulativePnL: number
    trade?: Trade
  }>
}

export function calculateTradingStats(trades: Trade[]): TradingStats {
  const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.pnl !== undefined)
  
  if (closedTrades.length === 0) {
    return getEmptyStats()
  }

  // Core Performance
  const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  const totalTrades = closedTrades.length
  const winningTrades = closedTrades.filter(trade => (trade.pnl || 0) > 0)
  const losingTrades = closedTrades.filter(trade => (trade.pnl || 0) < 0)
  const winRate = (winningTrades.length / totalTrades) * 100

  // P&L Analysis
  const totalWins = winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0))
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0
  
  const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0
  const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0
  const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl || 0)) : 0
  const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl || 0)) : 0
  const averageTrade = totalPnL / totalTrades

  // Calculate Equity Curve and Drawdown
  const sortedTrades = [...closedTrades].sort((a, b) => 
    new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
  )
  
  const equityCurve: Array<{ date: string; cumulativePnL: number; trade?: Trade }> = []
  let cumulativePnL = 0
  let peakPnL = 0
  let maxDrawdown = 0
  let currentDrawdown = 0

  sortedTrades.forEach(trade => {
    cumulativePnL += trade.pnl || 0
    equityCurve.push({
      date: trade.exitDate || trade.entryDate,
      cumulativePnL,
      trade
    })
    
    if (cumulativePnL > peakPnL) {
      peakPnL = cumulativePnL
      currentDrawdown = 0
    } else {
      currentDrawdown = peakPnL - cumulativePnL
      maxDrawdown = Math.max(maxDrawdown, currentDrawdown)
    }
  })

  const maxDrawdownPercent = peakPnL > 0 ? (maxDrawdown / peakPnL) * 100 : 0

  // Calculate Sharpe Ratio (simplified - assumes risk-free rate of 0)
  const returns = sortedTrades.map(trade => trade.pnl || 0)
  const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0 // Annualized

  // Expectancy
  const expectancy = (winRate / 100) * averageWin - ((100 - winRate) / 100) * averageLoss

  // Calculate Streaks
  const streaks = calculateStreaks(sortedTrades)

  // Time Analysis
  const averageHoldTime = calculateAverageHoldTime(closedTrades)
  const dailyPnL = calculateDailyPnL(closedTrades)
  const bestTradingDay = dailyPnL.length > 0 ? 
    dailyPnL.reduce((best, day) => day.pnl > best.pnl ? day : best) : null
  const worstTradingDay = dailyPnL.length > 0 ? 
    dailyPnL.reduce((worst, day) => day.pnl < worst.pnl ? day : worst) : null

  // Strategy Analysis
  const strategyStats = calculateStrategyStats(closedTrades)
  const topStrategy = strategyStats.length > 0 ? 
    strategyStats.reduce((best, strategy) => strategy.pnl > best.pnl ? strategy : best) : null
  const worstStrategy = strategyStats.length > 0 ? 
    strategyStats.reduce((worst, strategy) => strategy.pnl < worst.pnl ? strategy : worst) : null

  // Symbol Analysis
  const symbolStats = calculateSymbolStats(closedTrades)
  const topSymbol = symbolStats.length > 0 ? 
    symbolStats.reduce((best, symbol) => symbol.pnl > best.pnl ? symbol : best) : null

  // Monthly Performance
  const monthlyStats = calculateMonthlyStats(closedTrades)

  return {
    totalPnL,
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    profitFactor,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    averageTrade,
    maxDrawdown,
    maxDrawdownPercent,
    currentDrawdown,
    sharpeRatio,
    expectancy,
    currentStreak: streaks.current,
    maxWinningStreak: streaks.maxWinning,
    maxLosingStreak: streaks.maxLosing,
    averageHoldTime,
    bestTradingDay,
    worstTradingDay,
    topStrategy,
    worstStrategy,
    topSymbol,
    monthlyStats,
    equityCurve
  }
}

function getEmptyStats(): TradingStats {
  return {
    totalPnL: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    profitFactor: 0,
    averageWin: 0,
    averageLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    averageTrade: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    currentDrawdown: 0,
    sharpeRatio: 0,
    expectancy: 0,
    currentStreak: 0,
    maxWinningStreak: 0,
    maxLosingStreak: 0,
    averageHoldTime: "0d 0h",
    bestTradingDay: null,
    worstTradingDay: null,
    topStrategy: null,
    worstStrategy: null,
    topSymbol: null,
    monthlyStats: [],
    equityCurve: []
  }
}

function calculateStreaks(trades: Trade[]) {
  let currentStreak = 0
  let maxWinning = 0
  let maxLosing = 0
  let tempWinning = 0
  let tempLosing = 0

  for (const trade of trades) {
    const pnl = trade.pnl || 0
    
    if (pnl > 0) {
      tempWinning++
      tempLosing = 0
      maxWinning = Math.max(maxWinning, tempWinning)
      currentStreak = tempWinning
    } else if (pnl < 0) {
      tempLosing++
      tempWinning = 0
      maxLosing = Math.max(maxLosing, tempLosing)
      currentStreak = -tempLosing
    }
  }

  return {
    current: currentStreak,
    maxWinning,
    maxLosing
  }
}

function calculateAverageHoldTime(trades: Trade[]): string {
  const tradesWithBothDates = trades.filter(trade => trade.entryDate && trade.exitDate)
  
  if (tradesWithBothDates.length === 0) return "0d 0h"
  
  const totalHours = tradesWithBothDates.reduce((total, trade) => {
    const entry = new Date(trade.entryDate)
    const exit = new Date(trade.exitDate!)
    const diffMs = exit.getTime() - entry.getTime()
    return total + (diffMs / (1000 * 60 * 60)) // Convert to hours
  }, 0)
  
  const avgHours = totalHours / tradesWithBothDates.length
  const days = Math.floor(avgHours / 24)
  const hours = Math.floor(avgHours % 24)
  
  return `${days}d ${hours}h`
}

function calculateDailyPnL(trades: Trade[]) {
  const dailyMap = new Map<string, number>()
  
  trades.forEach(trade => {
    const date = trade.exitDate || trade.entryDate
    const currentPnL = dailyMap.get(date) || 0
    dailyMap.set(date, currentPnL + (trade.pnl || 0))
  })
  
  return Array.from(dailyMap.entries()).map(([date, pnl]) => ({ date, pnl }))
}

function calculateStrategyStats(trades: Trade[]) {
  const strategyMap = new Map<string, { pnl: number; trades: number }>()
  
  trades.forEach(trade => {
    const current = strategyMap.get(trade.strategy) || { pnl: 0, trades: 0 }
    strategyMap.set(trade.strategy, {
      pnl: current.pnl + (trade.pnl || 0),
      trades: current.trades + 1
    })
  })
  
  return Array.from(strategyMap.entries()).map(([strategy, stats]) => ({
    strategy,
    ...stats
  }))
}

function calculateSymbolStats(trades: Trade[]) {
  const symbolMap = new Map<string, { pnl: number; trades: number }>()
  
  trades.forEach(trade => {
    const current = symbolMap.get(trade.symbol) || { pnl: 0, trades: 0 }
    symbolMap.set(trade.symbol, {
      pnl: current.pnl + (trade.pnl || 0),
      trades: current.trades + 1
    })
  })
  
  return Array.from(symbolMap.entries()).map(([symbol, stats]) => ({
    symbol,
    ...stats
  }))
}

function calculateMonthlyStats(trades: Trade[]) {
  const monthlyMap = new Map<string, { pnl: number; trades: number; wins: number }>()
  
  trades.forEach(trade => {
    const date = new Date(trade.exitDate || trade.entryDate)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const current = monthlyMap.get(monthKey) || { pnl: 0, trades: 0, wins: 0 }
    
    monthlyMap.set(monthKey, {
      pnl: current.pnl + (trade.pnl || 0),
      trades: current.trades + 1,
      wins: current.wins + ((trade.pnl || 0) > 0 ? 1 : 0)
    })
  })
  
  return Array.from(monthlyMap.entries()).map(([month, stats]) => ({
    month,
    pnl: stats.pnl,
    trades: stats.trades,
    winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
  })).sort((a, b) => a.month.localeCompare(b.month))
} 