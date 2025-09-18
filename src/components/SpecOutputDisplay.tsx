'use client'

import React, { useState } from 'react'
import { SpecOutput } from '@/types/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

interface SpecOutputDisplayProps {
  output: SpecOutput | null
  summary?: string
  loading?: boolean
}

export function SpecOutputDisplay({ output, summary, loading = false }: SpecOutputDisplayProps) {
  const [activeTab, setActiveTab] = useState('summary')

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generating Specification...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">
              Please wait while we generate your specification...
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!output) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Specification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Generate a specification to see the results here
          </div>
        </CardContent>
      </Card>
    )
  }

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'story', label: 'User Story' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'risks', label: 'Risks & Edge Cases' },
    { id: 'context', label: 'Context' },
    { id: 'json', label: 'JSON' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{output.input.title}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Export to Jira
          </Button>
          <Button variant="outline" size="sm">
            Refine Spec
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="summary" isActive={activeTab === 'summary'}>
            <div className="prose prose-sm max-w-none">
              <h3>Summary</h3>
              <div className="whitespace-pre-wrap">{summary || 'No summary available'}</div>
              
              <h4>Estimation</h4>
              <div className="bg-muted p-4 rounded-md">
                <div><strong>Complexity:</strong> {output.estimation.complexity}</div>
                <div><strong>Confidence:</strong> {Math.round(output.estimation.confidence * 100)}%</div>
                <div><strong>Drivers:</strong> {output.estimation.drivers.join(', ')}</div>
                {output.estimation.notes && (
                  <div><strong>Notes:</strong> {output.estimation.notes}</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="story" isActive={activeTab === 'story'}>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">User Story</h3>
                <div className="bg-muted p-4 rounded-md">
                  <div><strong>As a</strong> {output.story.as_a}</div>
                  <div><strong>I want</strong> {output.story.i_want}</div>
                  <div><strong>So that</strong> {output.story.so_that}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Acceptance Criteria</h4>
                <ul className="space-y-2">
                  {output.story.acceptance_criteria.map((criteria, index) => (
                    <li key={index} className="bg-muted p-3 rounded-md">
                      {criteria}
                    </li>
                  ))}
                </ul>
              </div>

              {output.assumptions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Assumptions</h4>
                  <ul className="space-y-1">
                    {output.assumptions.map((assumption, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {assumption}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {output.dependencies.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Dependencies</h4>
                  <ul className="space-y-1">
                    {output.dependencies.map((dependency, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {dependency}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requirements" isActive={activeTab === 'requirements'}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Functional Requirements</h3>
              {output.functional_requirements.length > 0 ? (
                <div className="space-y-3">
                  {output.functional_requirements.map((req) => (
                    <div key={req.id} className="bg-muted p-4 rounded-md">
                      <div className="font-mono text-sm text-muted-foreground mb-2">{req.id}</div>
                      <div>{req.statement}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground">No functional requirements defined</div>
              )}

              {output.needs_clarification.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-orange-600">Needs Clarification</h4>
                  <div className="space-y-3">
                    {output.needs_clarification.map((item, index) => (
                      <div key={index} className="bg-orange-50 border border-orange-200 p-4 rounded-md">
                        <div className="font-medium">{item.topic}</div>
                        <div className="text-sm mt-1">{item.question}</div>
                        <div className="text-xs text-orange-600 mt-2">{item.why_it_matters}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" isActive={activeTab === 'tasks'}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Implementation Tasks</h3>
              {output.tasks.length > 0 ? (
                <div className="space-y-3">
                  {['FE', 'BE', 'Infra', 'QA', 'Docs'].map((area) => {
                    const areaTasks = output.tasks.filter(task => task.area === area)
                    if (areaTasks.length === 0) return null
                    
                    return (
                      <div key={area}>
                        <h4 className="font-semibold mb-2">{area}</h4>
                        <div className="space-y-2">
                          {areaTasks.map((task) => (
                            <div key={task.id} className="bg-muted p-4 rounded-md">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium">{task.title}</div>
                                <div className="font-mono text-sm text-muted-foreground">{task.id}</div>
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">{task.details}</div>
                              {task.prereqs.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  Prerequisites: {task.prereqs.join(', ')}
                                </div>
                              )}
                              {task.artifacts.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  Artifacts: {task.artifacts.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-muted-foreground">No tasks defined</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="risks" isActive={activeTab === 'risks'}>
            <div className="space-y-4">
              {output.risks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Risks & Mitigations</h3>
                  <div className="space-y-3">
                    {output.risks.map((risk, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 p-4 rounded-md">
                        <div className="font-medium text-red-800">{risk.risk}</div>
                        <div className="text-sm text-red-600 mt-2">
                          <strong>Mitigation:</strong> {risk.mitigation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {output.edge_cases.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Edge Cases</h3>
                  <ul className="space-y-2">
                    {output.edge_cases.map((edgeCase, index) => (
                      <li key={index} className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm">
                        {edgeCase}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {output.risks.length === 0 && output.edge_cases.length === 0 && (
                <div className="text-muted-foreground">No risks or edge cases identified</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="context" isActive={activeTab === 'context'}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Resolved Context</h3>
              <div className="grid gap-4">
                {Object.keys(output.resolved_context.glossary).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Glossary</h4>
                    <div className="bg-muted p-4 rounded-md space-y-2">
                      {Object.entries(output.resolved_context.glossary).map(([term, definition]) => (
                        <div key={term}>
                          <strong>{term}:</strong> {definition}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {output.resolved_context.stakeholders.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Stakeholders</h4>
                    <div className="bg-muted p-4 rounded-md space-y-2">
                      {output.resolved_context.stakeholders.map((stakeholder, index) => (
                        <div key={index}>
                          <strong>{stakeholder.name}</strong> ({stakeholder.role})
                          {stakeholder.interests.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Interests: {stakeholder.interests.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {output.resolved_context.constraints.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Constraints</h4>
                    <ul className="bg-muted p-4 rounded-md space-y-1">
                      {output.resolved_context.constraints.map((constraint, index) => (
                        <li key={index} className="text-sm">• {constraint}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {output.resolved_context.non_functional.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Non-Functional Requirements</h4>
                    <ul className="bg-muted p-4 rounded-md space-y-1">
                      {output.resolved_context.non_functional.map((nfr, index) => (
                        <li key={index} className="text-sm">• {nfr}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="json" isActive={activeTab === 'json'}>
            <div>
              <h3 className="text-lg font-semibold mb-2">Raw JSON Output</h3>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96">
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}