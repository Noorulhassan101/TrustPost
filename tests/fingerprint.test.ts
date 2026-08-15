import { computeContentHash } from "../src/lib/utils/fingerprint";
import * as assert from "assert";

async function runTests() {
    console.log("Running Fingerprint Identicality Tests...");

    const extraction1 = {
        vendor_name: "  Acme Corp ",
        invoice_number: "INV-1234",
        invoice_date: "2024-01-01",
        total_amount: 150.50,
        currency: "usd",
        raw_confidence: 0.95
    };

    // Testing case insensitivity, whitespace trimming, string formats, 
    // and completely omitting/changing subjective AI confidence scores.
    const extraction2 = {
        vendor_name: "acme corp",
        invoice_number: "inv-1234",
        invoice_date: " 2024-01-01 ",
        total_amount: "150.5",
        currency: " USD ",
        raw_confidence: 0.20
    };

    const hash1 = await computeContentHash(extraction1);
    const hash2 = await computeContentHash(extraction2);

    console.log(`Hash 1 (Original Input): ${hash1}`);
    console.log(`Hash 2 (Sloppy/Different Confidence Input): ${hash2}`);

    assert.strictEqual(hash1, hash2, "Hashes should match exactly despite formatting differences and confidence scores.");

    console.log("\n✅ Test Passed: Fingerprint deterministic duplicate detection handles normalization elegantly!");
}

runTests().catch(console.error);
