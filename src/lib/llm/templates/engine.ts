/**
 * Lightweight template engine for LLM prompts
 * Supports variable interpolation with {{variable}} syntax
 * Handles nested objects and arrays through dot notation
 */

import systemTemplate from './system.template'
import specGenerationTemplate from './spec-generation.template'
import clarifyingQuestionsTemplate from './clarifying-questions.template'
import refineSpecTemplate from './refine-spec.template'

export interface TemplateContext {
  [key: string]: any
}

export class TemplateEngine {
  private templates: Map<string, string> = new Map()
  private templateCache: Map<string, string> = new Map()

  constructor() {
    this.loadTemplates()
  }

  /**
   * Load all templates from template files
   */
  private loadTemplates(): void {
    this.templates.set('system', systemTemplate)
    this.templates.set('spec-generation', specGenerationTemplate)
    this.templates.set('clarifying-questions', clarifyingQuestionsTemplate)
    this.templates.set('refine-spec', refineSpecTemplate)
  }

  /**
   * Render a template with the given context
   */
  render(templateName: string, context: TemplateContext = {}): string {
    const template = this.templates.get(templateName)
    if (!template) {
      throw new Error(`Template '${templateName}' not found`)
    }

    // Check cache first
    const cacheKey = `${templateName}:${JSON.stringify(context)}`
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!
    }

    const rendered = this.interpolate(template, context)
    
    // Cache the rendered result
    this.templateCache.set(cacheKey, rendered)
    
    return rendered
  }

  /**
   * Interpolate variables in template string
   * Supports {{variable}}, {{object.property}}, and {{array.0}} syntax
   */
  private interpolate(template: string, context: TemplateContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      const trimmed = expression.trim()
      
      // Handle special functions
      if (trimmed.startsWith('JSON.stringify(') && trimmed.endsWith(')')) {
        const variable = trimmed.slice(15, -1).trim()
        const value = this.getNestedValue(context, variable)
        return JSON.stringify(value, null, 2)
      }

      // Handle date formatting
      if (trimmed === 'today_id') {
        return new Date().toISOString().split('T')[0].replace(/-/g, '')
      }

      if (trimmed === 'today_date') {
        return new Date().toISOString().split('T')[0]
      }

      // Regular variable interpolation
      const value = this.getNestedValue(context, trimmed)
      
      if (value === undefined || value === null) {
        console.warn(`Template variable '${trimmed}' not found in context`)
        return match // Keep original placeholder if not found
      }
      
      return String(value)
    })
  }

  /**
   * Get nested value from object using dot notation
   * e.g., "user.profile.name" -> context.user.profile.name
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) {
        return undefined
      }
      
      // Handle array indices
      if (Array.isArray(current) && /^\d+$/.test(key)) {
        return current[parseInt(key, 10)]
      }
      
      return current[key]
    }, obj)
  }

  /**
   * Ensure templates are loaded before rendering
   */
  private ensureTemplatesLoaded(): void {
    if (this.templates.size === 0) {
      this.loadTemplates()
    }
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear()
  }

  /**
   * Get list of available templates
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys())
  }

  /**
   * Validate that a template renders without errors
   */
  validateTemplate(templateName: string, sampleContext: TemplateContext): { valid: boolean; error?: string } {
    try {
      this.render(templateName, sampleContext)
      return { valid: true }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Default instance
export const templateEngine = new TemplateEngine()