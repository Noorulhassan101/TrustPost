"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Activity, CheckCircle, Clock, AlertCircle, Zap, ArrowRight } from "lucide-react";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc, collection, writeBatch, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--background)]"><Spinner /></div>}>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const { user, companyId, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const plan = searchParams.get("plan");

    const [verifying, setVerifying] = useState(true);
    const [needsCompany, setNeedsCompany] = useState(false);

    const [companyName, setCompanyName] = useState("");
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");

    const [stats, setStats] = useState({ processed: 0, needsAction: 0, totalSpend: 0 });
    const [chartData, setChartData] = useState<{ date: string; processed: number }[]>([]);
    const [recentDocs, setRecentDocs] = useState<{ id: string; status: string; fileName: string; createdAt: { toDate?: () => Date } | null }[]>([]);
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
            const recent: { id: string; status: string; fileName: string; createdAt: { toDate?: () => Date } | null }[] = [];

            const daysMap: Record<string, number> = {};
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                daysMap[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] = 0;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (recent.length < 5) {
                    recent.push({
                        id: docSnap.id,
                        status: data.status || "unknown",
                        fileName: data.fileName || "Unknown File",
                        createdAt: data.createdAt || null
                    });
                }

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

        if (!plan || (plan !== "free" && plan !== "pro")) {
            setError("You must select a valid pricing plan before creating a workspace.");
            return;
        }

        setProcessing(true);
        setError("");

        try {
            const batch = writeBatch(db);
            const companyRef = doc(collection(db, "companies"));
            const newCompanyId = companyRef.id;

            batch.set(companyRef, { name: companyName, planTier: plan, createdAt: serverTimestamp() });
            batch.set(doc(db, "companies", newCompanyId, "members", user!.uid), {
                uid: user!.uid, role: "admin", joinedAt: serverTimestamp()
            });
            batch.set(doc(db, "users", user!.uid), {
                email: user!.email, name: user!.displayName || "Unknown User",
                companyId: newCompanyId, updatedAt: serverTimestamp()
            }, { merge: true });

            await batch.commit();
            // eslint-disable-next-line
            window.location.assign("/dashboard");
        } catch (err: unknown) {
            console.error(err);
            setError((err as Error).message || "Failed to create workspace");
        } finally {
            setProcessing(false);
        }
    };

    if (loading || verifying) {
        return (
            <div className="flex h-screen items-center justify-center bg-[var(--background)]">
                <div className="w-8 h-8 border-[3px] border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    if (needsCompany) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[var(--background)] relative overflow-hidden">
                <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
                <div className="absolute top-20 right-20 w-20 h-20 rounded-full bg-[var(--secondary)]/15 animate-float" />
                <div className="absolute bottom-20 left-20 w-14 h-14 bg-[var(--tertiary)]/20 rotate-45 animate-float" style={{ animationDelay: "2s" }} />

                <div className="w-full max-w-md bg-[var(--card)] p-8 rounded-[var(--radius-lg)] border-[2px] border-[var(--foreground)] shadow-pop relative z-10 animate-fade-in">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-pop">
                            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <h2 className="text-xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-heading)" }}>Complete Setup</h2>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mb-6">You signed in with Google! Let&apos;s get your workspace set up.</p>

                    {error && (
                        <div className="mb-4 p-3 bg-[var(--destructive)]/10 text-[var(--destructive)] rounded-[var(--radius-sm)] text-sm border-[2px] border-[var(--destructive)]/30 font-medium">
                            {error}
                        </div>
                    )}

                    {(!plan || (plan !== "free" && plan !== "pro")) ? (
                        <div className="text-center bg-[var(--muted)]/50 p-6 rounded-[var(--radius-md)] border-[2px] border-dashed border-[var(--border)] mb-4">
                            <h3 className="font-bold text-[var(--foreground)] mb-2">No Plan Selected</h3>
                            <p className="text-[var(--muted-foreground)] text-sm mb-4">You must choose a subscription plan before joining EntryAI.</p>
                            <Link href="/#pricing" className="block w-full">
                                <Button className="w-full shadow-pop hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:translate-x-0.5 active:shadow-pop-active transition-all" style={{ transitionTimingFunction: "var(--bounce)" }}>
                                    View Pricing Plans
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateCompany} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Workspace Name</label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full px-4 py-2.5 border-[2px] border-[#CBD5E1] rounded-[var(--radius-md)] focus:border-[var(--accent)] focus:shadow-pop focus:outline-none bg-[var(--input)] text-[var(--foreground)] font-medium text-sm transition-all"
                                    required
                                    placeholder="Acme Corp"
                                />
                            </div>
                            <Button type="submit" disabled={processing} className="w-full">
                                {processing ? "Creating Workspace..." : `Create Workspace (${plan.toUpperCase()} Plan)`}
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </form>
                    )}
                    <button onClick={() => signOut(auth)} className="mt-4 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] w-full text-center font-medium transition">
                        Sign out and try a different account
                    </button>
                </div>
            </div>
        );
    }

    const kpiCards = [
        { label: "Documents Processed", value: stats.processed, icon: CheckCircle, bg: "bg-[var(--quaternary)]/12", iconColor: "text-[#059669]" },
        { label: "Action Required", value: stats.needsAction, icon: AlertCircle, bg: "bg-[var(--tertiary)]/12", iconColor: "text-[#B45309]" },
        { label: "Total Verified Spend", value: `$${stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Activity, bg: "bg-[var(--accent)]/10", iconColor: "text-[var(--accent)]", isMoney: true },
    ];

    return (
        <AppShell title={`Welcome back, ${user.displayName || user.email}`} subtitle="Here is the latest snapshot of your automated accounting.">
            {loadingStats ? (
                <div className="flex justify-center items-center h-64">
                    <div className="w-8 h-8 border-[3px] border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    {/* KPI Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {kpiCards.map((kpi) => (
                            <Card key={kpi.label} variant="sticker">
                                <div className="p-6 flex items-start justify-between">
                                    <div>
                                        <h3 className="text-[var(--muted-foreground)] text-xs font-bold uppercase tracking-widest mb-2">{kpi.label}</h3>
                                        <p className={`text-3xl font-extrabold text-[var(--foreground)] ${kpi.isMoney ? "tabular-nums" : ""}`} style={{ fontFamily: "var(--font-heading)" }}>
                                            {kpi.value}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-[var(--radius-md)] ${kpi.bg}`}>
                                        <kpi.icon className={`w-6 h-6 ${kpi.iconColor}`} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Chart + Recent Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card variant="document" className="lg:col-span-2">
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-[var(--foreground)] mb-6" style={{ fontFamily: "var(--font-heading)" }}>Processing Volume (Last 7 Days)</h3>
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dx={-10} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                                                contentStyle={{ borderRadius: '16px', border: '2px solid #E2E8F0', boxShadow: '4px 4px 0px #E2E8F0', fontFamily: 'var(--font-body)' }}
                                            />
                                            <Bar dataKey="processed" name="Invoices Processed" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </Card>

                        <Card variant="document">
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-[var(--foreground)] mb-4" style={{ fontFamily: "var(--font-heading)" }}>Recent Activity</h3>
                                <div className="space-y-3">
                                    {recentDocs.length === 0 ? (
                                        <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">
                                            <div className="flex items-center justify-center gap-2 mb-2 text-[var(--muted-foreground)]/40">
                                                <div className="w-4 h-4 rounded-full bg-[var(--secondary)]/20" />
                                                <div className="w-4 h-4 bg-[var(--tertiary)]/20 rotate-45" />
                                                <div className="w-4 h-4 rounded-full bg-[var(--quaternary)]/20" />
                                            </div>
                                            No documents uploaded yet.
                                        </div>
                                    ) : (
                                        recentDocs.map(d => (
                                            <Link key={d.id} href={`/documents/${d.id}`} className="block group">
                                                <div className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] hover:bg-[var(--muted)] transition-all border-[2px] border-transparent group-hover:border-[var(--border)]">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${d.status === 'posted' ? 'bg-[var(--quaternary)]/12 text-[#059669]' :
                                                            d.status === 'ready' ? 'bg-[var(--tertiary)]/12 text-[#B45309]' :
                                                                'bg-[var(--muted)] text-[var(--muted-foreground)]'
                                                            }`}>
                                                            {d.status === 'posted' ? <CheckCircle className="w-4 h-4" strokeWidth={2.5} /> : <Clock className="w-4 h-4" strokeWidth={2.5} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-[var(--foreground)] truncate w-28">{d.fileName}</p>
                                                            <StatusBadge status={d.status} />
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-[var(--muted-foreground)]">
                                                        {(() => {
                                                            const ts = d.createdAt as { toDate?: () => Date } | null;
                                                            return ts && typeof ts.toDate === "function" ? ts.toDate().toLocaleDateString() : "Just now";
                                                        })()}
                                                    </p>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                                <div className="mt-4 pt-4 border-t-[2px] border-[var(--border)]">
                                    <Link href="/documents" className="text-sm text-[var(--accent)] font-bold hover:underline flex items-center justify-center gap-1">
                                        View all documents <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </AppShell>
    );
}

function Spinner() {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[3px] border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
    );
}
