/**
 * Template validation utilities
 * Ensures templates are properly formatted and all required variables are available
 */

import { templateEngine, TemplateContext } from './engine';
import { SpecInput, ResolvedContext, SpecOutput } from '@/types/schemas';

// Sample contexts for validation
export const SAMPLE_CONTEXTS = {
    system: {},

    'spec-generation': {
        system_prompt: 'Test system prompt',
        resolved_context: {
            glossary: { API: 'Application Programming Interface' },
            stakeholders: [{ name: 'Product Owner', role: 'PO', interests: ['Features'] }],
            constraints: ['Budget: $10k'],
            non_functional: ['Performance: <2s response'],
            api_catalog: [],
            data_models: [],
            envs: ['dev', 'prod'],
            labels: {}
        } as ResolvedContext,
        input: {
            project_id: 'test-project',
            title: 'Test Feature',
            description: 'A test feature for validation',
            context: {
                stakeholders: ['Product Owner'],
                constraints: [],
                non_functional: [],
                links: [],
                inherit_from_project: true,
                overrides: {}
            }
        } as SpecInput,
        mode: 'draft'
    },

    'clarifying-questions': {
        resolved_context: {
            glossary: {},
            stakeholders: [],
            constraints: [],
            non_functional: [],
            api_catalog: [],
            data_models: [],
            envs: ['dev', 'prod'],
            labels: {}
        } as ResolvedContext,
        input: {
            project_id: 'test-project',
            title: 'Test Feature',
            description: 'A test feature for validation',
            context: {
                stakeholders: [],
                constraints: [],
                non_functional: [],
                links: [],
                inherit_from_project: true,
                overrides: {}
            }
        } as SpecInput
    },

    'refine-spec': {
        system_prompt: 'Test system prompt',
        original_spec: {
            input: {} as SpecInput,
            resolved_context: {} as ResolvedContext,
            story: {
                as_a: 'user',
                i_want: 'to test',
                so_that: 'validation works',
                acceptance_criteria: ['Given test', 'When validation', 'Then success']
            },
            needs_clarification: [],
            assumptions: [],
            dependencies: [],
            edge_cases: [],
            functional_requirements: [],
            tasks: [],
            estimation: {
                confidence: 0.8,
                complexity: 'M' as const,
                drivers: ['Testing'],
                notes: 'Test estimation'
            },
            risks: []
        } as SpecOutput,
        answers_formatted: 'Q: Test question?\nA: Test answer'
    }
};

/**
 * Validate all templates with sample contexts
 */
export function validateAllTemplates(): Array<{ template: string; valid: boolean; error?: string; rendered?: string }> {
    const results = [];

    for (const [templateName, sampleContext] of Object.entries(SAMPLE_CONTEXTS)) {
        try {
            const rendered = templateEngine.render(templateName, sampleContext);
            results.push({
                template: templateName,
                valid: true,
                rendered: rendered.substring(0, 200) + (rendered.length > 200 ? '...' : '')
            });
        } catch (error) {
            results.push({
                template: templateName,
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    return results;
}

/**
 * Extract variables from a template string
 */
export function extractTemplateVariables(templateContent: string): string[] {
    const variables = new Set<string>();
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(templateContent)) !== null) {
        const variable = match[1].trim();

        // Handle special functions
        if (variable.startsWith('JSON.stringify(') && variable.endsWith(')')) {
            const innerVar = variable.slice(15, -1).trim();
            variables.add(innerVar);
        } else if (variable === 'today_id' || variable === 'today_date') {
            // Built-in variables, no context needed
        } else {
            variables.add(variable);
        }
    }

    return Array.from(variables);
}

/**
 * Check if all required variables are present in context
 */
export function validateTemplateContext(
    templateName: string,
    context: TemplateContext
): {
    valid: boolean;
    missingVariables: string[];
    extraVariables: string[];
} {
    try {
        const templateContent = templateEngine.render(templateName, {}); // Get raw template
        const requiredVariables = extractTemplateVariables(templateContent);
        const providedVariables = Object.keys(context);

        const missingVariables = requiredVariables.filter((v) => !(v in context));
        const extraVariables = providedVariables.filter((v) => !requiredVariables.includes(v));

        return {
            valid: missingVariables.length === 0,
            missingVariables,
            extraVariables
        };
    } catch {
        return {
            valid: false,
            missingVariables: [],
            extraVariables: []
        };
    }
}

/**
 * Development helper to test template rendering
 */
export function testTemplateRender(
    templateName: string,
    context?: TemplateContext
): {
    success: boolean;
    result?: string;
    error?: string;
} {
    try {
        const sampleContext = context || SAMPLE_CONTEXTS[templateName as keyof typeof SAMPLE_CONTEXTS] || {};
        const result = templateEngine.render(templateName, sampleContext);

        return {
            success: true,
            result
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
