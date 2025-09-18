import { z } from 'zod'

// Input Schema
export const InputContextSchema = z.object({
  product_area: z.string().optional(),
  stakeholders: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  non_functional: z.array(z.string()).default([]),
  links: z.array(z.string().url()).default([]),
  inherit_from_project: z.boolean().default(true),
  overrides: z.record(z.any()).default({}),
})

export const SpecInputSchema = z.object({
  project_id: z.string(),
  title: z.string(),
  description: z.string(),
  context: InputContextSchema,
})

// Resolved Context Schema
export const StakeholderSchema = z.object({
  name: z.string(),
  role: z.string(),
  interests: z.array(z.string()),
})

export const ApiEndpointSchema = z.object({
  name: z.string(),
  baseUrl: z.string(),
  endpoints: z.array(z.string()),
})

export const DataModelFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
})

export const DataModelSchema = z.object({
  entity: z.string(),
  fields: z.array(DataModelFieldSchema),
})

export const ResolvedContextSchema = z.object({
  glossary: z.record(z.string()).default({}),
  stakeholders: z.array(StakeholderSchema).default([]),
  constraints: z.array(z.string()).default([]),
  non_functional: z.array(z.string()).default([]),
  api_catalog: z.array(ApiEndpointSchema).default([]),
  data_models: z.array(DataModelSchema).default([]),
  envs: z.array(z.string()).default(['local', 'dev', 'test', 'prod']),
  labels: z.record(z.string()).default({}),
})

// Output Schema Components
export const UserStorySchema = z.object({
  as_a: z.string(),
  i_want: z.string(),
  so_that: z.string(),
  acceptance_criteria: z.array(z.string()),
})

export const ClarificationSchema = z.object({
  topic: z.string(),
  question: z.string(),
  why_it_matters: z.string(),
})

export const FunctionalRequirementSchema = z.object({
  id: z.string(),
  statement: z.string(),
})

export const TaskAreaEnum = z.enum(['FE', 'BE', 'Infra', 'QA', 'Docs'])

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  area: TaskAreaEnum,
  details: z.string(),
  prereqs: z.array(z.string()).default([]),
  artifacts: z.array(z.string()).default([]),
})

export const ComplexityEnum = z.enum(['XS', 'S', 'M', 'L', 'XL'])

export const EstimationSchema = z.object({
  confidence: z.number().min(0).max(1),
  complexity: ComplexityEnum,
  drivers: z.array(z.string()),
  notes: z.string(),
})

export const RiskSchema = z.object({
  risk: z.string(),
  mitigation: z.string(),
})

// Full Output Schema
export const SpecOutputSchema = z.object({
  input: SpecInputSchema,
  resolved_context: ResolvedContextSchema,
  story: UserStorySchema,
  needs_clarification: z.array(ClarificationSchema).default([]),
  assumptions: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  edge_cases: z.array(z.string()).default([]),
  functional_requirements: z.array(FunctionalRequirementSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
  estimation: EstimationSchema,
  risks: z.array(RiskSchema).default([]),
})

// Clarifying Questions Schema
export const ClarifyingQuestionsSchema = z.object({
  questions: z.array(ClarificationSchema),
  estimated_confidence: z.number().min(0).max(1),
})

// Export types
export type InputContext = z.infer<typeof InputContextSchema>
export type SpecInput = z.infer<typeof SpecInputSchema>
export type Stakeholder = z.infer<typeof StakeholderSchema>
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>
export type DataModelField = z.infer<typeof DataModelFieldSchema>
export type DataModel = z.infer<typeof DataModelSchema>
export type ResolvedContext = z.infer<typeof ResolvedContextSchema>
export type UserStory = z.infer<typeof UserStorySchema>
export type Clarification = z.infer<typeof ClarificationSchema>
export type FunctionalRequirement = z.infer<typeof FunctionalRequirementSchema>
export type TaskArea = z.infer<typeof TaskAreaEnum>
export type Task = z.infer<typeof TaskSchema>
export type Complexity = z.infer<typeof ComplexityEnum>
export type Estimation = z.infer<typeof EstimationSchema>
export type Risk = z.infer<typeof RiskSchema>
export type SpecOutput = z.infer<typeof SpecOutputSchema>
export type ClarifyingQuestions = z.infer<typeof ClarifyingQuestionsSchema>