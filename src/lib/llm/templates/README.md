# LLM Prompt Template System

A lightweight, type-safe template system for managing LLM prompts in separate files with variable interpolation.

## Overview

This system replaces manual string concatenation with a structured template approach that provides:

- **Separation of Concerns**: Prompts are stored in dedicated template files
- **Variable Interpolation**: Dynamic content injection with `{{variable}}` syntax  
- **Type Safety**: Full TypeScript support with proper type definitions
- **Validation**: Built-in template validation and error checking
- **Caching**: Automatic template caching for performance
- **Maintainability**: Easy to edit, version, and test prompts

## Structure

```
src/lib/llm/templates/
├── engine.ts              # Core template engine
├── validation.ts          # Validation utilities
├── index.ts              # Main exports
├── example.ts            # Usage examples
├── system.template.ts    # System prompt template
├── spec-generation.template.ts  # Spec generation template  
├── clarifying-questions.template.ts  # Clarifying questions template
└── refine-spec.template.ts  # Spec refinement template
```

## Usage

### Basic Template Rendering

```typescript
import { templateEngine, TEMPLATE_NAMES } from '@/lib/llm/templates'

// Render system prompt
const systemPrompt = templateEngine.render(TEMPLATE_NAMES.SYSTEM)

// Render with context
const specPrompt = templateEngine.render(TEMPLATE_NAMES.SPEC_GENERATION, {
  system_prompt: systemPrompt,
  resolved_context: contextData,
  input: inputData,
  mode: 'draft'
})
```

### Template Variables

Templates support several interpolation patterns:

- **Simple variables**: `{{variable}}`
- **Nested objects**: `{{object.property}}`
- **JSON serialization**: `{{JSON.stringify(data)}}`
- **Built-in dates**: `{{today_id}}` (YYYYMMDD), `{{today_date}}` (YYYY-MM-DD)

### Creating New Templates

1. Create a new `.template.ts` file:
```typescript
// my-template.template.ts
export default `Hello {{name}}!
Your data: {{JSON.stringify(data)}}
Generated on: {{today_date}}`
```

2. Register in the engine:
```typescript
// In engine.ts constructor
import myTemplate from './my-template.template'
this.templates.set('my-template', myTemplate)
```

3. Add to template names:
```typescript
// In index.ts
export const TEMPLATE_NAMES = {
  // ... existing templates
  MY_TEMPLATE: 'my-template'
} as const
```

### Validation

```typescript
import { validateAllTemplates, testTemplateRender } from '@/lib/llm/templates'

// Validate all templates
const results = validateAllTemplates()
results.forEach(result => {
  console.log(`${result.template}: ${result.valid ? 'Valid' : 'Invalid'}`)
})

// Test specific template
const testResult = testTemplateRender('spec-generation', customContext)
```

## Template Files

### system.template.ts
Contains the base system prompt with guidelines and role definition.

### spec-generation.template.ts  
Main template for generating specifications. Includes:
- System prompt injection
- Context and input data
- Schema requirements
- Example structure
- Response format instructions

### clarifying-questions.template.ts
Template for generating clarifying questions to reduce ambiguity.

### refine-spec.template.ts
Template for refining specifications based on user feedback.

## Benefits Over Manual String Building

### Before (Manual)
```typescript
private buildSpecPrompt(input: SpecInput, context: ResolvedContext, mode: string): string {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
  return `${SYSTEM_PROMPT}

RESOLVED PROJECT CONTEXT:
${JSON.stringify(context, null, 2)}

USER INPUT:  
${JSON.stringify(input, null, 2)}

INSTRUCTIONS:
Generate a ${mode} specification using stable IDs prefixed with "${today}"...`
}
```

### After (Template-based)
```typescript
private buildSpecPrompt(input: SpecInput, context: ResolvedContext, mode: string): string {
  const systemPrompt = templateEngine.render(TEMPLATE_NAMES.SYSTEM)
  return templateEngine.render(TEMPLATE_NAMES.SPEC_GENERATION, {
    system_prompt: systemPrompt,
    resolved_context: context,
    input: input,
    mode: mode
  })
}
```

## Integration with LLMService

The `LLMService` class has been updated to use templates:

```typescript
// Generate specification
const prompt = this.buildSpecPrompt(input, resolvedContext, mode)
const response = await this.callLLM(prompt, SpecOutputSchema, options)

// Validate templates (development)
const validation = llmService.validateTemplates()
```

## Development Tools

### Console Testing (Browser)
```javascript
// Available in browser console
templateExample.exampleUsage()
templateExample.testIndividualTemplates()
```

### Template Analysis
```typescript
import { extractTemplateVariables, validateTemplateContext } from '@/lib/llm/templates'

// Extract variables from template
const variables = extractTemplateVariables(templateContent)

// Validate context completeness  
const validation = validateTemplateContext('spec-generation', context)
```

## Performance

- **Template Caching**: Rendered templates are cached automatically
- **Import Optimization**: Templates are bundled at build time
- **Type Safety**: Zero runtime type checking overhead

## Future Enhancements

Potential improvements:
- Template versioning and migration
- Conditional template sections
- Template composition and inheritance  
- External template loading (for dynamic prompts)
- A/B testing support for prompt variations

## Migration Guide

To migrate existing prompt building:

1. Extract prompt strings to `.template.ts` files
2. Replace string concatenation with `templateEngine.render()`
3. Update variable references to use `{{variable}}` syntax
4. Add template validation to tests
5. Remove old static prompt constants