import { Timestamp, FieldValue } from "firebase/firestore";

export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: Timestamp;
}

export interface Company {
    id?: string; // from doc id
    name: string;
    country: "US" | "PK";
    currency: "USD" | "PKR";
    connectedSystem?: "QBO" | "TALLY" | "SHEETS";
    planTier?: "free" | "pro";
    createdAt: Timestamp;
}

export interface CompanyMember {
    uid: string;
    role: "admin" | "reviewer";
    joinedAt: Timestamp;
}

export type DocumentStatus = "processing" | "ready" | "possible_duplicate" | "error" | "posted";
export type DocumentType = "invoice" | "receipt" | "unknown";

export interface ExtractionResult {
    vendor_name?: string;
    invoice_number?: string;
    invoice_date?: string;
    total_amount: number | null;
    currency: string | null;
    raw_confidence: number;
    dynamic_fields?: { key: string; value: string | number }[];
    [key: string]: unknown;
}

export interface DocumentEntry {
    id?: string; // Firestore document ID
    companyId: string;
    type: DocumentType;
    status: DocumentStatus;
    uploadedBy: string; // user ID
    fileName: string;
    fileUrl: string; // Storage URL
    storagePath: string; // Reference to Firebase Storage file
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;

    // Extraction & Idempotency fields
    extractionResult?: ExtractionResult;
    contentHash?: string;
    lastIdempotencyKey?: string;
    externalRecordId?: string;
    deletedAt?: Timestamp | null;
}

export interface Connection {
    id?: string;
    companyId: string;
    type: "QBO" | "TALLY" | "SHEETS";
    status: "connected" | "disconnected" | "error";
    metadata?: Record<string, unknown>;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface AuditLog {
    id?: string;
    companyId: string;
    documentId: string;
    action: string;
    performedBy: string; // User ID
    timestamp: Timestamp;
    details?: Record<string, unknown>;
}
