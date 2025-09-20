/**
 * Template system exports
 * Centralized access to template engine and validation utilities
 */

export { templateEngine, TemplateEngine, type TemplateContext } from './engine'
export { 
  validateAllTemplates, 
  validateTemplateContext, 
  extractTemplateVariables,
  testTemplateRender,
  SAMPLE_CONTEXTS 
} from './validation'

// Re-export template constants for easy access
export const TEMPLATE_NAMES = {
  SYSTEM: 'system',
  SPEC_GENERATION: 'spec-generation', 
  CLARIFYING_QUESTIONS: 'clarifying-questions',
  REFINE_SPEC: 'refine-spec'
} as const

export type TemplateName = typeof TEMPLATE_NAMES[keyof typeof TEMPLATE_NAMES]