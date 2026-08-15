# Development Roadmap & Milestones – MVP (Firebase, Production Posture)

This is the **single canonical roadmap**. It supersedes and replaces any earlier draft built on Supabase/Vercel/NextAuth — that draft should be deleted from the repo so the agent never sees two conflicting plans.

Assumptions: 10–15 hours/week, basic web dev already known, Firebase learned as you go.

**Total target: 8–10 weeks** (extended from the original 6–8 to account for staging/CI/CD, secrets management, idempotency, and monitoring — this is the cost of "production-ready" and is worth it).

---

## Week 0 – Preparation & Environment Setup (2–3 days)

**Goals:** Repo, three environments, and CI skeleton exist before any product code is written.

**Tasks:**

1. Create GitHub repo `entryai`.
2. Create **two** Firebase projects: `entryai-staging` and `entryai-prod`. Enable Auth, Firestore, Storage, Hosting, Functions on both. Set up local emulator suite for `dev`.
3. Configure `.firebaserc` with `staging`/`production` project aliases.
4. Install Firebase CLI, `firebase init` (Hosting + Functions + Firestore) targeting both projects.
5. Create Next.js app (TypeScript, App Router).
6. Set up **Google Cloud Secret Manager** on both projects; add placeholder secrets for the Gemini API key (real value only in staging/prod, not committed anywhere).
7. Write initial docs: copy all `.md` files into `docs/`.
8. `.env.example` with secret **names** only (no values), pointing to Secret Manager.
9. Set up GitHub Actions skeleton: a workflow that runs lint/typecheck on PR (tests come later once there's code to test).
10. Configure a **Google Cloud Billing budget alert** on both projects at a low threshold (e.g., $5) and send yourself a test alert to confirm it works.

**Deliverable:** Empty "Hello World" Next.js app deployed to `staging` via a manual `firebase deploy --project staging`, a passing CI lint check on a test PR, and a confirmed working budget alert.

---

## Week 1 – Auth & Company Setup

**Goals:** Users can sign up/login; users can create a company; basic dashboard exists — deployed to staging via the real pipeline for the first time.

**Tasks:**

1. Implement signup/login (email/password + Google) via Firebase Auth; session handling via `onAuthStateChanged`.
2. Firestore schema: `users`, `companies`, `companyUsers`/`members`.
3. Cloud Function: `createCompany({ name, country, currency })`, using the shared `assertCompanyMember` helper pattern from the start.
4. Pages: `/signup`, `/login`, `/dashboard`, "Create company" form.
5. Basic protection: redirect unauthenticated users; ensure each user belongs to a company.
6. Extend GitHub Actions: add unit test step (even a trivial one) so the pattern is established early; wire up the staging deploy job on merge to `main`.

**Deliverable:** Sign up, create a company, see a basic dashboard — reached via the CI/CD pipeline deploying to staging, not a manual deploy.

---

## Week 2 – Firestore Schema & Document Upload

**Goals:** Full core schema in Firestore; users can upload documents to Firebase Storage.

**Tasks:**

1. Extend schema: `connections`, `documents` (including `contentHash`, `lastIdempotencyKey`, `externalRecordId`, `deletedAt` fields from day one, even if unused yet), `extractionResults`, `auditLogs`.
2. Implement `createUploadUrl` (signed URL) and the upload flow (drag‑and‑drop zone).
3. Create `documents` doc with status `processing` on upload start.
4. Pages: `/documents` (list with status), upload button/zone.
5. Firestore security rules: enforce company isolation; add a rules-emulator test.

**Deliverable:** Upload a PDF/image, see it listed with status `processing`/`ready` (extraction still dummy), backed by a passing rules test in CI.

---

## Week 3 – AI Extraction + Duplicate Detection

**Goals:** Real AI extraction via Gemini Pro; fingerprinting and duplicate detection working; quota circuit breaker in place from the start (not bolted on later).

**Tasks:**

1. Implement `processDocument`: download file → global quota check → call Gemini Pro vision → parse JSON → compute `contentHash` → check for existing matching document in the company → set status (`ready` / `possible_duplicate` / `error` / `quota_exceeded`).
2. Define prompts for Invoices and Receipts.
3. Review UI (`/documents/[id]`): file preview, editable extracted-fields form, and a duplicate-warning banner when applicable.
4. `updateExtraction` function for saving user edits.
5. Unit tests for the fingerprinting/duplicate-matching logic.

**Deliverable:** Upload an invoice/receipt → see extracted fields, and uploading the same invoice twice correctly triggers a duplicate warning on the second one.

---

## Week 4 – Connector (Sheets First) with Idempotent Posting

**Goals:** One connector working end‑to‑end, with posting guaranteed idempotent from the first implementation — not retrofitted.

**Tasks:**

1. Set up Google Cloud project for Sheets API + OAuth credentials (can reuse the Firebase-linked GCP project).
2. Implement `connectSheets` and the `sheets` connector (`testConnection`, `createRecord`).
3. Implement `postDocument`: check `documents.externalRecordId` first (idempotency short-circuit) before calling the connector; on success, store `externalRecordId`, set `status = posted`, write audit log.
4. UI: "Connect Google Sheets" page; `/documents/[id]` "Post to Sheets" button with duplicate-acknowledgment step if applicable.
5. Unit + emulator test that explicitly asserts: calling `postDocument` twice (simulating a double-click) results in exactly one row in the target sheet.

**Deliverable:** Connect a Google Sheet, upload an invoice/receipt, review (acknowledging duplicate warning if shown), post → exactly one new row appears, even if you click Post twice.

---

## Week 5 – Polish, Logs, and Hardening Pass 1

**Goals:** Smooth flow for beta users; audit logs; validation; per-company quota enforcement.

**Tasks:**

1. `/logs` page showing recent actions, including duplicate-acknowledgment entries.
2. Clear error messages for extraction failures, posting failures, and quota-exceeded states.
3. Validation: required fields present before posting.
4. Per-company usage counter (`docsProcessedThisMonth`) enforced server-side against `monthlyDocCap`, not just displayed.
5. UI polish: loading states, toasts, simple onboarding tips.

**Deliverable:** A coherent, usable app a friendly beta user could follow with a short guide, with quota limits actually enforced (test by lowering the cap and confirming the block behavior).

---

## Week 6 – Production Hardening Pass 2 (Backups, Monitoring, Full CI/CD Gate)

**Goals:** The parts that make this genuinely production-ready rather than a well-built prototype.

**Tasks:**

1. Set up the scheduled weekly Firestore export to Storage (backups).
2. Implement soft-delete + scheduled purge function for document deletion (FR‑23).
3. Set up Cloud Monitoring dashboard for function error rate/latency; configure and **test** the error-rate and quota-approaching alerts.
4. Finish the full GitHub Actions pipeline: PR checks → merge to `main` → auto-deploy to staging → automated smoke test → manual approval gate → deploy to production → smoke test again.
5. Write and automate the staging smoke test script (upload → process → review → post against a sandbox connector).
6. Security pass: confirm no secrets in source, no credentials in logs, Firestore rules cover every collection, re-run rules emulator tests.

**Deliverable:** A real staging→production pipeline that has actually been exercised end-to-end at least once, backups running on schedule, and alerts confirmed to fire.

---

## Week 7 – Optional Second Connector (QBO or Tally)

**Goals (choose ONE):** Add QuickBooks Online or Tally, using the same idempotent-posting pattern established in Week 4 — no new pattern needed, just a new implementation of the `Connector` interface.

**Tasks (if QBO):** set up QuickBooks developer app + sandbox, implement OAuth flow (tokens via Secret Manager), map fields to Bill/Expense, add "Connect QuickBooks" page, test in sandbox including the double-post idempotency test.

**Tasks (if Tally):** set up Tally with Developer Kit, implement voucher-creation API calls, add "Connect Tally" page with local setup instructions, test against your own instance including the idempotency test.

**Deliverable:** A second connector working end‑to‑end with the same reliability guarantees as Sheets.

---

## Week 8–10 – Beta, Bug Fixes, and Documentation

**Goals:** 3–5 friendly beta users (US or Pakistan); fix critical bugs; finalize docs.

**Tasks:**

1. Recruit beta users.
2. Provide a short onboarding guide (`07_user_guide_template.md` as the base) and screenshots/video.
3. Collect feedback: what's confusing, what breaks, what they actually need.
4. Fix critical bugs and obvious UX issues found in real use.
5. Confirm monitoring caught any real incidents that occurred during beta (if nothing fired and something broke, that's a monitoring gap to fix before calling this done).
6. Write `README.md` (run locally, deploy to each environment) and finalize `USER_GUIDE.md`.

**Deliverable:** A stable MVP used by real people, deployed through a tested CI/CD pipeline, with monitoring/alerting and backups actually running — and a clear path to iterate.

---

## Agent Boundaries for Roadmap

The agent must:

- Keep all plans within this 8–10 week, single‑developer scope.
- Not propose adding more connectors or product features until MVP is done.
- Not suggest architectures that require multiple backend platforms or services beyond Firebase + the connectors named here.
- Treat Firebase (only) as the core backend across all environments.
- Treat this roadmap as the **default plan**; any deviation must be explicitly approved by you.

If the agent suggests a different timeline or scope, it must:

1. Explain why the current plan is insufficient.
2. Show how the new plan still respects: no uncontrolled paid services, single developer, MVP feature scope, and the production-hardening requirements in `04_technical_requirements_and_architecture.md`.

Otherwise, it must stick to this roadmap.
