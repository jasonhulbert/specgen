'use client'

import React, { useState } from 'react'
import { Project } from '@/types/database'
import { SpecInput } from '@/types/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface SpecInputFormProps {
  project: Project
  onGenerate: (input: SpecInput) => void
  loading?: boolean
}

export function SpecInputForm({ project, onGenerate, loading = false }: SpecInputFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stakeholders, setStakeholders] = useState('')
  const [constraints, setConstraints] = useState('')
  const [nonFunctional, setNonFunctional] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const input: SpecInput = {
      project_id: project.id,
      title: title.trim(),
      description: description.trim(),
      context: {
        stakeholders: stakeholders.split('\n').map(s => s.trim()).filter(Boolean),
        constraints: constraints.split('\n').map(c => c.trim()).filter(Boolean),
        non_functional: nonFunctional.split('\n').map(nf => nf.trim()).filter(Boolean),
        inherit_from_project: true,
        overrides: {},
        links: [],
      }
    }
    
    onGenerate(input)
  }

  const isValid = title.trim() && description.trim()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Specification Input</CardTitle>
        <p className="text-sm text-muted-foreground">
          Project: {project.name}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Feature Title *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Self-serve password reset"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Feature Description *
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the feature requirements in detail..."
              rows={4}
              required
            />
          </div>

          <div>
            <label htmlFor="stakeholders" className="block text-sm font-medium mb-2">
              Stakeholders (one per line)
            </label>
            <Textarea
              id="stakeholders"
              value={stakeholders}
              onChange={(e) => setStakeholders(e.target.value)}
              placeholder="Product Manager&#10;Engineering Team&#10;Customer Support"
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="constraints" className="block text-sm font-medium mb-2">
              Constraints (one per line)
            </label>
            <Textarea
              id="constraints"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="No PII logging&#10;Data residency: US&#10;Mobile-first design"
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="nonFunctional" className="block text-sm font-medium mb-2">
              Non-Functional Requirements (one per line)
            </label>
            <Textarea
              id="nonFunctional"
              value={nonFunctional}
              onChange={(e) => setNonFunctional(e.target.value)}
              placeholder="99.9% uptime&#10;P95 < 400ms&#10;WCAG 2.1 AA compliance"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={!isValid || loading}
              className="flex-1"
            >
              {loading ? 'Generating...' : 'Generate Draft Spec'}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              disabled={!isValid || loading}
              onClick={() => {
                // TODO: Implement "Ask Questions" mode
                console.log('Ask questions mode not yet implemented')
              }}
            >
              Ask Questions
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}