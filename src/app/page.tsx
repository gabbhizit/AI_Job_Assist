"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Zap, Shield, FileText, Bot, Users, TrendingUp,
  Check, ArrowRight, Star, ChevronRight, Play, Flame, Menu, X,
} from "lucide-react";

// ── Dark hero wrapper with dot grid + vignette ──────────────────────────────
function NoiseHero({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden" style={{ background: "#080c14" }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)",
      }} />
      {children}
    </div>
  );
}

// ── Animated match score ring ────────────────────────────────────────────────
function MatchRing({ score, size = 56, stroke = 4, color = "#6366f1" }: {
  score: number; size?: number; stroke?: number; color?: string;
}) {
  const [displayed, setDisplayed] = useState(0);
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (displayed / 100) * circ;

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 1200;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - prog, 3);
      setDisplayed(Math.round(score * eased));
      if (prog < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.05s linear" }} />
      </svg>
      <span style={{ fontSize: size / 4.5, color: "white", fontWeight: 700, lineHeight: 1 }}>{displayed}</span>
    </div>
  );
}

// ── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start: number | null = null;
        const animate = (ts: number) => {
          if (!start) start = ts;
          const prog = Math.min((ts - start) / duration, 1);
          const eased = 1 - Math.pow(1 - prog, 3);
          setVal(Math.round(target * eased));
          if (prog < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { val, ref };
}

function StatNumber({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const { val, ref } = useCountUp(target);
  return (
    <div ref={ref} style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.04em", color: "#030712" }}>
      {prefix}{val.toLocaleString()}{suffix}
    </div>
  );
}

// ── Job card mockup ──────────────────────────────────────────────────────────
function JobCardMockup({ title, company, salary, score, sponsor, delay = 0 }: {
  title: string; company: string; salary: string; score: number; sponsor: boolean; delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className="transition-all duration-700" style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "12px",
      padding: "16px",
      backdropFilter: "blur(8px)",
    }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.1)" }}>
          <span style={{ fontSize: "14px" }}>🏢</span>
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: "13px", fontWeight: 600, color: "white", lineHeight: 1.3 }}>{title}</p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>{company} · {salary}</p>
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {sponsor && (
              <span style={{ fontSize: "10px", color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "4px", padding: "2px 6px" }}>
                H1B Sponsor ✓
              </span>
            )}
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)", borderRadius: "4px", padding: "2px 6px" }}>
              New York, NY
            </span>
          </div>
        </div>
        <MatchRing score={score} size={44} stroke={3} color={score >= 80 ? "#6366f1" : "#8b5cf6"} />
      </div>
    </div>
  );
}

// ── Scroll-triggered fade-in wrapper ────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// ── Static data ──────────────────────────────────────────────────────────────
const features = [
  {
    icon: TrendingUp, color: "#6366f1", title: "AI Job Matching",
    desc: "Every job scored for your exact profile. Skills, experience, location, salary — and visa sponsorship. Not just keyword matching. Real compatibility.",
    detail: "Match score: 87% · H1B Sponsor ✓ · 312 matching roles found",
  },
  {
    icon: Shield, color: "#0ea5e9", title: "Visa Intelligence",
    desc: "Know before you apply. Every company's H1B filing history, E-Verify status, PERM data, and sponsorship approval rate — from USCIS and DOL data.",
    detail: "Google LLC · 57,064 H1B cases · 94% approval rate · Avg salary $165K",
  },
  {
    icon: Zap, color: "#8b5cf6", title: "Auto-Apply Engine",
    desc: "Queue jobs. Watch them get submitted. The local automation fills every field, uploads your tailored resume, and handles screening questions — live, on your machine.",
    detail: "3 applications running · Apple · Google · Meta · 0 failed",
  },
  {
    icon: FileText, color: "#f59e0b", title: "Resume Tailoring",
    desc: "One base resume, infinite tailored versions. Each application gets a resume rewritten for that specific job description. ATS-scored. Keyword-optimized.",
    detail: "Resume score: 91/100 · 7/8 required skills matched",
  },
  {
    icon: Bot, color: "#ec4899", title: "AI Career Coach",
    desc: "Ask it anything. It knows your resume, your applications, your rejections, your visa timeline. 'Why am I getting rejected?' gets a real answer, not a template.",
    detail: "OPT expires in 47 days · 3 high-priority roles identified",
  },
  {
    icon: Users, color: "#10b981", title: "Insider Connections",
    desc: "Find people at your target companies. Alumni, school connections, consultancy network peers. Get an outreach message pre-written for each one.",
    detail: "2 SCAD alumni at Figma · 1 suggested connection at Airbnb",
  },
];

const testimonials = [
  {
    quote: "I was applying to 20+ jobs a week manually and hearing nothing back. OfferPath showed me I was applying to companies with zero sponsorship history. Changed my entire strategy.",
    name: "Priya K.", role: "MS Computer Science, OPT · Now at Amazon",
  },
  {
    quote: "The auto-apply actually works. Not 'sort of works' — it completes the whole application. I watched it fill out a Workday form in 4 minutes.",
    name: "Rohan M.", role: "UX Designer · Landed at Figma",
  },
  {
    quote: "The AI coach told me exactly why I kept getting rejected at the resume stage. I fixed two things. My response rate went from 3% to 17%.",
    name: "Selin A.", role: "MBA, STEM OPT · Now at Deloitte",
  },
];

const steps = [
  { n: "01", icon: "⚡", title: "Set up once", desc: "Upload your resume. Tell us your visa status, target roles, location, and dealbreakers. Takes 4 minutes." },
  { n: "02", icon: "🎯", title: "Get matched jobs", desc: "Our engine scores every job for skill fit, location, salary, AND visa sponsorship history. Match scores, not just listings." },
  { n: "03", icon: "🚀", title: "Auto-apply with control", desc: "Add jobs to your queue. Watch the local automation fill out applications in real-time. Tailored resume, cover letter, screening answers." },
  { n: "04", icon: "🏆", title: "Track, prep, and land", desc: "Every application tracked automatically. Interview prep generated for each role. AI coach guides you through offer negotiation." },
];

// ── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,0.08)" : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <Flame size={13} color="white" />
          </div>
          <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.03em", color: scrolled ? "#030712" : "#ffffff" }}>
            OfferPath
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => scrollTo("how-it-works")}
            className="px-3.5 py-2 rounded-lg transition-all text-sm cursor-pointer hover:bg-white/10"
            style={{ fontSize: "14px", fontWeight: 500, color: scrolled ? "#6b7280" : "rgba(255,255,255,0.8)" }}
          >
            How it works
          </button>
          <button
            onClick={() => scrollTo("features")}
            className="px-3.5 py-2 rounded-lg transition-all text-sm cursor-pointer hover:bg-white/10"
            style={{ fontSize: "14px", fontWeight: 500, color: scrolled ? "#6b7280" : "rgba(255,255,255,0.8)" }}
          >
            Features
          </button>
          <button
            onClick={() => scrollTo("pricing")}
            className="px-3.5 py-2 rounded-lg transition-all text-sm cursor-pointer hover:bg-white/10"
            style={{ fontSize: "14px", fontWeight: 500, color: scrolled ? "#6b7280" : "rgba(255,255,255,0.8)" }}
          >
            Pricing
          </button>
          <div className="flex items-center gap-1.5 px-3.5 py-2 cursor-default"
            style={{ fontSize: "14px", fontWeight: 500, color: scrolled ? "#9ca3af" : "rgba(255,255,255,0.45)" }}>
            Blog
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: "#6366f120", color: "#6366f1", border: "1px solid #6366f140" }}>Soon</span>
          </div>
        </nav>

        {/* Right CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <button className="px-4 py-2 rounded-lg transition-all border"
              style={{
                fontSize: "14px", fontWeight: 500,
                color: scrolled ? "#374151" : "rgba(255,255,255,0.9)",
                borderColor: scrolled ? "#e5e7eb" : "rgba(255,255,255,0.25)",
                background: scrolled ? "white" : "transparent",
              }}>
              Log In
            </button>
          </Link>
          <Link href="/login">
            <button className="px-4 py-2 rounded-lg text-white transition-all hover:opacity-90"
              style={{ fontSize: "14px", fontWeight: 600, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              Get Started Free
            </button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg transition-colors"
          style={{ color: scrolled ? "#374151" : "white" }}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 flex flex-col p-6" style={{ background: "#030712" }}>
          <div className="flex flex-col gap-2">
            {[
              { label: "How it works", id: "how-it-works" },
              { label: "Features", id: "features" },
              { label: "Pricing", id: "pricing" },
            ].map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-left px-4 py-4 rounded-xl text-white/90 hover:bg-white/10 transition-colors"
                style={{ fontSize: "20px", fontWeight: 500 }}>
                {item.label}
              </button>
            ))}
            <div className="flex items-center gap-2 px-4 py-4 text-white/30" style={{ fontSize: "20px", fontWeight: 500 }}>
              Blog
              <span className="text-[11px] px-1.5 py-0.5 rounded-full"
                style={{ background: "#6366f120", color: "#6366f1", border: "1px solid #6366f140" }}>Soon</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 mt-auto">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <button className="w-full py-3.5 rounded-xl border border-white/20 text-white transition-colors hover:bg-white/10"
                style={{ fontSize: "16px", fontWeight: 500 }}>
                Log In
              </button>
            </Link>
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <button className="w-full py-3.5 rounded-xl text-white transition-opacity hover:opacity-90"
                style={{ fontSize: "16px", fontWeight: 600, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                Get Started Free
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ── Main landing page ────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div style={{ fontFamily: "var(--font-dm-sans), 'Inter', sans-serif" }}>
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────── */}
      <NoiseHero>
        <div className="max-w-7xl mx-auto px-6 pt-36 pb-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              {/* Beta badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
                style={{ border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.08)" }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#6366f1" }} />
                <span style={{ fontSize: "12px", color: "#6366f1", fontWeight: 500 }}>Now in Beta · Join the waitlist</span>
              </div>

              {/* Headline */}
              <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800, letterSpacing: "-0.04em", color: "white", lineHeight: 1.08, marginBottom: "12px" }}>
                Your job search,
                <br />
                <span style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  finally on autopilot.
                </span>
              </h1>
              <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "8px" }}>
                For international students who are done doing this manually.
              </p>
              <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: "36px" }}>
                OfferPath finds the right jobs, checks visa sponsorship, tailors your resume, and applies — while you prepare for interviews.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <Link href="/login">
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", fontSize: "15px", fontWeight: 600 }}>
                    Start for free <ArrowRight size={15} />
                  </button>
                </Link>
                <button
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all hover:bg-white/10"
                  style={{ fontSize: "15px", fontWeight: 500, color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <Play size={13} /> See how it works
                </button>
              </div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>No credit card required · Free tier available</p>

              {/* University strip */}
              <div className="flex flex-wrap items-center gap-2 mt-8">
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Built for students at</span>
                {["NYU", "Purdue", "Stony Brook", "UMass", "UIUC", "UT Austin"].map(u => (
                  <span key={u} className="px-2.5 py-1 rounded-md"
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {u}
                  </span>
                ))}
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>and 200+ more</span>
              </div>
            </div>

            {/* Hero visual — job feed mockup */}
            <div className="lg:flex flex-col gap-3 hidden">
              <div className="px-1">
                <div className="flex items-center justify-between mb-4">
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Matched for you · 312 roles
                  </p>
                  <span style={{ fontSize: "11px", color: "#6366f1" }}>Visa filter: ON ✓</span>
                </div>
                <div className="flex flex-col gap-3">
                  <JobCardMockup title="Senior Software Engineer" company="Figma" salary="$145K–$185K" score={94} sponsor={true} delay={300} />
                  <JobCardMockup title="Software Engineer II" company="Google" salary="$130K–$165K" score={87} sponsor={true} delay={550} />
                  <JobCardMockup title="Full Stack Engineer" company="Airbnb" salary="$120K–$155K" score={81} sponsor={true} delay={800} />
                  <JobCardMockup title="Backend Engineer" company="Stripe" salary="$140K–$180K" score={76} sponsor={true} delay={1050} />
                </div>
              </div>
              {/* Auto-apply widget */}
              <div className="rounded-xl p-4 mt-2"
                style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#6366f1" }} />
                    <span style={{ fontSize: "12px", color: "#6366f1", fontWeight: 600 }}>Auto-apply running</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>3 of 8 complete</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[{ c: "Apple", done: true }, { c: "Google", done: true }, { c: "Meta", done: true }, { c: "Netflix", done: false }, { c: "Uber", done: false }].map(({ c, done }) => (
                    <span key={c} className="px-2.5 py-1 rounded-md"
                      style={{
                        fontSize: "11px",
                        color: done ? "#4ade80" : "rgba(255,255,255,0.3)",
                        background: done ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${done ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)"}`,
                      }}>
                      {done ? "✓ " : ""}{c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Problem strip */}
        <div className="border-t border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="grid md:grid-cols-3 gap-px" style={{ background: "rgba(255,255,255,0.06)" }}>
              {[
                { stat: "200+ roles", ctx: "The average job seeker applies to 200+ before landing an offer.", sub: "Manual. Repetitive. Soul-crushing." },
                { stat: "68% of students", ctx: "don't know if a company sponsors before applying.", sub: "Wasted applications. Wasted time." },
                { stat: "Every tool", ctx: "helps you apply. None of them do it for you.", sub: "Until now." },
              ].map((p, i) => (
                <div key={i} className="px-8 py-7" style={{ background: "#080c14" }}>
                  <p style={{ fontSize: "20px", fontWeight: 700, color: "#6366f1", letterSpacing: "-0.02em", marginBottom: "6px" }}>{p.stat}</p>
                  <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{p.ctx}</p>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", marginTop: "4px" }}>{p.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </NoiseHero>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <span style={{ fontSize: "11px", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>The platform</span>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#030712", marginTop: "8px", lineHeight: 1.1 }}>
                From profile to offer.<br />One platform.
              </h2>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <FadeIn key={step.n} delay={i * 100}>
                <div className="relative p-6 rounded-2xl border hover:border-indigo-200 hover:shadow-lg transition-all"
                  style={{ borderColor: "#f3f4f6" }}>
                  <div className="absolute top-4 right-4"
                    style={{ fontSize: "48px", fontWeight: 800, color: "#f9fafb", lineHeight: 1, userSelect: "none" }}>
                    {step.n}
                  </div>
                  <div className="text-3xl mb-4">{step.icon}</div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#030712", letterSpacing: "-0.02em", marginBottom: "8px" }}>{step.title}</h3>
                  <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" className="py-24" style={{ background: "#f9fafb" }}>
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <span style={{ fontSize: "11px", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>What you get</span>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#030712", marginTop: "8px" }}>
                Every tool you need.<br />No switching tabs.
              </h2>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={i * 80}>
                <div
                  className="bg-white p-6 rounded-2xl border transition-all cursor-default"
                  style={{ borderColor: "#f3f4f6" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 40px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${f.color}15` }}>
                    <f.icon size={18} color={f.color} />
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#030712", letterSpacing: "-0.02em", marginBottom: "8px" }}>{f.title}</h3>
                  <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.6, marginBottom: "16px" }}>{f.desc}</p>
                  <div className="px-3 py-2 rounded-lg" style={{ background: `${f.color}08`, border: `1px solid ${f.color}20` }}>
                    <p style={{ fontSize: "11px", color: f.color, fontWeight: 500 }}>{f.detail}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── VISA INTELLIGENCE SPOTLIGHT ─────────────────────── */}
      <section style={{ background: "#080c14" }} className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <div>
                <span style={{ fontSize: "11px", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Built for international students</span>
                <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", color: "white", marginTop: "12px", lineHeight: 1.1, marginBottom: "20px" }}>
                  Stop applying to companies<br />that don&apos;t sponsor.
                </h2>
                <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "12px" }}>
                  Most job search tools don&apos;t tell you if a company sponsors. You find out after wasting 45 minutes on a Workday form.
                </p>
                <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "32px" }}>
                  OfferPath shows sponsorship history on every single job card — before you apply.
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginBottom: "24px" }}>
                  Data sourced from USCIS and Department of Labor public filings. Updated quarterly.
                </p>
                <Link href="/login">
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", fontSize: "15px", fontWeight: 600 }}>
                    See it live <ArrowRight size={15} />
                  </button>
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="flex items-center gap-3 mb-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: "18px" }}>🏢</span>
                  </div>
                  <div>
                    <p style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>Google LLC</p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Mountain View, CA · Technology</p>
                  </div>
                  <div className="ml-auto px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)" }}>
                    <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: 600 }}>H1B Sponsor ✓</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>H1B Cases Filed (2019–2024)</span>
                      <span style={{ fontSize: "12px", color: "white", fontWeight: 600 }}>57,064</span>
                    </div>
                    <div className="flex gap-1 items-end h-12">
                      {[62, 71, 78, 84, 91, 100].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm"
                          style={{ height: `${h}%`, background: `rgba(99,102,241,${0.3 + i * 0.12})` }} />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      {["'19", "'20", "'21", "'22", "'23", "'24"].map(y => (
                        <span key={y} style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>{y}</span>
                      ))}
                    </div>
                  </div>
                  {[
                    { label: "Approval Rate", val: "94%", color: "#4ade80" },
                    { label: "Average H1B Salary", val: "$165,000", color: "#6366f1" },
                    { label: "E-Verify Status", val: "✓ Enrolled", color: "#4ade80" },
                    { label: "PERM (Green Card) Cases", val: "12,857", color: "#0ea5e9" },
                    { label: "STEM Eligible Roles", val: "73%", color: "#8b5cf6" },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center py-2"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>{row.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: row.color }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS + STATS ────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#030712", textAlign: "center", marginBottom: "48px" }}>
              What job seekers are saying
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="p-6 rounded-2xl border h-full flex flex-col" style={{ borderColor: "#f3f4f6" }}>
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} size={13} fill="#f59e0b" color="#f59e0b" />)}
                  </div>
                  <p style={{ fontSize: "15px", color: "#374151", lineHeight: 1.7, flex: 1 }}>&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-5 pt-4" style={{ borderTop: "1px solid #f3f4f6" }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#030712" }}>{t.name}</p>
                    <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{t.role}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Stats strip */}
          <FadeIn>
            <div className="rounded-2xl p-8 grid grid-cols-3 gap-6 text-center"
              style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}>
              {[
                { target: 2400, suffix: "+", label: "students" },
                { target: 180000, suffix: "+", label: "applications submitted" },
                { target: 34, suffix: "%", label: "interview rate (platform average)" },
              ].map((s, i) => (
                <div key={i}>
                  <StatNumber target={s.target} suffix={s.suffix} />
                  <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CONSULTANCY CTA ─────────────────────────────────── */}
      <section className="py-20" style={{ background: "#f9fafb" }}>
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="rounded-2xl p-10 md:p-14 border" style={{ background: "white", borderColor: "#e5e7eb" }}>
              <div className="flex items-center gap-2 mb-6">
                <span className="px-3 py-1 rounded-full"
                  style={{ fontSize: "11px", color: "#14b8a6", background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.25)", fontWeight: 600 }}>
                  For consultancies
                </span>
                <span className="px-2 py-0.5 rounded-full"
                  style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                  Beta
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-12">
                <div>
                  <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#030712", lineHeight: 1.15, marginBottom: "16px" }}>
                    Running a job placement consultancy? We built something for you.
                  </h2>
                  <p style={{ fontSize: "15px", color: "#6b7280", lineHeight: 1.7, marginBottom: "24px" }}>
                    OfferPath gives consultancies a real-time dashboard to track their students&apos; job search activity. See applications submitted, interview progress, and placement outcomes — without managing it manually.
                  </p>
                  <Link href="/login">
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
                      style={{ fontSize: "14px", fontWeight: 600, background: "#030712" }}>
                      Contact Sales <ArrowRight size={14} />
                    </button>
                  </Link>
                  <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "10px" }}>
                    Currently in private beta. Limited partner spots available.
                  </p>
                </div>
                <div>
                  <div className="flex flex-col gap-3">
                    {[
                      { text: "Student cohort dashboard", available: true },
                      { text: "Application and interview pipeline", available: true },
                      { text: "Activity health scores per student", available: true },
                      { text: "Automated progress alerts", available: true },
                      { text: "Referral attribution and commission tracking", available: true },
                      { text: "Advanced features", available: false, beta: true },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.available ? "bg-indigo-50" : "bg-gray-100"}`}>
                          {item.available
                            ? <Check size={11} color="#6366f1" />
                            : <span style={{ fontSize: "10px" }}>🔒</span>
                          }
                        </div>
                        <span style={{ fontSize: "14px", color: item.available ? "#374151" : "#9ca3af" }}>
                          {item.text}
                          {item.beta && (
                            <span className="ml-2 px-1.5 py-0.5 rounded"
                              style={{ fontSize: "10px", color: "#9ca3af", background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                              Beta
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#030712" }}>
                Start free. Upgrade when you&apos;re ready.
              </h2>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Free */}
            <FadeIn>
              <div className="p-8 rounded-2xl border flex flex-col" style={{ borderColor: "#e5e7eb" }}>
                <div className="mb-6">
                  <p style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Free</p>
                  <div className="flex items-baseline gap-1">
                    <span style={{ fontSize: "40px", fontWeight: 800, letterSpacing: "-0.04em", color: "#030712" }}>$0</span>
                    <span style={{ fontSize: "14px", color: "#9ca3af" }}>forever</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 flex-1 mb-8">
                  {[
                    "Job matching feed (unlimited browsing)",
                    "Visa & sponsorship filters",
                    "Manual apply",
                    "Basic tracker (50 applications)",
                    "3 tailored resumes/month",
                    "AI Coach (5 uses/week)",
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2.5">
                      <Check size={13} color="#14b8a6" strokeWidth={2.5} />
                      <span style={{ fontSize: "14px", color: "#6b7280" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/login">
                  <button className="w-full py-3 rounded-xl border transition-all hover:bg-gray-50"
                    style={{ fontSize: "14px", fontWeight: 600, color: "#374151", borderColor: "#e5e7eb" }}>
                    Get started free
                  </button>
                </Link>
              </div>
            </FadeIn>

            {/* Pro */}
            <FadeIn delay={100}>
              <div className="p-8 rounded-2xl flex flex-col relative overflow-hidden"
                style={{ background: "#080c14", border: "2px solid #6366f1" }}>
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-1 rounded-full text-white"
                    style={{ fontSize: "11px", fontWeight: 600, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                    Recommended
                  </span>
                </div>
                <div className="mb-6">
                  <p style={{ fontSize: "12px", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Pro</p>
                  <div className="flex items-baseline gap-1">
                    <span style={{ fontSize: "40px", fontWeight: 800, letterSpacing: "-0.04em", color: "white" }}>$19</span>
                    <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>/month</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#4ade80", marginTop: "4px" }}>or $149/year — saves 35%</p>
                </div>
                <div className="flex flex-col gap-3 flex-1 mb-8">
                  {[
                    "Everything in Free",
                    "Unlimited auto-apply queue",
                    "Unlimited tailored resumes + cover letters",
                    "Full AI Coach (unlimited)",
                    "Insider connection discovery",
                    "Interview prep packs",
                    "OPT timeline tools",
                    "Real-time job alerts",
                    "Salary negotiation assistant",
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2.5">
                      <Check size={13} color="#6366f1" strokeWidth={2.5} />
                      <span style={{ fontSize: "14px", color: f === "Everything in Free" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.85)" }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
                <Link href="/login">
                  <button className="w-full py-3 rounded-xl text-white transition-all hover:opacity-90"
                    style={{ fontSize: "14px", fontWeight: 600, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                    Start Pro free for 7 days
                  </button>
                </Link>
              </div>
            </FadeIn>
          </div>
          <div className="text-center">
            <button
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-1 transition-colors hover:text-indigo-600"
              style={{ fontSize: "14px", color: "#6b7280" }}>
              → See full feature comparison <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <NoiseHero>
        <div className="py-32 text-center max-w-3xl mx-auto px-6">
          <FadeIn>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 800, letterSpacing: "-0.04em", color: "white", lineHeight: 1.1, marginBottom: "16px" }}>
              Your OPT window is ticking.<br />
              <span style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Let&apos;s make every day count.
              </span>
            </h2>
            <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: "36px" }}>
              Join thousands of students who stopped applying blindly and started executing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/login">
                <button className="flex items-center gap-2 px-8 py-4 rounded-xl text-white transition-all hover:opacity-90"
                  style={{ fontSize: "16px", fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  Get started free <ArrowRight size={16} />
                </button>
              </Link>
              <button
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 px-8 py-4 rounded-xl transition-all hover:bg-white/10"
                style={{ fontSize: "16px", fontWeight: 600, color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.2)" }}>
                See the platform
              </button>
            </div>
          </FadeIn>
        </div>
      </NoiseHero>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background: "#030712" }}>
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-16">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  <Flame size={13} color="white" />
                </div>
                <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.03em", color: "white" }}>OfferPath</span>
              </div>
              <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6, maxWidth: "200px" }}>
                The job execution platform for international students.
              </p>
            </div>

            {/* Product */}
            <div>
              <p style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>Product</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Features", id: "features" },
                  { label: "Pricing", id: "pricing" },
                  { label: "How it works", id: "how-it-works" },
                ].map(l => (
                  <button key={l.label}
                    onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" })}
                    style={{ fontSize: "14px", color: "#9ca3af", textAlign: "left" }}
                    className="hover:text-white transition-colors">
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Company */}
            <div>
              <p style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>Company</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Privacy Policy", href: "#" },
                  { label: "Terms of Service", href: "#" },
                ].map(l => (
                  <Link key={l.label} href={l.href}
                    style={{ fontSize: "14px", color: "#9ca3af" }}
                    className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Students */}
            <div>
              <p style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>Students</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "How it works", id: "how-it-works" },
                  { label: "Visa Intelligence", id: "features" },
                  { label: "Resume Tools", id: "features" },
                  { label: "AI Coach", id: "features" },
                ].map((l, i) => (
                  <button key={i}
                    onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" })}
                    style={{ fontSize: "14px", color: "#9ca3af", textAlign: "left" }}
                    className="hover:text-white transition-colors">
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderColor: "#1f2937" }}>
            <p style={{ fontSize: "13px", color: "#4b5563" }}>
              © 2025 OfferPath · Made for international students, by people who get it.
            </p>
            <Link href="/dashboard">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:opacity-80"
                style={{ fontSize: "13px", color: "#6366f1", background: "#6366f110", border: "1px solid #6366f120" }}>
                Open the app <ArrowRight size={13} />
              </button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
