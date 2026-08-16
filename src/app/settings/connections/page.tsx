"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2, LinkIcon } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ConnectionsSettingsPage() {
    const { user, companyId, planTier, loading } = useAuth();
    const router = useRouter();
    const [sheetId, setSheetId] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    useEffect(() => {
        async function fetchConnection() {
            if (!companyId) return;
            try {
                const docRef = doc(db, "companies", companyId, "connections", "google_sheets");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().spreadsheetId) {
                    setSheetId(docSnap.data().spreadsheetId);
                }
            } catch (e) {
                console.error("Failed to load connection", e);
            } finally {
                setInitialLoad(false);
            }
        }
        fetchConnection();
    }, [companyId]);

    const handleSave = async () => {
        if (!companyId) return;
        setSaving(true);
        setSaved(false);
        try {
            const docRef = doc(db, "companies", companyId, "connections", "google_sheets");
            await setDoc(docRef, {
                spreadsheetId: sheetId,
                updatedAt: serverTimestamp(),
                type: "google_sheets"
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error("Failed to save connection", e);
            alert("Failed to save connection details");
        } finally {
            setSaving(false);
        }
    };

    if (loading || (!user && loading) || initialLoad) return <div className="flex h-screen items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)]">Loading...</div>;
    if (!user || !companyId) return <div className="flex h-screen items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)]">Please verify account first on dashboard.</div>;

    return (
        <AppShell title="Connect System" subtitle="Connect your accounting system to automatically post verified invoices.">
            <div className="max-w-3xl space-y-6">
                <Card variant="sticker">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                        <div className="md:w-1/3">
                            <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[#E8F0FE] flex items-center justify-center mb-4 border-[2px] border-[#4285F4]/30 shadow-pop">
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#34A853" />
                                    <path d="M14 2V8H20" fill="#188038" />
                                    <path d="M8 13H16V15H8V13Z" fill="white" />
                                    <path d="M8 17H12V19H8V17Z" fill="white" />
                                </svg>
                            </div>
                            <h3 className="text-base font-extrabold text-[var(--foreground)] mb-2" style={{ fontFamily: "var(--font-heading)" }}>Google Sheets Sync</h3>
                            <p className="text-sm text-[var(--muted-foreground)]">Automatically push your verified document extractions as new rows in your ledger.</p>
                        </div>

                        <div className="md:w-2/3 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5 flex items-center gap-1.5">
                                    <LinkIcon className="w-3.5 h-3.5" />
                                    Spreadsheet ID
                                </label>
                                <input
                                    type="text"
                                    value={sheetId}
                                    onChange={(e) => setSheetId(e.target.value)}
                                    placeholder="1A2B3C4D5E6F7G8H9I0J..."
                                    className="w-full px-4 py-2.5 border-[2px] border-[#CBD5E1] rounded-[var(--radius-md)] focus:border-[var(--accent)] focus:shadow-pop focus:outline-none bg-[var(--input)] text-[var(--foreground)] font-medium text-sm transition-all font-mono"
                                />
                                <p className="text-xs text-[var(--muted-foreground)] mt-2">
                                    You can find this in the URL of your Google Sheet: <code className="bg-[var(--muted)] px-1 py-0.5 rounded text-[10px]">spreadsheets/d/<b>[your-id]</b>/edit</code>
                                </p>
                            </div>

                            <div className="flex items-center gap-4 pt-2">
                                <Button onClick={handleSave} disabled={saving}>
                                    <Save className="w-4 h-4" />
                                    {saving ? "Saving..." : "Save Connection"}
                                </Button>
                                {saved && (
                                    <span className="flex items-center text-sm font-bold text-[#059669] animate-fade-in">
                                        <CheckCircle2 className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
                                        Saved successfully
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Future Connector Placeholders */}
                <div className="grid grid-cols-2 gap-6 mt-6">
                    {planTier === "free" ? (
                        <Card variant="sticker" className="col-span-2 p-8 text-center bg-[var(--accent)]/5 border-[var(--accent)]/30 animate-fade-in">
                            <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4 border-[2px] border-[var(--accent)] shadow-pop">
                                <span className="text-3xl">🚀</span>
                            </div>
                            <h2 className="text-xl font-extrabold text-[var(--foreground)] mb-2" style={{ fontFamily: "var(--font-heading)" }}>Unlock Premium Integrations</h2>
                            <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">Export your extracted documents directly to QuickBooks Online and Tally automatically with our Pro plan.</p>
                            <Button onClick={() => router.push('/#pricing')} className="px-8 shadow-pop hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:translate-x-0.5 active:shadow-pop-active transition-all" style={{ transitionTimingFunction: "var(--bounce)" }}>
                                Upgrade to Pro
                            </Button>
                        </Card>
                    ) : (
                        <>
                            <Card variant="sticker" className="opacity-50 pointer-events-none">
                                <div className="p-6 text-center">
                                    <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--secondary)]/12 flex items-center justify-center mx-auto mb-3 border-[2px] border-[var(--secondary)]/30">
                                        <span className="text-2xl">📘</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-heading)" }}>QuickBooks Online</h4>
                                    <p className="text-xs text-[var(--muted-foreground)] mt-1">Coming soon</p>
                                </div>
                            </Card>
                            <Card variant="sticker" className="opacity-50 pointer-events-none">
                                <div className="p-6 text-center">
                                    <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--tertiary)]/12 flex items-center justify-center mx-auto mb-3 border-[2px] border-[var(--tertiary)]/30">
                                        <span className="text-2xl">📗</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-heading)" }}>Tally</h4>
                                    <p className="text-xs text-[var(--muted-foreground)] mt-1">Coming soon</p>
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
