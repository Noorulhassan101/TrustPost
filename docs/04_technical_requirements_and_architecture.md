# Technical Requirements & Architecture – MVP (Firebase)

This document defines the architecture and tech stack for the MVP. **Firebase is the single canonical backend** for this project — no other stack (Supabase, custom Postgres, etc.) should be introduced. All prior non-Firebase technical/roadmap drafts are superseded by this document and should be deleted from the repo.

## 1. Constraints (Hard)

- No new paid subscriptions beyond existing ones (Gemini Pro, etc.) without a hard, tested budget alert in place first (see §8).
- Free tiers first, for hosting, database, storage, auth, AI/OCR — small capped overage (Blaze plan) is allowed once budget alerts are proven to work.
- Must be buildable by **one CS student** in ~8–10 weeks part‑time (extended from the original 6–8 weeks to account for production hardening).
- Architecture should be **simple**, not microservices — but must include the environment separation, secrets handling, and CI/CD described below, since these are what make "simple" also "safe."

Any design that violates these must be rejected.

---

## 2. Environments

Three environments, each backed by its own Firebase project:

| Environment | Firebase project | Purpose |
|---|---|---|
| `dev` | local emulator suite (Auth, Firestore, Storage, Functions emulators) | day-to-day development, no real data, no real spend |
| `staging` | `entryai-staging` | mirrors production config; every change is deployed and smoke-tested here first; safe to use fake connector sandboxes (QBO sandbox, a test Google Sheet) |
| `production` | `entryai-prod` | real customer data |

Managed via `.firebaserc` project aliases (`dev`/`staging`/`production` mapped to the emulator/staging/prod project IDs) so all `firebase deploy` commands are explicit about target.

---

## 3. High‑Level Architecture

Simple **3‑tier architecture**, unchanged in shape from the original plan:

1. **Frontend + Backend** – Next.js app (UI, auth, document upload, review) using the Firebase SDK on the client and Firebase Admin SDK in Cloud Functions.
2. **Firebase Services** – Auth (email/password + Google), Firestore (main DB), Storage (raw files), Hosting (deploys Next.js).
3. **AI** – Gemini Pro API called from Cloud Functions only (never from the client).

### Logical Diagram (Text)

```text
[Browser]
   |
   | HTTPS
   v
[Frontend: Next.js on Firebase Hosting]
   - Auth UI (Firebase Auth)
   - Upload UI (Firebase Storage)
   - Review UI (incl. duplicate warnings)
   - Logs UI
   |
   | Callable Cloud Functions
   v
[Backend: Firebase Cloud Functions, Node.js/TypeScript]
   - Auth & company management (Firebase Admin SDK)
   - Document upload handling (Storage + Firestore)
   - Duplicate fingerprinting
   - Idempotent job orchestration (process doc, post to system)
   - Connector logic (QBO/Tally/Sheets)
   - Quota / cost circuit breaker
   |
   +--> [Firestore]        users, companies, connections, documents, extraction results, audit logs
   +--> [Firebase Storage]  raw PDFs/images
   +--> [Secret Manager]    Gemini API key, connector OAuth secrets
   +--> [AI Service: Gemini Pro API]   OCR + field extraction
   +--> [Cloud Monitoring / Logging]   error rates, alerts
   +--> [Cloud Billing Budgets]        spend alerts
```

**Backend approach:** Cloud Functions for Firebase (Node.js/TypeScript), using **v2 functions with `defineSecret`** for anything sensitive (see §7). Frontend calls these via callable functions. Secrets never reach the client; Firestore never stores plaintext credentials.

---

## 4. Tech Stack Choices

### 4.1 Frontend

- Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui.
- Firebase Auth (email/password + Google). Firebase Hosting.

### 4.2 Backend – Firebase Cloud Functions (v2)

Functions, all TypeScript, all with server-side auth + company-ownership checks:

- `createCompany({ name, country, currency })`
- `saveConnection(companyId, type, credentials, config)` — writes secret material to Secret Manager, not Firestore.
- `createUploadUrl({ companyId, fileType })`
- `processDocument({ companyId, documentId })` — extraction + fingerprinting.
- `updateExtraction({ companyId, documentId, data })`
- `postDocument({ companyId, documentId })` — idempotency key is always `documentId` itself; see §6 for the transaction-safe claim pattern
- `getLogs({ companyId, documentId? })`

### 4.3 Database – Firestore

Collections: `users`, `companies`, `companyUsers` (or `members` subcollection), `connections`, `documents`, `auditLogs`. Extracted data lives as a single field map directly on the `documents` doc (`documents.extractedData` + `documents.confidence`) — **not** a separate `extractionResults` collection or subcollection. There is always exactly one result per document in MVP scope, so a separate collection would only add a second read for no benefit; this was left ambiguous in earlier drafts and is now settled. Two additions to `documents` beyond the original plan: `contentHash` (duplicate fingerprint) and `externalRecordId` (idempotency — see §6).

### 4.4 Object Storage – Firebase Storage

`/companies/{companyId}/documents/{documentId}/original`. Upload via signed URL from `createUploadUrl`; `processDocument` triggered explicitly by the frontend after upload confirmation (simpler and easier to make idempotent than a Storage-finalize trigger for MVP).

### 4.5 AI / OCR

Gemini Pro (vision) via Cloud Functions only. `processDocument`:

1. Downloads file from Storage.
2. Checks the **global daily/monthly AI-call circuit breaker** (§8) before calling out — if tripped, sets `documents.status = quota_exceeded` instead of erroring silently, and the doc is retried once quota resets.
3. Sends to Gemini Pro with the invoice/receipt prompt.
4. Parses JSON response.
5. Computes `contentHash` fingerprint from normalized key fields.
6. Checks Firestore for an existing document in the same company with a matching/near-matching fingerprint; if found, sets `status = possible_duplicate` and stores the matched document's ID.
7. Otherwise sets `status = ready`.
8. On any error, retries once automatically (simple exponential backoff), then sets `status = error` with a message.

### 4.6 Connectors

`/functions/src/connectors/{sheets,quickbooks,tally}.ts`, common interface:

```ts
interface Connector {
  connect(config): Promise<void>;
  testConnection(): Promise<boolean>;
  createRecord(type: 'invoice' | 'receipt', data, idempotencyKey: string): Promise<{ externalId: string }>;
}
```

`createRecord` is responsible for idempotency at the connector level where the underlying API supports it (e.g., QBO supports a request-token-style dedupe pattern in some flows); where it doesn't (Sheets, Tally), idempotency is enforced in `postDocument` itself (§7).

For MVP, support **one connector live** (recommend Sheets first, per the roadmap), with the interface built so QBO/Tally are a drop-in addition later.

---

## 5. Data Model (Firestore)

### `users/{uid}`
`email`, `createdAt`, `companyId`

### `companies/{companyId}`
`name`, `country`, `currency`, `createdAt`, `docsProcessedThisMonth` (counter, reset monthly), `monthlyDocCap`

### `companies/{companyId}/members/{userId}` (or top-level `companyUsers`)
`role` ("admin" | "reviewer")

### `companies/{companyId}/connections/{connectorType}`
`type`, `secretRef` (pointer to Secret Manager entry — **not the credential itself**), `config` (e.g. `sheetId`, `range`), `createdAt`

### `companies/{companyId}/documents/{documentId}`
`type`, `status` ("processing" | "ready" | "possible_duplicate" | "posted" | "posting" | "error" | "skipped" | "quota_exceeded"), `filePath`, `fileType`, `uploadedBy`, `createdAt`, `updatedAt`, `contentHash`, `duplicateOfDocumentId` (nullable), `extractedData` (map, the extracted fields), `confidence`, `externalRecordId` (nullable — presence of this field **is** the idempotency guard; see §6), `postAttemptedAt` (nullable, set inside the posting transaction), `deletedAt` (nullable, for soft-delete)

Note: there is no separate `lastIdempotencyKey` field. The idempotency key for a post is always simply the `documentId` itself (see §6) — storing it again as a second field would just be a copy of data already available as the document's own ID, with no added meaning. `externalRecordId` already serves as the single source of truth for "has this been posted."

### `companies/{companyId}/logs/{logId}`
`documentId`, `userId`, `action` ("uploaded" | "reviewed" | "posted" | "duplicate_acknowledged" | "error" | "deleted"), `details`, `createdAt`

Firestore security rules enforce company isolation: a user may only read/write documents where their `companyId` matches. Cloud Functions using the Admin SDK bypass rules but must re-implement the same check in code on every call — this is not optional and should be a shared helper (`assertCompanyMember(uid, companyId)`) used by every function.

---

## 6. Processing Flow (Document Lifecycle)

1. **Upload**: frontend calls `createUploadUrl`, uploads via signed URL, then calls `processDocument`.
2. **Extraction** (`processDocument`): quota check → Gemini call → parse → fingerprint → duplicate check → Firestore write → status update.
3. **Review**: user views extracted fields; sees a duplicate warning banner if `status = possible_duplicate`, with a link to the matched document. Edits call `updateExtraction`.
4. **Acknowledge (if duplicate)**: user must explicitly confirm before posting; this is logged (`duplicate_acknowledged`).
5. **Post** (`postDocument`): the idempotency key is always simply the `documentId` — stable across every retry of the same logical post, no separate key field needed. **The check-then-post sequence must be transaction-safe, not just read-then-write in two separate steps**, or two near-simultaneous calls (a double-click, or a client retry firing while the first request is still in flight) can both pass the check before either has written the result, producing two external records. The implementation is a two-phase "claim, then post":

   - **Phase 1 — claim (inside a Firestore transaction):** read `documents/{id}`. If `externalRecordId` is already set, the transaction aborts and the function immediately returns the existing result — nothing else runs. If `status` is already `posting` and `postAttemptedAt` is recent (e.g., within the last 60 seconds), treat it as a concurrent in-flight attempt and return a "still processing, try again shortly" response rather than proceeding. Otherwise, within the *same transaction*, write `status = posting` and `postAttemptedAt = now`. Because Firestore transactions are atomic, only one concurrent caller can win this write; every other simultaneous caller re-reads the now-updated doc and takes the "already claimed" branch above instead.
   - **Phase 2 — post (outside the transaction, after the claim succeeds):** only the caller that won the claim calls the connector's `createRecord`. On success, write `externalRecordId` and `status = posted` in a second small transaction, and append the audit log entry.
   - **On connector failure:** clear the `posting` claim back to `status = error` with a message, so a manual retry can re-attempt the claim. The claim's staleness check above (the 60-second window) also self-heals a crashed function that claimed but never got to phase 2.

   This guarantees at most one external record is ever created per document, regardless of double-clicks, network retries, or two browser tabs — which is what FR‑18 in the PRD actually requires, not just the single-read check from the original draft.

---

## 7. Security Requirements

- Firebase Auth for all users; every Cloud Function verifies `context.auth` and calls `assertCompanyMember`.
- Firestore security rules restrict reads/writes to the caller's own `companyId`.
- **Secrets management**: Gemini API key and all connector OAuth client secrets/tokens are stored in **Google Cloud Secret Manager**, referenced in Cloud Functions v2 via `defineSecret(...)` — never as plain `functions:config` values, never in Firestore, never in `.env` files committed to the repo. `.env.example` in the repo contains only placeholder names, no real values, and a comment pointing to Secret Manager setup instructions.
- Per-company connector credentials (e.g., a customer's QBO refresh token) are also stored in Secret Manager, one secret per connection, referenced from Firestore by name only (`connections.{type}.secretRef`).
- No credentials or PII are ever logged (`console.log`) — code review checklist item.

---

## 8. Cost & Quota Management (Circuit Breakers)

Two independent layers, because per-company limits alone don't protect against a bug that spins across many companies:

1. **Per-company cap**: `companies.monthlyDocCap` (default 500), enforced in `processDocument` before calling Gemini — if a company is over cap, the doc is marked `quota_exceeded` with a clear user-facing message, not silently dropped.
2. **Global circuit breaker**: a single Firestore counter (or Cloud Monitoring metric) tracking total Gemini calls per day/month across all companies. If it crosses a hard ceiling you set (sized to stay inside free tier + a small buffer), new extraction calls are paused globally and queued, and you get an alert. This is the backstop against a runaway loop or malicious upload pattern.
3. **Billing budget alert**: a Google Cloud Billing budget configured on the project at multiple thresholds (e.g., 50%/90%/100% of a small monthly cap you choose, such as $10). This must be **tested** (a real alert email received) before onboarding any beta user — an untested alert is not a safeguard.
4. **Function-level guardrails**: max execution time and memory set conservatively on each function; Firestore/Storage usage monitored via the Firebase console budget/quota dashboards.

---

## 9. Backups & Data Retention

- **Firestore**: a scheduled weekly export (Cloud Scheduler + Firestore managed export) to a dedicated Storage bucket, retained for at least 4 weeks on a rolling basis. This is cheap and within free/low-cost tier at MVP scale.
- **Storage (documents)**: original files are the source of truth for re-extraction if Firestore data is ever lost; no separate backup needed beyond Storage's own durability, but soft-deleted documents are retained 30 days before permanent purge (per FR‑23 in the PRD) so accidental deletes are recoverable.
- Document deletion is soft (a `deletedAt` flag) with a scheduled purge function running after the retention window, not an immediate hard delete.

---

## 10. Testing

- **Unit tests** (Jest) for: fingerprinting/duplicate-matching logic, idempotent posting logic, connector interface implementations (mocked), extraction JSON parsing.
- **Emulator-based integration tests** for the Firebase Emulator Suite (Auth + Firestore + Storage + Functions) covering the core flow: upload → process → review → post, including a test that explicitly asserts double-posting is impossible under both a *sequential* retry (call, then call again) and a *concurrent* one (fire two `postDocument` calls for the same document at the same time via `Promise.all`) — the concurrent case is what actually exercises the transaction claim in §6 and is the one a naive read-then-write implementation fails.
- **Staging smoke test**: a short automated (or manual, documented) script run against `staging` after every deploy, before promoting to `production`: sign up, create company, connect Sheets sandbox, upload a sample invoice, review, post, confirm one row appears.

---

## 11. CI/CD Pipeline

GitHub Actions, two workflows:

1. **On every pull request**: install deps → lint → typecheck → run unit tests → run emulator integration tests. PRs cannot merge if this fails.
2. **On merge to `main`**:
   - Deploy to `staging` (Hosting + Functions + Firestore rules).
   - Run the staging smoke test.
   - If it passes, require a manual approval step (GitHub Environments protection rule) before deploying the same build to `production`.
   - On production deploy, run the smoke test again against `production` with a dedicated test company, then tag the release.

This gives you a real staging→production gate without adding infrastructure beyond what's already free (GitHub Actions free tier is generous enough for this project's scale).

---

## 12. Monitoring & Alerting

- **Cloud Monitoring** dashboard (or the Firebase console's built-in Functions metrics) tracking: function error rate, function latency (p50/p95), extraction failure rate, posting failure rate.
- **Alerting policies** (email at minimum, MVP-appropriate — no need for PagerDuty etc.):
  - Function error rate exceeds a threshold (e.g., >5% over 15 minutes).
  - Global AI-call circuit breaker approaching its ceiling (e.g., 80%).
  - Billing budget threshold reached (§8).
- These alerts must be tested end-to-end (trigger a deliberate test condition, confirm the email arrives) as part of Week 0/production-hardening setup, not assumed to work.

---

## 13. Deployment Plan

- Repo: GitHub (private).
- Firebase projects: `entryai-staging`, `entryai-prod`, plus local emulators for `dev`. All three enable Auth, Firestore, Storage, Hosting, Functions.
- `.firebaserc` defines the three aliases; `firebase deploy --only hosting,functions,firestore --project staging|production` used explicitly (never deploy without `--project`).
- Local: Firebase CLI + emulator suite for day-to-day dev; no real secrets needed locally (use emulator-local fake keys or a personal Gemini sandbox key stored outside the repo).
- CI: GitHub Actions as described in §11.
- `.env.example` documents secret **names** only; actual values live in Secret Manager per environment.

---

## 14. What the Agent Must Not Do

The agent must **not**:

- Propose paid services unless you explicitly change constraints, or propose them without a corresponding budget alert.
- Design complex microservices or Kubernetes setups.
- Add product features outside the requirements docs.
- Skip security basics (auth, isolation, encryption/secrets management of credentials).
- Skip the idempotency/duplicate-detection requirements to "save time" — these are core requirements, not optional hardening.
- Assume unlimited Firebase quotas; always design with the circuit breakers in §8 in mind.
- Introduce a different backend stack (Supabase, custom Postgres, etc.) — Firebase is final for this project.

If the agent suggests anything that conflicts with this doc, you must tell it to **re‑read and comply** with this file.
