// Node: "Apply Edits & Decision" (Code)
// Merges the reviewer's edits with the extracted data and reads the Approve/Reject decision.
// An empty override keeps the extracted value.

const form = $input.first().json;
const v = $('Validate & Flag Gaps').first().json;
const ex = v.extracted || {};

const companyOverride = (form['Company name'] || '').toString().trim();
const contactOverride = (form['Contact name'] || '').toString().trim();
const decision = (form['Decision'] || 'Reject').toString();
const notes = (form['Reviewer notes'] || '').toString();
const approved = decision.toLowerCase().indexOf('approve') !== -1;

const company = companyOverride || ex.company_name || null;
const contact = contactOverride || ex.contact_name || null;

// If the human filled a previously-missing field, drop it from missing_fields
let missing = Array.isArray(v.missing) ? v.missing.slice() : [];
if (company) missing = missing.filter(m => m !== 'company_name');
if (contact) missing = missing.filter(m => m !== 'contact_name');

return [{ json: {
  decision: decision,
  approved: approved,
  reviewer_notes: notes,
  record: {
    company_name: company,
    contact_name: contact,
    summary: ex.summary || null,
    action_items: JSON.stringify(ex.action_items || []),
    order_intent: JSON.stringify(ex.order_intent || {}),
    missing_fields: JSON.stringify(missing),
    confidence: v.confidence || 'low',
    status: approved ? 'approved' : 'rejected',
    source: v.source || 'manual',
    raw_transcript: v.transcript || ''
  }
} }];
