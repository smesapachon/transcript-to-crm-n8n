// Node: "Validate & Flag Gaps" (Code)
// Parses the LLM JSON, flags missing fields, sets confidence/needs_review,
// and builds a plain-text preview plus an HTML preview for the approval form.
// Styling note: the n8n form "Custom HTML" element strips inline `style` AND does
// not reliably apply CSS classes, so the HTML preview relies only on semantic tags
// (h3/h4/b/ul/li/hr) that the browser styles by default.

const raw = $input.first().json;
let content = '';
try { content = raw.choices[0].message.content; } catch (e) { content = ''; }
content = (content || '').replace(/```json/gi, '').replace(/```/g, '').trim();

let data; let parseError = false;
try { data = JSON.parse(content); } catch (e) { data = {}; parseError = true; }

const norm = $('Normalize & Build Request').first().json;

const missing = Array.isArray(data.missing_or_ambiguous) ? data.missing_or_ambiguous.slice() : [];
if (!data.company_name && missing.indexOf('company_name') === -1) missing.push('company_name');
if (!data.contact_name && missing.indexOf('contact_name') === -1) missing.push('contact_name');

const confidence = data.confidence || (parseError ? 'low' : 'medium');
const needsReview = parseError || data.needs_human_review === true || missing.length > 0 || confidence === 'low';

const items = Array.isArray(data.action_items) ? data.action_items : [];
const products = (data.order_intent && Array.isArray(data.order_intent.products)) ? data.order_intent.products : [];

const itemsTxt = items.length ? items.map(a => '  - ' + a).join('\n') : '  (none)';
const preview = [(needsReview ? 'NEEDS REVIEW' : 'Looks complete'), '', 'Company: ' + (data.company_name || '(missing)'), 'Contact: ' + (data.contact_name || '(missing)'), 'Confidence: ' + confidence, '', 'Summary:', (data.summary || '(none)'), '', 'Action items:', itemsTxt].join('\n');

const esc = s => (s == null ? '' : String(s));
const oi = data.order_intent || {};
const row = (k, v) => '<b>' + k + ':</b> ' + v + '<br>';
const bannerHtml = needsReview
  ? '<h3>⚠️ NEEDS REVIEW</h3>' + (missing.length ? ('<p><b>Missing / ambiguous:</b> ' + missing.join(', ') + '</p>') : '')
  : '<h3>✅ Looks complete</h3>';
const itemsHtml = items.length ? ('<ul>' + items.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul>') : '<p><i>None</i></p>';
const prodHtml = products.length ? ('<ul>' + products.map(p => '<li>' + esc(p.name) + (p.quantity ? (' &times; ' + p.quantity) : '') + '</li>').join('') + '</ul>') : '<p><i>None specified</i></p>';

const previewHtml =
  bannerHtml + '<hr>' +
  row('Company', esc(data.company_name) || '<i>(missing)</i>') +
  row('Contact', esc(data.contact_name) || '<i>(missing)</i>') +
  row('Confidence', confidence) +
  '<h4>Summary</h4><div>' + (esc(data.summary) || '<i>(none)</i>') + '</div>' +
  '<h4>Action items</h4>' + itemsHtml +
  '<h4>Order intent</h4>' + row('Present', oi.present ? 'YES' : 'no') + '<b>Products:</b>' + prodHtml +
  row('Timeline', esc(oi.timeline) || '<i>(none)</i>') +
  row('Notes', esc(oi.notes) || '<i>(none)</i>');

return [{ json: {
  extracted: data, missing, confidence, needs_review: needsReview, parse_error: parseError,
  preview, preview_html: previewHtml,
  transcript: norm.transcript, source: norm.source, received_at: norm.received_at
} }];
