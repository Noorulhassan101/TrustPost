# Business & Domain Knowledge: How Offices Do Data Entry Today

This document gives you enough real‑world context to design a product that fits how offices actually work, without over‑engineering.

## Typical Data Entry Workflows

### 1. Accounting / Bookkeeping (Invoices & Receipts)

**Actors:**
- Office admin / bookkeeper
- Accountant (sometimes external)

**Typical flow (manual):**

1. Receive documents: vendor invoices via email (PDF), paper receipts from staff (physical or photos), supplier statements (PDF).
2. Store documents: save PDFs to a folder (local/Drive/SharePoint), keep paper receipts in a box/folder.
3. Open each document and read key fields: vendor/supplier name, invoice/receipt number, date, line items (sometimes), subtotal, tax, total, due date (for invoices).
4. Enter into system: log into accounting software (QuickBooks, Xero, Tally, Zoho Books), navigate to "Bills" or "Expenses", create a new record and type fields manually, attach the PDF/receipt image to the record (optional but common).
5. Reconcile later: match bills/expenses to bank transactions, fix errors if something was entered wrong.

**Pain points:**

- Repetitive typing of the same fields over and over.
- Mistakes in amounts, dates, vendor names.
- Lost or messy receipts.
- Time pressure at month‑end.
- **The same invoice getting entered twice** — usually because two staff members handle overlapping piles, or because someone re-processes a document after a system hiccup and can't tell if it already went in. This is consistently the #1 fear bookkeepers raise about any automation tool. It is treated as a hard product requirement (see FR‑duplicate detection and idempotent posting in `03_product_requirements_prd.md`), not an edge case.

**How automation should fit in:**

- User uploads or forwards invoices/receipts to the tool.
- Tool extracts fields and shows them in a simple table.
- Tool flags if a very similar document (same vendor + invoice number + amount) already exists for this company, before the user posts.
- User checks/corrects, then clicks "Post to [Accounting System]".
- Tool creates the bill/expense and attaches the document — and guarantees that clicking "Post" twice, or a network retry, never creates two records.
- User sees the record already in their accounting software.

---

### 2. Sales / Operations (Leads, Orders, Basic Forms)

**Actors:** Sales admin / ops coordinator

**Typical flow (manual):**

1. Receive forms: web lead forms (exported as CSV/PDF), email inquiries with details, paper forms (less common now, but still exists).
2. Extract info: name, email, phone, company, product interest, order details.
3. Enter into CRM or spreadsheet: open CRM (HubSpot, Salesforce, Zoho) or a Google Sheet, create a new lead/contact/order row, copy‑paste fields.

**Pain points:**

- Same data typed multiple times (CRM + sheet + email).
- Inconsistent formatting (names, phone numbers).
- Missed leads when backlog grows.

**Automation fit:** Upload PDFs/exports of forms, extract fields into structured records, push to CRM or sheet automatically after review. (Out of MVP scope — noted for future direction only.)

---

### 3. Procurement / Inventory (Purchase Orders, Delivery Challans)

Common in Pakistan (exporters, wholesalers):

**Documents:** Purchase orders (POs), delivery challans, commercial invoices, packing lists.

**Manual flow:**

1. Receive PDFs/paper from suppliers.
2. Open each doc, read: supplier name, doc number, date, items, quantities, rates, totals, taxes.
3. Enter into Tally or custom ERP, and Excel/Sheets for internal tracking.

**Pain points:** High volume of similar but not identical documents, complex line items, pressure to keep inventory and accounts accurate.

**Automation fit:** Upload docs, extract header + line items, push to Tally/ERP/Sheets after review. (Line items are post-MVP.)

---

## Key Data Fields (Common Across Documents)

You don't need to support every possible field at first. For MVP, focus on:

### Invoices (Vendor/Supplier)

- `vendor_name`
- `invoice_number`
- `invoice_date`
- `due_date` (optional for MVP)
- `subtotal`
- `tax_amount`
- `total_amount`
- `currency` (often PKR/USD)
- `line_items` (optional for MVP; phase 2)

### Receipts

- `merchant_name`
- `receipt_date`
- `total_amount`
- `tax_amount` (optional)
- `category` (user can set default, e.g., "Travel", "Office Supplies")

### Basic Forms / Leads

- `name`, `email`, `phone`, `company`, `message` / `notes`, `product_interest` (if present)

For MVP: support **header fields only** (no line items) for invoices/receipts. Add line items later.

---

## How Companies Think About "Automation"

- They don't care about AI/ML details. They care about: "Will this save me time?", "Will it break my books?", "Is it easy to use?"
- They prefer **human‑in‑the‑loop**: "Let me check before it posts." And a clear audit trail: "Which invoice created which bill?"
- They fear: wrong amounts posted automatically, **duplicates (same invoice entered twice)**, losing documents.

Design principles from this:

1. **Always allow review before posting** (at least in MVP).
2. Show **document + extracted data side‑by‑side**.
3. Keep UI language simple: "Invoice", "Receipt", "Post to [System]".
4. Provide **clear logs**: "Invoice #1234 → Bill #567 in QuickBooks".
5. **Surface possible duplicates before posting**, not after — a warning banner on the review screen, not a buried log entry discovered at month-end.

---

## Competitive Landscape (High‑Level)

You don't need a deep market report; just know:

- Many tools exist for invoice/receipt scanning (e.g., Dext, Receipt‑Bank, etc.), document AI (Google Document AI, AWS Textract, Azure Form Recognizer), and automation (Zapier, Make, etc.).
- Most are focused on one region or one system, and priced for larger companies or require multiple tools.

Your angle:

- **One simple tool** for invoices + receipts + basic forms.
- **US + Pakistan** focus, with connectors for QBO, Tally, Sheets.
- **Very low price**, easy onboarding, English‑first.
- **Trustworthy on duplicates and reliability** — a differentiator small competitors often get wrong.

You are not trying to beat enterprise suites. You are trying to be the **simplest thing that works** for small offices, without ever corrupting their books.

---

## Pricing & Value (For Your Own Planning)

Even if you start free/cheap, think in these terms:

- US: if you save a bookkeeper **10 hours/month** at $25/hour, that's $250 value. Charging $49–$149/month is an easy sell if it works.
- Pakistan: if you save **20–40 hours/month** at lower hourly rates, value is still huge. Charging PKR 2,000–10,000/month can be justified.

For MVP, you might offer a **free beta** to the first 10–20 companies in exchange for feedback, then introduce simple plans once the product is stable.

This document's purpose is to keep your agent grounded in **real workflows**, not abstract ideas.
