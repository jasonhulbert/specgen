import { LLMConfig, LLMConfigSchema, createLLMAdapter, LLMAdapter } from './adapters'
import { getDBService } from '../database'

// Predefined configurations for common LLM providers
export const PREDEFINED_CONFIGS: Record<string, LLMConfig> = {
  // Anthropic configurations
  'anthropic-claude-sonnet-4': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    api_key: '', // To be filled by user
  },
  
  // Local configurations
  'lmstudio-local': {
    provider: 'lmstudio',
    base_url: 'http://localhost:1234',
    model: 'local-model',
  },
}

// Configuration manager class
export class LLMConfigManager {
  private configs: Map<string, LLMConfig> = new Map()
  private activeConfigId: string | null = null
  private adapters: Map<string, LLMAdapter> = new Map()
  private initialized = false

  constructor() {
    // Only initialize if we're in the browser
    if (typeof window !== 'undefined') {
      this.initializeAsync()
    }
  }

  // Async initialization
  private async initializeAsync(): Promise<void> {
    if (this.initialized) return
    
    try {
      await this.loadConfigurations()
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize LLM config manager:', error)
      // Fall back to default config
      this.addDefaultConfiguration()
      this.initialized = true
    }
  }

  // Ensure initialization before any operation
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeAsync()
    }
  }

  // Load configurations from IndexedDB
  private async loadConfigurations(): Promise<void> {
    try {
      const dbService = await getDBService()
      const configRecords = await dbService.getAllLLMConfigs()
      
      // Load all configurations
      for (const record of configRecords) {
        try {
          const validatedConfig = LLMConfigSchema.parse(record.config_json)
          this.configs.set(record.id, validatedConfig)
          
          if (record.is_active === 1) {
            this.activeConfigId = record.id
          }
        } catch (error) {
          console.warn(`Invalid configuration for ${record.id}:`, error)
        }
      }
    } catch (error) {
      console.warn('Failed to load LLM configurations from database:', error)
    }

    // If no configs loaded, add default
    if (this.configs.size === 0) {
      this.addDefaultConfiguration()
    }
  }

  // Add default LM Studio configuration
  private addDefaultConfiguration(): void {
    const defaultConfig = PREDEFINED_CONFIGS['lmstudio-local']
    this.configs.set('lmstudio-local', defaultConfig)
    this.activeConfigId = 'lmstudio-local'
    
    // Save to database if we're in browser
    if (typeof window !== 'undefined') {
      this.saveConfigurationToDb('lmstudio-local', defaultConfig, true).catch(console.error)
    }
  }

  // Save configuration to IndexedDB
  private async saveConfigurationToDb(id: string, config: LLMConfig, isActive: boolean = false): Promise<void> {
    try {
      const dbService = await getDBService()
      
      // Check if config already exists
      const existingConfig = await dbService.getLLMConfig(id)
      
      if (existingConfig) {
        // Update existing config
        await dbService.updateLLMConfig(id, {
          config_json: config,
          is_active: isActive ? 1 : 0,
        })
      } else {
        // Create new config
        await dbService.createLLMConfig(id, {
          config_json: config,
          is_active: isActive ? 1 : 0,
        })
      }
    } catch (error) {
      console.error('Failed to save LLM configuration:', error)
    }
  }

  // Add a new configuration
  async addConfiguration(id: string, config: LLMConfig): Promise<void> {
    await this.ensureInitialized()
    
    const validatedConfig = LLMConfigSchema.parse(config)
    this.configs.set(id, validatedConfig)
    
    // Clear cached adapter if it exists
    this.adapters.delete(id)
    
    // Save to database
    await this.saveConfigurationToDb(id, validatedConfig, false)
  }

  // Remove a configuration
  async removeConfiguration(id: string): Promise<void> {
    await this.ensureInitialized()
    
    this.configs.delete(id)
    this.adapters.delete(id)
    
    // Remove from database
    try {
      const dbService = await getDBService()
      await dbService.deleteLLMConfig(id)
    } catch (error) {
      console.error('Failed to delete LLM configuration from database:', error)
    }
    
    if (this.activeConfigId === id) {
      // Set first available config as active
      const firstConfigId = this.configs.keys().next().value
      if (firstConfigId) {
        await this.setActiveConfiguration(firstConfigId)
      } else {
        this.activeConfigId = null
      }
    }
  }

  // Get all configuration IDs and their basic info
  async getAllConfigurations(): Promise<Array<{ id: string; name: string; provider: string; model: string }>> {
    await this.ensureInitialized()
    
    return Array.from(this.configs.entries()).map(([id, config]) => ({
      id,
      name: this.getDisplayName(id, config),
      provider: config.provider,
      model: config.model || 'default',
    }))
  }

  // Get a specific configuration
  async getConfiguration(id: string): Promise<LLMConfig | undefined> {
    await this.ensureInitialized()
    return this.configs.get(id)
  }

  // Set active configuration
  async setActiveConfiguration(id: string): Promise<void> {
    await this.ensureInitialized()
    
    if (!this.configs.has(id)) {
      throw new Error(`Configuration ${id} not found`)
    }
    
    this.activeConfigId = id
    
    // Update database
    try {
      const dbService = await getDBService()
      
      // Deactivate all configs first
      const allConfigs = await dbService.getAllLLMConfigs()
      for (const config of allConfigs) {
        if (config.is_active === 1) {
          await dbService.updateLLMConfig(config.id, { is_active: 0 })
        }
      }
      
      // Activate the selected config
      await dbService.updateLLMConfig(id, { is_active: 1 })
    } catch (error) {
      console.error('Failed to update active configuration in database:', error)
    }
  }

  // Get active configuration
  async getActiveConfiguration(): Promise<{ id: string; config: LLMConfig } | null> {
    await this.ensureInitialized()
    
    if (!this.activeConfigId || !this.configs.has(this.activeConfigId)) {
      return null
    }
    
    return {
      id: this.activeConfigId,
      config: this.configs.get(this.activeConfigId)!,
    }
  }

  // Get or create adapter for a configuration
  async getAdapter(configId?: string): Promise<LLMAdapter> {
    await this.ensureInitialized()
    
    const id = configId || this.activeConfigId
    
    if (!id) {
      throw new Error('No active LLM configuration')
    }

    const config = this.configs.get(id)
    if (!config) {
      throw new Error(`Configuration ${id} not found`)
    }

    // Return cached adapter if available
    if (this.adapters.has(id)) {
      return this.adapters.get(id)!
    }

    // Create new adapter
    const adapter = createLLMAdapter(config)
    this.adapters.set(id, adapter)
    
    return adapter
  }

  // Test connection for a configuration
  async testConfiguration(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const adapter = await this.getAdapter(id)
      const success = await adapter.testConnection()
      return { success }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get display name for a configuration
  private getDisplayName(id: string, config: LLMConfig): string {
    switch (config.provider) {
      case 'openai':
        return `OpenAI ${config.model}`
      case 'anthropic':
        return `Anthropic ${config.model}`
      case 'lmstudio':
        return `LM Studio (${config.model || 'local'})`
      case 'ollama':
        return `Ollama ${config.model}`
      default:
        return id
    }
  }

  // Import configuration from object
  importConfiguration(id: string, configData: any): void {
    const config = LLMConfigSchema.parse(configData)
    this.addConfiguration(id, config)
  }

  // Export configuration
  exportConfiguration(id: string): LLMConfig | null {
    return this.configs.get(id) || null
  }

  // Create configuration from predefined template
  createFromTemplate(templateId: string, customizations?: Record<string, any>): LLMConfig {
    const template = PREDEFINED_CONFIGS[templateId]
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    const merged = { ...template, ...customizations }
    return LLMConfigSchema.parse(merged)
  }

  // Get configurations that require API keys
  getConfigurationsRequiringApiKeys(): string[] {
    return Array.from(this.configs.entries())
      .filter(([_, config]) => this.requiresApiKey(config))
      .map(([id, _]) => id)
  }

  // Check if a configuration requires an API key
  private requiresApiKey(config: LLMConfig): boolean {
    return config.provider === 'openai' || config.provider === 'anthropic'
  }

  // Validate all configurations
  validateAllConfigurations(): Array<{ id: string; valid: boolean; errors: string[] }> {
    return Array.from(this.configs.entries()).map(([id, config]) => {
      try {
        LLMConfigSchema.parse(config)
        
        const errors: string[] = []
        
        // Check for missing API keys
        if (this.requiresApiKey(config) && !(config as any).api_key) {
          errors.push('API key is required')
        }
        
        return { id, valid: errors.length === 0, errors }
      } catch (error) {
        return {
          id,
          valid: false,
          errors: ['Invalid configuration format']
        }
      }
    })
  }
}

// Safe config manager instance that handles SSR
let configManagerInstance: LLMConfigManager | null = null

function getConfigManager(): LLMConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new LLMConfigManager()
  }
  return configManagerInstance
}

// Export safe instance - only create when needed
export const llmConfigManager = getConfigManager()