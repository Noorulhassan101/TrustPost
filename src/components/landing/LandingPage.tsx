"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Zap, ArrowRight, Upload, Brain, Send, Shield,
    CheckCircle, Clock, FileText, Sparkles, AlertCircle,
    Star
} from "lucide-react";
import { Button } from "@/components/ui/Button";

/* ───────────────────────────────────────────────
   Intersection Observer hook for scroll animations
   ─────────────────────────────────────────────── */
function useInView(threshold = 0.15) {
    const [inView, setInView] = useState(false);
    const [node, setNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!node) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
            { threshold }
        );
        obs.observe(node);
        return () => obs.disconnect();
    }, [node, threshold]);

    return { ref: setNode, inView };
}

/* ───────────────────────────────────────────────
   Animated counter
   ─────────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
    const [count, setCount] = useState(0);
    const { ref, inView } = useInView();

    useEffect(() => {
        if (!inView) return;
        let start = 0;
        const duration = 1500;
        const stepTime = 16;
        const steps = duration / stepTime;
        const increment = target / steps;

        const timer = setInterval(() => {
            start += increment;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else { setCount(Math.floor(start)); }
        }, stepTime);

        return () => clearInterval(timer);
    }, [inView, target]);

    return <span ref={ref} className="tabular-nums">{count.toLocaleString()}{suffix}</span>;
}

/* ───────────────────────────────────────────────
   Main Landing Page
   ─────────────────────────────────────────────── */
export function LandingPage() {
    const { user, loading } = useAuth();

    const { ref: heroRef, inView: heroInView } = useInView(0.05);
    const { ref: problemsRef, inView: problemsInView } = useInView();
    const { ref: featuresRef, inView: featuresInView } = useInView();
    const { ref: howItWorksRef, inView: howItWorksInView } = useInView();
    const { ref: pricingRef, inView: pricingInView } = useInView();
    const { ref: statsRef, inView: statsInView } = useInView();
    const { ref: ctaRef, inView: ctaInView } = useInView();

    if (loading) return null;

    return (
        <div className="min-h-screen bg-[var(--background)] overflow-hidden">

            {/* ╔══════════════════════════════╗
               ║         NAVIGATION           ║
               ╚══════════════════════════════╝ */}
            <nav className="fixed top-0 inset-x-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b-[2px] border-[var(--border)]">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-pop">
                            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-lg font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-heading)" }}>EntryAI</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--muted-foreground)]">
                        <a href="#problems" className="hover:text-[var(--foreground)] transition">Problems</a>
                        <a href="#features" className="hover:text-[var(--foreground)] transition">Features</a>
                        <a href="#how-it-works" className="hover:text-[var(--foreground)] transition">How It Works</a>
                        <a href="#pricing" className="hover:text-[var(--foreground)] transition">Pricing</a>
                    </div>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <Link href="/dashboard">
                                <Button className="text-xs px-5 py-2">
                                    Dashboard <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                            </Link>
                        ) : (
                            <>
                                <Link href="/login">
                                    <Button variant="secondary" className="text-xs px-4 py-2">Log in</Button>
                                </Link>
                                <Link href="/login">
                                    <Button className="text-xs px-5 py-2">
                                        Get Started <ArrowRight className="w-3.5 h-3.5" />
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* ╔══════════════════════════════╗
               ║            HERO              ║
               ╚══════════════════════════════╝ */}
            <section ref={heroRef} className="relative pt-32 pb-24 md:pt-44 md:pb-32 px-6">
                {/* Decorative shapes — full playful energy */}
                <div className="absolute top-24 left-[8%] w-32 h-32 rounded-full bg-[var(--secondary)]/12 animate-float" />
                <div className="absolute top-40 right-[10%] w-20 h-20 bg-[var(--tertiary)]/15 rotate-45 animate-float" style={{ animationDelay: "2s" }} />
                <div className="absolute bottom-16 left-[15%] w-16 h-16 rounded-full bg-[var(--quaternary)]/12 animate-float" style={{ animationDelay: "4s" }} />
                <div className="absolute top-60 right-[25%] w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-b-[30px] border-b-[var(--accent)]/12 animate-float" style={{ animationDelay: "1s" }} />
                <div className="absolute bottom-32 right-[8%] w-10 h-10 rounded-full bg-[var(--secondary)]/10 animate-float" style={{ animationDelay: "3s" }} />

                {/* Dot grid */}
                <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    {/* Pill badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-[2px] border-[var(--accent)]/20 bg-[var(--accent)]/5 text-[var(--accent)] text-xs font-bold mb-8 transition-all duration-700 ${heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        AI-Powered Data Entry for Small Offices
                    </div>

                    <h1 className={`text-5xl md:text-7xl font-extrabold text-[var(--foreground)] leading-[1.08] mb-6 transition-all duration-700 delay-100 ${heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ fontFamily: "var(--font-heading)" }}>
                        Stop typing invoices.
                        <br />
                        <span className="relative">
                            <span className="text-[var(--accent)]">Start trusting AI.</span>
                            {/* Squiggle underline */}
                            <svg className="absolute -bottom-2 left-0 w-full h-3 text-[var(--tertiary)]" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none">
                                <path d="M2 8 Q 25 2, 50 8 Q 75 14, 100 8 Q 125 2, 150 8 Q 175 14, 200 8 Q 225 2, 250 8 Q 275 14, 298 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
                            </svg>
                        </span>
                    </h1>

                    <p className={`text-lg md:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 ${heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
                        Upload a receipt or invoice. Our AI extracts every field — vendor, amount, date, currency —
                        in seconds. Review once, post to your accounting system, and never key in data by hand again.
                    </p>

                    <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
                        <Link href={user ? "/dashboard" : "/login"}>
                            <Button className="text-base px-8 py-3">
                                {user ? "Go to Dashboard" : "Start Free"} <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                        <a href="#how-it-works">
                            <Button variant="secondary" className="text-base px-8 py-3">
                                See How It Works
                            </Button>
                        </a>
                    </div>

                    {/* Floating mock UI preview card */}
                    <div className={`mt-16 max-w-2xl mx-auto transition-all duration-1000 delay-500 ${heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
                        <div className="bg-[var(--card)] border-[2px] border-[var(--foreground)] rounded-[var(--radius-lg)] shadow-pop overflow-hidden">
                            <div className="bg-[var(--foreground)] px-4 py-2.5 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[var(--destructive)]" />
                                <div className="w-3 h-3 rounded-full bg-[var(--tertiary)]" />
                                <div className="w-3 h-3 rounded-full bg-[var(--quaternary)]" />
                                <span className="ml-2 text-xs text-white/50 font-mono">entryai.app/documents</span>
                            </div>
                            <div className="p-6 grid grid-cols-3 gap-4">
                                <div className="space-y-3">
                                    <div className="h-3 bg-[var(--muted)] rounded-full w-[80%]" />
                                    <div className="h-3 bg-[var(--muted)] rounded-full w-[60%]" />
                                    <div className="h-3 bg-[var(--muted)] rounded-full w-[90%]" />
                                    <div className="h-8 bg-[var(--accent)]/10 rounded-[var(--radius-sm)] border-[2px] border-[var(--accent)]/20 flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-[var(--accent)]">✓ AI EXTRACTED</span>
                                    </div>
                                </div>
                                <div className="col-span-2 bg-[var(--muted)]/50 rounded-[var(--radius-sm)] p-4 space-y-2 border-[2px] border-[var(--border)]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Vendor</span>
                                        <span className="text-xs font-bold text-[var(--foreground)]">Acme Office Supplies</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Total</span>
                                        <span className="text-xs font-extrabold text-[var(--foreground)] tabular-nums">$2,847.50</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Status</span>
                                        <span className="text-[9px] font-bold uppercase bg-[var(--quaternary)]/12 text-[#059669] px-2 py-0.5 rounded-full border border-[var(--quaternary)]">Ready for Review</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════╗
               ║       PROBLEM SECTION        ║
               ╚══════════════════════════════╝ */}
            <section id="problems" ref={problemsRef} className="py-24 px-6 relative">
                <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-[var(--destructive)]/5 -translate-y-1/2 translate-x-1/2" />

                <div className="max-w-5xl mx-auto">
                    <div className={`text-center mb-16 transition-all duration-700 ${problemsInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--destructive)] bg-[var(--destructive)]/8 px-3 py-1.5 rounded-full border-[2px] border-[var(--destructive)]/20">
                            The Problem
                        </span>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-[var(--foreground)] mt-6 mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                            Manual data entry is <span className="text-[var(--destructive)]">killing</span> your team
                        </h2>
                        <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
                            Every day, small offices waste hours re-typing the same numbers from invoices into spreadsheets. It&apos;s slow, error-prone, and soul-crushing.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: Clock, color: "var(--tertiary)", title: "3.5 hours/day", desc: "Average time spent on manual invoice processing in a 5-person office", delay: "0ms" },
                            { icon: AlertCircle, color: "var(--destructive)", title: "4.1% error rate", desc: "Human data-entry error rate — each mistake costs real money downstream", delay: "100ms" },
                            { icon: FileText, color: "var(--muted-foreground)", title: "Duplicate posts", desc: "Without fingerprinting, the same invoice gets entered twice — inflating your books", delay: "200ms" },
                        ].map((problem, i) => (
                            <div
                                key={i}
                                className={`bg-[var(--card)] border-[2px] border-[var(--foreground)] rounded-[var(--radius-lg)] p-6 shadow-pop-card transition-all duration-700 hover:-rotate-1 hover:scale-[1.02] ${problemsInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                                style={{ transitionDelay: problem.delay, transitionTimingFunction: "var(--bounce)" }}
                            >
                                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `color-mix(in srgb, ${problem.color} 12%, transparent)` }}>
                                    <problem.icon className="w-6 h-6" style={{ color: problem.color }} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-xl font-extrabold text-[var(--foreground)] mb-2" style={{ fontFamily: "var(--font-heading)" }}>{problem.title}</h3>
                                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{problem.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════╗
               ║       FEATURES / SOLUTION    ║
               ╚══════════════════════════════╝ */}
            <section id="features" ref={featuresRef} className="py-24 px-6 bg-[var(--foreground)] relative overflow-hidden">
                {/* Inverted decorative shapes */}
                <div className="absolute top-12 left-[5%] w-24 h-24 rounded-full bg-[var(--accent)]/10 animate-float" />
                <div className="absolute bottom-12 right-[8%] w-16 h-16 bg-[var(--tertiary)]/10 rotate-45 animate-float" style={{ animationDelay: "3s" }} />

                <div className="max-w-5xl mx-auto relative z-10">
                    <div className={`text-center mb-16 transition-all duration-700 ${featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--quaternary)] bg-[var(--quaternary)]/10 px-3 py-1.5 rounded-full border-[2px] border-[var(--quaternary)]/20">
                            The Solution
                        </span>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-white mt-6 mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                            AI that actually <span className="text-[var(--tertiary)]">gets</span> invoices
                        </h2>
                        <p className="text-lg text-white/60 max-w-2xl mx-auto">
                            EntryAI combines Gemini AI extraction with smart duplicate detection and one-click posting to your accounting system.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { icon: Brain, color: "#8B5CF6", title: "Gemini AI Extraction", desc: "Upload any invoice or receipt — PDF, JPEG, PNG. Our AI reads every field: vendor, date, amount, currency, invoice number. In seconds, not minutes.", tag: "Core" },
                            { icon: Shield, color: "#34D399", title: "Duplicate Detection", desc: "Content fingerprinting catches duplicates before they hit your books. See a clear warning, acknowledge it, and move on — or discard confidently.", tag: "Safety" },
                            { icon: Send, color: "#F472B6", title: "One-Click Post to Sheets", desc: "Connect your Google Sheet once. Every verified invoice posts automatically — with idempotency protection so nothing ever posts twice.", tag: "Speed" },
                            { icon: Sparkles, color: "#FBBF24", title: "AI Confidence Scores", desc: "Every extraction comes with a confidence score. Low confidence? The field highlights for your review. High confidence? Post and move on.", tag: "Trust" },
                        ].map((feature, i) => (
                            <div
                                key={i}
                                className={`bg-white/5 backdrop-blur-sm border-[2px] border-white/10 rounded-[var(--radius-lg)] p-8 transition-all duration-700 hover:bg-white/8 hover:border-white/20 group ${featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                                style={{ transitionDelay: `${i * 100}ms` }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-14 h-14 rounded-[var(--radius-md)] flex items-center justify-center border-[2px]" style={{ backgroundColor: `${feature.color}15`, borderColor: `${feature.color}30` }}>
                                        <feature.icon className="w-7 h-7" style={{ color: feature.color }} strokeWidth={2} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ backgroundColor: `${feature.color}15`, color: feature.color }}>
                                        {feature.tag}
                                    </span>
                                </div>
                                <h3 className="text-xl font-extrabold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>{feature.title}</h3>
                                <p className="text-sm text-white/50 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════╗
               ║       HOW IT WORKS           ║
               ╚══════════════════════════════╝ */}
            <section id="how-it-works" ref={howItWorksRef} className="py-24 px-6 relative">
                <div className="absolute inset-0 bg-dot-grid opacity-15 pointer-events-none" />

                <div className="max-w-5xl mx-auto relative z-10">
                    <div className={`text-center mb-16 transition-all duration-700 ${howItWorksInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/8 px-3 py-1.5 rounded-full border-[2px] border-[var(--accent)]/20">
                            How It Works
                        </span>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-[var(--foreground)] mt-6 mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                            Three steps. Zero typing.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { step: "01", icon: Upload, title: "Upload", desc: "Drag and drop any invoice or receipt — from your phone, scanner, or email.", color: "var(--accent)" },
                            { step: "02", icon: Brain, title: "Review", desc: "AI extracts all fields instantly. Check the data, edit if needed. Duplicates are flagged automatically.", color: "var(--tertiary)" },
                            { step: "03", icon: Send, title: "Post", desc: "One click to post into Google Sheets. QuickBooks and Tally coming soon. Done.", color: "var(--quaternary)" },
                        ].map((s, i) => (
                            <div
                                key={i}
                                className={`relative transition-all duration-700 ${howItWorksInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                                style={{ transitionDelay: `${i * 150}ms` }}
                            >
                                {/* Connector line (between steps) */}
                                {i < 2 && (
                                    <div className="hidden md:block absolute top-12 left-[calc(100%+4px)] w-[calc(100%-64px)] border-t-[2px] border-dashed border-[var(--border)]" style={{ transform: "translateX(28px)" }} />
                                )}

                                <div className="bg-[var(--card)] border-[2px] border-[var(--foreground)] rounded-[var(--radius-lg)] p-8 text-center shadow-pop transition-all duration-300 hover:-translate-y-1 hover:shadow-pop-hover" style={{ transitionTimingFunction: "var(--bounce)" }}>
                                    <div className="text-5xl font-extrabold mb-4 opacity-10" style={{ fontFamily: "var(--font-heading)", color: s.color }}>{s.step}</div>
                                    <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center border-[2px]" style={{ backgroundColor: `color-mix(in srgb, ${s.color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${s.color} 25%, transparent)` }}>
                                        <s.icon className="w-7 h-7" style={{ color: s.color }} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-[var(--foreground)] mb-2" style={{ fontFamily: "var(--font-heading)" }}>{s.title}</h3>
                                    <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════╗
               ║       PRICING                ║
               ╚══════════════════════════════╝ */}
            <section id="pricing" ref={pricingRef} className="py-24 px-6 bg-[var(--background)] relative">
                <div className="max-w-5xl mx-auto relative z-10">
                    <div className={`text-center mb-16 transition-all duration-700 ${pricingInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 rounded-full border-[2px] border-[var(--accent)]/20">
                            Pricing
                        </span>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-[var(--foreground)] mt-6 mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                            Simple, transparent pricing
                        </h2>
                        <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto font-medium">
                            Start for free, then pay for what you actually use.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Free Tier */}
                        <div className={`bg-white border-[2px] border-[var(--border)] rounded-[var(--radius-xl)] p-8 shadow-pop transition-all duration-700 hover:-translate-y-1 ${pricingInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: "100ms" }}>
                            <h3 className="text-2xl font-bold text-[var(--foreground)] mb-2" style={{ fontFamily: "var(--font-heading)" }}>Starter</h3>
                            <div className="text-4xl font-extrabold text-[var(--foreground)] mb-6">$0<span className="text-lg text-[var(--muted-foreground)] font-medium">/mo</span></div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-[var(--foreground)] font-medium">
                                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                                    </div>
                                    Up to 20 documents/month
                                </li>
                                <li className="flex items-center gap-3 text-[var(--foreground)] font-medium">
                                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                                    </div>
                                    Gemini AI Extraction
                                </li>
                                <li className="flex items-center gap-3 text-[var(--foreground)] font-medium">
                                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                                    </div>
                                    1 Google Sheets Connection
                                </li>
                            </ul>
                            <Link href={user ? "/dashboard?plan=free" : "/login?plan=free"} className="block w-full text-center bg-[var(--background)] border-[2px] border-[var(--border)] text-[var(--foreground)] px-6 py-3 rounded-full font-bold hover:bg-[var(--muted)] transition-colors">
                                Get Started Free
                            </Link>
                        </div>

                        {/* Pro Tier */}
                        <div className={`bg-[var(--foreground)] border-[2px] border-[var(--foreground)] rounded-[var(--radius-xl)] p-8 shadow-pop transition-all duration-700 hover:-translate-y-1 relative overflow-hidden ${pricingInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: "200ms" }}>
                            <div className="absolute top-0 right-0 bg-[var(--tertiary)] text-[var(--foreground)] text-xs font-bold px-4 py-1 rounded-bl-lg">
                                MOST POPULAR
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>Pro</h3>
                            <div className="text-4xl font-extrabold text-white mb-6">$29<span className="text-lg text-white/50 font-medium">/mo</span></div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-white font-medium">
                                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                                    </div>
                                    Unlimited documents
                                </li>
                                <li className="flex items-center gap-3 text-white font-medium">
                                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                                    </div>
                                    Unlimited Connections
                                </li>
                                <li className="flex items-center gap-3 text-white font-medium">
                                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                                    </div>
                                    Priority email support
                                </li>
                            </ul>
                            <Link href={user ? "/dashboard?plan=pro" : "/login?plan=pro"} className="block w-full text-center bg-[var(--accent)] text-white px-6 py-3 rounded-full font-bold hover:-translate-y-0.5 active:translate-y-0.5 transition-all shadow-pop">
                                Upgrade to Pro
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════╗
               ║       SOCIAL PROOF / STATS   ║
               ╚══════════════════════════════╝ */}
            <section ref={statsRef} className="py-20 px-6 border-y-[2px] border-[var(--border)]">
                <div className="max-w-5xl mx-auto">
                    <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 transition-all duration-700 ${statsInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                        {[
                            { value: 98, suffix: "%", label: "Extraction accuracy" },
                            { value: 12, suffix: "s", label: "Average processing time" },
                            { value: 3, suffix: ".5hrs", label: "Saved daily per office" },
                            { value: 0, suffix: "", label: "Duplicate posts (ever)", displayZero: true },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <p className="text-4xl md:text-5xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-heading)" }}>
                                    {stat.displayZero ? (
                                        <span className="tabular-nums">0</span>
                                    ) : (
                                        <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                                    )}
                                </p>
                                <p className="text-sm text-[var(--muted-foreground)] font-medium mt-2">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════╗
               ║     TESTIMONIALS / TRUST     ║
               ╚══════════════════════════════╝ */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="absolute bottom-8 left-[5%] w-20 h-20 bg-[var(--secondary)]/8 rounded-full animate-float" style={{ animationDelay: "1s" }} />
                <div className="absolute top-12 right-[8%] w-12 h-12 bg-[var(--tertiary)]/10 rotate-45 animate-float" style={{ animationDelay: "4s" }} />

                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-heading)" }}>
                            Trusted by small offices everywhere
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { name: "Sarah M.", role: "Office Manager, Vertex Co.", quote: "We used to spend entire mornings typing invoices. EntryAI cut that to 10 minutes. Our accountant actually smiles now." },
                            { name: "Raj P.", role: "Founder, ExportHub", quote: "The duplicate detection alone saved us from a $4,200 double payment. Paid for itself on day one." },
                            { name: "Lisa T.", role: "Bookkeeper", quote: "I was skeptical about AI reading receipts. The confidence scores won me over — I always know when to double-check." },
                        ].map((t, i) => (
                            <div key={i} className="bg-[var(--card)] border-[2px] border-[var(--foreground)] rounded-[var(--radius-lg)] p-6 shadow-pop-card relative">
                                {/* Speech bubble tab */}
                                <div className="absolute -top-3 left-6 w-6 h-6 bg-[var(--card)] border-l-[2px] border-t-[2px] border-[var(--foreground)] rotate-45" />

                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="w-4 h-4 text-[var(--tertiary)] fill-[var(--tertiary)]" />
                                    ))}
                                </div>
                                <p className="text-sm text-[var(--foreground)] leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                                <div className="flex items-center gap-3 pt-4 border-t-[2px] border-[var(--border)]">
                                    <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                                        {t.name[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[var(--foreground)]">{t.name}</p>
                                        <p className="text-[11px] text-[var(--muted-foreground)]">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════╗
               ║        FINAL CTA             ║
               ╚══════════════════════════════╝ */}
            <section ref={ctaRef} className="py-24 px-6 bg-[var(--accent)] relative overflow-hidden">
                {/* Decorative shapes */}
                <div className="absolute top-8 left-[10%] w-24 h-24 rounded-full bg-white/10 animate-float" />
                <div className="absolute bottom-8 right-[12%] w-16 h-16 bg-white/8 rotate-45 animate-float" style={{ animationDelay: "2s" }} />
                <div className="absolute top-1/2 right-[30%] w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[28px] border-b-white/8 animate-float" style={{ animationDelay: "3s" }} />

                <div className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${ctaInView ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`}>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                        Ready to stop typing?
                    </h2>
                    <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
                        Join hundreds of small offices automating their invoice workflow. Set up in under 2 minutes.
                    </p>
                    <Link href={user ? "/dashboard" : "/login"}>
                        <button
                            className="inline-flex items-center gap-2 bg-white text-[var(--accent)] font-extrabold text-base px-10 py-4 rounded-full border-[2px] border-[var(--foreground)] shadow-pop transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-active"
                            style={{ transitionTimingFunction: "var(--bounce)", fontFamily: "var(--font-heading)" }}
                        >
                            {user ? "Go to Dashboard" : "Get Started Free"} <ArrowRight className="w-5 h-5" />
                        </button>
                    </Link>
                    <p className="text-sm text-white/50 mt-4 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> No credit card required
                    </p>
                </div>
            </section>

            {/* ╔══════════════════════════════╗
               ║           FOOTER             ║
               ╚══════════════════════════════╝ */}
            <footer className="py-12 px-6 border-t-[2px] border-[var(--border)]">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-base font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-heading)" }}>EntryAI</span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-[var(--muted-foreground)]">
                        <a href="#features" className="hover:text-[var(--foreground)] transition">Features</a>
                        <a href="#how-it-works" className="hover:text-[var(--foreground)] transition">How It Works</a>
                        <Link href={user ? "/dashboard" : "/login"} className="hover:text-[var(--foreground)] transition">
                            {user ? "Dashboard" : "Sign In"}
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <div className="w-3 h-3 rounded-full bg-[var(--secondary)]/30" />
                        <div className="w-3 h-3 bg-[var(--tertiary)]/30 rotate-45" />
                        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-[var(--quaternary)]/30" />
                        <span className="ml-2">© 2026 EntryAI</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
