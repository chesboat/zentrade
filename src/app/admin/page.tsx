"use client"

// Admin Dashboard - Force redeploy v2 - Firebase connection fix
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
import { isUserAdmin, getUserAnalytics, getAuditLogs } from '@/services/adminService'
import { XPSettingsManager } from '@/components/admin/XPSettingsManager'
// import { QuestionnaireManager } from '@/components/admin/QuestionnaireManager'
import { AdminAuditLog } from '@/types/admin'

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [analytics, setAnalytics] = useState<{
    totalUsers: number;
    activeUsers: number; 
    totalRuleCheckIns: number;
    engagementRate: number;
  } | null>(null)
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const checkAdminAccess = async () => {
      console.log('🔍 Admin Debug - Starting admin access check')
      console.log('🔍 User state:', user ? `Logged in as ${user.email}` : 'No user')
      console.log('🔍 Environment check:', {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'PRESENT' : 'MISSING',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'PRESENT' : 'MISSING',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'PRESENT' : 'MISSING'
      })
      
      if (!user) {
        console.log('🔍 Redirecting to login - no user')
        router.push('/login')
        return
      }

      try {
        console.log('🔍 Testing Firebase connection...')
        const adminStatus = await isUserAdmin(user.uid)
        console.log('🔍 Admin status result:', adminStatus)
        
        if (!adminStatus) {
          console.log('🔍 User is not admin, redirecting to dashboard')
          router.push('/dashboard')
          return
        }
        
        console.log('🔍 User is admin, loading dashboard')
        setIsAdmin(true)
        
        // Load analytics and audit logs
        const [analyticsData, logs] = await Promise.all([
          getUserAnalytics(),
          getAuditLogs(50)
        ])
        
        setAnalytics(analyticsData)
        setAuditLogs(logs)
        console.log('🔍 Admin dashboard loaded successfully')
      } catch (error) {
        console.error('🔥 Error checking admin access:', error)
        console.error('🔥 Error details:', {
          message: (error as Error).message,
          code: (error as { code?: string }).code,
          stack: (error as Error).stack
        })
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAccess()
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
          {/* DEBUG: Version indicator */}
          <div className="text-xs text-red-500 font-mono mt-1">
            🚀 DEBUG VERSION v3 - {new Date().toISOString()}
          </div>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Shield className="h-3 w-3 mr-1" />
          Administrator
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Log
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
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rule Check-ins</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalRuleCheckIns}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.engagementRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Active vs total users
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => setActiveTab('xp-settings')}
                >
                  <Settings className="h-4 w-4" />
                  Manage XP Values
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => setActiveTab('questionnaires')}
                >
                  <HelpCircle className="h-4 w-4" />
                  Edit Questionnaires
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => setActiveTab('audit')}
                >
                  <Eye className="h-4 w-4" />
                  View Recent Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Admin Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="p-1 bg-blue-100 rounded">
                        {log.action === 'create' && <Database className="h-3 w-3 text-blue-600" />}
                        {log.action === 'update' && <Edit className="h-3 w-3 text-blue-600" />}
                        {log.action === 'delete' && <AlertTriangle className="h-3 w-3 text-red-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {log.action.charAt(0).toUpperCase() + log.action.slice(1)}d {log.resource}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.resourceId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {log.timestamp.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
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
          {/* <QuestionnaireManager /> */}
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Admin Audit Log</CardTitle>
              <p className="text-sm text-gray-600">
                Complete history of admin actions and system changes
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            log.action === 'create' ? 'default' :
                            log.action === 'update' ? 'secondary' :
                            'destructive'
                          }>
                            {log.action}
                          </Badge>
                          <span className="font-medium">{log.resource}</span>
                          <span className="text-gray-500">({log.resourceId})</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          By: {log.userEmail || log.userId}
                        </div>
                        {(log.oldValue && log.newValue) ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-blue-600">View changes</summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify({ oldValue: log.oldValue, newValue: log.newValue }, null, 2)}
                              </pre>
                            </div>
                          </details>
                        ) : null}
                      </div>
                      <div className="text-sm text-gray-500">
                        {log.timestamp.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 