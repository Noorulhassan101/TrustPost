# Product Vision & Scope

## Vision

Build a **simple, end‑to‑end AI data entry tool** that any small office can use to:

1. Upload or forward **PDFs, photos of receipts, invoices, and basic forms**.
2. Connect the tool **once** to their main system (accounting/CRM/spreadsheet).
3. Tell it in plain language **what data to extract and where to put it**.
4. Let the AI **extract, review, and automatically enter** that data into their system.

Positioning statement:

> "Drop your invoices and receipts here. We read them, extract the data, and push it into your accounting/CRM/spreadsheet automatically."

## What "Production-Ready" Means Here

This is being built to a **production-ready MVP** standard, not a throwaway prototype. Concretely, that means the product must, from v1:

- Never silently lose or duplicate a financial record.
- Fail loudly and recoverably (clear errors, retryable jobs) rather than fail silently.
- Keep secrets out of source control and client code.
- Be deployable to a **staging environment identical in shape to production**, with an automated pipeline gating what reaches real users.
- Have basic observability: you should find out about a broken integration from a dashboard/alert, not from a user complaint.
- Have a hard ceiling on AI/infra spend so a bug or spike can't produce a surprise bill.

"Production-ready" does **not** mean enterprise scale. It means: small, correct, observable, and safe to hand to a paying customer. See `04_technical_requirements_and_architecture.md` for how each of these is implemented, and `03_product_requirements_prd.md` for the requirements that codify them.

## Target Users (Initial)

### Primary

- **Small US businesses (1–50 employees)**
  - Accounting/bookkeeping firms serving SMBs
  - Field services (HVAC, plumbing, electrical)
  - Small e‑commerce brands

- **Small Pakistani businesses (1–100 employees)**
  - Exporters/trading houses (textiles, garments, surgical, etc.)
  - Local distributors/wholesalers
  - Small agencies/IT services

These users:

- Deal with **hundreds of documents/month** (invoices, receipts, purchase orders).
- Manually type data into **QuickBooks, Xero, Tally, Zoho Books, HubSpot, or spreadsheets**.
- Are **price‑sensitive** but will pay for clear time savings and fewer errors.

## Problems We Solve (Pain Points)

1. **Time waste** – Staff spend hours each week copying data from PDFs/images into systems.
2. **Errors** – Manual entry causes mistakes that are costly to fix later.
3. **Duplicate entries** – The same invoice gets keyed in twice, corrupting the books (see `02_business_and_domain_knowledge.md` — this is the #1 fear of the target user, so it is treated as a hard requirement, not a nice-to-have).
4. **Complex tools** – Existing solutions are either too niche (only invoices, only receipts), or too technical (require templates, regex, dev help).
5. **Fragmented workflows** – Documents live in email, drives, paper; data lives in multiple systems.

## Value Proposition

For the user:

- **Save 5–20+ hours/week** on data entry.
- **Reduce errors** from ~1–4% to <0.1% in automated flows.
- **One simple tool** instead of 3–4 different apps.
- **No coding**, no complex setup.
- **Trustworthy**: it won't double-post an invoice, and it tells you clearly when something needs your attention.

For you (founder):

- Clear, repeatable use case (invoices/receipts/forms → accounting/CRM/sheets).
- Ability to start with a narrow slice (e.g., invoices → QuickBooks/Tally) and expand.
- Potential to charge **$49–$299/month (US)** and **PKR 2,000–10,000/month (Pakistan)**.

## Scope (MVP vs Future)

### MVP Scope (Strict)

Focus on **one core flow** per market to start:

- **US MVP flow:** Upload PDFs/photos of vendor invoices & receipts → extract key fields → push into **QuickBooks Online (QBO)** and/or **Google Sheets**.
- **Pakistan MVP flow:** Upload PDFs/photos of supplier invoices & receipts → extract key fields → push into **Tally** (via Tally API) and/or **Google Sheets**.

MVP features:

1. Web app (desktop first).
2. Email/password + Google login.
3. Company setup + connect **one** system (QBO or Tally or Sheets).
4. Document upload (drag‑and‑drop).
5. Predefined profiles: "Invoices", "Receipts".
6. Extraction using AI (no custom training at first).
7. Review screen (human checks before posting).
8. **Duplicate detection** at review time (flag likely-duplicate documents before posting).
9. Post to connected system (manual "Post" button; **idempotent** — clicking twice never creates two records).
10. Basic audit log (which doc created which record).
11. **Staging environment + CI/CD pipeline** gating all production deploys.
12. **Basic monitoring, error alerting, and spend alerts** from day one.

**Out of MVP scope (explicitly deferred):**

- Email ingestion (forwarding invoices).
- Watching cloud folders automatically.
- Mobile app (mobile‑friendly web is enough).
- Complex custom ERPs.
- Multi‑language UI (English only for MVP).
- Advanced analytics dashboards.
- Auto-post without human review.
- Multi-user roles beyond a single admin/reviewer per company.

### Future Scope (Post‑MVP)

Only consider after MVP is live with paying users:

- Email‑in address for invoices/receipts.
- Auto‑watch Google Drive/OneDrive folders.
- More connectors (Xero, Zoho Books, HubSpot, etc.).
- Auto‑post rules (if confidence > X%, post automatically).
- Basic usage analytics (docs processed, time saved).
- Simple multi‑language support (e.g., Urdu labels).
- Multi-user companies with roles.
- Line-item level extraction.

## Success Criteria (MVP)

Treat these as hard gates before calling MVP "done":

1. **Functional**
   - A new user can sign up, create a company, connect QBO or Tally or Sheets, upload 5–10 invoices/receipts, review extracted data, and post to their system successfully.
   - No critical bugs in this flow.

2. **Reliability**
   - At least **95% success rate** on clean, standard invoices/receipts (fields extracted and posted correctly after human review).
   - Clear error messages when something fails (e.g., connection lost, unsupported format, quota exceeded).
   - No double-posting is possible even under retries, double-clicks, or network failures mid-request.

3. **Usability**
   - A non‑technical office user can complete the core flow in **under 10 minutes** with no help.
   - No more than **3 clicks** from upload to "ready to review".

4. **Cost**
   - All infra and AI usage for MVP must stay within **free tiers**, or a small, explicitly-approved budget with a hard alerting ceiling (see `04_technical_requirements_and_architecture.md` §8).
   - A billing budget alert is configured and tested before any beta user is onboarded.

5. **Security & Ops basics**
   - Authentication working (no open endpoints).
   - Documents and credentials stored securely (encrypted at rest, secrets never in source control).
   - Basic audit log of who posted what.
   - Staging environment mirrors production and is used for every deploy before it reaches real users.
   - CI pipeline runs lint/typecheck/tests on every change; nothing reaches production without passing CI.
   - Basic error-rate and spend monitoring with alerts configured.

If any of these cannot be met with current constraints, **reduce feature scope first** (e.g., support only Sheets, defer QBO/Tally) — never cut the reliability, security, or cost-safeguard requirements to hit a deadline.

---

## Constraints (Hard Boundaries)

These are non‑negotiable for the agent:

1. **No new paid subscriptions** beyond existing ones (Gemini Pro, etc.) without explicit approval. A small, capped, alerted spend (e.g., Firebase Blaze plan with a hard budget alert) is allowed — see §8 of the technical doc — but must never be open-ended.
2. Use free tiers first for hosting, database, storage, and AI/OCR; only exceed them with an explicit, logged decision and a budget alert in place.
3. Do **not** design for millions of users or massive scale. Design for the first **50–100 companies**, each processing up to **1,000 docs/month**. Simple, monolithic‑ish architecture that can be refactored later.
4. Do **not** add product features that are not required for the MVP scope above. Production-hardening work (CI/CD, staging, monitoring, secrets management, idempotency, duplicate detection, backups) is **in scope** and is not a "feature" for the purposes of this rule.
5. All decisions must favor **simplicity, speed to ship, and low cost** over "perfect" architecture — but never at the expense of correctness on financial data (no silent data loss, no silent duplication).

Any proposal that violates these constraints must be **rejected** and revised.
