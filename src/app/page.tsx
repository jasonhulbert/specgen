'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/types/database'
import { SpecInput, SpecOutput, Clarification } from '@/types/schemas'
import { ProjectSelector } from '@/components/ProjectSelector'
import { SpecInputForm } from '@/components/SpecInputForm'
import { SpecOutputDisplay } from '@/components/SpecOutputDisplay'
import { ClarifyingQuestions } from '@/components/ClarifyingQuestions'
import { LLMSelector } from '@/components/LLMSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [specOutput, setSpecOutput] = useState<SpecOutput | null>(null)
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  
  // Clarifying questions state
  const [clarifyingQuestions, setClarifyingQuestions] = useState<Clarification[]>([])
  const [estimatedConfidence, setEstimatedConfidence] = useState(0)
  const [ambiguityScore, setAmbiguityScore] = useState(0)
  const [specInputId, setSpecInputId] = useState<string | null>(null)
  const [currentInput, setCurrentInput] = useState<SpecInput | null>(null)

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    setShowCreateProject(false)
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    try {
      const { getDBService } = await import('@/lib/database')
      const { projectContextService, DEFAULT_PROJECT_CONTEXT } = await import('@/lib/projectContext')
      
      const dbService = await getDBService()
      const project = await dbService.createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim(),
      })

      // Create default context for the project
      await projectContextService.createProjectContext(
        project.id,
        DEFAULT_PROJECT_CONTEXT,
        true // Make it active
      )

      setSelectedProject(project)
      setNewProjectName('')
      setNewProjectDescription('')
      setShowCreateProject(false)
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const handleGenerateSpec = async (input: SpecInput) => {
    setLoading(true)
    setSpecOutput(null)
    setSummary('')
    setClarifyingQuestions([])
    setCurrentInput(input)

    try {
      const { llmService } = await import('@/lib/llm')
      const { projectContextService } = await import('@/lib/projectContext')
      const { getDBService } = await import('@/lib/database')
      
      const dbService = await getDBService()

      // Get active project context
      const activeContext = await dbService.getActiveProjectContext(input.project_id)
      if (!activeContext) {
        throw new Error('No active project context found')
      }

      // Resolve context with input context
      const resolvedContext = await projectContextService.resolveContext(input.project_id, input.context)

      // Store the input first
      const specInput = await dbService.createSpecInput({
        project_id: input.project_id,
        title: input.title,
        description: input.description,
        context_json: input.context,
      })

      // Calculate ambiguity score using heuristic
      const ambiguityScore = llmService.calculateAmbiguityScore(input)
      
      // If ambiguity is high, generate clarifying questions
      if (ambiguityScore > 0.4) {
        const clarifyingQuestions = await llmService.generateClarifyingQuestions(input, resolvedContext)
        
        setClarifyingQuestions(clarifyingQuestions.questions)
        setEstimatedConfidence(clarifyingQuestions.estimated_confidence)
        setAmbiguityScore(ambiguityScore)
        setSpecInputId(specInput.id)
      } else {
        // Generate the specification directly
        const specResponse = await llmService.generateSpec(input, resolvedContext, 'final')
        
        // Store the output
        const specOutput = await dbService.createSpecOutput({
          input_id: specInput.id,
          output_json: specResponse.json,
          summary_md: specResponse.summary,
          model_info_json: specResponse.model_info,
        })

        setSpecOutput(specResponse.json)
        setSummary(specResponse.summary)
      }
    } catch (error) {
      console.error('Error generating spec:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswersProvided = async (answers: Array<{ question: string; answer: string }>) => {
    if (!specInputId || !currentInput) return

    setLoading(true)
    setClarifyingQuestions([])

    try {
      const { llmService } = await import('@/lib/llm')
      const { projectContextService } = await import('@/lib/projectContext')
      const { getDBService } = await import('@/lib/database')
      
      const dbService = await getDBService()

      // Resolve context
      const resolvedContext = await projectContextService.resolveContext(currentInput.project_id, currentInput.context)

      // Generate the specification with the original input
      const specResponse = await llmService.generateSpec(currentInput, resolvedContext, 'final')
      
      // Store the initial output
      await dbService.createSpecOutput({
        input_id: specInputId,
        output_json: specResponse.json,
        summary_md: specResponse.summary,
        model_info_json: specResponse.model_info,
      })

      // Now refine it with the answers (this returns a partial spec)
      const refinedParts = await llmService.refineSpec(specResponse.json, answers)

      // Merge the refined parts back into the original spec
      const finalSpec = { ...specResponse.json, ...refinedParts }

      setSpecOutput(finalSpec)
      setSummary(specResponse.summary) // Keep original summary for now
    } catch (error) {
      console.error('Error refining spec:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkipQuestions = async () => {
    if (!currentInput) return

    setLoading(true)
    setClarifyingQuestions([])

    try {
      const { llmService } = await import('@/lib/llm')
      const { projectContextService } = await import('@/lib/projectContext')
      const { getDBService } = await import('@/lib/database')
      
      const dbService = await getDBService()

      // Resolve context
      const resolvedContext = await projectContextService.resolveContext(currentInput.project_id, currentInput.context)

      // Generate the specification
      const specResponse = await llmService.generateSpec(currentInput, resolvedContext, 'final')
      
      // Store the output if we have a spec input ID
      if (specInputId) {
        await dbService.createSpecOutput({
          input_id: specInputId,
          output_json: specResponse.json,
          summary_md: specResponse.summary,
          model_info_json: specResponse.model_info,
        })
      }

      setSpecOutput(specResponse.json)
      setSummary(specResponse.summary)
    } catch (error) {
      console.error('Error generating spec:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Feature Spec Agent</h1>
          <p className="text-muted-foreground mt-2">
            Convert high-level feature requirements into actionable specifications
          </p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Pane - Input */}
          <div className="space-y-6">
            <LLMSelector />
            
            <ProjectSelector
              selectedProject={selectedProject}
              onProjectSelect={handleProjectSelect}
              onCreateProject={() => setShowCreateProject(true)}
            />

            {showCreateProject && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  <Input
                    placeholder="Project description"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                      Create Project
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateProject(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedProject && (
              <SpecInputForm
                project={selectedProject}
                onGenerate={handleGenerateSpec}
                loading={loading}
              />
            )}
          </div>
          
          {/* Right Pane - Output */}
          <div className="space-y-6">
            {clarifyingQuestions.length > 0 ? (
              <ClarifyingQuestions
                questions={clarifyingQuestions}
                estimatedConfidence={estimatedConfidence}
                ambiguityScore={ambiguityScore}
                onAnswersProvided={handleAnswersProvided}
                onSkip={handleSkipQuestions}
                loading={loading}
              />
            ) : (
              <SpecOutputDisplay
                output={specOutput}
                summary={summary}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}