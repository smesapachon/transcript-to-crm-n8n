# Sales-call transcript → CRM (with human approval)

An n8n automation that turns a sales-call transcript into a clean record in a system of
record, with a human approval step in the middle.

## What it does

```
Form (paste transcript)
  → Build LLM request
  → LLM extract (OpenAI, strict JSON)
  → Validate & flag gaps (missing fields, confidence, needs-review)
  → Human review form (edit fields + Approve/Reject)
  → IF approved
        → INSERT into Postgres (Supabase)  → "Saved" page
     else
        → "Rejected" page (nothing written)
```

The LLM extracts: **account/company name, contact name, a 2–3 sentence summary, action
items, and an order/quote intent**. Everything is shown to a human for review before it
is saved — and the human can correct fields inline (e.g. type the company name the call
never stated) before approving.

## Stack

- **n8n** (self-hosted) — orchestration + the two forms (intake + approval).
- **OpenAI** `gpt-4o-mini`, `temperature 0`, `response_format: json_object` — extraction.
- **Supabase / Postgres** — system of record (`db/schema.sql`).

## Key decisions

1. **Never invent; flag instead.** The prompt forces the model to return `null` + a
   `missing_or_ambiguous` list rather than guessing. A `Validate` step turns that into a
   `confidence` level and a `needs_review` flag, and the approval form shows a
   *NEEDS REVIEW* banner listing exactly which fields are missing. This is how the messy
   transcript is handled — no hallucinated part numbers.
2. **Approval that lets you fix, not just accept/reject.** The human step is an editable
   form: empty overrides keep the extracted value; a typed value wins. This mirrors how a
   real CRM operator works a thin lead.
3. **A real database as the system of record.** Postgres (not a sheet) so the record has a
   typed schema, a `status` column, and `jsonb` for action items / order intent — closer to
   a production CRM table.

## Handling the messy transcript (#2)

Danny's call has no company name, no part numbers, and references a prior "school job".
The automation:
- sets `company_name = null`, `contact_name = "Danny"`,
- marks `order_intent.present = true` but leaves `products` empty, noting the prior-deal
  reference instead of inventing items,
- captures the **pricing objection**, the **callback request**, and the **deadline** as
  action items,
- sets `confidence = low`, `needs_human_review = true`, and routes to the review form with
  the missing fields surfaced for the human to complete before saving.

## Run it

1. Create the table: run `db/schema.sql` in Supabase (SQL editor).
2. Import `workflow/transcript-to-crm.json` into n8n.
3. Set two credentials: **OpenAI** (on `LLM Extract`) and **Postgres** (on `Insert into CRM`,
   using the Supabase connection string).
4. Open the form trigger URL, paste a transcript from `samples/`, submit, review, approve.

## What I'd add before production

- **Async / different approver:** swap the in-session review form for *Wait + email/Slack
  approval* so a manager can approve later from their inbox (the rest of the flow is identical).
- **Idempotency:** dedupe on a natural key (e.g. transcript hash) so re-runs don't create
  duplicate records — same pattern I use elsewhere with a unique document id.
- **Retries + error branch** on the LLM call, and a dead-letter for un-parseable responses.
- **Schema-enforced output** via function/tool calling instead of prompt-only JSON.
- Salesforce as the system of record if that is the target CRM.

## What I'd do differently with more time

- Let the reviewer edit *every* field (products, summary) from the form, not just the names.
- Add a lightweight eval set of transcripts to catch prompt regressions.
- Auto-link to the referenced prior deal ("school job") instead of just flagging it.

## Open question for the team

For low-confidence records, should they still be **written and flagged for follow-up**, or
**held back entirely** until a human completes them? I implemented *flag and save* so nothing
is lost — happy to match your team's preference.
