"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Flame, Target, TrendingUp, MessageCircle } from "lucide-react"

interface MotivatorCardProps {
  message: string
  streak: number
  todayXP: number
  level: number
  className?: string
}

export function MotivatorCard({ 
  message, 
  streak, 
  todayXP, 
  level, 
  className = "" 
}: MotivatorCardProps) {
  
  const getStreakIcon = (streak: number) => {
    if (streak >= 7) return <Flame className="h-4 w-4 text-orange-500" />
    if (streak >= 3) return <Target className="h-4 w-4 text-blue-500" />
    return <TrendingUp className="h-4 w-4 text-green-500" />
  }

  const getCardGradient = (level: number) => {
    if (level >= 10) return "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200"
    if (level >= 5) return "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200"
    return "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
  }

  return (
    <Card className={`${getCardGradient(level)} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-primary" />
            Daily Motivation
          </CardTitle>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {getStreakIcon(streak)}
                {streak} day{streak !== 1 ? 's' : ''}
              </Badge>
            )}
            {todayXP > 0 && (
              <Badge variant="outline" className="text-sm">
                +{todayXP} XP today
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-base leading-relaxed text-foreground/90 italic">
            "{message}"
          </p>
          
          {/* Progress indicators */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="text-sm text-muted-foreground">
              Level {level} Trader
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {streak > 0 && (
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  {streak} streak
                </span>
              )}
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {todayXP} XP today
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 