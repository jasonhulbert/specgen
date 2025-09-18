import { SpecOutput, SpecOutputSchema, ClarifyingQuestions, ClarifyingQuestionsSchema, SpecInput, ResolvedContext } from '@/types/schemas'

// LLM Provider configuration
export interface LLMConfig {
  id: string
  provider: string
  name: string
  base_url: string
  is_openai_compatible: boolean
  model: string
  api_key?: string
}

// Default LM Studio configuration
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  id: 'local-model',
  provider: 'local',
  name: 'LM Studio Local Model',
  base_url: 'http://localhost:1234',
  is_openai_compatible: true,
  model: 'local-model', // Generic model name - LM Studio often accepts any string here
}

// LLM Response types
export interface LLMResponse {
  summary: string
  json: any
  model_info: {
    model: string
    provider: string
    timestamp: Date
    tokens_used?: number
  }
}

export interface LLMRequestOptions {
  temperature?: number
  max_tokens?: number
  timeout?: number
}

// System prompts
export const SYSTEM_PROMPT = `You are a pragmatic product/engineering copilot trained on modern agile practices. You write **concise, unambiguous** specs. You prefer bullet‑point clarity over prose. You surface **ambiguities** and **risks** explicitly. You generate **structured JSON** that matches the provided schema, and an accompanying human‑readable summary.

Guidelines:
- Never fabricate org‑specific facts; ask questions instead
- Use domain vocabulary only if present in the input/context or project context
- Keep lists short and high‑signal; default max 7 items per list
- Use stable IDs with today's date prefix for easy diffing
- Keep acceptance criteria in Given/When/Then form for QA handoff
- Always include QA and Docs placeholders in task breakdown
- Group tasks with area and prereqs for natural ordering`

export const CLARIFYING_QUESTIONS_PROMPT = `Given the input and resolved context, identify 3-5 questions that would most reduce ambiguity in the specification. Focus on:
- Missing business logic or edge cases
- Unclear functional requirements
- Ambiguous stakeholder expectations
- Technical implementation gaps
- Integration dependencies

IMPORTANT: Respond with ONLY a valid JSON object that matches the ClarifyingQuestions schema. Do not include any other text, markdown, or explanations.`

// LLM Service class
export class LLMService {
  private config: LLMConfig

  constructor(config: LLMConfig = DEFAULT_LLM_CONFIG) {
    this.config = config
  }

  // Generate specification from input
  async generateSpec(
    input: SpecInput,
    resolvedContext: ResolvedContext,
    mode: 'draft' | 'final' = 'draft',
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse> {
    const prompt = this.buildSpecPrompt(input, resolvedContext, mode)
    
    try {
      const response = await this.callLLM(prompt, SpecOutputSchema, options)
      return response
    } catch (error) {
      console.error('Error generating spec:', error)
      throw new Error(`Failed to generate specification: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Generate clarifying questions
  async generateClarifyingQuestions(
    input: SpecInput,
    resolvedContext: ResolvedContext,
    options: LLMRequestOptions = {}
  ): Promise<ClarifyingQuestions> {
    const prompt = this.buildClarifyingQuestionsPrompt(input, resolvedContext)
    
    try {
      const response = await this.callLLM(prompt, ClarifyingQuestionsSchema, options)
      return response.json
    } catch (error) {
      console.error('Error generating clarifying questions:', error)
      throw new Error(`Failed to generate clarifying questions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Refine specification with answers
  async refineSpec(
    originalSpec: SpecOutput,
    answers: Array<{ question: string; answer: string }>,
    options: LLMRequestOptions = {}
  ): Promise<Partial<SpecOutput>> {
    const prompt = this.buildRefinePrompt(originalSpec, answers)
    
    try {
      const response = await this.callLLM(prompt, SpecOutputSchema.partial(), options)
      return response.json
    } catch (error) {
      console.error('Error refining spec:', error)
      throw new Error(`Failed to refine specification: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Calculate ambiguity score heuristic
  calculateAmbiguityScore(input: SpecInput): number {
    let score = 0

    // Check input length (shorter descriptions tend to be more ambiguous)
    if (input.description.length < 100) score += 0.3
    else if (input.description.length < 200) score += 0.1

    // Check for numbers/dates (more specific)
    const hasNumbers = /\d/.test(input.description)
    if (!hasNumbers) score += 0.2

    // Check for vague words
    const vagueWords = ['some', 'maybe', 'possibly', 'could', 'might', 'perhaps', 'probably']
    const vagueCount = vagueWords.filter(word => 
      input.description.toLowerCase().includes(word)
    ).length
    score += vagueCount * 0.1

    // Check pronoun density (more pronouns = less specific)
    const pronouns = ['it', 'this', 'that', 'they', 'them']
    const pronounCount = pronouns.filter(pronoun =>
      input.description.toLowerCase().split(' ').includes(pronoun)
    ).length
    score += pronounCount * 0.05

    // Check for missing context
    if (!input.context.stakeholders?.length) score += 0.1
    if (!input.context.constraints?.length) score += 0.1
    
    return Math.min(score, 1.0) // Cap at 1.0
  }

  // Build spec generation prompt
  private buildSpecPrompt(
    input: SpecInput,
    resolvedContext: ResolvedContext,
    mode: 'draft' | 'final'
  ): string {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    
    return `${SYSTEM_PROMPT}

RESOLVED PROJECT CONTEXT:
${JSON.stringify(resolvedContext, null, 2)}

USER INPUT:
${JSON.stringify(input, null, 2)}

INSTRUCTIONS:
Generate a ${mode} specification using stable IDs prefixed with "${today}" (e.g., "FR-${today}-001", "T-${today}-001").

CRITICAL SCHEMA REQUIREMENTS:
- "input": Must include the exact input object provided above
- "resolved_context": Must include the exact resolved context provided above  
- "story": Object with "as_a", "i_want", "so_that", "acceptance_criteria" (array of strings)
- "tasks": Array of objects, each with:
  - "id": string (e.g., "T-${today}-001")
  - "title": string (descriptive task name)
  - "area": MUST be one of: "FE", "BE", "Infra", "QA", "Docs" (no other values allowed)
  - "details": string (implementation details)
  - "prereqs": array of strings (default: [])
  - "artifacts": array of strings (default: [])
- "estimation": Object with:
  - "confidence": number between 0 and 1
  - "complexity": one of "XS", "S", "M", "L", "XL"
  - "drivers": array of strings
  - "notes": string
- "functional_requirements": Array with "id" and "statement" fields
- "needs_clarification": Array (default: [])
- "assumptions": Array of strings (default: [])
- "dependencies": Array of strings (default: [])
- "edge_cases": Array of strings (default: [])
- "risks": Array with "risk" and "mitigation" fields (default: [])

EXAMPLE STRUCTURE:
{
  "input": /* the exact input object */,
  "resolved_context": /* the exact resolved context */,
  "story": {
    "as_a": "user",
    "i_want": "to do something",
    "so_that": "I achieve a goal",
    "acceptance_criteria": ["Given...", "When...", "Then..."]
  },
  "tasks": [
    {
      "id": "T-${today}-001",
      "title": "Setup frontend components",
      "area": "FE",
      "details": "Create React components for...",
      "prereqs": [],
      "artifacts": ["Component files"]
    }
  ],
  "estimation": {
    "confidence": 0.8,
    "complexity": "M",
    "drivers": ["New technology"],
    "notes": "Standard implementation"
  },
  "functional_requirements": [
    {
      "id": "FR-${today}-001",
      "statement": "System must..."
    }
  ],
  "needs_clarification": [],
  "assumptions": [],
  "dependencies": [],
  "edge_cases": [],
  "risks": []
}

RESPOND WITH ONLY VALID JSON. NO OTHER TEXT.`
  }

  // Build clarifying questions prompt
  private buildClarifyingQuestionsPrompt(
    input: SpecInput,
    resolvedContext: ResolvedContext
  ): string {
    return `${CLARIFYING_QUESTIONS_PROMPT}

RESOLVED PROJECT CONTEXT: ${JSON.stringify(resolvedContext, null, 2)}

USER INPUT: ${JSON.stringify(input, null, 2)}

Respond with a JSON object containing a "questions" array and "estimated_confidence" number.`
  }

  // Build refinement prompt
  private buildRefinePrompt(
    originalSpec: SpecOutput,
    answers: Array<{ question: string; answer: string }>
  ): string {
    return `SYSTEM: ${SYSTEM_PROMPT}

ORIGINAL SPECIFICATION: ${JSON.stringify(originalSpec, null, 2)}

CLARIFYING ANSWERS:
${answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}

INSTRUCTIONS:
Update only the affected sections based on the clarifying answers. Return a partial specification object with only the changed fields.

RESPONSE FORMAT:
- Provide a JSON object with only the updated fields.
`
  }

  // Core LLM API call
  private async callLLM(
    prompt: string,
    schema: any,
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse> {
    const { temperature = 0.1, max_tokens = 4000, timeout = 60000 } = options

    if (!this.config.is_openai_compatible) {
      throw new Error('Only OpenAI-compatible APIs are currently supported')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Prepare the request payload
    const requestBody = {
      model: this.config.model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates structured JSON responses.' },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens,
      // Remove response_format for now as it might not be supported by LM Studio
      // response_format: { type: 'json_object' }
    }

    console.log('LLM Request:', {
      url: `${this.config.base_url}/v1/chat/completions`,
      body: requestBody
    })

    try {
      const response = await fetch(`${this.config.base_url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.api_key && { 'Authorization': `Bearer ${this.config.api_key}` }),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('LLM API Error Response:', errorText)
        throw new Error(`LLM API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('No content in LLM response')
      }

      console.log('Raw LLM Response:', content)

      // Try to parse as direct JSON first
      let parsedJson: any
      let summary = 'Generated specification'

      try {
        // First try to parse the entire content as JSON
        parsedJson = JSON.parse(content.trim())
      } catch (jsonError) {
        // If that fails, try to extract JSON from the content
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            parsedJson = JSON.parse(jsonMatch[0])
            // Extract summary from content before the JSON
            const summaryPart = content.substring(0, jsonMatch.index).trim()
            if (summaryPart) {
              summary = summaryPart
            }
          } catch (extractError) {
            console.error('Failed to parse extracted JSON:', extractError)
            throw new Error(`Failed to parse LLM response as JSON: ${jsonError}`)
          }
        } else {
          console.error('No JSON found in response:', content)
          throw new Error('No valid JSON found in LLM response')
        }
      }

      console.log('Parsed JSON:', parsedJson)

      // Validate against schema
      try {
        const validated = schema.parse(parsedJson)
        
        return {
          summary: summary,
          json: validated,
          model_info: {
            model: this.config.model,
            provider: this.config.provider,
            timestamp: new Date(),
            tokens_used: data.usage?.total_tokens,
          },
        }
      } catch (validationError) {
        console.error('Schema validation failed:', validationError)
        console.error('Raw response that failed validation:', content)
        console.error('Parsed JSON that failed validation:', parsedJson)
        throw validationError
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('LLM request timed out')
      }
      throw error
    }
  }
}

// Default service instance
export const llmService = new LLMService()