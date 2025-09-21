const specGenerationTemplate = `{{system_prompt}}

RESOLVED PROJECT CONTEXT:
{{JSON.stringify(resolved_context)}}

USER INPUT:
{{JSON.stringify(input)}}

INSTRUCTIONS:
Generate a {{mode}} specification using stable IDs prefixed with "{{today_id}}" (e.g., "FR-{{today_id}}-001", "T-{{today_id}}-001").

CRITICAL SCHEMA REQUIREMENTS:
- "input": Must include the exact input object provided above
- "resolved_context": Must include the exact resolved context provided above  
- "story": Object with "as_a", "i_want", "so_that", "acceptance_criteria" (array of strings)
- "tasks": Array of objects, each with:
  - "id": string (e.g., "T-{{today_id}}-001")
  - "title": string (descriptive task name)
  - "area": MUST be one of: "FE", "BE", "Infra", "QA", "Docs" (no other values allowed)
  - "details": string (implementation details)
  - "prereqs": array of strings (default: [])
  - "artifacts": array of strings (default: [])
- "estimation": Object with:
  - "confidence": number between 0 and 1
  - "complexity": one of "XS", "S", "M", "L", "XL"
  - "drivers": array of strings
  - "notes": string
- "functional_requirements": Array with "id" and "statement" fields
- "needs_clarification": Array (default: [])
- "assumptions": Array of strings (default: [])
- "dependencies": Array of strings (default: [])
- "edge_cases": Array of strings (default: [])
- "risks": Array with "risk" and "mitigation" fields (default: [])

EXAMPLE STRUCTURE:
{
  "input": /* the exact input object */,
  "resolved_context": /* the exact resolved context */,
  "story": {
    "as_a": "user",
    "i_want": "to do something",
    "so_that": "I achieve a goal",
    "acceptance_criteria": ["Given...", "When...", "Then..."]
  },
  "tasks": [
    {
      "id": "T-{{today_id}}-001",
      "title": "Setup frontend components",
      "area": "FE",
      "details": "Create React components for...",
      "prereqs": [],
      "artifacts": ["Component files"]
    }
  ],
  "estimation": {
    "confidence": 0.8,
    "complexity": "M",
    "drivers": ["New technology"],
    "notes": "Standard implementation"
  },
  "functional_requirements": [
    {
      "id": "FR-{{today_id}}-001",
      "statement": "System must..."
    }
  ],
  "needs_clarification": [],
  "assumptions": [],
  "dependencies": [],
  "edge_cases": [],
  "risks": []
}

RESPOND WITH ONLY VALID JSON. NO OTHER TEXT.`;

export default specGenerationTemplate;
