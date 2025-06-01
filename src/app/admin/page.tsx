"use client"

// Admin Dashboard - Server-side Firebase Admin SDK implementation
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Settings, 
  HelpCircle, 
  Users, 
  Activity,
  Shield,
  Eye,
  Edit,
  Database,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react"
import { checkAdminAccess, getUserAnalytics } from '@/lib/services/adminApiService'
import { XPSettingsManager } from '@/components/admin/XPSettingsManager'
// import { QuestionnaireManager } from '@/components/admin/QuestionnaireManager'

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [analytics, setAnalytics] = useState<{
    totalUsers: number;
    activeUsersLast7Days: number; 
    totalSessions: number;
    averageSessionsPerUser: number;
    topPerformers: any[];
    recentActivity: any[];
  } | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const checkAdminAccessAndLoadData = async () => {
      console.log('🔍 Admin Debug - Starting admin access check via API')
      console.log('🔍 User state:', user ? `Logged in as ${user.email}` : 'No user')
      
      if (!user) {
        console.log('🔍 Redirecting to login - no user')
        router.push('/login')
        return
      }

      try {
        console.log('🔍 Checking admin access via server-side API...')
        const adminStatus = await checkAdminAccess()
        console.log('🔍 Admin status result:', adminStatus)
        
        if (!adminStatus) {
          console.log('🔍 User is not admin, redirecting to dashboard')
          router.push('/dashboard')
          return
        }
        
        console.log('🔍 User is admin, loading dashboard data')
        setIsAdmin(true)
        
        // Load analytics data
        const analyticsData = await getUserAnalytics()
        setAnalytics(analyticsData)
        
        console.log('🔍 Admin dashboard loaded successfully')
      } catch (error) {
        console.error('🔥 Error checking admin access:', error)
        console.error('🔥 Error details:', {
          message: (error as Error).message
        })
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAccessAndLoadData()
  }, [user, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to access this area.</p>
            <Button onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage XP settings, questionnaires, and system configuration</p>
          {/* Version indicator */}
          <div className="text-xs text-green-500 font-mono mt-1">
            ✅ SERVER-SIDE API v1.0 - {new Date().toISOString()}
          </div>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Shield className="h-3 w-3 mr-1" />
          Administrator
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="xp-settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            XP Settings
          </TabsTrigger>
          <TabsTrigger value="questionnaires" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Questionnaires
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered accounts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users (7d)</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.activeUsersLast7Days}</div>
                  <p className="text-xs text-muted-foreground">
                    Last 7 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalSessions}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Sessions/User</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.averageSessionsPerUser}</div>
                  <p className="text-xs text-muted-foreground">
                    Engagement metric
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Firebase Admin SDK</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Admin Authentication</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Routes</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Operational
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* XP Settings Tab */}
        <TabsContent value="xp-settings">
          <XPSettingsManager />
        </TabsContent>

        {/* Questionnaires Tab */}
        <TabsContent value="questionnaires">
          <Card>
            <CardHeader>
              <CardTitle>Questionnaire Management</CardTitle>
              <p className="text-sm text-gray-600">
                Coming soon - Manage questionnaire templates and questions
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Questionnaire management will be available soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 