"use client";

import { CheckCircle, AlertTriangle, XCircle, Loader2, MinusCircle } from "lucide-react";

type DocumentStatus =
    | "processing"
    | "ready"
    | "possible_duplicate"
    | "posting"
    | "posted"
    | "error"
    | "skipped"
    | "quota_exceeded";

const statusConfig: Record<DocumentStatus, { label: string; icon: typeof CheckCircle; bg: string; text: string; border: string }> = {
    posted: {
        label: "Posted",
        icon: CheckCircle,
        bg: "bg-[var(--quaternary)]/12",
        text: "text-[#059669]",
        border: "border-[var(--quaternary)]",
    },
    ready: {
        label: "Ready for Review",
        icon: CheckCircle,
        bg: "bg-[var(--quaternary)]/12",
        text: "text-[#059669]",
        border: "border-[var(--quaternary)]",
    },
    possible_duplicate: {
        label: "Possible Duplicate",
        icon: AlertTriangle,
        bg: "bg-[var(--tertiary)]/12",
        text: "text-[#B45309]",
        border: "border-[var(--tertiary)]",
    },
    error: {
        label: "Error",
        icon: XCircle,
        bg: "bg-[var(--destructive)]/12",
        text: "text-[var(--destructive)]",
        border: "border-[var(--destructive)]",
    },
    quota_exceeded: {
        label: "Quota Exceeded",
        icon: XCircle,
        bg: "bg-[var(--destructive)]/12",
        text: "text-[var(--destructive)]",
        border: "border-[var(--destructive)]",
    },
    processing: {
        label: "Processing",
        icon: Loader2,
        bg: "bg-[var(--muted)]",
        text: "text-[var(--muted-foreground)]",
        border: "border-[var(--border)]",
    },
    posting: {
        label: "Posting",
        icon: Loader2,
        bg: "bg-[var(--accent)]/8",
        text: "text-[var(--accent)]",
        border: "border-[var(--accent)]/30",
    },
    skipped: {
        label: "Skipped",
        icon: MinusCircle,
        bg: "bg-[var(--muted)]",
        text: "text-[var(--muted-foreground)]",
        border: "border-[var(--border)]",
    },
};

export function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status as DocumentStatus] || statusConfig.processing;
    const Icon = config.icon;
    const isSpinning = status === "processing" || status === "posting";

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
            <Icon className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} strokeWidth={2.5} />
            {config.label}
        </span>
    );
}

/* Larger variant for banners */
export function StatusBanner({ status, children }: { status: string; children: React.ReactNode }) {
    const config = statusConfig[status as DocumentStatus] || statusConfig.processing;
    const Icon = config.icon;

    return (
        <div className={`${config.bg} border-b-[2px] ${config.border} p-4 shrink-0 animate-fade-in`}>
            <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full ${config.bg} ${config.text}`}>
                    <Icon className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div className={`${config.text} text-sm`}>{children}</div>
            </div>
        </div>
    );
}
