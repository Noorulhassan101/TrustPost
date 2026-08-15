# User Guide – EntryAI (MVP)

This is a simple guide you can customize and give to beta users.

## What EntryAI Does

EntryAI helps you:

1. Upload invoices and receipts (PDFs or photos).
2. Automatically read key information (vendor, amount, date, etc.).
3. Warn you if a document looks like a duplicate of one you've already processed.
4. Let you review and correct the data.
5. Send it directly to your accounting system or Google Sheet — safely, so accidentally clicking "Post" twice never creates two records.

You still check everything before it's posted, so you stay in control.

---

## Getting Started

### 1. Create Your Account

1. Go to: `https://your-app-url.com`
2. Click **Sign Up**.
3. Enter your email and password (or use Google login if enabled).
4. Verify your email if required.

### 2. Create Your Company

1. After login, you'll be asked to create a company.
2. Enter: company name, country (US or Pakistan), currency (USD or PKR).
3. Click **Create**.

### 3. Connect Your System

You can connect one of: Google Sheets, QuickBooks Online (if enabled), Tally (if enabled).

#### Connect Google Sheets

1. In the dashboard, click **Connect System**.
2. Choose **Google Sheets**.
3. Follow the Google login and permission prompts.
4. Select the spreadsheet you want to use (or accept the default).
5. Confirm.

Your system is now connected.

---

## Uploading Documents

### Supported Files

- PDFs (invoices, receipts)
- Images: JPG, PNG (photos of receipts)
- Max size: 10 MB per file

### How to Upload

1. Go to the **Documents** page.
2. Click **Upload** or drag files into the upload box.
3. Wait a few seconds while the system reads your documents.

You'll see a list like:

- Invoice_123.pdf – Status: Ready for Review
- Receipt_456.jpg – Status: Possible Duplicate
- Receipt_789.jpg – Status: Ready for Review

---

## Reviewing and Posting

### Review a Document

1. Click on a document in the list.
2. You'll see: your document on the left (preview or download), extracted fields on the right (vendor, amount, date, etc.).
3. Check the fields — if something is wrong, edit it directly. If the document isn't valid (e.g., not an invoice), you can skip it.

### If You See a "Possible Duplicate" Warning

EntryAI compares every new document against what you've already processed. If it looks like you may have already entered this invoice or receipt, you'll see a warning banner with a link to the earlier document.

- Check the linked document — if it really is the same invoice, don't post again; you can skip it instead.
- If it's genuinely a different document that just happens to look similar, you can confirm and continue — this decision is recorded in your logs.

### Post to Your System

1. Once the data looks correct, click **Post to [System]**.
2. Wait a moment.
3. You'll see "Posted successfully" or an error message if something went wrong.
4. It's safe to click Post again if you're not sure it worked the first time — EntryAI will never create a second record for the same document.

For Google Sheets: a new row will appear in your sheet with the data.
For QuickBooks/Tally: a new bill/expense/voucher will be created (check your system to confirm).

---

## Viewing Logs

1. Go to the **Logs** page.
2. You'll see a list of actions: who uploaded which document, who posted it and when, any duplicate warnings that were reviewed, and any errors.

This helps you track what happened.

---

## Deleting a Document

If you need to remove a document (e.g., uploaded by mistake), an admin can delete it from the document's page. Deleted documents are kept for 30 days in case you need to recover one, then permanently removed.

---

## Tips & Best Practices

- Upload documents regularly (e.g., once a day or week) so you don't build a big backlog.
- Always review before posting, especially in the beginning.
- Pay attention to "Possible Duplicate" warnings — they exist to protect your books.
- If you see repeated mistakes (e.g., wrong field mapping), tell the support contact so they can improve the setup.

---

## Support

If you have questions or issues:

- Email: `support@yourdomain.com` (replace with your contact).
- Include: your company name, what you were trying to do, any error messages you saw.

---

## Limits (Beta)

During beta:

- There may be a limit on how many documents you can process per month.
- Some features may change based on feedback.

You'll be informed if limits affect you.
