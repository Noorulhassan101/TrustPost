"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { collection, writeBatch, serverTimestamp } from "firebase/firestore";

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [verifying, setVerifying] = useState(true);
    const [needsCompany, setNeedsCompany] = useState(false);

    const [companyName, setCompanyName] = useState("");
    const [country, setCountry] = useState("US");
    const [currency, setCurrency] = useState("USD");
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const verifyCompany = async () => {
            try {
                const userDoc = await getDoc(doc(db, "users", user!.uid));
                if (!userDoc.exists() || !userDoc.data().companyId) {
                    setNeedsCompany(true);
                }
            } catch (err: unknown) {
                console.error(err);
            } finally {
                setVerifying(false);
            }
        };

        if (!loading && !user) {
            router.push("/login");
        } else if (user) {
            verifyCompany();
        }
    }, [user, loading, router]);

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setError("");

        try {
            const batch = writeBatch(db);
            const companyRef = doc(collection(db, "companies"));
            const companyId = companyRef.id;

            // 1. Create the company doc
            batch.set(companyRef, {
                name: companyName,
                country,
                currency,
                createdAt: serverTimestamp()
            });

            // 2. Add the user as an admin member of the company
            batch.set(doc(db, "companies", companyId, "members", user!.uid), {
                uid: user!.uid,
                role: "admin",
                joinedAt: serverTimestamp()
            });

            // 3. Update the user's profile with the new company ID
            batch.set(doc(db, "users", user!.uid), {
                email: user!.email,
                name: user!.displayName || "Unknown User",
                companyId: companyId,
                updatedAt: serverTimestamp()
            }, { merge: true });

            await batch.commit();

            // Force a reload of the window to let the AuthProvider fetch the new companyId
            window.location.reload();
        } catch (err: unknown) {
            console.error(err);
            setError((err as Error).message || "Failed to create company");
        } finally {
            setProcessing(false);
        }
    };

    const handleSignOut = async () => {
        await signOut(auth);
    };

    if (loading || verifying) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">
                Loading dashboard...
            </div>
        );
    }

    if (!user) return null;

    if (needsCompany) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Complete Setup</h2>
                    <p className="text-sm text-gray-600 mb-6">You signed in with Google! Let&apos;s get your company workspace set up.</p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleCreateCompany} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                required
                                placeholder="Acme Corp"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                <select
                                    value={country}
                                    onChange={e => setCountry(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white text-gray-900"
                                >
                                    <option value="US">United States</option>
                                    <option value="PK">Pakistan</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                <select
                                    value={currency}
                                    onChange={e => setCurrency(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white text-gray-900"
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="PKR">PKR (₨)</option>
                                </select>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full mt-4 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition"
                        >
                            {processing ? "Creating Workspace..." : "Create Workspace"}
                        </button>
                    </form>

                    <button onClick={handleSignOut} className="mt-4 text-sm text-gray-500 hover:text-gray-700 w-full text-center">
                        Sign out and try a different account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <aside className="w-64 bg-white border-r border-gray-200">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900">EntryAI</h1>
                </div>
                <nav className="mt-6 px-4 space-y-2">
                    <Link href="/dashboard" className="block bg-blue-50 text-blue-700 px-4 py-3 rounded-lg font-medium transition">Dashboard</Link>
                    <Link href="/documents" className="block text-gray-600 hover:bg-gray-50 hover:text-gray-900 px-4 py-3 rounded-lg font-medium transition">Documents</Link>
                    <Link href="/settings/connections" className="block text-gray-600 hover:bg-gray-50 hover:text-gray-900 px-4 py-3 rounded-lg font-medium transition">Connections</Link>
                </nav>
            </aside>

            <main className="flex-1 p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-semibold text-gray-800">Welcome back, {user.email}</h2>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-gray-500 text-sm font-medium mb-1">Documents Processed</h3>
                        <p className="text-3xl font-bold text-gray-900">0</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
