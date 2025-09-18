'use client'

import React, { useState, useEffect } from 'react'
import { Project } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ProjectSelectorProps {
  selectedProject: Project | null
  onProjectSelect: (project: Project) => void
  onCreateProject: () => void
}

export function ProjectSelector({ selectedProject, onProjectSelect, onCreateProject }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const { getDBService } = await import('@/lib/database')
      const dbService = await getDBService()
      const projectList = await dbService.getProjects()
      setProjects(projectList)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading projects...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Project</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No projects found</p>
            <Button onClick={onCreateProject}>Create First Project</Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    selectedProject?.id === project.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => onProjectSelect(project)}
                >
                  <div className="font-medium">{project.name}</div>
                  <div className={`text-sm ${
                    selectedProject?.id === project.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  }`}>
                    {project.description}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={onCreateProject} className="w-full">
              Create New Project
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}