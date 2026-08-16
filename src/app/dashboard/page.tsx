"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard, FileText, Settings, Activity, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc, collection, writeBatch, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
    const { user, companyId, loading } = useAuth();
    const router = useRouter();

    const [verifying, setVerifying] = useState(true);
    const [needsCompany, setNeedsCompany] = useState(false);

    const [companyName, setCompanyName] = useState("");
    const [country, setCountry] = useState("US");
    const [currency, setCurrency] = useState("USD");
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");

    const [stats, setStats] = useState({ processed: 0, needsAction: 0, totalSpend: 0 });
    const [chartData, setChartData] = useState<any[]>([]);
    const [recentDocs, setRecentDocs] = useState<any[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const verifyCompany = async () => {
            try {
                if (companyId) {
                    setNeedsCompany(false);
                } else {
                    const userDoc = await getDoc(doc(db, "users", user!.uid));
                    if (!userDoc.exists() || !userDoc.data().companyId) {
                        setNeedsCompany(true);
                    }
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
    }, [user, loading, router, companyId]);

    useEffect(() => {
        if (!companyId) return;

        const q = query(
            collection(db, "companies", companyId, "documents"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let processed = 0;
            let needsAction = 0;
            let totalSpend = 0;
            const recent: any[] = [];

            const daysMap: Record<string, number> = {};
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                daysMap[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] = 0;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (recent.length < 5) recent.push({ id: docSnap.id, ...data });

                if (data.status === "posted") {
                    processed++;
                    const amount = parseFloat(data.extractionResult?.total_amount) || 0;
                    totalSpend += amount;

                    if (data.createdAt) {
                        const dateObj = data.createdAt.toDate();
                        const dayLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        if (daysMap[dayLabel] !== undefined) {
                            daysMap[dayLabel]++;
                        }
                    }
                } else if (data.status === "ready" || data.status === "failed") {
                    needsAction++;
                }
            });

            setStats({ processed, needsAction, totalSpend });
            setRecentDocs(recent);
            setChartData(Object.keys(daysMap).map(date => ({ date, processed: daysMap[date] })));
            setLoadingStats(false);
        });

        return () => unsubscribe();
    }, [companyId]);

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setError("");

        try {
            const batch = writeBatch(db);
            const companyRef = doc(collection(db, "companies"));
            const newCompanyId = companyRef.id;

            batch.set(companyRef, {
                name: companyName,
                country,
                currency,
                createdAt: serverTimestamp()
            });

            batch.set(doc(db, "companies", newCompanyId, "members", user!.uid), {
                uid: user!.uid,
                role: "admin",
                joinedAt: serverTimestamp()
            });

            batch.set(doc(db, "users", user!.uid), {
                email: user!.email,
                name: user!.displayName || "Unknown User",
                companyId: newCompanyId,
                updatedAt: serverTimestamp()
            }, { merge: true });

            await batch.commit();
            window.location.reload();
        } catch (err: unknown) {
            console.error(err);
            setError((err as Error).message || "Failed to create workspace");
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
                <Spinner />
            </div>
        );
    }

    if (!user) return null;

    if (needsCompany) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Complete Setup</h2>
                    <p className="text-sm text-gray-600 mb-6">You signed in with Google! Let&apos;s get your workspace set up.</p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleCreateCompany} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Workspace Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                required
                                placeholder="Acme Corp"
                            />
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
            {/* SAAS Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">TrustPost</h1>
                </div>
                <nav className="mt-2 px-4 space-y-1 flex-1">
                    <Link href="/dashboard" className="flex items-center space-x-3 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg font-medium transition">
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Dashboard</span>
                    </Link>
                    <Link href="/documents" className="flex items-center space-x-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 px-4 py-3 rounded-lg font-medium transition">
                        <FileText className="w-5 h-5" />
                        <span>Documents</span>
                    </Link>
                    <Link href="/settings/connections" className="flex items-center space-x-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 px-4 py-3 rounded-lg font-medium transition">
                        <Settings className="w-5 h-5" />
                        <span>Connections</span>
                    </Link>
                </nav>
            </aside>

            {/* Dashboard Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900">Welcome back, {user.displayName || user.email}</h2>
                        <p className="text-gray-500 mt-1">Here is the latest snapshot of your automated accounting.</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg transition"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                    </button>
                </div>

                {loadingStats ? (
                    <div className="flex justify-center items-center h-64"><Spinner /></div>
                ) : (
                    <div className="space-y-6">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                                <div>
                                    <h3 className="text-gray-500 text-sm font-medium mb-1">Documents Processed</h3>
                                    <p className="text-3xl font-bold text-gray-900">{stats.processed}</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                                <div>
                                    <h3 className="text-gray-500 text-sm font-medium mb-1">Action Required</h3>
                                    <p className="text-3xl font-bold text-gray-900">{stats.needsAction}</p>
                                </div>
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <AlertCircle className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                                <div>
                                    <h3 className="text-gray-500 text-sm font-medium mb-1">Total Verified Spend</h3>
                                    <p className="text-3xl font-bold text-gray-900">
                                        ${stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Activity className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        {/* Chart & Recent Activity */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Chart */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                                <h3 className="text-lg font-semibold text-gray-900 mb-6">Processing Volume (Last 7 Days)</h3>
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dx={-10} />
                                            <Tooltip
                                                cursor={{ fill: '#F3F4F6' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="processed" name="Invoices Processed" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                                <div className="space-y-4">
                                    {recentDocs.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            No documents uploaded yet.
                                        </div>
                                    ) : (
                                        recentDocs.map(doc => (
                                            <Link key={doc.id} href={`/documents/${doc.id}`} className="block group">
                                                <div className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50 transition border border-transparent group-hover:border-gray-100">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`p-2 rounded-full ${doc.status === 'posted' ? 'bg-green-100 text-green-600' :
                                                                doc.status === 'ready' ? 'bg-orange-100 text-orange-600' :
                                                                    'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {doc.status === 'posted' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 truncate w-32">{doc.fileName}</p>
                                                            <p className="text-xs text-gray-500 capitalize">{doc.status}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-400">
                                                            {doc.createdAt?.toDate ? doc.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <Link href="/documents" className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center justify-center">
                                        View all documents
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function Spinner() {
    return (
        <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    )
}
