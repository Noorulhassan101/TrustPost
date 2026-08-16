"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { DocumentEntry, ExtractionResult } from "@/lib/types/schema";
import { ArrowLeft, Save, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { computeContentHash } from "@/lib/utils/fingerprint";
import { postRecord } from "@/app/actions/sheets";
import { StatusBanner } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, companyId, loading } = useAuth();
    const router = useRouter();

    const [documentEntry, setDocumentEntry] = useState<DocumentEntry | null>(null);
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [posting, setPosting] = useState(false);
    const [formData, setFormData] = useState<Partial<ExtractionResult>>({});

    useEffect(() => {
        if (!loading && !user) router.push("/login");
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
                    if (data.extractionResult) setFormData(data.extractionResult);
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
            const newHash = await computeContentHash(formData as Record<string, unknown>);
            const docRef = doc(db, "companies", companyId, "documents", id);
            await updateDoc(docRef, {
                extractionResult: formData,
                contentHash: newHash,
                status: "ready",
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
        if (documentEntry.externalRecordId) {
            alert("This document has already been posted to your accounting system.");
            return;
        }

        setPosting(true);
        try {
            const compRef = doc(db, "companies", companyId);
            const compSnap = await getDoc(compRef);
            if (!compSnap.exists()) throw new Error("Company not found.");

            const compData = compSnap.data();
            const planTier = compData.planTier || "free";

            // Check export limits for free plan
            const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
            let currentExportCount = compData.exportCount || 0;
            const lastExportMonth = compData.lastExportMonth || currentMonth;

            if (lastExportMonth !== currentMonth) {
                currentExportCount = 0;
            }

            if (planTier === "free" && currentExportCount >= 10) {
                alert("You have reached your Free plan limit of 10 exports per month! Please upgrade to Pro to unlock unlimited exports.");
                router.push("/#pricing");
                return;
            }

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

            // Update document
            const docRef = doc(db, "companies", companyId, "documents", id);
            await updateDoc(docRef, {
                status: "posted",
                externalRecordId: result.updatedRange || "posted_unknown_row",
                postedAt: serverTimestamp()
            });

            // Update company quota
            await updateDoc(compRef, {
                exportCount: currentExportCount + 1,
                lastExportMonth: currentMonth
            });

            alert("Successfully posted to Google Sheets!");
            setDocumentEntry({ ...documentEntry, status: "posted", externalRecordId: result.updatedRange || "posted" });
        } catch (e: unknown) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Failed to post to Google Sheets");
        } finally {
            setPosting(false);
        }
    };

    if (loading || fetching) return (
        <div className="flex h-screen items-center justify-center bg-[var(--background)]">
            <div className="w-8 h-8 border-[3px] border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
    );
    if (!documentEntry) return <div className="flex h-screen items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)]">Document not found</div>;

    const isPdf = documentEntry.fileName.toLowerCase().endsWith(".pdf");

    return (
        <div className="h-screen bg-[var(--background)] flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-[var(--card)] border-b-[2px] border-[var(--border)] px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/documents" className="p-2 hover:bg-[var(--muted)] rounded-full text-[var(--muted-foreground)] transition-all border-[2px] border-transparent hover:border-[var(--border)]">
                        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                    </Link>
                    <h1 className="text-lg font-bold text-[var(--foreground)] truncate max-w-md" style={{ fontFamily: "var(--font-heading)" }}>
                        {documentEntry.fileName}
                    </h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 min-h-0 p-6 flex gap-6 overflow-hidden">
                {/* Left: Document Preview */}
                <div className="w-1/2 bg-[var(--foreground)] rounded-[var(--radius-lg)] overflow-hidden border-[2px] border-[var(--foreground)] flex flex-col relative h-full">
                    {isPdf ? (
                        <iframe src={documentEntry.fileUrl} className="w-full h-full border-none" title="PDF Preview" />
                    ) : (
                        <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={documentEntry.fileUrl} alt="Document Preview" className="max-w-full max-h-full rounded-[var(--radius-sm)]" />
                        </div>
                    )}
                </div>

                {/* Right: Extraction Form — RESTRAINT RULES: flat, no hard shadow, no bounce */}
                <div className="w-1/2 bg-[var(--card)] rounded-[var(--radius-md)] border-[2px] border-[var(--border)] overflow-hidden flex flex-col relative h-full animate-fade-in">

                    {/* Status Banners — 3-way color distinction */}
                    {documentEntry.status === "possible_duplicate" && (
                        <StatusBanner status="possible_duplicate">
                            <h3 className="text-sm font-bold">Possible Duplicate Detected!</h3>
                            <p className="text-xs mt-1 opacity-80">Our system found another document with identical core information. Please verify carefully before saving.</p>
                        </StatusBanner>
                    )}

                    {documentEntry.status === "error" && (
                        <StatusBanner status="error">
                            <h3 className="text-sm font-bold">Extraction Failed</h3>
                            <p className="text-xs mt-1 opacity-80">We couldn&apos;t automatically read data from this file. You&apos;ll need to enter it manually below.</p>
                        </StatusBanner>
                    )}

                    {documentEntry.status === "ready" && (
                        <StatusBanner status="ready">
                            <h3 className="text-sm font-bold">Ready for Review</h3>
                            <p className="text-xs mt-1 opacity-80">Data has been successfully extracted. Verify the fields below and post to your accounting system when ready.</p>
                        </StatusBanner>
                    )}

                    {documentEntry.status === "posted" && (
                        <StatusBanner status="posted">
                            <h3 className="text-sm font-bold">Posted</h3>
                            <p className="text-xs mt-1 opacity-80">This document has been finalized and posted to your connected system.</p>
                        </StatusBanner>
                    )}

                    <div className="p-6 flex-1 overflow-y-auto hidden-scrollbar min-h-0">
                        <h2 className="text-base font-bold text-[var(--foreground)] mb-6 border-b-[2px] border-[var(--border)] pb-3" style={{ fontFamily: "var(--font-heading)" }}>Extracted Information</h2>

                        <form id="extraction-form" onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Vendor Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.vendor_name || ""}
                                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                                    className="w-full px-4 py-2.5 border-[2px] border-[#CBD5E1] rounded-[var(--radius-md)] focus:border-[var(--accent)] focus:shadow-pop focus:outline-none text-[var(--foreground)] font-medium text-sm bg-[var(--input)] transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Invoice Number</label>
                                    <input
                                        type="text"
                                        value={formData.invoice_number || ""}
                                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                        className="w-full px-4 py-2.5 border-[2px] border-[#CBD5E1] rounded-[var(--radius-md)] focus:border-[var(--accent)] focus:shadow-pop focus:outline-none text-[var(--foreground)] font-medium text-sm bg-[var(--input)] transition-all"
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Invoice Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.invoice_date || ""}
                                        onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                                        className="w-full px-4 py-2.5 border-[2px] border-[#CBD5E1] rounded-[var(--radius-md)] focus:border-[var(--accent)] focus:shadow-pop focus:outline-none text-[var(--foreground)] font-medium text-sm bg-[var(--input)] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Total Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.total_amount || ""}
                                        onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-2.5 border-[2px] border-[#CBD5E1] rounded-[var(--radius-md)] focus:border-[var(--accent)] focus:shadow-pop focus:outline-none text-[var(--foreground)] font-bold text-sm bg-[var(--input)] transition-all tabular-nums"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Currency</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.currency || ""}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2.5 border-[2px] border-[#CBD5E1] rounded-[var(--radius-md)] focus:border-[var(--accent)] focus:shadow-pop focus:outline-none text-[var(--foreground)] font-medium text-sm bg-[var(--input)] transition-all"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Fields Section */}
                            {formData.dynamic_fields && formData.dynamic_fields.length > 0 && (
                                <div className="mt-8 border-t-[2px] border-dashed border-[var(--border)] pt-6 space-y-4">
                                    <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--accent)]">Additional Details (AI Detected)</h3>

                                    {formData.dynamic_fields.map((field, index) => (
                                        <div key={index} className="flex flex-col gap-1.5 group">
                                            <input
                                                type="text"
                                                value={field.key}
                                                onChange={(e) => {
                                                    const newFields = [...formData.dynamic_fields!];
                                                    newFields[index].key = e.target.value;
                                                    setFormData({ ...formData, dynamic_fields: newFields });
                                                }}
                                                className="block text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] bg-transparent border-none p-0 focus:outline-none focus:text-[var(--accent)] w-full transition-colors"
                                            />
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    value={field.value}
                                                    onChange={(e) => {
                                                        const newFields = [...formData.dynamic_fields!];
                                                        newFields[index].value = e.target.value;
                                                        setFormData({ ...formData, dynamic_fields: newFields });
                                                    }}
                                                    className="flex-1 px-4 py-2 border-[2px] border-[#CBD5E1] rounded-[var(--radius-md)] focus:border-[var(--accent)] focus:shadow-pop focus:outline-none text-[var(--foreground)] font-medium text-sm bg-[var(--input)] transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newFields = formData.dynamic_fields!.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, dynamic_fields: newFields });
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center shrink-0 border-[2px] border-transparent text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/5 hover:border-[var(--destructive)]/20 rounded-[var(--radius-md)] transition-colors"
                                                    title="Remove field"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {formData.raw_confidence && (
                                <div className="pt-2">
                                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] font-bold bg-[var(--muted)] px-3 py-1.5 rounded-full border-[2px] border-[var(--border)]">
                                        AI Confidence: {Math.round((formData.raw_confidence as number) * 100)}%
                                    </span>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Action Bar */}
                    <div className="p-4 bg-[var(--muted)]/50 border-t-[2px] border-[var(--border)] flex justify-end shrink-0 gap-3">
                        {documentEntry.status === "ready" && (
                            <Button
                                type="button"
                                onClick={handlePostToSheets}
                                disabled={posting || saving}
                            >
                                <Send className="w-4 h-4" />
                                {posting ? "Posting..." : "Post to Sheets"}
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            type="submit"
                            form="extraction-form"
                            disabled={saving || documentEntry.status === "posted"}
                        >
                            <Save className="w-4 h-4" />
                            {saving ? "Saving..." : "Review & Save"}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
