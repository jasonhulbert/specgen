import { ResolvedContext, SpecInput, SpecOutput } from '@/types/schemas';

// Database entity types
export interface Project {
    id: string;
    name: string;
    description: string;
    created_by?: string;
    created_at: Date;
}

export interface ProjectContext {
    id: string;
    project_id: string;
    context_json: ResolvedContext;
    version: number;
    is_active: number; // 1 for true, 0 for false (IndexedDB compatibility)
    created_at: Date;
}

export interface ProjectContextDiff {
    id: string;
    project_context_id: string;
    diff_json: Record<string, unknown>;
    created_at: Date;
}

export interface SpecInputRecord {
    id: string;
    project_id: string;
    title: string;
    description: string;
    context_json: SpecInput['context'];
    created_by?: string;
    created_at: Date;
}

export interface SpecOutputRecord {
    id: string;
    input_id: string;
    output_json: SpecOutput;
    summary_md: string;
    model_info_json: {
        model: string;
        provider: string;
        timestamp: Date;
        tokens_used?: number;
    };
    created_at: Date;
}

export interface SpecRevision {
    id: string;
    output_id: string;
    diff_json: Record<string, unknown>;
    created_at: Date;
}

export interface SpecEvaluation {
    id: string;
    output_id: string;
    rubric_scores_json: {
        clarity: number; // 0-3
        completeness: number; // 0-3
        actionability: number; // 0-3
        risk_awareness: number; // 0-3
        schema_fidelity: number; // 0-3
    };
    notes?: string;
    created_at: Date;
}

export interface LLMConfigRecord {
    id: string;
    config_json: Record<string, unknown>; // The LLMConfig object
    is_active: number; // 1 for true, 0 for false (IndexedDB compatibility)
    created_at: Date;
    updated_at: Date;
}
