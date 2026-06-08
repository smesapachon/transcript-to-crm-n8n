# Sales-call transcript to CRM (with human approval)

An n8n automation that turns a sales-call transcript into a clean record in a system of
record, with a human review/approval step in the middle. Tailored to **Bell & McCoy
Integrated Solutions**, a lighting and home-automation manufacturers' rep agency.

**Live demo (review UI on GitHub Pages):** https://smesapachon.github.io/transcript-to-crm-n8n/

## Screenshots

**n8n workflow (canvas)**

![n8n canvas](assets/canvas.png)

**Review UI: extracted fields, domain classification and risk flags (GitHub Pages)**

![Review card](assets/review-card.png)

## What it does

```
GitHub Pages (paste transcript)
  -> POST /webhook/transcript-extract
      n8n: Normalize -> LLM extract -> Validate & flag gaps
      -> responds with the extracted fields
  -> GitHub Pages renders an editable review card (boxes, colors, badges)
  -> human edits + Approve / Reject
  -> POST /webhook/transcript-save
      n8n: Apply edits -> IF approved -> INSERT (Supabase) -> email the territory rep
```

The LLM extracts company, contact, a 2 to 3 sentence summary, action items, and order/quote
intent, plus domain classification and risk flags (see below). Nothing is written until a
human reviews it, and the reviewer can correct fields inline before approving.

## Stack
- **n8n** (cloud) for orchestration and two webhooks (extract and save).
- **OpenAI** `gpt-4o-mini`, `temperature 0`, `response_format: json_object`. Cheap and fast, and plenty for structured extraction.
- **Supabase / Postgres** as the system of record.
- **GitHub Pages** serves the input and review UI (`docs/index.html`) for full design control.
- **Gmail** notifies the territory rep on approval.

## Key decisions
1. **Never invent, flag instead.** The prompt forces `null` plus a `missing_or_ambiguous`
   list rather than guessing. A `Validate` step turns that into a `confidence` level and a
   *NEEDS REVIEW* banner. That is how the messy transcript is handled, with no hallucinated
   part numbers.
2. **Domain classification for a rep agency.** Beyond the generic fields, the extractor
   adds `customer_type`, `product_category`, `territory_state`, `project_name`, `priority`
   and `risk_flags`, because a manufacturers' rep routes leads by territory and product line
   and tracks account risk (pricing objections, competitor mentions). This makes the record
   actionable for *their* business, not a generic CRM dump.
3. **Approval that lets you fix, not just accept or reject.** The review UI is editable. An
   empty override keeps the extracted value, a typed value wins.
4. **External review UI for full control of the UX.** The n8n form sandbox strips styling, so
   the review screen is a GitHub Pages app talking to n8n through two webhooks. That gives a
   branded, boxed, color-coded card.

## Handling the messy transcript
Danny's voicemail has no company, no part numbers, references a prior "school job" and a
pricing complaint. The automation sets company `null`, marks `order_intent.present=true`
with empty products (noting the prior-deal reference), captures the pricing objection as a
`risk_flag`, sets `confidence=low` and `needs_human_review=true`, and routes to the review UI
with the gaps surfaced for the human to complete.

## Run it
1. Create the table (see `db/schema.sql`; the JSON/array fields are stored as `text`).
2. Import `workflow/transcript-to-crm-external.json` into n8n.
3. Connect credentials: OpenAI, Postgres (Supabase), Gmail, and set the rep's email on *Notify Rep*.
4. Activate the workflow, then copy the two production webhook URLs into `docs/index.html` (`EXTRACT_URL`, `SAVE_URL`).
5. Open the GitHub Pages URL, paste a transcript from `samples/`, review, approve.

**Primary workflow:** `workflow/transcript-to-crm-external.json` (used by the GitHub Pages UI).
A self-contained variant using n8n's native form (no external page) is in
`workflow/transcript-to-crm.json`.

> On re-import, the n8n Postgres node may auto-add an `id` mapping to the Insert. Remove it,
> since `id` is a generated identity column. The JSON-shaped fields are stored as `text` to
> avoid n8n validating jsonb columns as objects; a production build would use jsonb through
> the Supabase REST API.

## What I'd add before production
- **Auth and rate limiting on the webhooks.** They are currently open, so anyone with the URL
  can POST (junk records, or burn the LLM budget). I'd add a shared-secret header or signed
  requests, plus throttling.
- **Retries and error handling on the LLM call** (and a dead-letter for unparseable
  responses). Today an OpenAI hiccup surfaces as a generic failure.
- **Idempotency:** dedupe by transcript hash so the same call isn't saved twice.
- **Account-history lookup** to resolve "same as the school job" against prior orders, since
  repeat business is core to a rep agency.
- **Product/SKU catalog matching** (for example, map "40 wireless dimmers" to Lutron part
  numbers), auto-route to the territory rep by `territory_state`, and draft-quote generation
  from `order_intent`.

## What I'd do differently with more time
- Let the reviewer edit every field (products, summary), not just the names.
- A small eval set of transcripts to catch prompt regressions.

## Open question for the team
For low-confidence records, should they be **written and flagged for follow-up**, or **held
back** until a human completes them? I implemented *flag and save* so nothing is lost, and I'm
happy to match your process. And should records auto-route to the territory rep by state?
