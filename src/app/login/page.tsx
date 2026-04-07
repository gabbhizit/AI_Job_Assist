"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Flame, ArrowRight } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        scopes:
          "openid email profile https://www.googleapis.com/auth/gmail.readonly",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "var(--font-dm-sans), 'Inter', sans-serif" }}>
      {/* Left — form panel */}
      <div className="flex-1 flex flex-col justify-center px-8 py-16 bg-white" style={{ maxWidth: "480px" }}>
        <div className="w-full">
          <Link href="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <Flame size={13} color="white" />
            </div>
            <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.03em", color: "#030712" }}>OfferPath</span>
          </Link>

          <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.03em", color: "#030712", marginBottom: "6px" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "15px", color: "#6b7280", marginBottom: "32px" }}>
            Sign in to your account to continue
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}>
              Authentication failed. Please try again.
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border transition-all hover:bg-gray-50 cursor-pointer"
            style={{ fontSize: "15px", fontWeight: 500, color: "#374151", borderColor: "#e5e7eb" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "#f3f4f6" }} />
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>new here?</span>
            <div className="flex-1 h-px" style={{ background: "#f3f4f6" }} />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white transition-all hover:opacity-90 cursor-pointer"
            style={{ fontSize: "15px", fontWeight: 600, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            Sign up free <ArrowRight size={15} />
          </button>

          <p className="text-center mt-6" style={{ fontSize: "12px", color: "#9ca3af" }}>
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline" style={{ color: "#6b7280" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline" style={{ color: "#6b7280" }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {/* Right — dark panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden" style={{ background: "#080c14" }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(99,102,241,0.12) 0%, transparent 70%)",
        }} />
        <div className="relative flex flex-col justify-center px-16 py-16">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
              style={{ border: "1px solid rgba(99,102,241,0.35)", background: "rgba(99,102,241,0.08)" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#6366f1" }} />
              <span style={{ fontSize: "12px", color: "#6366f1", fontWeight: 500 }}>2,400+ students active this week</span>
            </div>
            <h2 style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: "-0.04em", color: "white", lineHeight: 1.1, marginBottom: "16px" }}>
              Every day counts<br />on OPT.
            </h2>
            <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
              The platform is already running. Your job search shouldn&apos;t wait.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { emoji: "🎯", text: "87 new visa-matched jobs since yesterday" },
              { emoji: "⚡", text: "Auto-apply queue running for 340 students right now" },
              { emoji: "🤖", text: "AI Coach answered 2,100 questions this week" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span style={{ fontSize: "16px" }}>{item.emoji}</span>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
