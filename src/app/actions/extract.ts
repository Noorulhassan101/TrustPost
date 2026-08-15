"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const INVOICE_PROMPT = `
Extract the following fields from this invoice image and return ONLY a valid JSON object matching this schema exactly:
{
  "vendor_name": "string (the company issuing the invoice, keep concise)",
  "invoice_number": "string (the invoice ID/number, use null if none)",
  "invoice_date": "YYYY-MM-DD",
  "total_amount": number (just the float amount, use 0 if not found),
  "currency": "string (e.g. USD, EUR, PKR)",
  "raw_confidence": number (your confidence in extraction accuracy, 0-1)
}
Return plain JSON with no markdown wrapping. Do not include \`\`\`json or \`\`\`.
`;

const RECEIPT_PROMPT = `
Extract the following fields from this receipt image and return ONLY a valid JSON object matching this schema exactly:
{
  "vendor_name": "string (the store/vendor name)",
  "invoice_number": "string (the receipt ID/number, use null if none)",
  "invoice_date": "YYYY-MM-DD",
  "total_amount": number (just the float amount, use 0 if not found),
  "currency": "string (e.g. USD, EUR, PKR)",
  "raw_confidence": number (your confidence in extraction accuracy, 0-1)
}
Return plain JSON with no markdown wrapping. Do not include \`\`\`json or \`\`\`.
`;

export async function extractDocument({ fileUrl, type }: { fileUrl: string, type: 'invoice' | 'receipt' | 'unknown' }) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.includes("your_real_api_key_here")) {
        return {
            success: false,
            error: "GEMINI_API_KEY is missing! Please configure your .env.local file with a valid Google AI Studio key."
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const imageResp = await fetch(fileUrl);
        if (!imageResp.ok) throw new Error("Failed to fetch image from Storage");

        const arrayBuffer = await imageResp.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");
        const contentType = imageResp.headers.get("content-type") || "image/jpeg";

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: contentType
            }
        };

        const prompt = type === "receipt" ? RECEIPT_PROMPT : INVOICE_PROMPT;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();

        // Clean JSON from markdown if necessary
        const cleanedJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();

        const parsed = JSON.parse(cleanedJson);
        return { success: true, data: parsed };
    } catch (e: unknown) {
        console.error("Gemini Extraction Error:", e);
        return { success: false, error: (e as Error).message };
    }
}
