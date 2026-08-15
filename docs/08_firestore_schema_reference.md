# Firestore Schema Reference – EntryAI

This is the canonical, current schema — synced with `04_technical_requirements_and_architecture.md` §5–6 after the idempotency fix. If this file and `04_*` ever disagree, `04_*` wins; update this file to match.

Firestore is NoSQL. "Relationships" below are either **path-based nesting** (a collection lives under a parent document) or **reference fields** (a string field holding another document's ID) — there are no joins, so every read pattern is designed around this.

---

## `users/{uid}`

Document ID = Firebase Auth UID.

| Field | Type | Notes |
|---|---|---|
| `email` | string | |
| `companyId` | string | Reference to `companies/{companyId}` |
| `createdAt` | timestamp | |

---

## `companies/{companyId}`

| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `country` | string | `"US"` \| `"PK"` |
| `currency` | string | `"USD"` \| `"PKR"` |
| `createdAt` | timestamp | |
| `docsProcessedThisMonth` | number | Counter, reset monthly. Known write-hotspot at very high volume — fine at MVP scale (see `04_*` for the ceiling). |
| `monthlyDocCap` | number | Default 500. Enforced server-side, not just displayed. |

---

## `companies/{companyId}/members/{userId}`

(Or a top-level `companyUsers` collection with `companyId` + `userId` fields — either works; subcollection is the default choice.)

| Field | Type | Notes |
|---|---|---|
| `role` | string | `"admin"` \| `"reviewer"` |

---

## `companies/{companyId}/connections/{connectorType}`

Document ID = the connector type itself (e.g. `sheets`, `quickbooks`, `tally`) — this assumes **one connection per type per company** (MVP scope). If multiple connections of the same type are ever needed, this ID scheme must change.

| Field | Type | Notes |
|---|---|---|
| `type` | string | `"sheets"` \| `"quickbooks"` \| `"tally"` |
| `secretRef` | string | Pointer/name into Google Cloud Secret Manager. **Never store the actual credential value here.** |
| `config` | map | e.g. `{ sheetId, range }` for Sheets |
| `createdAt` | timestamp | |

---

## `companies/{companyId}/documents/{documentId}`

The core entity. Extracted data lives directly on this document — there is **no separate `extractionResults` collection** (settled decision: one result per document in MVP scope makes a subcollection pure overhead).

| Field | Type | Notes |
|---|---|---|
| `type` | string | `"invoice"` \| `"receipt"` |
| `status` | string | `"processing"` \| `"ready"` \| `"possible_duplicate"` \| `"posting"` \| `"posted"` \| `"error"` \| `"skipped"` \| `"quota_exceeded"` |
| `filePath` | string | Path in Firebase Storage |
| `fileType` | string | `"pdf"` \| `"jpg"` \| `"png"` |
| `uploadedBy` | string | Reference to `users/{uid}` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |
| `contentHash` | string | Duplicate-detection fingerprint, computed from normalized `(vendor_name, invoice_number, total_amount, invoice_date)` or `(merchant_name, receipt_date, total_amount)` |
| `duplicateOfDocumentId` | string, nullable | Reference to the matched earlier `documents/{id}` if flagged as a possible duplicate |
| `extractedData` | map | The extracted fields (`vendor_name`, `invoice_number`, `total_amount`, `currency`, etc. — see `02_business_and_domain_knowledge.md` for the full field list) |
| `confidence` | number, nullable | AI extraction confidence, 0–1 |
| `externalRecordId` | string, nullable | The QBO bill ID / sheet row ID / Tally voucher ID once posted. **Presence of this field is the idempotency guard** — see below. |
| `postAttemptedAt` | timestamp, nullable | Set inside the posting claim transaction; used to detect and self-heal a stale/crashed `posting` claim |
| `deletedAt` | timestamp, nullable | Soft-delete marker; purged 30 days after set |

**No separate idempotency-key field.** The idempotency key for posting is always simply the `documentId` itself — a second field storing the same value would be redundant. `externalRecordId` is the single source of truth for "has this been posted."

**Idempotent posting logic (must be transaction-safe, not read-then-write):**
1. **Claim** (inside a Firestore transaction): read the doc. If `externalRecordId` is set → abort, return the existing result. If `status = "posting"` and `postAttemptedAt` is recent (< 60s) → abort, return "in progress, try again shortly." Otherwise, write `status = "posting"` + `postAttemptedAt = now` in the same transaction. Firestore's transaction atomicity guarantees only one concurrent caller can win this.
2. **Post** (outside the transaction, only by the caller that won the claim): call the connector's `createRecord`. On success, write `externalRecordId` + `status = "posted"` in a second small transaction, and append an audit log entry. On failure, clear back to `status = "error"` with a message so a retry can re-claim.

---

## `companies/{companyId}/logs/{logId}`

| Field | Type | Notes |
|---|---|---|
| `documentId` | string, nullable | Reference to `documents/{id}` |
| `userId` | string | Reference to `users/{uid}` |
| `action` | string | `"uploaded"` \| `"reviewed"` \| `"posted"` \| `"duplicate_acknowledged"` \| `"error"` \| `"deleted"` |
| `details` | map | Keep to references/diffs, not full data snapshots — don't duplicate `extractedData` here |
| `createdAt` | timestamp | |

---

## Security Rules (summary)

- Every collection under `companies/{companyId}/...` is readable/writable only by users whose `companyId` matches.
- Next.js API Routes use the Admin SDK, which bypasses rules — every function must re-implement the same check in code via a shared `assertCompanyMember(uid, companyId)` helper. This is not optional.
- Secrets (`secretRef` targets) live in Secret Manager, never in Firestore, never in client code, never logged.

---

## Known Scaling Notes (accepted for MVP, revisit later)

- `docsProcessedThisMonth` is a single-document counter — fine up to Firestore's ~1 write/sec/doc ceiling, which is nowhere close at 1,000 docs/month/company. Move to a sharded counter if volume grows well beyond MVP scope.
- `connections/{connectorType}` assumes one connection per type per company — multi-connection support requires a schema change.
- Composite indexes for filtered document queries (type + status + date range) will need to be created as usage grows; Firestore surfaces this automatically with an auto-create link the first time a query needs one.
