import { openDB, IDBPDatabase } from 'idb'
import { v4 as uuidv4 } from 'uuid'
import {
  Project,
  ProjectContext,
  ProjectContextDiff,
  SpecInputRecord,
  SpecOutputRecord,
  SpecRevision,
  SpecEvaluation,
} from '@/types/database'

const DB_NAME = 'specgen'
const DB_VERSION = 1

// Database interface
interface SpecGenDB {
  projects: {
    key: string
    value: Project
    indexes: { 'by-created': Date }
  }
  project_contexts: {
    key: string
    value: ProjectContext
    indexes: { 'by-project-active': [string, number]; 'by-project-created': [string, Date] }
  }
  project_context_diffs: {
    key: string
    value: ProjectContextDiff
    indexes: { 'by-context': string }
  }
  spec_inputs: {
    key: string
    value: SpecInputRecord
    indexes: { 'by-project-created': [string, Date] }
  }
  spec_outputs: {
    key: string
    value: SpecOutputRecord
    indexes: { 'by-input': string; 'by-created': Date }
  }
  spec_revisions: {
    key: string
    value: SpecRevision
    indexes: { 'by-output': string }
  }
  spec_evaluations: {
    key: string
    value: SpecEvaluation
    indexes: { 'by-output': string }
  }
}

// Database instance
let dbInstance: IDBPDatabase<SpecGenDB> | null = null

// Initialize database
export async function initDB(): Promise<IDBPDatabase<SpecGenDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<SpecGenDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Projects store
      const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
      projectStore.createIndex('by-created', 'created_at')

      // Project contexts store
      const contextStore = db.createObjectStore('project_contexts', { keyPath: 'id' })
      contextStore.createIndex('by-project-active', ['project_id', 'is_active'])
      contextStore.createIndex('by-project-created', ['project_id', 'created_at'])

      // Project context diffs store
      const diffStore = db.createObjectStore('project_context_diffs', { keyPath: 'id' })
      diffStore.createIndex('by-context', 'project_context_id')

      // Spec inputs store
      const inputStore = db.createObjectStore('spec_inputs', { keyPath: 'id' })
      inputStore.createIndex('by-project-created', ['project_id', 'created_at'])

      // Spec outputs store
      const outputStore = db.createObjectStore('spec_outputs', { keyPath: 'id' })
      outputStore.createIndex('by-input', 'input_id')
      outputStore.createIndex('by-created', 'created_at')

      // Spec revisions store
      const revisionStore = db.createObjectStore('spec_revisions', { keyPath: 'id' })
      revisionStore.createIndex('by-output', 'output_id')

      // Spec evaluations store
      const evalStore = db.createObjectStore('spec_evaluations', { keyPath: 'id' })
      evalStore.createIndex('by-output', 'output_id')
    },
  })

  return dbInstance
}

// Database operations
export class DatabaseService {
  private db: IDBPDatabase<SpecGenDB>

  constructor(db: IDBPDatabase<SpecGenDB>) {
    this.db = db
  }

  // Projects
  async createProject(data: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
    const project: Project = {
      ...data,
      id: uuidv4(),
      created_at: new Date(),
    }
    await this.db.add('projects', project)
    return project
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.db.get('projects', id)
  }

  async getProjects(): Promise<Project[]> {
    return this.db.getAllFromIndex('projects', 'by-created')
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const project = await this.getProject(id)
    if (!project) throw new Error('Project not found')
    
    const updated = { ...project, ...updates }
    await this.db.put('projects', updated)
  }

  // Project Contexts
  async createProjectContext(data: Omit<ProjectContext, 'id' | 'created_at'>): Promise<ProjectContext> {
    const context: ProjectContext = {
      ...data,
      id: uuidv4(),
      created_at: new Date(),
    }
    
    // If this is active, deactivate others
    if (context.is_active) {
      await this.deactivateProjectContexts(context.project_id)
    }
    
    await this.db.add('project_contexts', context)
    return context
  }

  async getActiveProjectContext(projectId: string): Promise<ProjectContext | undefined> {
    const contexts = await this.db.getAllFromIndex('project_contexts', 'by-project-active', [projectId, 1])
    return contexts[0]
  }

  async getProjectContexts(projectId: string): Promise<ProjectContext[]> {
    return this.db.getAllFromIndex('project_contexts', 'by-project-created', [projectId])
  }

  async activateProjectContext(contextId: string): Promise<void> {
    const context = await this.db.get('project_contexts', contextId)
    if (!context) throw new Error('Context not found')
    
    // Deactivate others
    await this.deactivateProjectContexts(context.project_id)
    
    // Activate this one
    context.is_active = 1
    await this.db.put('project_contexts', context)
  }

  private async deactivateProjectContexts(projectId: string): Promise<void> {
    const activeContexts = await this.db.getAllFromIndex('project_contexts', 'by-project-active', [projectId, 1])
    
    for (const context of activeContexts) {
      context.is_active = 0
      await this.db.put('project_contexts', context)
    }
  }

  // Spec Inputs
  async createSpecInput(data: Omit<SpecInputRecord, 'id' | 'created_at'>): Promise<SpecInputRecord> {
    const input: SpecInputRecord = {
      ...data,
      id: uuidv4(),
      created_at: new Date(),
    }
    await this.db.add('spec_inputs', input)
    return input
  }

  async getSpecInput(id: string): Promise<SpecInputRecord | undefined> {
    return this.db.get('spec_inputs', id)
  }

  async getSpecInputsByProject(projectId: string): Promise<SpecInputRecord[]> {
    return this.db.getAllFromIndex('spec_inputs', 'by-project-created', [projectId])
  }

  // Spec Outputs
  async createSpecOutput(data: Omit<SpecOutputRecord, 'id' | 'created_at'>): Promise<SpecOutputRecord> {
    const output: SpecOutputRecord = {
      ...data,
      id: uuidv4(),
      created_at: new Date(),
    }
    await this.db.add('spec_outputs', output)
    return output
  }

  async getSpecOutput(id: string): Promise<SpecOutputRecord | undefined> {
    return this.db.get('spec_outputs', id)
  }

  async getSpecOutputByInput(inputId: string): Promise<SpecOutputRecord | undefined> {
    const outputs = await this.db.getAllFromIndex('spec_outputs', 'by-input', inputId)
    return outputs[0] // Return latest
  }

  async getRecentSpecOutputs(limit = 10): Promise<SpecOutputRecord[]> {
    const outputs = await this.db.getAllFromIndex('spec_outputs', 'by-created')
    return outputs.slice(-limit).reverse()
  }

  // Spec Evaluations
  async createSpecEvaluation(data: Omit<SpecEvaluation, 'id' | 'created_at'>): Promise<SpecEvaluation> {
    const evaluation: SpecEvaluation = {
      ...data,
      id: uuidv4(),
      created_at: new Date(),
    }
    await this.db.add('spec_evaluations', evaluation)
    return evaluation
  }

  async getSpecEvaluation(outputId: string): Promise<SpecEvaluation | undefined> {
    const evaluations = await this.db.getAllFromIndex('spec_evaluations', 'by-output', outputId)
    return evaluations[0]
  }
}

// Global database service instance
let dbService: DatabaseService | null = null

export async function getDBService(): Promise<DatabaseService> {
  if (!dbService) {
    const db = await initDB()
    dbService = new DatabaseService(db)
  }
  return dbService
}