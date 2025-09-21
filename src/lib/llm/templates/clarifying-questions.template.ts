const clarifyingQuestionsTemplate = `Given the input and resolved context, identify 3-5 questions that would most reduce ambiguity in the specification. Focus on:
- Missing business logic or edge cases
- Unclear functional requirements
- Ambiguous stakeholder expectations
- Technical implementation gaps
- Integration dependencies

IMPORTANT: Respond with ONLY a valid JSON object that matches the ClarifyingQuestions schema. Do not include any other text, markdown, or explanations.

RESOLVED PROJECT CONTEXT: {{JSON.stringify(resolved_context)}}

USER INPUT: {{JSON.stringify(input)}}

Respond with a JSON object containing a "questions" array and "estimated_confidence" number.`;

export default clarifyingQuestionsTemplate;
