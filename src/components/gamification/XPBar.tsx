"use client"

import React from 'react'
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Star, Zap } from "lucide-react"

interface XPBarProps {
  level: number
  xp: number
  xpToNextLevel: number
  className?: string
}

export function XPBar({ level, xp, xpToNextLevel, className = "" }: XPBarProps) {
  // Calculate total XP needed for current level
  const totalXPForCurrentLevel = 1000 * level // As per specification
  const currentLevelXP = totalXPForCurrentLevel - xpToNextLevel
  const progressPercentage = (currentLevelXP / totalXPForCurrentLevel) * 100

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Level and XP Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
            <Star className="h-3 w-3" />
            Level {level}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Zap className="h-3 w-3" />
            {xp.toLocaleString()} XP
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {xpToNextLevel.toLocaleString()} to next level
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <Progress 
          value={progressPercentage} 
          className="h-3 bg-muted"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{currentLevelXP.toLocaleString()}</span>
          <span>{totalXPForCurrentLevel.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
} 