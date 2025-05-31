"use client"

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Copy, TrendingUp, TrendingDown, Target, Shield, DollarSign, CheckCircle, AlertCircle } from "lucide-react"
import { useTrades } from "@/contexts/TradesContext"
import { Trade as ContextTrade } from "@/mockData/trades"

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

interface PointData {
  price: number
  time_t?: number
}

interface SourceData {
  points?: PointData[]
  state?: {
    symbol?: string
    stopLevel?: number
    profitLevel?: number
    riskSize?: number
    qty?: number
  }
  type?: string
}

interface ClipData {
  sources?: Array<{
    source: SourceData
  }>
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
  
  const { addTrade, updateTrade } = useTrades()

  const parseTradingViewData = useCallback((text: string): ParsedTrade => {
    const result: ParsedTrade = { originalText: text }
    
    // Look for TradingView data
    if (text.includes('data-tradingview-clip')) {
      try {
        const clipMatch = text.match(/data-tradingview-clip="([^"]+)"/);
        if (!clipMatch) return result
        
        const jsonStr = clipMatch[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
        
        const clipData: ClipData = JSON.parse(jsonStr)
        
        if (!clipData.sources?.[0]?.source) return result
        
        const source = clipData.sources[0].source
        
        // Extract trade date
        if (source.points && source.points.length > 0) {
          const lastPoint = source.points[source.points.length - 1]
          if (lastPoint.time_t) {
            const tradeDate = new Date(lastPoint.time_t * 1000)
            result.tradeDate = tradeDate.toISOString().split('T')[0]
          }
        }
        
        // Extract symbol
        if (source.state?.symbol) {
          const symbolString = source.state.symbol
          result.ticker = symbolString.includes(':') 
            ? symbolString.split(':')[1] 
            : symbolString
        }
        
        // Extract direction
        if (source.type) {
          if (source.type.includes('Short')) {
            result.direction = 'Short'
          } else if (source.type.includes('Long')) {
            result.direction = 'Long'
          }
        }
        
        // Extract prices
        if (source.points && source.points.length > 0) {
          const prices = source.points.map(p => p.price).filter(p => p != null)
          if (prices.length > 0) {
            result.entryPrice = prices[0]
          }
        }
        
        // Extract quantity
        if (source.state?.qty) {
          result.quantity = Math.round(source.state.qty)
        }
        
        return result
      } catch (err) {
        console.error('Error parsing TradingView data:', err)
        return result
      }
    }
    
    return result
  }, [])

  const fallbackTextParsing = useCallback((text: string): ParsedTrade => {
    const result: ParsedTrade = { originalText: text }
    
    // Simple text parsing for basic trade info
    const symbolMatch = text.match(/([A-Z]{2,6}[0-9]?!?)/i)
    if (symbolMatch) {
      result.ticker = symbolMatch[1].toUpperCase()
    }
    
    const priceMatch = text.match(/(\d+\.?\d*)/g)
    if (priceMatch && priceMatch.length > 0) {
      result.entryPrice = parseFloat(priceMatch[0])
    }
    
    if (text.toLowerCase().includes('long')) {
      result.direction = 'Long'
    } else if (text.toLowerCase().includes('short')) {
      result.direction = 'Short'
    }
    
    return result
  }, [])

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    try {
      const clipboardData = e.clipboardData
      if (!clipboardData) return

      // Handle image paste
      const items = Array.from(clipboardData.items)
      const imageItem = items.find(item => item.type.startsWith('image/'))
      
      if (imageItem) {
        const file = imageItem.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64 = event.target?.result as string
            if (parsedTrade) {
              setParsedTrade({
                ...parsedTrade,
                screenshot: base64
              })
            }
          }
          reader.readAsDataURL(file)
          return
        }
      }

      // Handle text paste
      const text = clipboardData.getData('text/plain')
      if (!text.trim()) {
        setError('No text found in clipboard')
        return
      }

      // Try TradingView parsing first
      let parsed = parseTradingViewData(text)
      
      // Fallback to simple text parsing
      if (!parsed.ticker && !parsed.entryPrice) {
        parsed = fallbackTextParsing(text)
      }

      if (!parsed.direction && !parsed.entryPrice && !parsed.ticker) {
        setError('Could not detect valid trading data.')
        return
      }

      setParsedTrade(parsed)
      setError('')
    } catch (err) {
      console.error('Paste error:', err)
      setError('Failed to parse trading data.')
    }
  }, [parsedTrade, parseTradingViewData, fallbackTextParsing])

  const handleSaveTrade = () => {
    if (!parsedTrade) return
    
    setIsSaving(true)
    
    try {
      const newTrade: Omit<ContextTrade, 'id'> = {
        symbol: parsedTrade.ticker || 'UNKNOWN',
        company: parsedTrade.ticker || 'Unknown Company',
        type: parsedTrade.direction === 'Short' ? 'short' : 'long',
        quantity: parsedTrade.quantity || 1,
        entryPrice: parsedTrade.entryPrice || 0,
        exitPrice: parsedTrade.exitPrice,
        entryDate: parsedTrade.tradeDate || new Date().toISOString().split('T')[0],
        exitDate: parsedTrade.exitPrice ? parsedTrade.tradeDate : undefined,
        pnl: parsedTrade.actualPnL,
        status: parsedTrade.exitPrice ? 'closed' : 'open',
        notes: journalText || parsedTrade.journalEntry || '',
        strategy: 'Manual Entry',
        screenshot: parsedTrade.screenshot
      }
      
      addTrade(newTrade)
      
      // Reset form
      setParsedTrade(null)
      setJournalText('')
      setError('')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving trade:', err)
      setError('Failed to save trade')
    } finally {
      setIsSaving(false)
    }
  }

  const formatPrice = (price: number) => `$${price.toFixed(2)}`

  return (
    <div className="space-y-6">
      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Trade saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Paste Trade Data
          </CardTitle>
          <CardDescription>
            Paste trade data from TradingView or enter manually. You can also paste screenshots.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`min-h-[100px] border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isInputFocused ? 'border-blue-500 bg-blue-50' : 'border-muted-foreground/25'
            }`}
            onPaste={handlePaste}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            tabIndex={0}
          >
            <div className="space-y-2">
              <Copy className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click here and paste your trade data (Cmd+V / Ctrl+V)
              </p>
              <p className="text-xs text-muted-foreground">
                Supports TradingView data and screenshots
              </p>
            </div>
          </div>

          {parsedTrade && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Parsed Trade Data</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {parsedTrade.ticker && (
                    <div>
                      <span className="text-muted-foreground">Symbol:</span>
                      <span className="ml-2 font-medium">{parsedTrade.ticker}</span>
                    </div>
                  )}
                  {parsedTrade.direction && (
                    <div>
                      <span className="text-muted-foreground">Direction:</span>
                      <Badge variant={parsedTrade.direction === 'Long' ? 'default' : 'secondary'} className="ml-2">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {parsedTrade.direction}
                      </Badge>
                    </div>
                  )}
                  {parsedTrade.entryPrice && (
                    <div>
                      <span className="text-muted-foreground">Entry:</span>
                      <span className="ml-2 font-medium">{formatPrice(parsedTrade.entryPrice)}</span>
                    </div>
                  )}
                  {parsedTrade.quantity && (
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="ml-2 font-medium">{parsedTrade.quantity}</span>
                    </div>
                  )}
                </div>

                {parsedTrade.screenshot && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Screenshot:</span>
                    <img 
                      src={parsedTrade.screenshot} 
                      alt="Trade screenshot" 
                      className="max-w-sm rounded border"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Journal Notes:</label>
                  <textarea
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Add your thoughts about this trade..."
                    className="w-full p-3 border rounded-md"
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleSaveTrade}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? 'Saving...' : 'Save Trade'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 