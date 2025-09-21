import { ResolvedContext, InputContext } from '@/types/schemas';
import { getDBService } from '@/lib/database';

// Deep merge utility for context merging
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
        if (source[key] !== undefined) {
            if (Array.isArray(source[key])) {
                result[key] = source[key] as T[Extract<keyof T, string>];
            } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                result[key] = deepMerge(result[key] || {}, source[key]) as T[Extract<keyof T, string>];
            } else {
                result[key] = source[key] as T[Extract<keyof T, string>];
            }
        }
    }

    return result;
}

// Context difference calculation
function calculateDiff(previous: ResolvedContext, current: ResolvedContext): Record<string, unknown> {
    const diff: Record<string, unknown> = {};

    // Simple field-by-field comparison
    for (const key in current) {
        if (
            JSON.stringify(previous[key as keyof ResolvedContext]) !==
            JSON.stringify(current[key as keyof ResolvedContext])
        ) {
            diff[key] = {
                previous: previous[key as keyof ResolvedContext],
                current: current[key as keyof ResolvedContext]
            };
        }
    }

    return diff;
}

// Default context template
export const DEFAULT_PROJECT_CONTEXT: ResolvedContext = {
    glossary: {},
    stakeholders: [],
    constraints: [],
    non_functional: [],
    api_catalog: [],
    data_models: [],
    envs: ['local', 'dev', 'test', 'prod'],
    labels: {}
};

// Context merging service
export class ProjectContextService {
    // Resolve final context by merging project defaults with feature overrides
    async resolveContext(projectId: string, featureContext?: InputContext): Promise<ResolvedContext> {
        const dbService = await getDBService();

        // Get active project context (defaults)
        const activeContext = await dbService.getActiveProjectContext(projectId);
        const projectDefaults = activeContext?.context_json || DEFAULT_PROJECT_CONTEXT;

        // If no feature context or inherit_from_project is false, return project defaults
        if (!featureContext || !featureContext.inherit_from_project) {
            return projectDefaults;
        }

        // Merge project defaults with feature overrides
        let resolvedContext = { ...projectDefaults };

        // Apply feature-level context fields
        if (featureContext.stakeholders?.length) {
            const existingStakeholders = resolvedContext.stakeholders.map((s) => s.name);
            const newStakeholderNames = featureContext.stakeholders.filter(
                (name) => !existingStakeholders.includes(name)
            );

            // Add new stakeholders with basic info
            const newStakeholders = newStakeholderNames.map((name) => ({
                name,
                role: 'Stakeholder',
                interests: []
            }));

            resolvedContext.stakeholders = [...resolvedContext.stakeholders, ...newStakeholders];
        }

        if (featureContext.constraints?.length) {
            const uniqueConstraints = new Set([...resolvedContext.constraints, ...featureContext.constraints]);
            resolvedContext.constraints = Array.from(uniqueConstraints);
        }

        if (featureContext.non_functional?.length) {
            const uniqueNonFunctional = new Set([...resolvedContext.non_functional, ...featureContext.non_functional]);
            resolvedContext.non_functional = Array.from(uniqueNonFunctional);
        }

        // Apply explicit overrides (feature overrides always win)
        if (featureContext.overrides) {
            resolvedContext = deepMerge(resolvedContext, featureContext.overrides as Partial<ResolvedContext>);
        }

        return resolvedContext;
    }

    // Create a new project context version
    async createProjectContext(projectId: string, context: ResolvedContext, isActive: boolean = false) {
        const dbService = await getDBService();

        // Get current version number
        const existingContexts = await dbService.getProjectContexts(projectId);
        const nextVersion = existingContexts.length > 0 ? Math.max(...existingContexts.map((c) => c.version)) + 1 : 1;

        // Create new context
        const newContext = await dbService.createProjectContext({
            project_id: projectId,
            context_json: context,
            version: nextVersion,
            is_active: isActive ? 1 : 0
        });

        // Create diff if there's a previous version
        if (existingContexts.length > 0) {
            const previousContext = existingContexts[existingContexts.length - 1];
            const diff = calculateDiff(previousContext.context_json, context);

            if (Object.keys(diff).length > 0) {
                // Store the diff (if needed for history tracking)
                // await dbService.createProjectContextDiff(...)
            }
        }

        return newContext;
    }

    // Update and version a project context
    async updateProjectContext(projectId: string, updates: Partial<ResolvedContext>, createNewVersion: boolean = true) {
        const dbService = await getDBService();

        // Get current active context
        const activeContext = await dbService.getActiveProjectContext(projectId);
        if (!activeContext) {
            throw new Error('No active context found for project');
        }

        // Merge updates
        const updatedContext = deepMerge(activeContext.context_json, updates);

        if (createNewVersion) {
            // Create new version
            return this.createProjectContext(projectId, updatedContext, true);
        } else {
            // Update in place (rare case) - create new version instead
            return this.createProjectContext(projectId, updatedContext, true);
        }
    }

    // Get context history with diffs
    async getContextHistory(projectId: string) {
        const dbService = await getDBService();
        const contexts = await dbService.getProjectContexts(projectId);

        // Sort by version
        contexts.sort((a, b) => a.version - b.version);

        // Calculate diffs between versions
        const history = contexts.map((context, index) => {
            let diff = {};
            if (index > 0) {
                diff = calculateDiff(contexts[index - 1].context_json, context.context_json);
            }

            return {
                ...context,
                diff,
                is_current: context.is_active === 1
            };
        });

        return history;
    }

    // Activate a specific context version
    async activateContextVersion(contextId: string) {
        const dbService = await getDBService();
        await dbService.activateProjectContext(contextId);
    }

    // Preview resolved context without saving
    async previewResolvedContext(
        projectId: string,
        featureContext: InputContext
    ): Promise<{
        resolved: ResolvedContext;
        inherited_from_project: Partial<ResolvedContext>;
        feature_overrides: Partial<ResolvedContext>;
    }> {
        const dbService = await getDBService();

        const activeContext = await dbService.getActiveProjectContext(projectId);
        const projectDefaults = activeContext?.context_json || DEFAULT_PROJECT_CONTEXT;

        const resolved = await this.resolveContext(projectId, featureContext);

        // Calculate what came from where for transparency
        const inherited = { ...projectDefaults };
        const overrides = featureContext.overrides || {};

        return {
            resolved,
            inherited_from_project: inherited,
            feature_overrides: overrides
        };
    }

    // Validate context completeness
    validateContext(context: ResolvedContext): {
        isValid: boolean;
        warnings: string[];
        suggestions: string[];
    } {
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Check for common missing elements
        if (Object.keys(context.glossary).length === 0) {
            suggestions.push('Consider adding domain terms to the glossary');
        }

        if (context.stakeholders.length === 0) {
            warnings.push('No stakeholders defined - this may lead to unclear requirements');
        }

        if (context.constraints.length === 0) {
            suggestions.push('Consider adding technical or business constraints');
        }

        if (context.non_functional.length === 0) {
            suggestions.push('Consider adding non-functional requirements (performance, security, etc.)');
        }

        if (context.api_catalog.length === 0) {
            suggestions.push('Consider documenting existing APIs and services');
        }

        // Check stakeholder completeness
        const incompleteStakeholders = context.stakeholders.filter((s) => !s.role || s.interests.length === 0);
        if (incompleteStakeholders.length > 0) {
            warnings.push(`${incompleteStakeholders.length} stakeholder(s) missing role or interests`);
        }

        const isValid = warnings.length === 0;

        return { isValid, warnings, suggestions };
    }

    // Import context from external source (Jira, Confluence, etc.)
    async importContext(
        projectId: string,
        source: 'jira' | 'confluence' | 'json',
        data: unknown
    ): Promise<ResolvedContext> {
        // Placeholder for external integrations
        switch (source) {
            case 'json':
                // Validate and import JSON context
                const imported = data as ResolvedContext;
                return this.createProjectContext(projectId, imported, false).then((c) => c.context_json);

            case 'jira':
                // Extract context from Jira project metadata
                // This would integrate with Jira API to extract components, users, etc.
                throw new Error('Jira import not yet implemented');

            case 'confluence':
                // Extract context from Confluence space
                throw new Error('Confluence import not yet implemented');

            default:
                throw new Error(`Unknown import source: ${source}`);
        }
    }
}

// Default service instance
export const projectContextService = new ProjectContextService();
