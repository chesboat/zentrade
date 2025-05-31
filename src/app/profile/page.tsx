"use client"

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Settings, 
  Shield, 
  Calendar, 
  Target,
  Mail,
  Crown,
  ChevronRight
} from "lucide-react"
import Link from 'next/link'
import Image from 'next/image'

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}

function ProfileContent() {
  const { user, userProfile } = useAuth()

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and trading preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                {user.photoURL ? (
                  <Image 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    width={80}
                    height={80}
                    className="rounded-full border-4 border-blue-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                )}
              </div>

              {/* User Details */}
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-xl font-semibold">
                    {user.displayName || 'Trading Professional'}
                  </h3>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                </div>

                {/* Gamification Info */}
                {userProfile && (
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Level {userProfile.level}
                    </Badge>
                    <Badge variant="outline">
                      {userProfile.xp.toLocaleString()} XP
                    </Badge>
                    {userProfile.streak > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        🔥 {userProfile.streak} day streak
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trading Rules Setup Card */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Shield className="h-5 w-5 text-blue-600" />
              Trading Discipline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-blue-700">
              Define your trading rules and discipline system to stay consistent and improve performance.
            </p>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
              <Link href="/onboarding" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Setup Trading Rules
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>
            <p className="text-xs text-blue-600 italic">
              This will take about 5 minutes and helps create your personalized trading system
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                View Trading Calendar
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/analytics" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Performance Analytics
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Account Settings
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity Summary */}
        {userProfile && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Trading Progress Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {userProfile.level}
                  </div>
                  <p className="text-sm text-green-700">Current Level</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {userProfile.xp.toLocaleString()}
                  </div>
                  <p className="text-sm text-blue-700">Total XP</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {userProfile.streak}
                  </div>
                  <p className="text-sm text-orange-700">Current Streak</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {userProfile.longestStreak}
                  </div>
                  <p className="text-sm text-purple-700">Best Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 