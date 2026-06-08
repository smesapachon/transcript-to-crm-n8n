-- System of record: Supabase / Postgres
-- Run once in the Supabase SQL editor before importing the workflow.
-- Note: the JSON-shaped fields (action_items, order_intent, missing_fields, risk_flags) are
-- stored as TEXT holding JSON. This avoids n8n's Postgres node validating jsonb columns as
-- "object" and rejecting JSON strings/arrays. For production you'd use jsonb + an insert path
-- that passes native objects (e.g. the Supabase REST API).

create table if not exists sales_call_records (
  id               bigint generated always as identity primary key,
  company_name     text,
  contact_name     text,
  summary          text,
  action_items     text,   -- JSON array (as text)
  order_intent     text,   -- JSON object (as text): { present, products[], timeline, notes }
  missing_fields   text,   -- JSON array (as text)
  -- domain classification (tailored to a manufacturers' rep agency)
  project_name     text,
  customer_type    text,   -- architect | designer | builder | integrator | ...
  product_category text,   -- lighting control | automated shading | LED | landscape | ...
  territory_state  text,   -- 2-letter US state, for territory routing
  priority         text,   -- high | medium | low
  risk_flags       text,   -- JSON array (as text): pricing_objection, competitor_mentioned, ...
  confidence       text,   -- high | medium | low
  status           text default 'approved',   -- approved | rejected
  source           text,
  raw_transcript   text,
  created_at       timestamptz default now()
);
