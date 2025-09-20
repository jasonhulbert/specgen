import { z } from 'zod'

// Base types for LLM adapters
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMRequestOptions {
  temperature?: number
  max_tokens?: number
  timeout?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

export interface LLMResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  finish_reason?: string
}

export interface LLMModelInfo {
  id: string
  name: string
  provider: string
  context_length: number
  supports_json_mode: boolean
  supports_function_calling: boolean
  cost_per_1k_tokens?: {
    input: number
    output: number
  }
}

// Provider configuration schemas
export const OpenAIConfigSchema = z.object({
  provider: z.literal('openai'),
  api_key: z.string(),
  base_url: z.string().optional(),
  model: z.string(),
  organization_id: z.string().optional(),
})

export const AnthropicConfigSchema = z.object({
  provider: z.literal('anthropic'),
  api_key: z.string(),
  model: z.string(),
  base_url: z.string().optional(),
})

export const LMStudioConfigSchema = z.object({
  provider: z.literal('lmstudio'),
  base_url: z.string(),
  model: z.string().optional(),
})

export const OllamaConfigSchema = z.object({
  provider: z.literal('ollama'),
  base_url: z.string(),
  model: z.string(),
})

export const LLMConfigSchema = z.discriminatedUnion('provider', [
  OpenAIConfigSchema,
  AnthropicConfigSchema,
  LMStudioConfigSchema,
  OllamaConfigSchema,
])

export type LLMConfig = z.infer<typeof LLMConfigSchema>
export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>
export type AnthropicConfig = z.infer<typeof AnthropicConfigSchema>
export type LMStudioConfig = z.infer<typeof LMStudioConfigSchema>
export type OllamaConfig = z.infer<typeof OllamaConfigSchema>

// Base adapter interface
export abstract class LLMAdapter {
  protected config: LLMConfig
  
  constructor(config: LLMConfig) {
    this.config = config
  }

  abstract getModelInfo(): LLMModelInfo

  abstract generateCompletion(
    messages: LLMMessage[],
    options?: LLMRequestOptions
  ): Promise<LLMResponse>
  
  // Test connection to the provider
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateCompletion([
        { role: 'user', content: 'Hello' }
      ], { max_tokens: 10, temperature: 0 })
      return !!response.content
    } catch {
      return false
    }
  }
}

// OpenAI/OpenAI-compatible adapter
export class OpenAIAdapter extends LLMAdapter {
  protected config: OpenAIConfig

  constructor(config: OpenAIConfig) {
    super(config)
    this.config = config
  }

  getModelInfo(): LLMModelInfo {
    const modelSpecs: Record<string, Partial<LLMModelInfo>> = {
      'gpt-4': {
        name: 'GPT-4',
        context_length: 8192,
        supports_json_mode: true,
        supports_function_calling: true,
        cost_per_1k_tokens: { input: 0.03, output: 0.06 }
      },
      'gpt-4-turbo': {
        name: 'GPT-4 Turbo',
        context_length: 128000,
        supports_json_mode: true,
        supports_function_calling: true,
        cost_per_1k_tokens: { input: 0.01, output: 0.03 }
      },
      'gpt-3.5-turbo': {
        name: 'GPT-3.5 Turbo',
        context_length: 16385,
        supports_json_mode: true,
        supports_function_calling: true,
        cost_per_1k_tokens: { input: 0.0015, output: 0.002 }
      }
    }

    const spec = modelSpecs[this.config.model] || {}
    
    return {
      id: this.config.model,
      name: spec.name || this.config.model,
      provider: 'openai',
      context_length: spec.context_length || 4096,
      supports_json_mode: spec.supports_json_mode || false,
      supports_function_calling: spec.supports_function_calling || false,
      cost_per_1k_tokens: spec.cost_per_1k_tokens,
    }
  }

  async generateCompletion(
    messages: LLMMessage[],
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse> {
    const {
      temperature = 0.1,
      max_tokens = 4000,
      timeout = 60000,
      top_p,
      frequency_penalty,
      presence_penalty
    } = options

    const baseUrl = this.config.base_url || 'https://api.openai.com'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const requestBody: any = {
      model: this.config.model,
      messages,
      temperature,
      max_tokens,
    }

    // Add optional parameters
    if (top_p !== undefined) requestBody.top_p = top_p
    if (frequency_penalty !== undefined) requestBody.frequency_penalty = frequency_penalty
    if (presence_penalty !== undefined) requestBody.presence_penalty = presence_penalty

    // Enable JSON mode if supported
    const modelInfo = this.getModelInfo()
    if (modelInfo.supports_json_mode) {
      requestBody.response_format = { type: 'json_object' }
    }

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`,
          ...(this.config.organization_id && { 'OpenAI-Organization': this.config.organization_id }),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      
      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage,
        finish_reason: data.choices[0]?.finish_reason,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out')
      }
      throw error
    }
  }
}

// Anthropic Claude adapter
export class AnthropicAdapter extends LLMAdapter {
  protected config: AnthropicConfig

  constructor(config: AnthropicConfig) {
    super(config)
    this.config = config
  }

  getModelInfo(): LLMModelInfo {
    const modelSpecs: Record<string, Partial<LLMModelInfo>> = {
      'claude-sonnet-4-20250514': {
        name: 'Claude 3.5 Sonnet',
        context_length: 200000,
        supports_json_mode: true,
        cost_per_1k_tokens: { input: 0.003, output: 0.015 }
      }
    }

    const spec = modelSpecs[this.config.model] || {}
    
    return {
      id: this.config.model,
      name: spec.name || this.config.model,
      provider: 'anthropic',
      context_length: spec.context_length || 100000,
      supports_json_mode: spec.supports_json_mode || true,
      supports_function_calling: false,
      cost_per_1k_tokens: spec.cost_per_1k_tokens,
    }
  }

  async generateCompletion(
    messages: LLMMessage[],
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse> {
    const {
      temperature = 0.1,
      max_tokens = 4000,
      timeout = 60000,
      top_p
    } = options

    const baseUrl = this.config.base_url || 'https://api.anthropic.com'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Convert messages format for Anthropic
    const systemMessage = messages.find(m => m.role === 'system')
    const conversationMessages = messages.filter(m => m.role !== 'system')

    const requestBody: any = {
      model: this.config.model,
      messages: conversationMessages,
      max_tokens,
      temperature,
    }

    if (systemMessage) {
      requestBody.system = systemMessage.content
    }

    if (top_p !== undefined) {
      requestBody.top_p = top_p
    }

    try {
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.api_key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      
      return {
        content: data.content[0]?.text || '',
        model: data.model,
        usage: data.usage,
        finish_reason: data.stop_reason,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out')
      }
      throw error
    }
  }
}

// LM Studio adapter (OpenAI-compatible local)
export class LMStudioAdapter extends LLMAdapter {
  protected config: LMStudioConfig

  constructor(config: LMStudioConfig) {
    super(config)
    this.config = config
  }

  getModelInfo(): LLMModelInfo {
    return {
      id: this.config.model || 'local-model',
      name: 'LM Studio Local Model',
      provider: 'lmstudio',
      context_length: 32768, // Assume reasonable default
      supports_json_mode: false, // Most local models don't support structured output
      supports_function_calling: false,
    }
  }

  async generateCompletion(
    messages: LLMMessage[],
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse> {
    const {
      temperature = 0.1,
      max_tokens = 4000,
      timeout = 60000,
    } = options

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const requestBody = {
      model: this.config.model || 'local-model',
      messages,
      temperature,
      max_tokens,
    }

    try {
      const response = await fetch(`${this.config.base_url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`LM Studio API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      
      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model || this.config.model || 'local-model',
        usage: data.usage,
        finish_reason: data.choices[0]?.finish_reason,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out')
      }
      throw error
    }
  }
}

// Ollama adapter
export class OllamaAdapter extends LLMAdapter {
  protected config: OllamaConfig

  constructor(config: OllamaConfig) {
    super(config)
    this.config = config
  }

  getModelInfo(): LLMModelInfo {
    return {
      id: this.config.model,
      name: `Ollama ${this.config.model}`,
      provider: 'ollama',
      context_length: 32768, // Varies by model
      supports_json_mode: false,
      supports_function_calling: false,
    }
  }

  async generateCompletion(
    messages: LLMMessage[],
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse> {
    const {
      temperature = 0.1,
      timeout = 60000,
    } = options

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Convert messages to Ollama format
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n')

    const requestBody = {
      model: this.config.model,
      prompt,
      options: {
        temperature,
      },
      stream: false,
    }

    try {
      const response = await fetch(`${this.config.base_url}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      
      return {
        content: data.response || '',
        model: this.config.model,
        usage: {
          prompt_tokens: data.prompt_eval_count || 0,
          completion_tokens: data.eval_count || 0,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        finish_reason: data.done ? 'stop' : 'length',
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out')
      }
      throw error
    }
  }
}

// Factory function to create adapters
export function createLLMAdapter(config: LLMConfig): LLMAdapter {
  switch (config.provider) {
    case 'openai':
      return new OpenAIAdapter(config)
    case 'anthropic':
      return new AnthropicAdapter(config)
    case 'lmstudio':
      return new LMStudioAdapter(config)
    case 'ollama':
      return new OllamaAdapter(config)
    default:
      throw new Error(`Unsupported LLM provider: ${(config as any).provider}`)
  }
}