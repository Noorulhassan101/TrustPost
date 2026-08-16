"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

interface AuthContextType {
    user: User | null;
    companyId: string | null;
    planTier: "free" | "pro" | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, companyId: null, planTier: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [planTier, setPlanTier] = useState<"free" | "pro" | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const compId = userDoc.data().companyId || null;
                        setCompanyId(compId);

                        if (compId) {
                            const compDoc = await getDoc(doc(db, "companies", compId));
                            if (compDoc.exists()) {
                                setPlanTier(compDoc.data().planTier || "free");
                            } else {
                                setPlanTier(null);
                            }
                        } else {
                            setPlanTier(null);
                        }
                    } else {
                        setCompanyId(null);
                        setPlanTier(null);
                    }
                } catch (error) {
                    console.error("Failed to fetch user profile", error);
                    setCompanyId(null);
                    setPlanTier(null);
                }
            } else {
                setCompanyId(null);
                setPlanTier(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, companyId, planTier, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
