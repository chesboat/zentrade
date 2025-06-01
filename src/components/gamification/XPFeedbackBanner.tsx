"use client"

import React, { useState, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Star, 
  Zap, 
  TrendingUp, 
  Shield, 
  CheckCircle,
  X,
  Calendar,
  Award
} from "lucide-react"
import { useRuleAdherence } from '@/hooks/useRuleAdherence'

interface XPFeedbackBannerProps {
  className?: string
}

export function XPFeedbackBanner({ className = '' }: XPFeedbackBannerProps) {
  const { hasCheckedInToday, todaysXP, currentStreak } = useRuleAdherence()
  const [isDismissed, setIsDismissed] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)

  // Show animation when component first loads and user has checked in
  useEffect(() => {
    if (hasCheckedInToday && todaysXP > 0) {
      setShowAnimation(true)
      const timer = setTimeout(() => setShowAnimation(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [hasCheckedInToday, todaysXP])

  // Don't show if dismissed or no check-in today
  if (isDismissed || !hasCheckedInToday || todaysXP === 0) {
    return null
  }

  const getXPMessage = (xp: number) => {
    if (xp >= 25) {
      return {
        title: "Perfect Discipline! 🔥",
        message: "You followed all your trading rules today. This is how champions are made!",
        color: "from-green-500 to-emerald-600"
      }
    } else if (xp >= 10) {
      return {
        title: "Great Job! 👏",
        message: "Strong rule adherence today. You're building excellent trading habits!",
        color: "from-blue-500 to-cyan-600"
      }
    } else if (xp >= 5) {
      return {
        title: "Honesty Counts! 💪",
        message: "Thanks for being honest about your trading. Every step forward matters!",
        color: "from-purple-500 to-pink-600"
      }
    } else {
      return {
        title: "Keep Going! 🚀",
        message: "Every trading session is a learning opportunity. Tomorrow is a fresh start!",
        color: "from-orange-500 to-red-600"
      }
    }
  }

  const { title, message, color } = getXPMessage(todaysXP)

  return (
    <div className={`relative ${className}`}>
      <div className={`
        p-4 rounded-lg border shadow-lg
        bg-gradient-to-r ${color}
        text-white
        ${showAnimation ? 'animate-pulse scale-105' : ''}
        transition-all duration-300
      `}>
        {/* Dismiss Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(true)}
          className="absolute top-2 right-2 text-white/70 hover:text-white hover:bg-white/20"
        >
          <X className="h-3 w-3" />
        </Button>

        <div className="flex items-start gap-4 pr-8">
          {/* Icon */}
          <div className="p-2 bg-white/20 rounded-full">
            {todaysXP >= 25 ? (
              <Award className="h-6 w-6" />
            ) : todaysXP >= 10 ? (
              <TrendingUp className="h-6 w-6" />
            ) : todaysXP >= 5 ? (
              <Shield className="h-6 w-6" />
            ) : (
              <Zap className="h-6 w-6" />
            )}
          </div>

          <div className="flex-1 space-y-2">
            {/* Title and XP */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{title}</h3>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Star className="h-3 w-3 mr-1" />
                +{todaysXP} XP
              </Badge>
            </div>

            {/* Message */}
            <p className="text-white/90 text-sm leading-relaxed">{message}</p>

            {/* Streak Info */}
            {currentStreak > 0 && (
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Calendar className="h-4 w-4" />
                <span>
                  {currentStreak === 1 
                    ? "Starting your streak!" 
                    : `${currentStreak} day streak! Keep it going!`
                  }
                </span>
              </div>
            )}

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-white/70 text-xs pt-1">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Session completed
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Rules reviewed
              </span>
            </div>
          </div>
        </div>

        {/* Animated sparkles for high XP */}
        {showAnimation && todaysXP >= 25 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-4 animate-ping">
              <Star className="h-4 w-4 text-yellow-300" />
            </div>
            <div className="absolute top-6 right-6 animate-ping delay-300">
              <Star className="h-3 w-3 text-yellow-300" />
            </div>
            <div className="absolute bottom-4 left-1/2 animate-ping delay-700">
              <Star className="h-4 w-4 text-yellow-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 