"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  Users,
  Calendar
} from "lucide-react"
import { useAuth } from '@/contexts/AuthContext'
import { 
  getQuestionnaireTemplates,
  createQuestionnaireTemplate,
  updateQuestionnaireTemplate,
  deleteQuestionnaireTemplate
} from '@/services/adminService'
import { QuestionnaireTemplate } from '@/types/admin'

export function QuestionnaireManager() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const templateList = await getQuestionnaireTemplates()
      setTemplates(templateList)
    } catch (err) {
      setError('Failed to load questionnaire templates')
      console.error('Error loading templates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (templateId: string, isActive: boolean) => {
    if (!user) return
    
    try {
      await updateQuestionnaireTemplate(templateId, { isActive }, user.uid)
      await loadTemplates()
      setSuccess(`Template ${isActive ? 'activated' : 'deactivated'} successfully`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to update template status')
      console.error('Error updating template:', err)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!user) return
    
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }
    
    try {
      await deleteQuestionnaireTemplate(templateId, user.uid)
      await loadTemplates()
      setSuccess('Template deleted successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to delete template')
      console.error('Error deleting template:', err)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading questionnaire templates...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Questionnaire Management</h2>
          <p className="text-gray-600">Manage questionnaire templates and questions</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="text-red-800">{error}</div>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <div className="text-green-800">{success}</div>
        </Alert>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HelpCircle className="h-5 w-5" />
                  {template.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {template.isDefault && (
                    <Badge variant="outline">Default</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  {template.description}
                </p>
                
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-3 w-3" />
                    <span>{template.questions.length} questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span>{template.usageCount} users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>Modified {template.lastModified.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(template.id, !template.isActive)}
                >
                  {template.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                
                {!template.isDefault && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-gray-600 mb-4">
              Create your first questionnaire template to get started.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 