/**
 * Template system usage example and testing
 * This file demonstrates how to use the new template system
 */

import { templateEngine, TEMPLATE_NAMES, validateAllTemplates, testTemplateRender } from './index';
import { SpecInput, ResolvedContext } from '@/types/schemas';

// Example usage of the template system
export function exampleUsage() {
    console.log('=== Template System Example ===');

    // 1. Render a simple system prompt
    const systemPrompt = templateEngine.render(TEMPLATE_NAMES.SYSTEM);
    console.log('System Prompt:', systemPrompt.substring(0, 100) + '...');

    // 2. Render spec generation template with context
    const sampleInput: SpecInput = {
        project_id: 'example-project',
        title: 'User Authentication',
        description: 'Implement user login and registration functionality',
        context: {
            stakeholders: ['Product Manager', 'Security Team'],
            constraints: ['Must use OAuth 2.0'],
            non_functional: ['Response time < 2s'],
            links: [],
            inherit_from_project: true,
            overrides: {}
        }
    };

    const sampleContext: ResolvedContext = {
        glossary: { OAuth: 'Open Authorization protocol' },
        stakeholders: [
            { name: 'Product Manager', role: 'PM', interests: ['User experience'] },
            { name: 'Security Team', role: 'Security', interests: ['Data protection'] }
        ],
        constraints: ['Must use OAuth 2.0', 'GDPR compliance'],
        non_functional: ['Response time < 2s', 'Uptime > 99.9%'],
        api_catalog: [],
        data_models: [],
        envs: ['dev', 'test', 'prod'],
        labels: { environment: 'production' }
    };

    const specPrompt = templateEngine.render(TEMPLATE_NAMES.SPEC_GENERATION, {
        system_prompt: systemPrompt,
        resolved_context: sampleContext,
        input: sampleInput,
        mode: 'draft'
    });

    console.log('Spec Generation Prompt (first 300 chars):', specPrompt.substring(0, 300) + '...');

    // 3. Test date interpolation
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    console.log('Today ID generated:', today);
    console.log('Template today_id:', specPrompt.includes(today) ? 'Working!' : 'Not working');

    // 4. Validate all templates
    console.log('\\n=== Template Validation ===');
    const validation = validateAllTemplates();
    validation.forEach((result) => {
        console.log(`${result.template}: ${result.valid ? '✅ Valid' : '❌ Invalid'}`);
        if (!result.valid) {
            console.log(`  Error: ${result.error}`);
        }
    });

    return {
        systemPrompt,
        specPrompt: specPrompt.substring(0, 500),
        validation
    };
}

// Test individual template rendering
export function testIndividualTemplates() {
    console.log('\\n=== Individual Template Tests ===');

    const templates = Object.values(TEMPLATE_NAMES);

    templates.forEach((templateName) => {
        const result = testTemplateRender(templateName);
        console.log(`${templateName}: ${result.success ? '✅' : '❌'}`);
        if (!result.success) {
            console.log(`  Error: ${result.error}`);
        }
    });
}

// Demonstrate template variable extraction
export function demonstrateTemplateAnalysis() {
    console.log('\\n=== Template Analysis ===');

    try {
        // Get the raw template content to analyze variables
        templateEngine.render(TEMPLATE_NAMES.SPEC_GENERATION, {});
        console.log('Spec template analysis complete');
    } catch (error) {
        console.log('Template analysis failed:', error);
    }
}

// Export for easy testing in development
if (typeof window !== 'undefined') {
    // Browser environment - attach to window for console testing
    (window as unknown as Record<string, unknown>).templateExample = {
        exampleUsage,
        testIndividualTemplates,
        demonstrateTemplateAnalysis,
        templateEngine,
        TEMPLATE_NAMES
    };
}
