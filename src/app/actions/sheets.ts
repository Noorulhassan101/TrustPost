"use server";

import { google } from "googleapis";
import { DocumentEntry } from "@/lib/types/schema";

/**
 * Validates Google Credentials and initializes a Sheets API client
 */
function getSheetsClient() {
    // Next.js .env.local loader sometimes preserves the double quotes as literal string characters
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.replace(/"/g, "");
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/"/g, "")?.replace(/\\n/g, "\n");

    if (!clientEmail || !privateKey) {
        throw new Error("Google API credentials are missing from the environment.");
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    return google.sheets({ version: "v4", auth });
}

/**
 * Tests connection by fetching basic spreadsheet metadata
 */
export async function testConnection(spreadsheetId: string) {
    try {
        const sheets = getSheetsClient();
        const response = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        if (response.status === 200) {
            return { success: true, title: response.data.properties?.title };
        }
        return { success: false, error: "Failed to access spreadsheet" };
    } catch (error: any) {
        console.error("Sheets Test Connection Error:", error);
        return { success: false, error: error.message || "Failed to access spreadsheet" };
    }
}

/**
 * Appends a highly structured row based on the extracted AI schema
 */
export async function postRecord(doc: DocumentEntry, spreadsheetId: string) {
    try {
        const sheets = getSheetsClient();

        // Ensure Extraction Data is present
        const ext = doc.extractionResult;
        if (!ext) {
            throw new Error("Cannot post a document with no extracted data");
        }

        // Check if headers exist
        const checkRange = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "A1:F1"
        });

        if (!checkRange.data.values || checkRange.data.values.length === 0) {
            // Document is empty, initialize headers
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: "A:F",
                valueInputOption: "USER_ENTERED",
                insertDataOption: "INSERT_ROWS",
                requestBody: {
                    values: [["Invoice Date", "Vendor Name", "Invoice Number", "Total Amount", "Currency", "TrustPost Ref ID"]]
                }
            });
        }

        const values = [
            [
                ext.invoice_date || "N/A",
                ext.vendor_name || "Unknown Vendor",
                ext.invoice_number || "N/A",
                ext.total_amount || 0,
                ext.currency || "USD",
                doc.id // Internal unique ID reference
            ]
        ];

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "A:F",
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values }
        });

        if (response.status === 200) {
            return {
                success: true,
                updatedRange: response.data.updates?.updatedRange
            };
        }
        return { success: false, error: "Failed to append to spreadsheet" };

    } catch (error: any) {
        console.error("Sheets Post Error:", error);
        return { success: false, error: error.message || "Failed to post to spreadsheet" };
    }
}
