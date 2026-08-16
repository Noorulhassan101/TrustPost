"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Settings, Zap, Home } from "lucide-react";

const navItems = [
    { href: "/", label: "Home Page", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/settings/connections", label: "Connections", icon: Settings },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-[var(--card)] border-r-[2px] border-[var(--border)] flex flex-col shrink-0">
            <div className="p-6 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-pop">
                    <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <h1 className="text-xl font-extrabold text-[var(--foreground)] tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                    EntryAI
                </h1>
            </div>

            <nav className="mt-2 px-4 space-y-1 flex-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`
                                flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] font-semibold text-sm
                                transition-all duration-200
                                ${isActive
                                    ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[2px] border-[var(--accent)]/20"
                                    : "text-[var(--muted-foreground)] border-[2px] border-transparent hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                                }
                            `.trim()}
                        >
                            <Icon className="w-5 h-5" strokeWidth={2} />
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Decorative element at bottom */}
            <div className="p-4">
                <div className="flex items-center justify-center gap-2 text-[var(--muted-foreground)]/40">
                    <div className="w-3 h-3 rounded-full bg-[var(--secondary)]/30" />
                    <div className="w-3 h-3 bg-[var(--tertiary)]/30 rotate-45" />
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-[var(--quaternary)]/30" />
                </div>
            </div>
        </aside>
    );
}
