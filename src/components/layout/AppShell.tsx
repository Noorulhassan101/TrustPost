"use client";

import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { Button } from "@/components/ui/Button";

interface AppShellProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
    const handleSignOut = async () => {
        await signOut(auth);
    };

    return (
        <div className="min-h-screen bg-[var(--background)] flex">
            <AppSidebar />
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-heading)" }}>
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-[var(--muted-foreground)] mt-1 text-sm">{subtitle}</p>
                        )}
                    </div>
                    <Button variant="secondary" onClick={handleSignOut} className="text-xs px-4 py-2">
                        <LogOut className="w-4 h-4" />
                        Sign out
                    </Button>
                </div>
                {children}
            </main>
        </div>
    );
}
