"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Save, CheckCircle2 } from "lucide-react";
import { auth, db } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";

export default function ConnectionsSettingsPage() {
    const { user, companyId, loading } = useAuth();
    const router = useRouter();
    const [sheetId, setSheetId] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
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

    const handleSignOut = async () => {
        await signOut(auth);
    };

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

    if (loading || (!user && loading) || initialLoad) return <div className="flex h-screen items-center justify-center">Loading...</div>;
    if (!user || !companyId) return <div className="flex h-screen items-center justify-center">Please verify account first on dashboard.</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <aside className="w-64 bg-white border-r border-gray-200">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900">EntryAI</h1>
                </div>
                <nav className="mt-6 px-4 space-y-2">
                    <Link href="/dashboard" className="block text-gray-600 hover:bg-gray-50 hover:text-gray-900 px-4 py-3 rounded-lg font-medium transition">
                        Dashboard
                    </Link>
                    <Link href="/documents" className="block text-gray-600 hover:bg-gray-50 hover:text-gray-900 px-4 py-3 rounded-lg font-medium transition">
                        Documents
                    </Link>
                    <Link href="/settings/connections" className="block bg-blue-50 text-blue-700 px-4 py-3 rounded-lg font-medium transition">
                        Connections
                    </Link>
                </nav>
            </aside>

            <main className="flex-1 p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800">Connections</h2>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                    </button>
                </div>

                <div className="max-w-3xl bg-white p-8 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                            <span className="text-2xl">📊</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Google Sheets Integration</h3>
                            <p className="text-gray-500">Automatically post verified invoices to a Google Sheet.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Target Spreadsheet ID</label>
                            <input
                                type="text"
                                value={sheetId}
                                onChange={(e) => setSheetId(e.target.value)}
                                placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-mono text-sm"
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                You can find the Spreadsheet ID in your Google Sheets URL: <br />
                                <code>.../d/<b>[this-is-the-spreadsheet-id]</b>/edit</code>
                            </p>
                        </div>

                        <div className="flex items-center gap-4 pt-4">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? "Saving..." : "Save Connection"}
                            </button>
                            {saved && (
                                <span className="flex items-center text-sm font-medium text-green-600">
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Saved successfully
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
