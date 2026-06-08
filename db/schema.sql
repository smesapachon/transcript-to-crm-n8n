-- System of record: Supabase / Postgres
-- Run this once in the Supabase SQL editor (or any Postgres) before importing the workflow.

create table if not exists sales_call_records (
  id             bigint generated always as identity primary key,
  company_name   text,
  contact_name   text,
  summary        text,
  action_items   jsonb,        -- array of strings
  order_intent   jsonb,        -- { present, products[], timeline, notes }
  missing_fields jsonb,        -- array of field names flagged by the extractor
  confidence     text,         -- high | medium | low
  status         text default 'approved',   -- approved | rejected
  source         text,         -- where the transcript came from
  raw_transcript text,         -- kept for audit / re-processing
  created_at     timestamptz default now()
);

-- Helpful for reviewing what still needs a human:
create index if not exists idx_scr_needs_followup
  on sales_call_records (confidence, created_at);
