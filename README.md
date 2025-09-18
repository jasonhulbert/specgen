# Feature Spec Agent

A lightweight chat agent that converts high-level feature requirements into concise, actionable specifications.

## Features

- **Business-voice user stories** with acceptance criteria
- **Ambiguity detection** and clarifying questions
- **Assumptions and dependencies** identification
- **Edge cases** enumeration
- **Functional requirements** extraction
- **Implementation tasks** breakdown (FE/BE/Infra/QA/Docs)
- **T-shirt sizing** and complexity estimation
- **Project context management** with versioning
- **Local LLM integration** (LM Studio compatible)

## Tech Stack

- **Next.js 15** with TypeScript
- **TailwindCSS v4** for styling
- **IndexedDB** for client-side storage
- **Zod** for schema validation
- **Local LM Studio** integration (OpenAI-compatible API)

## Getting Started

### Prerequisites

1. **Node.js 18+** and npm
2. **LM Studio** running locally on port 1234 (optional, for AI features)

### Installation

1. Clone and install dependencies:
```bash
git clone <repository-url>
cd specgen
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### LM Studio Setup (Optional)

For AI-powered specification generation:

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Load a compatible model (e.g., GPT-style models)
3. Start the local server on port 1234
4. The application will automatically detect and use the local LLM

## Usage

### 1. Create a Project

- Click "Create First Project" or "Create New Project"
- Enter a project name and description
- The system creates a default project context

### 2. Input Feature Requirements

- Select your project
- Enter feature title and description
- Optionally add stakeholders, constraints, and non-functional requirements
- Click "Generate Draft Spec"

### 3. Handle Clarifying Questions

If the input has high ambiguity (score > 60%), the system will:
- Present 3-5 targeted clarifying questions
- Allow you to answer questions to reduce ambiguity
- Generate a refined specification based on your answers
- Option to skip questions and generate with current information

### 4. Review Generated Specification

The output includes multiple tabs:
- **Summary**: Overview and estimation
- **User Story**: As-a/I-want/So-that format with acceptance criteria
- **Requirements**: Functional requirements and clarifications needed
- **Tasks**: Implementation breakdown by area (FE/BE/Infra/QA/Docs)
- **Risks & Edge Cases**: Risk mitigations and edge case considerations
- **Context**: Resolved project context used for generation
- **JSON**: Raw structured output for export

## Architecture

### Data Model

The application uses IndexedDB with the following entities:
- `projects` - Project definitions
- `project_contexts` - Versioned context configurations
- `spec_inputs` - Feature input records
- `spec_outputs` - Generated specifications
- `spec_evaluations` - Quality assessments

### API Routes

- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/[id]` - Get project details
- `GET /api/projects/[id]/context` - Get project context
- `POST /api/projects/[id]/context` - Update project context
- `POST /api/specs/generate` - Generate specification
- `POST /api/specs/refine` - Refine with clarifying answers

### Project Context System

Projects maintain versioned contexts including:
- **Glossary** - Domain terms and definitions
- **Stakeholders** - Names, roles, and interests
- **Constraints** - Technical and business limitations
- **Non-functional Requirements** - Performance, security, etc.
- **API Catalog** - Available services and endpoints
- **Data Models** - Entity definitions
- **Environment Profiles** - Local/dev/test/prod configs
- **Labels** - Jira components, service mappings

### Merging Rules

1. **Project defaults** (from active context version)
2. **Feature-level overrides** (provided with input)

Feature overrides always take precedence over project defaults.

## Output Schema

The system generates structured JSON output following a comprehensive schema:

```typescript
interface SpecOutput {
  input: SpecInput
  resolved_context: ResolvedContext
  story: UserStory
  needs_clarification: Clarification[]
  assumptions: string[]
  dependencies: string[]
  edge_cases: string[]
  functional_requirements: FunctionalRequirement[]
  tasks: Task[]
  estimation: Estimation
  risks: Risk[]
}
```

## Development

### Project Structure

```
src/
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   └── page.tsx        # Main application
├── components/         # React components
│   ├── ui/            # Base UI components
│   └── *.tsx          # Feature components
├── lib/               # Core services
│   ├── database.ts    # IndexedDB operations
│   ├── llm.ts         # LLM integration
│   └── projectContext.ts # Context management
└── types/             # TypeScript definitions
    ├── schemas.ts     # Zod schemas
    └── database.ts    # Database types
```

### Key Services

- **DatabaseService** - IndexedDB operations with versioning
- **LLMService** - Local LLM integration with structured output
- **ProjectContextService** - Context merging and versioning

### Testing

```bash
npm run lint        # ESLint checking
npm run type-check  # TypeScript validation
```

## Roadmap

### Completed (V0)
- ✅ Core specification generation
- ✅ Project and context management
- ✅ Clarifying questions flow
- ✅ Two-pane UI with tabbed output
- ✅ Ambiguity detection
- ✅ T-shirt sizing estimation

### Future Enhancements (V1+)
- 🔲 Project context editor UI
- 🔲 Evaluation and scoring system
- 🔲 Jira export functionality
- 🔲 Specification refinement UI
- 🔲 Context versioning UI
- 🔲 Offline evaluation harness
- 🔲 Multi-turn conversation improvements

## Configuration

### LLM Provider Configuration

Default configuration for LM Studio:

```typescript
{
  id: 'gpt-oss-20b',
  provider: 'local',
  name: 'GPT 20B LM Studio',
  base_url: 'http://localhost:1234',
  is_openai_compatible: true,
  model: 'openai/gpt-oss-20b'
}
```

### Ambiguity Detection

The system calculates ambiguity scores based on:
- Input length (shorter = more ambiguous)
- Presence of specific numbers/dates
- Vague language patterns
- Pronoun density
- Missing context elements

Scores > 0.6 trigger clarifying questions in draft mode.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details