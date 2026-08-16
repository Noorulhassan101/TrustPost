"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: [
        "bg-[var(--accent)] text-white font-bold",
        "border-[2px] border-[var(--foreground)]",
        "rounded-full shadow-pop",
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-hover",
        "active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-active",
    ].join(" "),
    secondary: [
        "bg-transparent text-[var(--foreground)] font-bold",
        "border-[2px] border-[var(--foreground)]",
        "rounded-full",
        "hover:bg-[var(--tertiary)] hover:text-[var(--foreground)]",
    ].join(" "),
    destructive: [
        "bg-transparent text-[var(--destructive)] font-bold",
        "border-[2px] border-[var(--destructive)]",
        "rounded-full",
        "hover:bg-[var(--destructive)] hover:text-white",
    ].join(" "),
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = "primary", className = "", children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled}
                className={`
                    inline-flex items-center justify-center gap-2
                    px-6 py-2.5 text-sm
                    transition-all duration-200
                    disabled:opacity-50 disabled:pointer-events-none
                    ${variantClasses[variant]}
                    ${className}
                `.trim()}
                style={{ transitionTimingFunction: "var(--bounce)" }}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";
