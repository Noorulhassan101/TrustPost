"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, ArrowRight } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentEntry } from "@/lib/types/schema";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";

export default function DocumentsPage() {
    const { user, companyId, loading } = useAuth();
    const router = useRouter();
    const [documents, setDocuments] = useState<DocumentEntry[]>([]);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!companyId) return;

        const q = query(
            collection(db, "companies", companyId, "documents"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docsList: DocumentEntry[] = [];
            snapshot.forEach((doc) => {
                docsList.push({ id: doc.id, ...doc.data() } as DocumentEntry);
            });
            setDocuments(docsList);
        });

        return () => unsubscribe();
    }, [companyId]);

    if (loading || (!user && loading)) return <div className="flex h-screen items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)]">Loading...</div>;
    if (!user || !companyId) return <div className="flex h-screen items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)]">Please verify account first on dashboard.</div>;

    return (
        <AppShell title="Documents" subtitle="Upload, track, and manage your invoices and receipts.">
            {/* Upload Zone */}
            <Card variant="sticker" className="mb-8">
                <div className="p-6">
                    <h3 className="text-base font-bold text-[var(--foreground)] mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                        <div className="p-2 rounded-full bg-[var(--accent)]/10">
                            <UploadCloud className="w-5 h-5 text-[var(--accent)]" strokeWidth={2.5} />
                        </div>
                        Upload New Document
                    </h3>
                    <UploadZone />
                </div>
            </Card>

            {/* Document List */}
            <Card variant="document">
                <div className="px-6 py-4 border-b-[2px] border-[var(--border)]">
                    <h3 className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">Recent Documents</h3>
                </div>
                <ul className="divide-y-[2px] divide-[var(--border)]">
                    {documents.length === 0 ? (
                        <li className="p-8 text-center text-[var(--muted-foreground)]">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <div className="w-5 h-5 rounded-full bg-[var(--secondary)]/20" />
                                <div className="w-5 h-5 bg-[var(--tertiary)]/20 rotate-45" />
                                <div className="w-5 h-5 rounded-full bg-[var(--quaternary)]/20" />
                            </div>
                            <p className="text-sm font-medium">No documents uploaded yet.</p>
                            <p className="text-xs mt-1">Drag your first invoice into the upload zone above.</p>
                        </li>
                    ) : (
                        documents.map((doc) => (
                            <li key={doc.id} className="p-4 hover:bg-[var(--muted)]/50 transition-all flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--muted)] flex items-center justify-center border-[2px] border-[var(--border)]">
                                        <FileText className="w-5 h-5 text-[var(--muted-foreground)]" strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--foreground)]">{doc.fileName}</p>
                                        <p className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold tracking-widest mt-0.5">{doc.type}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <StatusBadge status={doc.status} />
                                    <Link
                                        href={`/documents/${doc.id}`}
                                        className="flex items-center gap-1 text-sm text-[var(--accent)] font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        View <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </Card>
        </AppShell>
    );
}
