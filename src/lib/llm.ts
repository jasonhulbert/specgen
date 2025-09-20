import { SpecOutput, SpecOutputSchema, ClarifyingQuestions, ClarifyingQuestionsSchema, SpecInput, ResolvedContext } from '@/types/schemas'
import { llmConfigManager } from './llm/config'
import { LLMAdapter, LLMMessage, LLMRequestOptions } from './llm/adapters'
import { templateEngine, TEMPLATE_NAMES, validateAllTemplates } from './llm/templates'

// Legacy interface for backward compatibility
export interface LLMConfig {
  id: string
  provider: string
  name: string
  base_url: string
  is_openai_compatible: boolean
  model: string
  api_key?: string
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

// LLM Service class - now uses the adapter system
export class LLMService {
  private configManager = llmConfigManager

  constructor() {
    // Service now uses the global config manager
  }

  // Get current adapter
  private async getCurrentAdapter(): Promise<LLMAdapter> {
    return await this.configManager.getAdapter()
  }

  // Get active configuration info
  async getActiveConfiguration() {
    return await this.configManager.getActiveConfiguration()
  }

  // Switch to a different LLM configuration
  async switchConfiguration(configId: string): Promise<void> {
    await this.configManager.setActiveConfiguration(configId)
  }

  // Get all available configurations
  async getAvailableConfigurations() {
    return await this.configManager.getAllConfigurations()
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

  // Validate all templates (useful for debugging and testing)
  validateTemplates() {
    return validateAllTemplates()
  }

  // Build spec generation prompt
  private buildSpecPrompt(
    input: SpecInput,
    resolvedContext: ResolvedContext,
    mode: 'draft' | 'final'
  ): string {
    const systemPrompt = templateEngine.render(TEMPLATE_NAMES.SYSTEM)
    
    return templateEngine.render(TEMPLATE_NAMES.SPEC_GENERATION, {
      system_prompt: systemPrompt,
      resolved_context: resolvedContext,
      input: input,
      mode: mode,
    })
  }

  // Build clarifying questions prompt
  private buildClarifyingQuestionsPrompt(
    input: SpecInput,
    resolvedContext: ResolvedContext
  ): string {
    return templateEngine.render(TEMPLATE_NAMES.CLARIFYING_QUESTIONS, {
      resolved_context: resolvedContext,
      input: input,
    })
  }

  // Build refinement prompt
  private buildRefinePrompt(
    originalSpec: SpecOutput,
    answers: Array<{ question: string; answer: string }>
  ): string {
    const systemPrompt = templateEngine.render(TEMPLATE_NAMES.SYSTEM)
    const answersFormatted = answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')
    
    return templateEngine.render(TEMPLATE_NAMES.REFINE_SPEC, {
      system_prompt: systemPrompt,
      original_spec: originalSpec,
      answers_formatted: answersFormatted,
    })
  }

  // Core LLM API call using adapter system
  private async callLLM(
    prompt: string,
    schema: any,
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse> {
    const { temperature = 0.1, max_tokens = 4000, timeout = 60000 } = options

    const adapter = await this.getCurrentAdapter()
    const activeConfig = await this.getActiveConfiguration()
    
    if (!activeConfig) {
      throw new Error('No active LLM configuration found')
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are a helpful assistant that generates structured JSON responses.' },
      { role: 'user', content: prompt }
    ]

    console.log('LLM Request:', {
      provider: activeConfig.config.provider,
      model: activeConfig.config.model || 'default',
      messages: messages.map(m => ({ role: m.role, content: m.content.substring(0, 100) + '...' }))
    })

    try {
      const response = await adapter.generateCompletion(messages, {
        temperature,
        max_tokens,
        timeout,
      })

      console.log('Raw LLM Response:', response.content.substring(0, 200) + '...')

      // Try to parse as direct JSON first
      let parsedJson: any
      let summary = 'Generated specification'

      try {
        // First try to parse the entire content as JSON
        parsedJson = JSON.parse(response.content.trim())
      } catch (jsonError) {
        // If that fails, try to extract JSON from the content
        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            parsedJson = JSON.parse(jsonMatch[0])
            // Extract summary from content before the JSON
            const summaryPart = response.content.substring(0, jsonMatch.index).trim()
            if (summaryPart) {
              summary = summaryPart
            }
          } catch (extractError) {
            console.error('Failed to parse extracted JSON:', extractError)
            throw new Error(`Failed to parse LLM response as JSON: ${jsonError}`)
          }
        } else {
          console.error('No JSON found in response:', response.content)
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
            model: response.model,
            provider: activeConfig.config.provider,
            timestamp: new Date(),
            tokens_used: response.usage?.total_tokens,
          },
        }
      } catch (validationError) {
        console.error('Schema validation failed:', validationError)
        console.error('Raw response that failed validation:', response.content)
        console.error('Parsed JSON that failed validation:', parsedJson)
        throw validationError
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('LLM request timed out')
      }
      throw error
    }
  }
}

// Default service instance
export const llmService = new LLMService()

// Export adapter system for advanced usage
export { llmConfigManager } from './llm/config'
export type { LLMConfig as AdapterConfig, LLMAdapter } from './llm/adapters'