"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Clock, CheckCircle } from "lucide-react"
import { RuleCheckInModal } from './RuleCheckInModal'
import { useRuleAdherence } from '@/hooks/useRuleAdherence'

interface EndSessionButtonProps {
  variant?: 'default' | 'compact'
  className?: string
}

export function EndSessionButton({ variant = 'default', className = '' }: EndSessionButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const { hasCheckedInToday, todaysXP } = useRuleAdherence()

  const handleSuccess = (xp: number, message: string) => {
    setShowModal(false)
    // No need to manage local feedback state since hasCheckedInToday will be true
    // and the component will show the completed state permanently
  }

  // If already checked in today, show completed state
  if (hasCheckedInToday) {
    return (
      <div className={`space-y-2 ${className}`}>
        {variant === 'compact' ? (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">Session completed</span>
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              +{todaysXP} XP
            </Badge>
          </div>
        ) : (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Today&apos;s session completed!</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                +{todaysXP} XP earned
              </Badge>
            </div>
            <p className="text-sm text-green-600 mt-2">
              Great job checking in on your rule adherence. See you tomorrow!
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* End Session Button */}
      {variant === 'compact' ? (
        <Button
          onClick={() => setShowModal(true)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 w-full"
        >
          <Clock className="h-3 w-3" />
          End Session
        </Button>
      ) : (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">Ready to wrap up?</span>
              </div>
              <p className="text-sm text-blue-600">
                Take a moment to review how well you followed your trading rules today.
              </p>
            </div>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              End Session
            </Button>
          </div>
        </div>
      )}

      {/* Rule Check-In Modal */}
      <RuleCheckInModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </div>
  )
} 