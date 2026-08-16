"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
    ({ label, className = "", ...props }, ref) => {
        return (
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                    {label}
                </label>
                <input
                    ref={ref}
                    className={`
                        w-full px-4 py-2.5
                        bg-[var(--input)] text-[var(--foreground)]
                        border-[2px] border-[#CBD5E1] rounded-[var(--radius-md)]
                        font-medium text-sm
                        transition-all duration-150
                        focus:border-[var(--accent)] focus:shadow-pop focus:outline-none
                        placeholder:text-[var(--muted-foreground)]/50
                        ${className}
                    `.trim()}
                    {...props}
                />
            </div>
        );
    }
);

InputField.displayName = "InputField";
