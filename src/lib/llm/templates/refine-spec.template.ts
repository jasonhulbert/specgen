const refineSpecTemplate = `SYSTEM: {{system_prompt}}

ORIGINAL SPECIFICATION: {{JSON.stringify(original_spec)}}

CLARIFYING ANSWERS:
{{answers_formatted}}

INSTRUCTIONS:
Update only the affected sections based on the clarifying answers. Return a partial specification object with only the changed fields.

RESPONSE FORMAT:
- Provide a JSON object with only the updated fields.`;

export default refineSpecTemplate;
