"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { DocumentEntry, ExtractionResult } from "@/lib/types/schema";
import { ArrowLeft, AlertTriangle, CheckCircle, Save, XCircle, Send } from "lucide-react";
import Link from "next/link";
import { computeContentHash } from "@/lib/utils/fingerprint";
import { postRecord } from "@/app/actions/sheets";

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, companyId, loading } = useAuth();
    const router = useRouter();

    const [documentEntry, setDocumentEntry] = useState<DocumentEntry | null>(null);
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [posting, setPosting] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<ExtractionResult>>({});

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!companyId || !id) return;

        const fetchDoc = async () => {
            try {
                const docRef = doc(db, "companies", companyId, "documents", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() } as DocumentEntry;
                    setDocumentEntry(data);
                    if (data.extractionResult) {
                        setFormData(data.extractionResult);
                    }
                } else {
                    console.error("Document not found");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setFetching(false);
            }
        };

        fetchDoc();
    }, [companyId, id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId || !documentEntry) return;

        setSaving(true);
        try {
            // Re-compute the fingerprint hash just in case the edits fixed the duplicate!
            const newHash = await computeContentHash(formData as Record<string, unknown>);

            const docRef = doc(db, "companies", companyId, "documents", id);
            await updateDoc(docRef, {
                extractionResult: formData,
                contentHash: newHash, // updated fingerprint
                status: "ready",      // Clear any 'possible_duplicate' or 'error' state upon explicit manual save
                updatedAt: serverTimestamp()
            });

            alert("Changes saved and document finalized!");
            setDocumentEntry({ ...documentEntry, extractionResult: formData as ExtractionResult, status: "ready" });
        } catch (err) {
            console.error(err);
            alert("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const handlePostToSheets = async () => {
        if (!companyId || !documentEntry || documentEntry.status === "posted") return;

        // STRICT IDEMPOTENCY CHECK - safely prevent double posts regardless of race conditions
        if (documentEntry.externalRecordId) {
            alert("This document has already been posted to your accounting system.");
            return;
        }

        setPosting(true);
        try {
            const connRef = doc(db, "companies", companyId, "connections", "google_sheets");
            const connSnap = await getDoc(connRef);

            if (!connSnap.exists() || !connSnap.data().spreadsheetId) {
                throw new Error("No Google Sheet configured. Please visit Connections Settings.");
            }

            const sheetId = connSnap.data().spreadsheetId;
            const result = await postRecord(documentEntry, sheetId);

            if (!result.success) {
                throw new Error(result.error || "Failed to post to Google Sheets");
            }

            const docRef = doc(db, "companies", companyId, "documents", id);
            await updateDoc(docRef, {
                status: "posted",
                externalRecordId: result.updatedRange || "posted_unknown_row",
                postedAt: serverTimestamp()
            });

            alert("Successfully posted to Google Sheets!");
            setDocumentEntry({ ...documentEntry, status: "posted", externalRecordId: result.updatedRange || "posted" });

        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to post to Google Sheets");
        } finally {
            setPosting(false);
        }
    };

    if (loading || fetching) return <div className="flex h-screen items-center justify-center">Loading Data...</div>;
    if (!documentEntry) return <div className="flex h-screen items-center justify-center">Document not found</div>;

    const isPdf = documentEntry.fileName.toLowerCase().endsWith(".pdf");

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/documents" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 truncate max-w-md">
                        {documentEntry.fileName}
                    </h1>
                </div>
            </header>

            <main className="flex-1 p-6 flex gap-6 overflow-hidden max-h-[calc(100vh-73px)]">
                {/* Left Side: Document Preview */}
                <div className="w-1/2 bg-gray-800 rounded-xl overflow-hidden shadow-inner flex flex-col relative h-full">
                    {isPdf ? (
                        <iframe
                            src={documentEntry.fileUrl}
                            className="w-full h-full border-none"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="w-full h-full overflow-auto object-contain flex items-center justify-center p-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={documentEntry.fileUrl}
                                alt="Document Preview"
                                className="max-w-full max-h-full rounded-md shadow-md"
                            />
                        </div>
                    )}
                </div>

                {/* Right Side: Extraction Form */}
                <div className="w-1/2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto hidden-scrollbar flex flex-col relative h-full">

                    {/* Status Banners */}
                    {documentEntry.status === "possible_duplicate" && (
                        <div className="bg-orange-50 border-b border-orange-200 p-4 shrink-0">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-bold text-orange-800">Possible Duplicate Detected!</h3>
                                    <p className="text-xs text-orange-700 mt-1">Our system found another document in your workspace with identical core information (Vendor, Invoice Number, Date, Amount). Please verify carefully before saving.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {documentEntry.status === "error" && (
                        <div className="bg-red-50 border-b border-red-200 p-4 shrink-0">
                            <div className="flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-bold text-red-800">Extraction Failed</h3>
                                    <p className="text-xs text-red-700 mt-1">We couldn't automatically read data from this file. You'll need to enter it manually below.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {documentEntry.status === "ready" && (
                        <div className="bg-green-50 border-b border-green-200 p-4 shrink-0">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-bold text-green-800">Ready for Review</h3>
                                    <p className="text-xs text-green-700 mt-1">Data has been successfully extracted. Verify the fields below and post to your accounting system when ready.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {documentEntry.status === "posted" && (
                        <div className="bg-blue-50 border-b border-blue-200 p-4 shrink-0">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-bold text-blue-800">Posted</h3>
                                    <p className="text-xs text-blue-700 mt-1">This document has been finalized and securely posted to your connected system.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-6 flex-1">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6 border-b pb-2">Extracted Information</h2>

                        <form id="extraction-form" onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.vendor_name || ""}
                                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                                    <input
                                        type="text"
                                        value={formData.invoice_number || ""}
                                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium"
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.invoice_date || ""}
                                        onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.total_amount || ""}
                                        onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.currency || ""}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium"
                                    />
                                </div>
                            </div>

                            {formData.raw_confidence && (
                                <div className="pt-2">
                                    <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded inline-flex items-center gap-1 border border-gray-200">
                                        AI Confidence: {Math.round((formData.raw_confidence as number) * 100)}%
                                    </span>
                                </div>
                            )}

                        </form>
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0 gap-3">
                        {documentEntry.status === "ready" && (
                            <button
                                type="button"
                                onClick={handlePostToSheets}
                                disabled={posting || saving}
                                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition shadow-sm disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                <span>{posting ? 'Posting...' : 'Post to Sheets'}</span>
                            </button>
                        )}
                        <button
                            type="submit"
                            form="extraction-form"
                            disabled={saving || documentEntry.status === "posted"}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition shadow-sm disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Saving...' : 'Review & Save'}</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
