"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UploadCloud, FileText } from "lucide-react";
import { auth, db } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentEntry } from "@/lib/types/schema";
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

    const handleSignOut = async () => {
        await signOut(auth);
    };

    if (loading || (!user && loading)) return <div className="flex h-screen items-center justify-center">Loading...</div>;
    if (!user || !companyId) return <div className="flex h-screen items-center justify-center">Please verify account first on dashboard.</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case "processing": return "bg-yellow-100 text-yellow-800 border border-yellow-200";
            case "ready": return "bg-blue-100 text-blue-800 border border-blue-200";
            case "possible_duplicate": return "bg-orange-100 text-orange-800 border border-orange-200";
            case "posted": return "bg-green-100 text-green-800 border border-green-200";
            case "error": return "bg-red-100 text-red-800 border border-red-200";
            default: return "bg-gray-100 text-gray-800";
        }
    };

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
                    <Link href="/documents" className="block bg-blue-50 text-blue-700 px-4 py-3 rounded-lg font-medium transition">
                        Documents
                    </Link>
                    <Link href="/settings/connections" className="block text-gray-600 hover:bg-gray-50 hover:text-gray-900 px-4 py-3 rounded-lg font-medium transition">
                        Connections
                    </Link>
                </nav>
            </aside>

            <main className="flex-1 p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800">Documents</h2>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                    </button>
                </div>

                <div className="mb-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <UploadCloud className="w-5 h-5 text-gray-500" />
                        Upload New Document
                    </h3>
                    <UploadZone />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Recent Documents</h3>
                    </div>
                    <ul className="divide-y divide-gray-200">
                        {documents.length === 0 ? (
                            <li className="p-6 text-center text-gray-500">No documents uploaded yet.</li>
                        ) : (
                            documents.map((doc) => (
                                <li key={doc.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                                            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">{doc.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(doc.status)}`}>
                                            {doc.status.replace("_", " ")}
                                        </span>
                                        <Link href={`/documents/${doc.id}`} className="text-sm text-blue-600 hover:underline font-medium">
                                            View Details
                                        </Link>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </main>
        </div>
    );
}
