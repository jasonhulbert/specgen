# Feature Spec Agent — Comprehensive Research & Build Plan

*Last updated: Sept 17, 2025*

---

## Problem & Goals

Build a lightweight chat agent that converts a high‑level feature/requirement into a concise, actionable mini‑spec. The agent should:

* Produce a **business‑voice user story**
* Flag **ambiguities** and **open questions**
* List **assumptions** and **dependencies**
* Enumerate **edge cases**
* Extract **functional requirements**
* Propose **implementation tasks** (optionally grouped by FE/BE/Infra)

Stretch goals:

* Ask **targeted clarifying questions** before finalizing
* Attach **estimation primitives** (t‑shirt sizes, rough complexity drivers)
* Export to **Jira**/**Azure Boards**/**Linear**; PRD sync (optional)
* **Shared project context:** allow cross‑feature defaults (stakeholders, domain terms, APIs, constraints) to be referenced and reused across many specs.

---

## Tech Stack

- Next.js (version ^15), Typescript
- IndexedDB for datastorage
- TailwindCSS (version ^4) for styling

---

## LLM Providers

### Local LLM Studio

- **id:** gpt-oss-20b
- **provider**: "local"
- **name**: GPT 20B LM Studio
- **base_url**: http://localhost:1234
- **is_openai_compatible**: true
- **model**: openai/gpt-oss-20b

## Output Contract (Structured Schema)

Use structured output so downstream tools/Jira exports are trivial.

```json
{
  "input": {
    "project_id": "string",
    "title": "string",
    "description": "string",
    "context": {
      "product_area": "string",
      "stakeholders": ["string"],
      "constraints": ["string"],
      "non_functional": ["string"],
      "links": ["url"],
      "inherit_from_project": true,
      "overrides": { "key": "value" }
    }
  },
  "resolved_context": {
    "glossary": {"term": "definition"},
    "stakeholders": [{"name":"string","role":"string","interests":["string"]}],
    "constraints": ["string"],
    "non_functional": ["string"],
    "api_catalog": [{"name":"Auth API","baseUrl":"string","endpoints":["/login","/reset"]}],
    "data_models": [{"entity":"User","fields":[{"name":"id","type":"uuid"}]}],
    "envs": ["local","dev","test","prod"],
    "labels": {"jira_component":"Auth","service":"users"}
  },
  "story": {
    "as_a": "string",
    "i_want": "string",
    "so_that": "string",
    "acceptance_criteria": ["Given/When/Then ..."]
  },
  "needs_clarification": [
    { "topic": "string", "question": "string", "why_it_matters": "string" }
  ],
  "assumptions": ["string"],
  "dependencies": ["string"],
  "edge_cases": ["string"],
  "functional_requirements": [
    { "id": "FR-001", "statement": "string" }
  ],
  "tasks": [
    { "id": "T-001", "title": "string", "area": "FE|BE|Infra|QA|Docs", "details": "string", "prereqs": ["T-..."], "artifacts": ["string"] }
  ],
  "estimation": {
    "confidence": 0.0,
    "complexity": "XS|S|M|L|XL",
    "drivers": ["string"],
    "notes": "string"
  },
  "risks": [ {"risk": "string", "mitigation": "string"} ]
}
```

Notes:

* Use stable IDs (e.g., prefix with today’s date) for easy diffing.
* Keep **acceptance criteria** in Given/When/Then form—easy to hand to QA.

---

## Project Context Model

A normalized, versioned bundle of reusable facts for a project:

* **Glossary** (domain terms & definitions)
* **Stakeholders** (names/roles/interests)
* **Constraints & Policies** (e.g., no PII logging; data residency)
* **Non‑Functional Reqs (NFRs)** (SLAs, SLOs, uptime, latency targets)
* **API Catalog** (base URLs, endpoints, auth style)
* **Data Models** (entities/fields; links to schemas)
* **Environment Profiles** (local/dev/test/stage/prod)
* **Labels/Mappings** (Jira components, services, repo links)

**Merging Rules (Precedence)**:

1. **Project defaults** (active context version)
2. **Feature‑level overrides** (provided with the input)

Result becomes **`resolved_context`** and is passed to the model. Feature overrides always win.

---

## Prompting Strategy (Model Spec)

### System prompt (role)

> You are a pragmatic product/engineering copilot trained on modern agile practices. You write **concise, unambiguous** specs. You prefer bullet‑point clarity over prose. You surface **ambiguities** and **risks** explicitly. You generate **structured JSON** that matches the provided schema, and an accompanying human‑readable summary.

### Guardrails

* Enforce a **content policy**: never fabricate org‑specific facts; ask questions instead.
* Use **domain vocabulary only if present** in the input/context or **project context**.
* Keep lists short and high‑signal; default max 7 items per list.

### Project‑context injection

* Before synthesis, fetch `project_id` ➜ load project context blocks (glossary, constraints, APIs, data models, labels).
* Merge with feature‑level `context.overrides` (feature overrides win).
* Provide the merged **resolved\_context** to the model as a separate section.

### Few‑shot exemplars (abridged)

Include 2–3 examples of input ➜ ideal output (both prose + JSON) covering:

1. Simple UI tweak (low ambiguity)
2. Cross‑service integration (dependencies & risks)
3. Edge‑case heavy data import (clarifying questions crucial)

### Multi‑turn flow

1. **Ingest**: parse user text & context block.
2. **Probe** (optional): ask 3–5 targeted questions if confidence < threshold.
3. **Synthesize**: produce story, FRs, tasks, etc., adhering to schema.
4. **Refine**: if the user answers, regenerate only affected sections (diff mode).

---

## Architecture (Minimal, Extensible)

```
+-------------------+        +-------------------+
|  Web UI (Next.js) |<------>|  Spec API (Node)  |
+-------------------+        +-------------------+
          |                           |
          v                           v
  Auth (optional)          LLM Provider (structured output)
          |                           |
          v                           v
 Local/Cloud Store (Postgres/Supabase) + Object Store (versions)
```

**Why this shape**

* Keep the UI simple; move prompt logic to a single **Spec API**.
* Centralize **model config**, **prompt templates**, and **evaluation harness** in the API.
* Store both **user input** and **generated JSON** versions for auditability.

---

## Data Model (DB)

Tables (simplified):

* `projects(id, name, description, created_by, created_at)`
* `project_contexts(id, project_id, context_json, version, is_active, created_at)`
* `project_context_diffs(id, project_context_id, diff_json, created_at)`
* `spec_inputs(id, project_id, title, description, context_json, created_by, created_at)`
* `spec_outputs(id, input_id, output_json, summary_md, model_info_json, created_at)`
* `spec_revisions(id, output_id, diff_json, created_at)`
* `spec_evals(id, output_id, rubric_scores_json, notes)`

**Merging precedence**: `defaults from project_context` < `spec_inputs.context.overrides`.

Indexes: `(project_id, created_at)` for dashboards; `(is_active, project_id)` for quick context fetch.

---

## API Surface (Spec API)

* `POST /projects` ➜ create project
* `GET /projects/:id/context` ➜ fetch active project context
* `POST /projects/:id/context` ➜ upsert context (versioned)
* `POST /projects/:id/context:activate` ➜ mark version active
* `POST /specs:generate` ➜ body: `{ input, mode: "draft|final" }` → returns `{ output_json, summary_md }`

  * Server loads project context via `input.project_id`, merges, passes `resolved_context` to the model
* `POST /specs:refine` ➜ body: `{ spec_id, answers }` → returns updated sections
* `GET /specs/:id` ➜ the latest output + version history
* `POST /export/jira` ➜ maps tasks/ACs to issues/subtasks (uses project labels)

Auth: token or session (optional for PoC). RBAC idea: project‑scoped roles.

---

## Implementation Notes

### Structured outputs

* Use your LLM provider’s **structured output** / JSON schema feature (or function‑calling) to validate shape.
* Validate server‑side with Zod/TypeScript.

### Clarifying‑question gate

* Heuristic: compute a rough **ambiguity score** from input length, presence of numbers/dates, count of domain terms vs pronouns, etc. If score > threshold, call a **question generator** prompt before final synthesis.
* **Project‑aware probing**: bias questions toward gaps relative to `resolved_context`.

### Estimation strategy (practical)

* Start with **t‑shirt sizing** + confidence. Avoid time until team historicals exist.
* When you have historicals, fit a simple **lookup table** by type-of-work × area × complexity → time range.

### Task breakdown

* Always include **QA** and **Docs** placeholders.
* Group tasks with `area` and `prereqs` for natural ordering.

---

## Example Prompts

### A) Single‑shot draft (server template)

```
SYSTEM: <system prompt above>

RESOLVED PROJECT CONTEXT (YAML):
context:
  glossary:
    PII: "Personally Identifiable Information"
    ACV: "Annual Contract Value"
  constraints: ["No storage of plaintext PII", "Data residency: US"]
  non_functional: ["99.9% uptime", "P95 < 400ms"]
  api_catalog:
    - name: "Auth API"
      baseUrl: "https://auth.api"
      endpoints: ["/login","/reset"]
  data_models:
    - entity: "User"
      fields: [{ name: "id", type: "uuid" }, { name: "email", type: "string" }]
  labels: { jira_component: "Auth", service: "users" }

USER INPUT (YAML):
input:
  project_id: "proj_123"
  title: "Self‑serve password reset"
  description: |
    Allow users to reset passwords via email with rate limiting.
  context:
    inherit_from_project: true
    overrides:
      non_functional: ["P95 < 300ms"]

RESPONSE FORMAT: First, a concise summary (<200 words). Then, a JSON object matching the schema.
```

### Clarifying questions

```
Given the same input and resolved context, ask 3–5 questions that would most reduce ambiguity. Output JSON:
{
  "questions": [{"topic":"…","question":"…","why_it_matters":"…"}],
  "estimated_confidence": 0.62
}
```

---

## Minimal Server Sketch (TypeScript)

```ts
import { z } from "zod";
import express from "express";

const OutputSchema = z.object({ /* mirror schema from section 2 */ });

const app = express();
app.use(express.json());

app.post("/specs:generate", async (req, res) => {
  const { input, mode = "draft" } = req.body;

  const system = `You are a pragmatic product/engineering copilot...`;
  const user = `INPUT:\n${JSON.stringify(input, null, 2)}\n` +
               `FORMAT: summary then JSON per schema`;

  const result = await callLLM({ system, user, schema: OutputSchema });
  const parsed = OutputSchema.safeParse(result.json);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const payload = { summary_md: result.summary, output_json: parsed.data };
  res.json(payload);
});

app.listen(3000);
```

> `callLLM` is your adapter around the LLM SDK that requests **schema‑constrained** JSON and returns `{summary, json}`.

---

## Evaluation & Quality

**Offline eval set**

* Create 20–30 seed specs from your domain. Gold‑standard outputs written by you.
* Keep them in repo; run a nightly eval.

**Rubric (0–3 each)**

1. **Clarity** (jargon avoided, unambiguous)
2. **Completeness** (key aspects covered)
3. **Actionability** (tasks executable)
4. **Risk awareness** (edge cases, dependencies)
5. **Schema fidelity** (valid JSON, IDs present)

Track averages + drift over time. Fail CI if schema fidelity < 1.0.

---

## Privacy & Safety

* Never include credentials or PII in prompts. Redact known patterns.
* Provide a **confidentiality warning** in the UI.
* Log prompts/outputs minimally; allow user to delete.
* Add a **"no org‑specific facts unless provided"** constraint.

---

## UI Sketch (Next.js)

* Left pane: **Project selector** (with context status/version) → input title/description + optional feature overrides
* Right pane (tabs): **Summary**, **Story & AC**, **Clarifications**, **FRs**, **Tasks**, **Edge Cases**, **JSON**, **Context** (read‑only merged view)
* Buttons: **Generate Draft**, **Ask Questions**, **Finalize**, **Export → Jira**
* Project context editor (separate screen): sections for **Glossary**, **Constraints**, **NFRs**, **APIs**, **Data Models**, **Labels** with versioning & preview of `resolved_context`

---

## Roadmap

**V0 (1–2 days)**

* Single prompt ➜ summary + JSON per schema
* Server validation w/ Zod; save to DB
* **Project context model**: create `projects` + `project_contexts` tables; simple UI to edit JSON

**V1**

* Clarifying‑question gate; partial regeneration
* Basic t‑shirt sizing w/ drivers
* **Context versioning** + diff; show resolved merge; context‑aware probing

**V2**

* Jira export mapping (project, issue type, AC → sub‑tasks) using project labels/components
* Org glossary injection (embeddings lookup)

**V3**

* Feedback loop: thumbs up/down per section, comment‑to‑regenerate
* Lightweight estimate calibration from history
* RBAC and audit logs

---

## Integration Notes

* **Embeddings**: index your internal standards/definitions. Retrieve top‑k snippets to condition prompts.
* **Spec Kit inspiration**: align sections to your org’s PRD/Spec template so adoption is easy.
* **Git hooks**: allow `spec.json` to live in the repo alongside a feature branch.

---

## Next Steps (Actionable)

1. Copy the schema and server sketch; stand up `/specs:generate` with schema validation.
2. Create 3 few‑shot examples (simple UI, cross‑service, data import).
3. Build the Next.js UI with a two‑pane layout and tabs.
4. Draft the clarifying‑question prompt + ambiguity heuristic.
5. Seed a 20‑spec evaluation set and wire up the rubric.
6. Share a demo with your team; pick one real feature to pilot end‑to‑end.
