"use client"

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Copy, TrendingUp, TrendingDown, Target, DollarSign, CheckCircle, AlertCircle, Edit3, Save, X } from "lucide-react"
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
  riskRewardRatio?: number // R/R ratio from TradingView stop/target levels
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
  
  // New state for modal editing
  const [isEditingTrade, setIsEditingTrade] = useState(false)
  const [isAddingScreenshot, setIsAddingScreenshot] = useState(false)
  const [editedTrade, setEditedTrade] = useState<ContextTrade | null>(null)
  
  const { trades, addTrade, updateTrade } = useTrades()

  const parseTradingViewData = useCallback((text: string): ParsedTrade => {
    const result: ParsedTrade = { originalText: text }
    
    console.log('🔍 Starting TradingView data parsing...')
    
    // 1. DETECT DATA FORMAT - Look for the critical data-tradingview-clip attribute
    if (text.includes('data-tradingview-clip')) {
      console.log('✅ Found data-tradingview-clip attribute!')
      
      try {
        // Extract the JSON from data-tradingview-clip attribute
        const clipMatch = text.match(/data-tradingview-clip="([^"]+)"/);
        if (!clipMatch) {
          console.log('❌ Could not extract clip data from attribute')
          return result
        }
        
        console.log('🔓 Raw clip data:', clipMatch[1])
        
        // Unescape the HTML entities
        const jsonStr = clipMatch[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
        
        console.log('📝 Unescaped JSON string:', jsonStr)
        
        const clipData = JSON.parse(jsonStr)
        console.log('📊 Parsed clip data:', clipData)
        
        if (!clipData.sources || !clipData.sources[0] || !clipData.sources[0].source) {
          console.log('❌ Invalid clip data structure')
          return result
        }
        
        const source = clipData.sources[0].source
        console.log('🎯 Source data:', source)
        
        // 2. EXTRACT TRADE DATE (CRITICAL)
        if (source.points && source.points.length > 0) {
          const lastPoint = source.points[source.points.length - 1]
          if (lastPoint.time_t) {
            const tradeDate = new Date(lastPoint.time_t * 1000)
            result.tradeDate = tradeDate.toISOString().split('T')[0]
            console.log('📅 Extracted trade date:', result.tradeDate)
          }
        }
        
        // 3. EXTRACT SYMBOL
        if (source.state && source.state.symbol) {
          const symbolString = source.state.symbol
          // Handle formats: "CME_MINI:MNQ1!" -> "MNQ1!"
          result.ticker = symbolString.includes(':') 
            ? symbolString.split(':')[1] 
            : symbolString
          console.log('🏷️ Extracted symbol:', result.ticker)
        }
        
        // 4. DETERMINE DIRECTION
        if (source.type) {
          if (source.type.includes('Short') || source.type.includes('RiskRewardShort')) {
            result.direction = 'Short'
          } else if (source.type.includes('Long') || source.type.includes('RiskRewardLong')) {
            result.direction = 'Long'
          }
          console.log('🎯 Detected direction:', result.direction, 'from type:', source.type)
        }
        
        // 5. EXTRACT PRICES
        if (source.points && source.points.length > 0) {
          const prices = source.points.map((p: { price: number }) => p.price).filter((p: number) => p != null)
          const uniquePrices = [...new Set(prices)]
          console.log('💰 All prices:', prices)
          console.log('💎 Unique prices:', uniquePrices)
          
          if (uniquePrices.length >= 2) {
            // Calculate entry (most frequent price)
            const entryFreq: Record<string, number> = {}
            prices.forEach((p: number) => entryFreq[p.toString()] = (entryFreq[p.toString()] || 0) + 1)
            const entryPrice = Object.keys(entryFreq).reduce((a, b) => 
              entryFreq[a] > entryFreq[b] ? a : b)
            
            result.entryPrice = parseFloat(entryPrice)
            console.log('🎯 Entry price:', result.entryPrice)
            
            // Calculate stop/target from TradingView levels
            if (source.state && source.state.stopLevel && source.state.profitLevel && result.entryPrice) {
              const direction = result.direction
              if (direction === 'Short') {
                result.stopLoss = result.entryPrice + (Number(source.state.stopLevel) / 4)
                result.takeProfit = result.entryPrice - (Number(source.state.profitLevel) / 4)
              } else {
                result.stopLoss = result.entryPrice - (Number(source.state.stopLevel) / 4)
                result.takeProfit = result.entryPrice + (Number(source.state.profitLevel) / 4)
              }
              console.log('🛡️ Stop Loss:', result.stopLoss)
              console.log('🎯 Take Profit:', result.takeProfit)
              
              // Calculate Risk/Reward ratio from actual TradingView levels
              if (result.stopLoss && result.takeProfit && result.entryPrice) {
                const riskPoints = Math.abs(result.stopLoss - result.entryPrice)
                const rewardPoints = Math.abs(result.takeProfit - result.entryPrice)
                result.riskRewardRatio = rewardPoints / riskPoints
                console.log('📊 Risk/Reward Ratio:', result.riskRewardRatio)
              }
            }
          } else if (uniquePrices.length === 1) {
            // Single price level
            result.entryPrice = Number(uniquePrices[0])
            console.log('🎯 Single price level:', result.entryPrice)
          }
          
          // 6. CONTRACT QUANTITY HANDLING (moved before P&L calculation)
          if (source.state && source.state.qty) {
            const originalQty = source.state.qty
            const symbol = result.ticker || ''
            const isFutures = symbol.includes('!') || symbol.includes('CME')
            
            if (isFutures) {
              // Round to whole contracts for futures
              result.quantity = Math.round(originalQty)
              const riskMultiplier = result.quantity / originalQty
              result.actualRisk = (source.state.riskSize || 125) * riskMultiplier
              
              if (riskMultiplier > 1.25) {
                result.riskAdjustment = 'moderate_risk'
              } else if (riskMultiplier < 0.8) {
                result.riskAdjustment = 'lower_risk'
              }
            } else {
              // CFDs - use exact quantity
              result.quantity = originalQty
              result.actualRisk = source.state.riskSize || 125
            }
            console.log('📈 Quantity:', result.quantity)
            console.log('💰 Adjusted Risk:', result.actualRisk)
          }
          
          // 7. DETERMINE OUTCOME & P&L (using adjusted risk amount)
          const currentPrice = prices[prices.length - 1]
          
          if (result.direction && result.entryPrice && currentPrice) {
            // Use the adjusted risk amount (or fallback to original)
            const riskAmount = result.actualRisk || source.state?.riskSize || 125
            
            // Check if exit price equals entry price (breakeven scenario)
            const priceThreshold = 0.01 // Small threshold for price comparison
            if (Math.abs(currentPrice - result.entryPrice) <= priceThreshold) {
              result.outcome = 'breakeven'
              result.exitPrice = result.entryPrice
              result.actualPnL = 0
              console.log('🟡 Detected breakeven trade: exit price equals entry price')
            } else if (result.stopLoss && result.takeProfit) {
              // Original logic for trades with explicit stop/target levels
              if (result.direction === 'Short') {
                const stopDistance = Math.abs(currentPrice - result.stopLoss)
                const targetDistance = Math.abs(currentPrice - result.takeProfit)
                
                if (stopDistance < targetDistance) {
                  result.outcome = 'loss'
                  result.exitPrice = result.stopLoss
                  result.actualPnL = -riskAmount // Use adjusted risk amount
                } else {
                  result.outcome = 'win'
                  result.exitPrice = result.takeProfit
                  const riskPoints = Math.abs(result.stopLoss - result.entryPrice)
                  const profitPoints = Math.abs(result.takeProfit - result.entryPrice)
                  const rrRatio = profitPoints / riskPoints
                  result.actualPnL = riskAmount * rrRatio // Use adjusted risk amount
                }
              } else if (result.direction === 'Long') {
                const stopDistance = Math.abs(currentPrice - result.stopLoss)
                const targetDistance = Math.abs(currentPrice - result.takeProfit)
                
                if (stopDistance < targetDistance) {
                  result.outcome = 'loss'
                  result.exitPrice = result.stopLoss
                  result.actualPnL = -riskAmount // Use adjusted risk amount
                } else {
                  result.outcome = 'win'
                  result.exitPrice = result.takeProfit
                  const riskPoints = Math.abs(result.stopLoss - result.entryPrice)
                  const profitPoints = Math.abs(result.takeProfit - result.entryPrice)
                  const rrRatio = profitPoints / riskPoints
                  result.actualPnL = riskAmount * rrRatio // Use adjusted risk amount
                }
              }
            } else {
              // When no explicit stop/target but we have price movement
              result.exitPrice = currentPrice
              const priceDiff = result.direction === 'Long' 
                ? currentPrice - result.entryPrice 
                : result.entryPrice - currentPrice
              
              if (Math.abs(priceDiff) <= priceThreshold) {
                result.outcome = 'breakeven'
                result.actualPnL = 0
              } else if (priceDiff > 0) {
                result.outcome = 'win'
                // Estimate P&L based on price movement using adjusted risk
                result.actualPnL = Math.abs(priceDiff) * (riskAmount / 10) // Rough estimation
              } else {
                result.outcome = 'loss'
                result.actualPnL = -Math.abs(priceDiff) * (riskAmount / 10) // Rough estimation
              }
            }
            console.log('📊 Outcome:', result.outcome)
            console.log('💰 P&L:', result.actualPnL)
          }
        }
        
        console.log('✅ Successfully parsed TradingView clip data:', result)
        return result
        
      } catch (error) {
        console.error('❌ Error parsing TradingView clip data:', error)
        // Fall through to backup parsing
      }
    }
    
    // Fallback to original text parsing if clip data not found or failed
    console.log('📝 Falling back to text parsing...')
    return fallbackTextParsing(text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fallback parsing for plain text or when clip data fails
  const fallbackTextParsing = useCallback((text: string): ParsedTrade => {
    const result: ParsedTrade = { originalText: text }
    
    // Clean the text
    const cleanText = text.trim().replace(/\s+/g, ' ')
    
    // Try to extract ticker (common patterns)
    const tickerPatterns = [
      /([A-Z]{1,5})\s+(?:Long|Short)/i,
      /(?:Symbol|Ticker):\s*([A-Z]{1,5})/i,
      /^([A-Z]{1,5})\s/,
      /\b([A-Z]{2,5})\b/
    ]
    
    for (const pattern of tickerPatterns) {
      const match = cleanText.match(pattern)
      if (match) {
        result.ticker = match[1].toUpperCase()
        break
      }
    }
    
    // Extract direction
    if (/\b(?:long|buy)\b/i.test(cleanText)) {
      result.direction = 'Long'
    } else if (/\b(?:short|sell)\b/i.test(cleanText)) {
      result.direction = 'Short'
    }
    
    // Extract prices with various patterns
    const pricePatterns = [
      // Entry patterns
      { key: 'entryPrice', patterns: [
        /(?:entry|enter|price):\s*\$?(\d+\.?\d*)/i,
        /(?:@|at)\s*\$?(\d+\.?\d*)/,
        /\b(\d+\.?\d{2,})\b/
      ]},
      // Stop Loss patterns
      { key: 'stopLoss', patterns: [
        /(?:stop|sl|stop loss):\s*\$?(\d+\.?\d*)/i,
        /(?:stop|sl)\s*\$?(\d+\.?\d*)/i
      ]},
      // Take Profit patterns
      { key: 'takeProfit', patterns: [
        /(?:take profit|tp|target):\s*\$?(\d+\.?\d*)/i,
        /(?:tp|target)\s*\$?(\d+\.?\d*)/i
      ]}
    ]
    
    for (const { key, patterns } of pricePatterns) {
      for (const pattern of patterns) {
        const match = cleanText.match(pattern)
        if (match) {
          const price = parseFloat(match[1])
          if (!isNaN(price) && price > 0) {
            if (key === 'entryPrice') {
              result.entryPrice = price
            } else if (key === 'stopLoss') {
              result.stopLoss = price
            } else if (key === 'takeProfit') {
              result.takeProfit = price
            }
            break
          }
        }
      }
    }
    
    // Extract quantity
    const qtyPatterns = [
      /(?:qty|quantity|size|shares?):\s*(\d+)/i,
      /(\d+)\s*(?:shares?|units?)/i
    ]
    
    for (const pattern of qtyPatterns) {
      const match = cleanText.match(pattern)
      if (match) {
        const qty = parseInt(match[1])
        if (!isNaN(qty) && qty > 0) {
          result.quantity = qty
          break
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
      // Get clipboard data - check for images first, then text
      const clipboardData = e.clipboardData
      
      // Check for images first (screenshots)
      const items = Array.from(clipboardData.items)
      const imageItem = items.find(item => item.type.startsWith('image/'))
      
      if (imageItem) {
        console.log('📸 Found image in clipboard')
        const imageFile = imageItem.getAsFile()
        if (imageFile) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64Image = event.target?.result as string
            console.log('📷 Image converted to base64')
            
            // If we already have parsed trade data, add screenshot to it
            if (parsedTrade) {
              setParsedTrade({
                ...parsedTrade,
                screenshot: base64Image
              })
              setIsScreenshotMode(true)
              setShowSuccess(true)
              setTimeout(() => setShowSuccess(false), 2000)
            } else {
              // Create a basic trade entry for screenshot-only paste
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
      
      // If no image, proceed with text data processing (existing logic)
      const types = Array.from(clipboardData.types)
      console.log('🔍 Available clipboard types:', types)
      
      let bestText = ''
      const allClipboardData: Record<string, string> = {}
      
      // Extract ALL clipboard data types for analysis
      for (const type of types) {
        try {
          const data = clipboardData.getData(type)
          allClipboardData[type] = data
          console.log(`📋 ${type}:`, data)
          
          // If this data is longer than what we have, consider it
          if (data && data.length > bestText.length) {
            bestText = data
          }
        } catch (error) {
          console.log(`❌ Failed to get ${type}:`, error)
        }
      }
      
      console.log('📦 All clipboard data:', allClipboardData)
      
      // Try to access clipboard using the Clipboard API for more data types
      if (navigator.clipboard && navigator.clipboard.read) {
        try {
          const clipboardItems = await navigator.clipboard.read()
          console.log('🔧 Clipboard API items:', clipboardItems)
          
          for (const item of clipboardItems) {
            console.log('📄 Clipboard item types:', item.types)
            
            for (const type of item.types) {
              try {
                const blob = await item.getType(type)
                const text = await blob.text()
                console.log(`🗂️ Clipboard API ${type}:`, text)
                
                allClipboardData[`api_${type}`] = text
                
                if (text && text.length > bestText.length) {
                  bestText = text
                }
              } catch (error) {
                console.log(`❌ Failed to get Clipboard API ${type}:`, error)
              }
            }
          }
        } catch (error) {
          console.log('❌ Clipboard API not available or failed:', error)
        }
      }
      
      // Special handling for HTML data
      if (allClipboardData['text/html']) {
        const htmlData = allClipboardData['text/html']
        console.log('🌐 Analyzing HTML data...')
        
        // Parse HTML to extract ALL possible data
        const parser = new DOMParser()
        const doc = parser.parseFromString(htmlData, 'text/html')
        
        // Get ALL attributes from ALL elements
        const allElements = doc.querySelectorAll('*')
        const extractedData: Record<string, { tag: string; textContent: string | null; attributes: Record<string, string> }> = {}
        
        allElements.forEach((el, index) => {
          const tagInfo = {
            tag: el.tagName,
            textContent: el.textContent,
            attributes: {} as Record<string, string>
          }
          
          // Extract ALL attributes
          Array.from(el.attributes).forEach(attr => {
            tagInfo.attributes[attr.name] = attr.value
          })
          
          if (Object.keys(tagInfo.attributes).length > 0 || tagInfo.textContent?.trim()) {
            extractedData[`element_${index}`] = tagInfo
          }
        })
        
        console.log('🏷️ Extracted HTML elements:', extractedData)
        
        // Look for any data that might contain trading info
        Object.values(extractedData).forEach((elementData) => {
          const text = JSON.stringify(elementData).toLowerCase()
          if (text.includes('price') || text.includes('entry') || text.includes('stop') || text.includes('target') || text.includes('symbol')) {
            console.log('💰 Found potential trading data in element:', elementData)
          }
        })
      }
      
      if (!bestText.trim()) {
        setError('No text found in clipboard')
        setParsedTrade(null)
        return
      }
      
      const parsed = parseTradingViewData(bestText)
      
      // Enhanced parsing for TradingView specific patterns
      if (!parsed.ticker || !parsed.entryPrice) {
        const enhanced = enhancedTradingViewParsing(bestText, parsed)
        Object.assign(parsed, enhanced)
      }
      
      console.log('🎯 Final parsed result:', parsed)
      
      // Validate minimum required fields
      if (!parsed.direction && !parsed.entryPrice && !parsed.ticker) {
        setError('Could not detect valid trading data. Please ensure you copied position details from TradingView.')
        setParsedTrade(null)
        return
      }
      
      setParsedTrade(parsed)
      
    } catch (err) {
      console.error('❌ Paste error:', err)
      setError('Failed to parse trading data. Please check the format.')
      setParsedTrade(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedTrade, parseTradingViewData])

  // Enhanced parsing for TradingView specific formats
  const enhancedTradingViewParsing = useCallback((text: string, existing: ParsedTrade): Partial<ParsedTrade> => {
    const result: Partial<ParsedTrade> = {}
    
    // TradingView specific patterns
    const patterns = [
      // Position tool formats
      /Position:\s*([A-Z]+)\s*(Long|Short)\s*Entry:\s*\$?([\d.]+)/i,
      /([A-Z]+).*?(Long|Short).*?@\s*\$?([\d.]+)/i,
      /Symbol:\s*([A-Z]+).*?Side:\s*(Long|Short).*?Price:\s*\$?([\d.]+)/i,
      
      // Alert formats
      /([A-Z]+)\s+Alert.*?(Long|Short).*?([\d.]+)/i,
      
      // Drawing tool formats
      /([A-Z]+)\s*(Buy|Sell|Long|Short).*?([\d.]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        if (!existing.ticker && match[1]) result.ticker = match[1].toUpperCase()
        if (!existing.direction && match[2]) {
          const dir = match[2].toLowerCase()
          result.direction = (dir === 'long' || dir === 'buy') ? 'Long' : 'Short'
        }
        if (!existing.entryPrice && match[3]) {
          const price = parseFloat(match[3])
          if (!isNaN(price)) result.entryPrice = price
        }
        break
      }
    }
    
    return result
  }, [])

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
      screenshot: parsedTrade.screenshot,
      riskAmount: parsedTrade.actualRisk, // Store the original risk amount
      riskRewardRatio: parsedTrade.riskRewardRatio // Store the original R/R ratio
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
  
  // Helper function to calculate trading metrics
  const calculateTradeMetrics = (trade: ContextTrade) => {
    const metrics: {
      riskRewardRatio?: number
      riskAmount?: number
      riskPercentage?: number
      pointsGainedLost?: number
      rMultiple?: number
      returnOnRisk?: number
      tradeDuration?: number
      breakEvenPrice?: number
      maxRisk?: number
      maxReward?: number
    } = {}
    
    // Use stored risk amount if available, otherwise estimate
    if (trade.riskAmount) {
      metrics.riskAmount = trade.riskAmount
    } else if (trade.entryPrice && trade.exitPrice) {
      // Fallback estimation only if no stored risk amount
      const estimatedStopDistance = trade.entryPrice * 0.02
      const riskPerPoint = (trade.pnl && trade.entryPrice && trade.exitPrice) 
        ? Math.abs(trade.pnl / Math.abs(trade.exitPrice - trade.entryPrice))
        : 25 // Default for futures
      metrics.riskAmount = estimatedStopDistance * riskPerPoint * trade.quantity
    }
    
    // Use stored Risk/Reward ratio if available (from TradingView), otherwise calculate if possible
    if (trade.riskRewardRatio) {
      metrics.riskRewardRatio = trade.riskRewardRatio
    }
    
    // Calculate risk/reward and other metrics if we have the necessary data
    if (trade.entryPrice && trade.exitPrice) {
      const pointsGainedLost = trade.type === 'long' 
        ? trade.exitPrice - trade.entryPrice
        : trade.entryPrice - trade.exitPrice
      metrics.pointsGainedLost = pointsGainedLost
      
      // R-Multiple calculation using stored or calculated risk amount
      if (metrics.riskAmount && metrics.riskAmount > 0 && trade.pnl !== undefined) {
        metrics.rMultiple = trade.pnl / metrics.riskAmount
        metrics.returnOnRisk = (trade.pnl / metrics.riskAmount) * 100
      }
      
      // Risk percentage (assuming $10k account - could be made configurable)
      const accountSize = 10000
      if (metrics.riskAmount) {
        metrics.riskPercentage = (metrics.riskAmount / accountSize) * 100
      }
      
      // Calculate max reward potential (estimate based on actual P&L if available)
      if (trade.pnl !== undefined && pointsGainedLost !== 0) {
        const riskPerPoint = Math.abs(trade.pnl / pointsGainedLost)
        metrics.maxReward = Math.abs(pointsGainedLost) * riskPerPoint * trade.quantity
      }
      
      // Only calculate Risk/Reward ratio if not already stored and we have the data
      if (!metrics.riskRewardRatio && metrics.riskAmount && metrics.maxReward) {
        metrics.riskRewardRatio = metrics.maxReward / metrics.riskAmount
      }
    }
    
    // Trade duration calculation
    if (trade.entryDate && trade.exitDate) {
      const entryTime = new Date(trade.entryDate).getTime()
      const exitTime = new Date(trade.exitDate).getTime()
      metrics.tradeDuration = Math.round((exitTime - entryTime) / (1000 * 60 * 60 * 24)) // Days
    }
    
    return metrics
  }

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

            {/* Additional Trade Details Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Stop Loss */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Stop Loss</label>
                <div className="flex items-center gap-2">
                  {parsedTrade.stopLoss ? (
                    <div className="flex items-center gap-1 text-base font-medium text-red-600">
                      <DollarSign className="h-3 w-3" />
                      {parsedTrade.stopLoss.toFixed(2)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not detected</span>
                  )}
                </div>
              </div>

              {/* Take Profit */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Take Profit</label>
                <div className="flex items-center gap-2">
                  {parsedTrade.takeProfit ? (
                    <div className="flex items-center gap-1 text-base font-medium text-green-600">
                      <Target className="h-3 w-3" />
                      {parsedTrade.takeProfit.toFixed(2)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not detected</span>
                  )}
                </div>
              </div>

              {/* Risk Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Risk Amount</label>
                <div className="flex items-center gap-2">
                  {parsedTrade.actualRisk ? (
                    <div className="flex items-center gap-1 text-base font-medium text-orange-600">
                      <DollarSign className="h-3 w-3" />
                      {parsedTrade.actualRisk.toFixed(2)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not detected</span>
                  )}
                </div>
              </div>

              {/* Risk/Reward Ratio */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Risk/Reward</label>
                <div className="flex items-center gap-2">
                  {parsedTrade.riskRewardRatio ? (
                    <div className="flex items-center gap-1 text-base font-medium text-blue-600">
                      <Target className="h-3 w-3" />
                      {parsedTrade.riskRewardRatio.toFixed(2)}R
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not detected</span>
                  )}
                </div>
              </div>
            </div>

            {/* Second Row - Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                <div className="flex items-center gap-2">
                  {parsedTrade.quantity ? (
                    <span className="text-base font-medium">{parsedTrade.quantity}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not detected</span>
                  )}
                </div>
              </div>
            </div>

            {/* Outcome and P&L Row */}
            {(parsedTrade.outcome || parsedTrade.actualPnL !== undefined || parsedTrade.exitPrice) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Trade Outcome */}
                {parsedTrade.outcome && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Outcome</label>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          parsedTrade.outcome === 'win' ? 'default' : 
                          parsedTrade.outcome === 'loss' ? 'destructive' : 
                          'secondary'
                        }
                        className="text-base px-3 py-1"
                      >
                        {parsedTrade.outcome === 'win' && <TrendingUp className="h-3 w-3 mr-1" />}
                        {parsedTrade.outcome === 'loss' && <TrendingDown className="h-3 w-3 mr-1" />}
                        {parsedTrade.outcome === 'breakeven' && <span className="mr-1">⚖️</span>}
                        {parsedTrade.outcome.charAt(0).toUpperCase() + parsedTrade.outcome.slice(1)}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* P&L */}
                {parsedTrade.actualPnL !== undefined && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">P&L</label>
                    <div className={`flex items-center gap-1 text-base font-medium ${
                      parsedTrade.actualPnL > 0 ? 'text-green-600' : 
                      parsedTrade.actualPnL < 0 ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      <DollarSign className="h-3 w-3" />
                      {parsedTrade.actualPnL >= 0 ? '+' : ''}{parsedTrade.actualPnL.toFixed(2)}
                    </div>
                  </div>
                )}

                {/* Exit Price */}
                {parsedTrade.exitPrice && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Exit Price</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-base font-medium">
                        <DollarSign className="h-3 w-3" />
                        {parsedTrade.exitPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Risk Adjustment Warning */}
            {parsedTrade.riskAdjustment && (
              <div className="p-3 border rounded-lg bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {parsedTrade.riskAdjustment === 'moderate_risk' && 'Risk adjusted upward due to contract rounding'}
                    {parsedTrade.riskAdjustment === 'lower_risk' && 'Risk adjusted downward due to contract rounding'}
                  </span>
                </div>
              </div>
            )}

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
                  {isEditingTrade ? editedTrade?.symbol : selectedTrade.symbol}
                </Badge>
                <Badge variant={(isEditingTrade ? editedTrade?.type : selectedTrade.type) === 'long' ? 'default' : 'destructive'} className="text-base px-3 py-1">
                  {(isEditingTrade ? editedTrade?.type : selectedTrade.type) === 'long' ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {(isEditingTrade ? editedTrade?.type : selectedTrade.type) === 'long' ? 'Long' : 'Short'}
                </Badge>
                <span className="text-xl font-semibold">
                  {formatPrice(isEditingTrade ? editedTrade?.entryPrice || 0 : selectedTrade.entryPrice)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingTrade && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditedTrade({ ...selectedTrade })
                      setIsEditingTrade(true)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Trade
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedTrade(null)
                    setIsEditingTrade(false)
                    setIsAddingScreenshot(false)
                    setEditedTrade(null)
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Trade Details - Edit Mode */}
              {isEditingTrade && editedTrade ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-semibold">Edit Trade Details</h3>
                    <Badge variant="outline" className="text-xs">Edit Mode</Badge>
                  </div>
                  
                  {/* Basic Trade Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Symbol</label>
                      <input
                        type="text"
                        value={editedTrade.symbol}
                        onChange={(e) => setEditedTrade({ ...editedTrade, symbol: e.target.value.toUpperCase() })}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="e.g., AAPL"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Direction</label>
                      <select
                        value={editedTrade.type}
                        onChange={(e) => setEditedTrade({ ...editedTrade, type: e.target.value as 'long' | 'short' })}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="long">Long</option>
                        <option value="short">Short</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Entry Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedTrade.entryPrice}
                        onChange={(e) => setEditedTrade({ ...editedTrade, entryPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                      <input
                        type="number"
                        value={editedTrade.quantity}
                        onChange={(e) => setEditedTrade({ ...editedTrade, quantity: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="1"
                      />
                    </div>
                  </div>
                  
                  {/* Additional Details */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Exit Price (Optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedTrade.exitPrice || ''}
                        onChange={(e) => setEditedTrade({ ...editedTrade, exitPrice: parseFloat(e.target.value) || undefined })}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">P&L (Optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedTrade.pnl || ''}
                        onChange={(e) => setEditedTrade({ ...editedTrade, pnl: parseFloat(e.target.value) || undefined })}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <select
                        value={editedTrade.status}
                        onChange={(e) => setEditedTrade({ ...editedTrade, status: e.target.value as 'open' | 'closed' })}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Date Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Entry Date</label>
                      <input
                        type="date"
                        value={editedTrade.entryDate}
                        onChange={(e) => setEditedTrade({ ...editedTrade, entryDate: e.target.value })}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Exit Date (Optional)</label>
                      <input
                        type="date"
                        value={editedTrade.exitDate || ''}
                        onChange={(e) => setEditedTrade({ ...editedTrade, exitDate: e.target.value || undefined })}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  
                  {/* Save/Cancel Buttons */}
                  <div className="flex gap-3 justify-end pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setIsEditingTrade(false)
                        setEditedTrade(null)
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (editedTrade) {
                          updateTrade(selectedTrade.id, editedTrade)
                          setSelectedTrade(editedTrade)
                          setIsEditingTrade(false)
                          setEditedTrade(null)
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {/* Basic Trade Details */}
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
                    {selectedTrade.pnl !== undefined && (
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
                  
                  {/* Trading Metrics Section */}
                  {(() => {
                    const metrics = calculateTradeMetrics(selectedTrade)
                    return (
                      <>
                        {/* Risk Management Metrics */}
                        <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                          <h4 className="font-semibold text-base flex items-center gap-2">
                            <Target className="h-4 w-4 text-orange-500" />
                            Risk Management
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {metrics.riskAmount && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Risk Amount</label>
                                <div className="text-base font-semibold text-orange-600">
                                  ${metrics.riskAmount.toFixed(2)}
                                </div>
                              </div>
                            )}
                            {metrics.riskPercentage && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Risk %</label>
                                <div className="text-base font-semibold text-orange-600">
                                  {metrics.riskPercentage.toFixed(2)}%
                                </div>
                              </div>
                            )}
                            {metrics.riskRewardRatio && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Risk:Reward</label>
                                <div className="text-base font-semibold text-blue-600">
                                  {metrics.riskRewardRatio.toFixed(2)}R
                                </div>
                              </div>
                            )}
                            {metrics.rMultiple && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">R-Multiple</label>
                                <div className={`text-base font-semibold ${metrics.rMultiple >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {metrics.rMultiple >= 0 ? '+' : ''}{metrics.rMultiple.toFixed(2)}R
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                          <h4 className="font-semibold text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Performance Metrics
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {metrics.pointsGainedLost !== undefined && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Points Moved</label>
                                <div className={`text-base font-semibold ${metrics.pointsGainedLost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {metrics.pointsGainedLost >= 0 ? '+' : ''}{metrics.pointsGainedLost.toFixed(2)}
                                </div>
                              </div>
                            )}
                            {metrics.returnOnRisk && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Return on Risk</label>
                                <div className={`text-base font-semibold ${metrics.returnOnRisk >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {metrics.returnOnRisk >= 0 ? '+' : ''}{metrics.returnOnRisk.toFixed(1)}%
                                </div>
                              </div>
                            )}
                            {metrics.tradeDuration !== undefined && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Duration</label>
                                <div className="text-base font-semibold text-blue-600">
                                  {metrics.tradeDuration === 0 ? 'Same day' : 
                                   metrics.tradeDuration === 1 ? '1 day' : 
                                   `${metrics.tradeDuration} days`}
                                </div>
                              </div>
                            )}
                            {selectedTrade.strategy && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Strategy</label>
                                <div className="text-base font-semibold text-purple-600">
                                  {selectedTrade.strategy}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Trade Outcome</div>
                            <div className="flex items-center justify-center gap-1">
                              {selectedTrade.pnl === undefined ? (
                                <Badge variant="outline" className="bg-blue-50 border-blue-200">
                                  <span className="text-blue-700">Open Position</span>
                                </Badge>
                              ) : selectedTrade.pnl > 0 ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Winner
                                </Badge>
                              ) : selectedTrade.pnl < 0 ? (
                                <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  Loser
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Breakeven
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Status</div>
                            <Badge variant={selectedTrade.status === 'open' ? 'default' : 'secondary'}>
                              {selectedTrade.status === 'open' ? 'Open' : 'Closed'}
                            </Badge>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Entry Date</div>
                            <div className="text-sm font-medium">{selectedTrade.entryDate}</div>
                            {selectedTrade.exitDate && (
                              <div className="text-xs text-muted-foreground">Exit: {selectedTrade.exitDate}</div>
                            )}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </>
              )}
              
              {/* Screenshot Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">Screenshot</label>
                  {!selectedTrade.screenshot && !isAddingScreenshot && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsAddingScreenshot(true)}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Add Screenshot
                    </Button>
                  )}
                </div>
                
                {isAddingScreenshot ? (
                  <div className="space-y-4">
                    <div 
                      className="relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer group border-primary/50 bg-primary/5"
                      onClick={() => document.getElementById('modal-paste-input')?.focus()}
                    >
                      <div className="space-y-2">
                        <div className="mx-auto w-10 h-10 rounded-full flex items-center justify-center bg-primary/20 text-primary">
                          <Copy className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium">Paste Screenshot Here</p>
                        <p className="text-xs text-muted-foreground">
                          Copy your screenshot and paste it here ({navigator.platform.toLowerCase().includes('mac') ? '⌘ V' : 'Ctrl + V'})
                        </p>
                      </div>
                      
                      <input
                        id="modal-paste-input"
                        type="text"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onPaste={async (e) => {
                          e.preventDefault()
                          const clipboardData = e.clipboardData
                          const items = Array.from(clipboardData.items)
                          const imageItem = items.find(item => item.type.startsWith('image/'))
                          
                          if (imageItem) {
                            const imageFile = imageItem.getAsFile()
                            if (imageFile) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                const base64Image = event.target?.result as string
                                const updatedTrade = { ...selectedTrade, screenshot: base64Image }
                                updateTrade(selectedTrade.id, updatedTrade)
                                setSelectedTrade(updatedTrade)
                                setIsAddingScreenshot(false)
                              }
                              reader.readAsDataURL(imageFile)
                            }
                          }
                        }}
                        autoComplete="off"
                      />
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsAddingScreenshot(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : selectedTrade.screenshot ? (
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
                ) : (
                  <div className="p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center text-muted-foreground">
                    <Copy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No screenshot attached</p>
                  </div>
                )}
              </div>
              
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
                          const updatedTrade = { ...selectedTrade, notes: journalText }
                          updateTrade(selectedTrade.id, updatedTrade)
                          setSelectedTrade(updatedTrade)
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