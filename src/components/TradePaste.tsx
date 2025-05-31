"use client"

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Copy, TrendingUp, TrendingDown, Target, DollarSign, CheckCircle, AlertCircle } from "lucide-react"
import { useTrades } from "@/contexts/TradesContext"
import { Trade as ContextTrade } from "@/mockData/trades"
import Image from "next/image"

interface ParsedTrade {
  ticker?: string
  direction?: 'Long' | 'Short'
  entryPrice?: number
  stopLoss?: number
  takeProfit?: number
  quantity?: number
  originalText: string
  tradeDate?: string
  outcome?: 'win' | 'loss' | 'breakeven'
  exitPrice?: number
  actualPnL?: number
  actualRisk?: number
  riskAdjustment?: 'moderate_risk' | 'lower_risk' | 'normal'
  screenshot?: string
  journalEntry?: string
}

export function TradePaste() {
  const [parsedTrade, setParsedTrade] = useState<ParsedTrade | null>(null)
  const [error, setError] = useState<string>('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<ContextTrade | null>(null)
  const [journalText, setJournalText] = useState('')
  const [isEditingJournal, setIsEditingJournal] = useState(false)
  const [isScreenshotMode, setIsScreenshotMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const { trades, addTrade, updateTrade } = useTrades()

  const parseTradingViewData = useCallback((text: string): ParsedTrade => {
    const result: ParsedTrade = { originalText: text }
    
    // Look for TradingView clip data
    if (text.includes('data-tradingview-clip')) {
      try {
        const clipMatch = text.match(/data-tradingview-clip="([^"]+)"/)
        if (clipMatch) {
          const jsonStr = clipMatch[1]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
          
          const clipData = JSON.parse(jsonStr)
          
          if (clipData.sources?.[0]?.source) {
            const source = clipData.sources[0].source
            
            // Extract basic trade info
            if (source.state?.symbol) {
              result.ticker = source.state.symbol.includes(':') 
                ? source.state.symbol.split(':')[1] 
                : source.state.symbol
            }
            
            if (source.type?.includes('Short')) {
              result.direction = 'Short'
            } else if (source.type?.includes('Long')) {
              result.direction = 'Long'
            }
            
            if (source.points?.length > 0) {
              const prices = source.points.map((p: { price: number }) => p.price).filter((p: number) => p != null)
              if (prices.length > 0) {
                result.entryPrice = prices[0]
              }
            }
          }
        }
      } catch {
        // Fall through to text parsing
      }
    }
    
    // Basic text parsing fallback
    if (!result.ticker || !result.entryPrice) {
      const cleanText = text.trim().replace(/\s+/g, ' ')
      
      // Extract ticker
      const tickerMatch = cleanText.match(/([A-Z]{1,5})\s+(?:Long|Short)/i) || 
                         cleanText.match(/(?:Symbol|Ticker):\s*([A-Z]{1,5})/i)
      if (tickerMatch) {
        result.ticker = tickerMatch[1].toUpperCase()
      }
      
      // Extract direction
      if (/\b(?:long|buy)\b/i.test(cleanText)) {
        result.direction = 'Long'
      } else if (/\b(?:short|sell)\b/i.test(cleanText)) {
        result.direction = 'Short'
      }
      
      // Extract price
      const priceMatch = cleanText.match(/(?:entry|price|@):\s*\$?(\d+\.?\d*)/i) ||
                        cleanText.match(/\b(\d+\.?\d{2,})\b/)
      if (priceMatch) {
        const price = parseFloat(priceMatch[1])
        if (!isNaN(price) && price > 0) {
          result.entryPrice = price
        }
      }
    }
    
    return result
  }, [])

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    setError('')
    setShowSuccess(false)
    
    try {
      const clipboardData = e.clipboardData
      
      // Check for images first
      const items = Array.from(clipboardData.items)
      const imageItem = items.find(item => item.type.startsWith('image/'))
      
      if (imageItem) {
        const imageFile = imageItem.getAsFile()
        if (imageFile) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64Image = event.target?.result as string
            
            if (parsedTrade) {
              setParsedTrade({
                ...parsedTrade,
                screenshot: base64Image
              })
              setIsScreenshotMode(true)
              setShowSuccess(true)
              setTimeout(() => setShowSuccess(false), 2000)
            } else {
              const screenshotTrade: ParsedTrade = {
                originalText: 'Screenshot import',
                screenshot: base64Image,
                tradeDate: new Date().toISOString().split('T')[0]
              }
              setParsedTrade(screenshotTrade)
              setIsScreenshotMode(true)
            }
          }
          reader.readAsDataURL(imageFile)
          return
        }
      }
      
      // Get text data
      const textData = clipboardData.getData('text/plain') || 
                      clipboardData.getData('text/html') || 
                      clipboardData.getData('text')
      
      if (!textData.trim()) {
        setError('No text found in clipboard')
        setParsedTrade(null)
        return
      }
      
      const parsed = parseTradingViewData(textData)
      
      // Validate minimum required fields
      if (!parsed.direction && !parsed.entryPrice && !parsed.ticker) {
        setError('Could not detect valid trading data. Please ensure you copied position details from TradingView.')
        setParsedTrade(null)
        return
      }
      
      setParsedTrade(parsed)
      
    } catch (err) {
      console.error('Paste error:', err)
      setError('Failed to parse trading data. Please check the format.')
      setParsedTrade(null)
    }
  }, [parsedTrade, parseTradingViewData])

  const handleSaveTrade = useCallback(() => {
    if (!parsedTrade) return
    
    if (!parsedTrade.ticker || !parsedTrade.direction || !parsedTrade.entryPrice) {
      setError('Missing required fields: ticker, direction, and entry price are required.')
      return
    }
    
    setIsSaving(true)
    
    const newTrade: Omit<ContextTrade, 'id'> = {
      symbol: parsedTrade.ticker,
      company: `${parsedTrade.ticker} Futures`,
      type: parsedTrade.direction === 'Long' ? 'long' : 'short',
      quantity: parsedTrade.quantity || 1,
      entryPrice: parsedTrade.entryPrice,
      exitPrice: parsedTrade.exitPrice,
      entryDate: parsedTrade.tradeDate || new Date().toISOString().split('T')[0],
      exitDate: parsedTrade.outcome ? parsedTrade.tradeDate || new Date().toISOString().split('T')[0] : undefined,
      pnl: parsedTrade.actualPnL,
      status: parsedTrade.outcome ? 'closed' : 'open',
      notes: journalText || undefined,
      strategy: 'TradingView Import',
      screenshot: parsedTrade.screenshot
    }
    
    addTrade(newTrade)
    setShowSuccess(true)
    setError('')
    
    setTimeout(() => {
      setShowSuccess(false)
      setIsSaving(false)
      
      setTimeout(() => {
        setParsedTrade(null)
        setJournalText('')
        setIsEditingJournal(false)
        setIsScreenshotMode(false)
      }, 300)
    }, 1500)
  }, [parsedTrade, journalText, addTrade])

  const formatPrice = (price: number) => `$${price.toFixed(2)}`

  return (
    <div className="space-y-6">
      {/* Clean Paste Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Import Trade from TradingView
          </CardTitle>
          <CardDescription>
            Copy your position tool from TradingView and paste it here to automatically extract all trade details. 
            You can also paste screenshots and add journal entries to document your trades.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="text-lg">🍎</span>
                macOS Instructions
              </h4>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-blue-600">📊 Position Tool:</p>
                  <ol className="text-sm space-y-1 ml-2">
                    <li>1. Right-click position tool in TradingView</li>
                    <li>2. Select &quot;Copy&quot; or press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">⌘ C</kbd></li>
                    <li>3. Click paste zone below and press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">⌘ V</kbd></li>
                  </ol>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600">📸 Screenshot:</p>
                  <ol className="text-sm space-y-1 ml-2">
                    <li>1. Take screenshot (<kbd className="px-1 py-0.5 bg-background border rounded text-xs">⌘ ⇧ 4</kbd>)</li>
                    <li>2. Or copy image (<kbd className="px-1 py-0.5 bg-background border rounded text-xs">⌘ C</kbd>)</li>
                    <li>3. Click paste zone and press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">⌘ V</kbd></li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="text-lg">🪟</span>
                Windows Instructions
              </h4>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-blue-600">📊 Position Tool:</p>
                  <ol className="text-sm space-y-1 ml-2">
                    <li>1. Right-click position tool in TradingView</li>
                    <li>2. Select &quot;Copy&quot; or press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">Ctrl C</kbd></li>
                    <li>3. Click paste zone below and press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">Ctrl V</kbd></li>
                  </ol>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600">📸 Screenshot:</p>
                  <ol className="text-sm space-y-1 ml-2">
                    <li>1. Take screenshot (<kbd className="px-1 py-0.5 bg-background border rounded text-xs">⊞ ⇧ S</kbd>)</li>
                    <li>2. Or copy image (<kbd className="px-1 py-0.5 bg-background border rounded text-xs">Ctrl C</kbd>)</li>
                    <li>3. Click paste zone and press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">Ctrl V</kbd></li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Paste Zone */}
          <div 
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer group ${
              isInputFocused 
                ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20' 
                : parsedTrade && !isScreenshotMode
                  ? 'border-green-400 bg-green-50 hover:border-green-500'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onClick={() => document.getElementById('hidden-paste-input')?.focus()}
          >
            <div className="space-y-3">
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                isInputFocused 
                  ? 'bg-primary text-primary-foreground animate-pulse' 
                  : parsedTrade && !isScreenshotMode
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
              }`}>
                {parsedTrade && !isScreenshotMode ? (
                  <CheckCircle className="h-6 w-6" />
                ) : parsedTrade ? (
                  <span className="text-xl">📸</span>
                ) : (
                  <Copy className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className={`text-lg font-medium transition-colors duration-200 ${
                  isInputFocused ? 'text-primary' : ''
                }`}>
                  {isInputFocused ? 
                    parsedTrade?.ticker ? '📸 Ready to paste screenshot!' : '🎯 Ready to paste!' :
                    parsedTrade?.ticker && parsedTrade?.screenshot ? '✅ Trade complete! Ready to save' :
                    parsedTrade?.ticker ? 'Paste your TradingView screenshot (Optional)' : 
                    parsedTrade?.screenshot ? 'Paste position tool from TradingView' :
                    'Paste position tool from TradingView'}
                </p>
                <p className={`text-sm mt-1 transition-colors duration-200 ${
                  isInputFocused ? 'text-primary/80 font-medium' : 'text-muted-foreground'
                }`}>
                  {isInputFocused 
                    ? parsedTrade?.ticker 
                      ? `📸 Paste your screenshot now! • Press ${navigator.platform.toLowerCase().includes('mac') ? '⌘ V' : 'Ctrl + V'}`
                      : `Press ${navigator.platform.toLowerCase().includes('mac') ? '⌘ V' : 'Ctrl + V'} now!`
                    : parsedTrade?.ticker && parsedTrade?.screenshot
                      ? '📊 Position data + 📸 Screenshot attached • Perfect!'
                      : parsedTrade?.ticker 
                        ? `📸 Add screenshot to complete your trade record • ${navigator.platform.toLowerCase().includes('mac') ? '⌘ V' : 'Ctrl + V'} to paste`
                        : parsedTrade?.screenshot
                          ? `📊 Add position tool data to complete • ${navigator.platform.toLowerCase().includes('mac') ? '⌘ V' : 'Ctrl + V'} to paste`
                          : `📊 Start by pasting your position tool data • ${navigator.platform.toLowerCase().includes('mac') ? '⌘ V' : 'Ctrl + V'} to paste`
                  }
                </p>
              </div>
              
              {isInputFocused && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-transparent to-primary/10 animate-pulse pointer-events-none" />
              )}
            </div>
            
            {/* Hidden input for paste detection */}
            <input
              id="hidden-paste-input"
              type="text"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              placeholder=""
              onPaste={handlePaste}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              autoComplete="off"
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {showSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {parsedTrade?.screenshot && parsedTrade?.ticker ? 
                  'Screenshot added to trade successfully!' : 
                  parsedTrade?.screenshot ? 
                    'Screenshot imported! Add position tool data to complete the trade.' :
                    'Trade imported successfully!'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Parsed Trade Summary */}
      {parsedTrade && (
        <Card className={`transition-all duration-300 ${isSaving ? 'opacity-75 scale-[0.98]' : 'opacity-100 scale-100'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {isSaving ? 'Saving Trade...' : 'Imported Trade Details'}
            </CardTitle>
            <CardDescription>
              {isSaving ? 'Your trade is being saved...' : 'Review the extracted information before saving'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Ticker */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Ticker</label>
                <div className="flex items-center gap-2">
                  {parsedTrade.ticker ? (
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {parsedTrade.ticker}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not detected</span>
                  )}
                </div>
              </div>

              {/* Direction */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Direction</label>
                <div className="flex items-center gap-2">
                  {parsedTrade.direction ? (
                    <Badge 
                      variant={parsedTrade.direction === 'Long' ? 'default' : 'destructive'}
                      className="text-base px-3 py-1"
                    >
                      {parsedTrade.direction === 'Long' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {parsedTrade.direction}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not detected</span>
                  )}
                </div>
              </div>

              {/* Entry Price */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Entry Price</label>
                <div className="flex items-center gap-2">
                  {parsedTrade.entryPrice ? (
                    <div className="flex items-center gap-1 text-base font-medium">
                      <DollarSign className="h-3 w-3" />
                      {parsedTrade.entryPrice.toFixed(2)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not detected</span>
                  )}
                </div>
              </div>

              {/* Trade Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Trade Date</label>
                <div className="flex items-center gap-2">
                  {parsedTrade.tradeDate ? (
                    <span className="text-base font-medium">{parsedTrade.tradeDate}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not detected</span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Screenshot Section */}
            {parsedTrade.screenshot && (
              <>
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Screenshot</label>
                  <div className="relative group">
                    <Image 
                      src={parsedTrade.screenshot} 
                      alt="Trade screenshot" 
                      className="w-full max-w-md rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      width={400}
                      height={300}
                      onClick={() => {
                        const newWindow = window.open()
                        if (newWindow) {
                          newWindow.document.write(`<img src="${parsedTrade.screenshot}" style="max-width: 100%; height: auto;" />`)
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">Click to view full size</span>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}
            
            {/* Journal Entry Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">Journal Entry</label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsEditingJournal(!isEditingJournal)}
                >
                  {isEditingJournal ? 'Save' : 'Edit'}
                </Button>
              </div>
              
              {isEditingJournal ? (
                <textarea
                  placeholder="Add your trading notes, analysis, emotions, and lessons learned..."
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  className="w-full min-h-32 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                />
              ) : (
                <div 
                  className="min-h-24 p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setIsEditingJournal(true)}
                >
                  {journalText ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {journalText}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm italic">
                      Click to add journal entry... Record your thoughts, analysis, and lessons learned.
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveTrade}
                disabled={!parsedTrade.ticker || !parsedTrade.direction || !parsedTrade.entryPrice || isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    ✅ Save Trade
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Trades List */}
      {trades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Imported Trades ({trades.length})</CardTitle>
            <CardDescription>
              Trades imported from TradingView
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trades.slice(0, 5).map((trade) => (
                <div 
                  key={trade.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedTrade(trade as ContextTrade)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="secondary">{trade.symbol}</Badge>
                      <Badge variant={trade.type === 'long' ? 'default' : 'destructive'}>
                        {trade.type === 'long' ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {trade.type === 'long' ? 'Long' : 'Short'}
                      </Badge>
                      <span className="font-medium">{formatPrice(trade.entryPrice)}</span>
                      <span className="text-sm text-muted-foreground">
                        {trade.quantity} contracts
                      </span>
                      
                      {trade.screenshot && (
                        <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                          📸 Screenshot
                        </Badge>
                      )}
                      
                      {trade.notes && (
                        <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                          📝 Journal
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {trade.entryDate}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Trade Detail Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {selectedTrade.symbol}
                </Badge>
                <Badge variant={selectedTrade.type === 'long' ? 'default' : 'destructive'} className="text-base px-3 py-1">
                  {selectedTrade.type === 'long' ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {selectedTrade.type === 'long' ? 'Long' : 'Short'}
                </Badge>
                <span className="text-xl font-semibold">{formatPrice(selectedTrade.entryPrice)}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedTrade(null)}
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
                  <div className="text-lg font-semibold">{formatPrice(selectedTrade.entryPrice)}</div>
                </div>
                {selectedTrade.exitPrice && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Exit Price</label>
                    <div className="text-lg font-semibold">{formatPrice(selectedTrade.exitPrice)}</div>
                  </div>
                )}
                {selectedTrade.pnl && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">P&L</label>
                    <div className={`text-lg font-semibold ${selectedTrade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${selectedTrade.pnl.toFixed(2)}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                  <div className="text-lg font-semibold">{selectedTrade.quantity}</div>
                </div>
              </div>
              
              {/* Screenshot */}
              {selectedTrade.screenshot && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Screenshot</label>
                  <div className="relative group">
                    <Image 
                      src={selectedTrade.screenshot} 
                      alt="Trade screenshot" 
                      className="w-full rounded-lg border shadow-sm cursor-pointer max-h-96 object-contain bg-muted/20"
                      width={600}
                      height={400}
                      onClick={() => {
                        const newWindow = window.open()
                        if (newWindow) {
                          newWindow.document.write(`
                            <html>
                              <head><title>Trade Screenshot - ${selectedTrade.symbol}</title></head>
                              <body style="margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5;">
                                <img src="${selectedTrade.screenshot}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
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
                      setJournalText(selectedTrade.notes || '')
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
                          updateTrade(selectedTrade.id, { ...selectedTrade, notes: journalText })
                          setSelectedTrade({ ...selectedTrade, notes: journalText })
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
                      setJournalText(selectedTrade.notes || '')
                      setIsEditingJournal(true)
                    }}
                  >
                    {selectedTrade.notes ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedTrade.notes}
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
      )}
    </div>
  )
} 