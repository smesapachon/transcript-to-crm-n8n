// Node: "Normalize & Build Request" (Code)
// Reads the form submission, builds the OpenAI request body with the system prompt.

const input = $input.first().json;
const transcript = (input.Transcript || input.transcript || input.text || '').toString().trim();
if (!transcript) { throw new Error('No transcript provided.'); }
const source = (input.Source || input.source || 'manual').toString();

const SYSTEM_PROMPT = [
  'You are a sales-call data extraction assistant. Read the transcript and return ONLY one valid JSON object, no markdown. Keys:',
  '- company_name: account/company name, or null',
  '- contact_name: the person name, or null',
  '- summary: 2 to 3 factual sentences, no invented details',
  '- action_items: array of short imperative strings; empty array if none',
  '- order_intent: object with present (boolean), products (array of objects with name and quantity), timeline (string or null), notes (string or null)',
  '- missing_or_ambiguous: array of field names you could not confidently fill',
  '- confidence: one of high, medium, low',
  '- needs_human_review: boolean',
  '',
  'Rules:',
  '- Never invent facts. If a value is not clearly stated, use null (or empty array, or present false) and add the field name to missing_or_ambiguous.',
  '- If the caller references a previous deal instead of specifics (for example same as the school job, or do what you did before), do not guess products: set order_intent.present true, leave products empty, and explain the reference in notes and in missing_or_ambiguous.',
  '- Record pricing objections, deadlines and callback requests as action_items.',
  '- Set needs_human_review true and confidence low whenever company_name or contact_name is missing, or products or quantities are implied but unknown.',
  'Return only the JSON object.'
].join('\n');

const body = {
  model: 'gpt-4o-mini',
  temperature: 0,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: 'Transcript:\n\n' + transcript }
  ]
};

return [{ json: { transcript, source, received_at: new Date().toISOString(), body } }];
