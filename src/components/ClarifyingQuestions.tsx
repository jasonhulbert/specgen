'use client'

import React, { useState } from 'react'
import { Clarification } from '@/types/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ClarifyingQuestionsProps {
  questions: Clarification[]
  estimatedConfidence: number
  ambiguityScore: number
  onAnswersProvided: (answers: Array<{ question: string; answer: string }>) => void
  onSkip: () => void
  loading?: boolean
}

export function ClarifyingQuestions({
  questions,
  estimatedConfidence,
  ambiguityScore,
  onAnswersProvided,
  onSkip,
  loading = false
}: ClarifyingQuestionsProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({})

  const handleAnswerChange = (index: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [index]: answer }))
  }

  const handleSubmit = () => {
    const answeredQuestions = questions
      .map((question, index) => ({
        question: question.question,
        answer: answers[index] || '',
      }))
      .filter(qa => qa.answer.trim() !== '')

    onAnswersProvided(answeredQuestions)
  }

  const answeredCount = Object.values(answers).filter(answer => answer.trim() !== '').length
  const canSubmit = answeredCount > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clarifying Questions</CardTitle>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>
            <strong>Ambiguity Score:</strong> {Math.round(ambiguityScore * 100)}% 
            <span className="ml-2 text-orange-600">(High ambiguity detected)</span>
          </div>
          <div>
            <strong>Current Confidence:</strong> {Math.round(estimatedConfidence * 100)}%
          </div>
          <p>
            Please answer these questions to improve the specification quality. 
            You can skip questions you&apos;re not sure about.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question, index) => (
          <div key={index} className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
              <div className="font-medium text-blue-800 mb-1">
                {question.topic}
              </div>
              <div className="text-blue-700 mb-2">
                {question.question}
              </div>
              <div className="text-xs text-blue-600">
                <strong>Why this matters:</strong> {question.why_it_matters}
              </div>
            </div>
            
            <Textarea
              placeholder="Your answer (optional)..."
              value={answers[index] || ''}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              rows={3}
            />
          </div>
        ))}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="flex-1"
          >
            {loading ? 'Generating Refined Spec...' : `Generate Spec with ${answeredCount} Answer${answeredCount !== 1 ? 's' : ''}`}
          </Button>
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={loading}
          >
            Skip Questions
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <strong>Tip:</strong> Answering more questions will result in a more accurate and complete specification.
        </div>
      </CardContent>
    </Card>
  )
}