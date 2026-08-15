# Product Requirements Document (PRD) – MVP

## 1. Overview

**Product name (placeholder):** "EntryAI"
**Goal:** Enable small offices to upload invoices/receipts, extract key fields with AI, review them, and post to their accounting/CRM/spreadsheet with minimal effort — reliably enough to trust with real books.

**MVP scope:**

- Web app only (desktop browser).
- Support **one document type per flow**: Invoices → Accounting/Sheets, Receipts → Accounting/Sheets.
- Support **one integration per company** in MVP: QuickBooks Online (US), or Tally (Pakistan), or Google Sheets (both).
- Stack: **Firebase** (Auth, Firestore, Storage, Next.js API Routes, Hosting) — see `04_technical_requirements_and_architecture.md`. This is the single source of truth for backend decisions; no other stack should be considered.

Everything else is out of scope for MVP.

---

## 2. User Roles

- **Owner/Admin** — creates company account, connects external system, manages users (later), configures profiles.
- **Reviewer (can be same as Admin in MVP)** — uploads documents, reviews extracted data, posts to connected system, views audit log.

For MVP, assume **one user per company** to simplify.

---

## 3. Core User Stories

### Onboarding & Setup

1. **Sign up / Login** — email/password or Google login.
2. **Create Company** — name, currency, country.
3. **Connect System** — one external system (QBO or Tally or Google Sheets) via OAuth/API key.
4. **Configure Profile** — select "Invoices" or "Receipts" and confirm field mapping.

### Document Ingestion & Extraction

5. **Upload Documents** — drag‑and‑drop PDFs/images.
6. **View Processing Status** — Processing, Ready for Review, Posted, Error, Possible Duplicate.
7. **Extract Data** — AI extracts predefined fields, stored as structured data.

### Review & Posting

8. **Review Extracted Data** — original file preview + editable extracted fields side by side.
9. **Duplicate Warning** — if a similar document already exists for this company, the reviewer sees a clear warning with a link to the existing record before they can post.
10. **Post to System** — click "Post to [System]" to create a corresponding record. Safe to click more than once.
11. **Handle Errors** — clear error messages if posting fails, with a retry action.

### Audit & History

12. **View Audit Log** — which document created which record, who posted it and when.
13. **Search/Filter Documents** — by type and status.

---

## 4. Functional Requirements

### 4.1 Authentication & Company Setup

- FR‑1: Support email/password + Google OAuth login (Firebase Auth).
- FR‑2: Each user belongs to one company (MVP).
- FR‑3: Company has: name, country (US/PK), currency (USD/PKR), connected system type (QBO/Tally/Sheets), connection credentials (stored via Next.js API Routes secrets, never client-side).

### 4.2 Document Upload & Storage

- FR‑4: Users can upload PDFs and JPG/PNG images (receipts).
- FR‑5: Each document is stored with original file + metadata (company_id, type, status, uploaded_by, timestamps).
- FR‑6: File size limit: **10 MB per file** (MVP).
- FR‑7: English text in docs only (no OCR for other scripts required in MVP).

### 4.3 Document Processing & Extraction

- FR‑8: Classify type (invoice vs receipt) based on user selection or simple rules; run AI extraction to get fields.
- FR‑9: Extracted fields stored as JSON, e.g.:

  ```json
  {
    "vendor_name": "...",
    "invoice_number": "...",
    "invoice_date": "YYYY-MM-DD",
    "total_amount": 123.45,
    "currency": "USD",
    "raw_confidence": 0.92
  }
  ```

- FR‑10: If extraction fails completely, mark status = `Error` with a message. Failures are automatically retried once (e.g., transient API error) before surfacing to the user.

### 4.4 Duplicate Detection

- FR‑11: On successful extraction, compute a **document fingerprint** from normalized `(vendor_name, invoice_number, total_amount, invoice_date)` (or `(merchant_name, receipt_date, total_amount)` for receipts).
- FR‑12: Before a document reaches "Ready for Review," check the fingerprint against other documents for the same company. If a match (or near-match, e.g., same vendor + amount + date within 1 day) is found, set status = `Possible Duplicate` and link to the existing document.
- FR‑13: A document flagged as a possible duplicate can still be posted, but only after the reviewer explicitly acknowledges the warning (one extra confirmation step). This decision is written to the audit log.

### 4.5 Review UI

- FR‑14: Review screen shows document preview (left) and editable extracted fields (right).
- FR‑15: User can edit any field.
- FR‑16: User can mark document as "Ready to post" or "Skip/Ignore" (if not a valid doc).

### 4.6 Posting to External Systems

- FR‑17: For connected system:
  - **Google Sheets**: create a new row in a configured sheet with columns matching fields.
  - **QuickBooks Online**: create a Bill (for invoices) or Expense (for receipts) via API.
  - **Tally**: create a voucher/entry via Tally API.
- FR‑18: **Posting is idempotent, including under concurrent attempts.** The document ID itself is the idempotency key. If a post is retried or fired twice at once — user double-click, two open tabs, a network-level retry racing the original request — the system must guarantee at most one external record is ever created. A simple "check the flag, then write it" is not sufficient, since two near-simultaneous calls can both pass the check before either writes; the claim step must be atomic (a Firestore transaction) so only one caller can ever win it. See `04_technical_requirements_and_architecture.md` §6 for the required implementation pattern.
- FR‑19: After successful post: update document status = `Posted`, store external record ID (e.g., QBO bill ID, sheet row ID).
- FR‑20: If post fails: update status = `Error`, store error message visible to user, allow manual retry (retry reuses the same idempotency key).

### 4.7 Audit & Logs

- FR‑21: For each document, store who uploaded it, who reviewed/edited it, who posted it and when, external record ID and system type, and any duplicate-acknowledgment decision.
- FR‑22: Provide a simple list view with filters (type, status, date range).

### 4.8 Data Retention

- FR‑23: Documents and their extracted data are retained for the lifetime of the company account. An admin can delete a document and its data on request; deletion removes the file from Storage and marks the Firestore record as deleted (soft-delete with a purge job after 30 days), and is itself logged.
- FR‑24: Company data is exportable on request (JSON or CSV of documents + extraction results), so a customer is never locked in.

---

## 5. Non‑Functional Requirements

- NFR‑1: **Performance** — upload < 3s typical; extraction < 30s per document (async); posting < 5s under normal conditions.

- NFR‑2: **Reliability** — no data loss on upload or processing errors. Failed jobs must be retryable, visible, and safe to retry (idempotent) without side effects.

- NFR‑3: **Security**
  - All endpoints protected by authentication; caller identity verified server-side on every Cloud Function.
  - Company data isolated (no cross‑company access) — enforced in both Firestore rules and function-level checks.
  - Credentials/tokens for connectors stored via a secrets mechanism (Cloud Secret Manager, referenced by Next.js API Routes), never in Firestore in plaintext, never in client code or logs.

- NFR‑4: **Cost**
  - MVP must run within free tiers where possible; any paid usage (e.g., Spark plan (Free tier) overage, Gemini calls) must have a **hard budget alert** configured before onboarding any real user (see technical doc §8).
  - AI usage capped per company (e.g., max 500 docs/month in free beta) enforced server-side, not just tracked.
  - A daily/monthly global cap on AI calls exists as a circuit breaker independent of per-company caps, to prevent a bug from generating runaway spend.

- NFR‑5: **Maintainability**
  - Codebase understandable by a single developer.
  - Clear separation: frontend / backend API / AI‑OCR logic / connectors.
  - Core business logic (extraction parsing, duplicate fingerprinting, idempotent posting) covered by automated unit tests.

- NFR‑6: **Deployability**
  - A staging environment (separate Firebase project) mirrors production and is used for every change before it reaches real users.
  - CI pipeline runs lint, typecheck, and tests on every pull request; nothing merges without passing CI.
  - Production deploys are gated behind a successful staging deploy + smoke test.

- NFR‑7: **Observability**
  - Function error rates, extraction failure rates, and posting failure rates are visible on a dashboard.
  - Alerting notifies the developer (email at minimum) on: elevated function error rate, AI quota approaching limit, and billing threshold reached.

---

## 6. Out of Scope (MVP)

Explicitly NOT required for MVP:

- Email ingestion (forwarding invoices).
- Auto‑watching cloud folders.
- Mobile apps.
- Multi‑user companies with complex roles.
- Line‑item extraction (optional stretch, but not required).
- Advanced analytics/dashboards.
- Multi‑language UI.
- Auto‑post without review.

Any feature not listed in this PRD or explicitly marked as future must be **rejected** by the agent unless you change this document. Production-hardening items in §5 (NFR‑4 through NFR‑7) are **not** considered "features" for this rule — they are required infrastructure, always in scope.

---

## 7. Acceptance Criteria (MVP "Done")

The MVP is considered done when:

1. A new user can sign up, create a company, connect **one** system (QBO/Tally/Sheets), upload 5 invoices/receipts, review and post them successfully, with duplicate warnings working as designed.
2. All core user stories (section 3) are implemented and tested.
3. No critical bugs in the core flow. Double-clicking "Post" or retrying a failed post never creates a duplicate external record — verified with an explicit test.
4. Staging environment exists, mirrors production, and every change has passed through it before reaching production. CI is green on `main`.
5. Budget alerts and function-error alerts are configured and have been tested (a test alert has actually fired and been received).
6. Basic documentation exists: setup guide for the developer, simple user guide (1–2 pages) for beta users.
7. The system runs within free tier or the approved capped budget for at least **10 test companies** with ~50 docs each.

If any of these cannot be met, reduce **feature** scope (e.g., support only Sheets first) — never skip items 3–5.
