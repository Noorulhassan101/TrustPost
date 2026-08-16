"use client";

import { ReactNode } from "react";

type CardVariant = "sticker" | "document";

interface CardProps {
    variant?: CardVariant;
    className?: string;
    children: ReactNode;
}

export function Card({ variant = "sticker", className = "", children }: CardProps) {
    const base = "bg-[var(--card)] border-[2px] border-[var(--foreground)] rounded-[var(--radius-lg)] overflow-hidden";

    if (variant === "sticker") {
        return (
            <div
                className={`${base} shadow-pop-card transition-all duration-300 hover:-rotate-1 hover:scale-[1.02] ${className}`}
                style={{ transitionTimingFunction: "var(--bounce)" }}
            >
                {children}
            </div>
        );
    }

    /* "document" variant — flat, calm, for financial data */
    return (
        <div className={`bg-[var(--card)] border-[2px] border-[var(--border)] rounded-[var(--radius-md)] ${className}`}>
            {children}
        </div>
    );
}
