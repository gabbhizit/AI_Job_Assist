"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Briefcase, FileText, FileStack, Bot,
  Settings, Zap, User, Bookmark, Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ProfileModal } from "./profile-modal";
import { SettingsModal } from "./settings-modal";
import { UpgradeModal } from "./upgrade-modal";

// ── ScoreRing (ported from Figma Layout.tsx) ──────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      <svg className="absolute inset-0 -rotate-90" width="40" height="40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#e8e8e8" strokeWidth="2.5" />
        <circle
          cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <span style={{ fontSize: "10px", color: "#111111", lineHeight: 1, fontWeight: 600 }}>{score}</span>
    </div>
  );
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const navItems = [
  { to: "/dashboard",            label: "Dashboard",    icon: LayoutDashboard, color: "#6366f1", disabled: false },
  { to: "/dashboard/jobs",       label: "Jobs",         icon: Briefcase,       color: "#0ea5e9", disabled: false },
  { to: "/dashboard/jobs/saved", label: "Saved",        icon: Bookmark,        color: "#8b5cf6", disabled: false },
  { to: "/dashboard/applications", label: "Applications", icon: FileText,  color: "#d97706", disabled: false },
  { to: "/dashboard/resume",      label: "Resume",       icon: FileStack, color: "#8b5cf6", disabled: false },
  { to: "/dashboard/coach",       label: "AI Coach",     icon: Bot,       color: "#16a34a", disabled: false },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [healthScore, setHealthScore] = useState(75);
  const [openModal, setOpenModal] = useState<"profile" | "settings" | "upgrade" | null>(null);

  // Derive health score from avg match score
  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        const matches = data.matches || [];
        if (matches.length > 0) {
          const avg = Math.round(matches.reduce((s: number, m: { score: number }) => s + m.score, 0) / matches.length);
          setHealthScore(Math.min(100, Math.round(50 + avg * 0.5)));
        }
      })
      .catch(() => {/* keep default 75 */});
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside
      className="flex flex-col border-r border-[#e8e8e8] py-5 px-3 bg-white shadow-sm hidden md:flex"
      style={{ width: "220px", minWidth: "220px", height: "100vh", position: "sticky", top: 0 }}
    >
      {/* Logo */}
      <div className="px-3 mb-8 flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-[7px] shadow-sm"
          style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <Flame size={13} color="white" />
        </div>
        <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.03em", color: "#111111" }}>
          OfferPath
        </span>
      </div>

      {/* Health Score */}
      <div className="flex items-center gap-3 px-3 mb-6 pb-5 border-b border-[#f0f0f0]">
        <ScoreRing score={healthScore} />
        <div>
          <p style={{ fontSize: "11px", color: "#aaaaaa", lineHeight: 1 }}>Health Score</p>
          <p style={{ fontSize: "13px", color: "#111111", marginTop: "3px", lineHeight: 1, fontWeight: 600 }}>
            {healthScore} / 100
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map(({ to, label, icon: Icon, color, disabled }) => {
          if (disabled) {
            return (
              <span
                key={label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[7px]"
                style={{ opacity: 0.4, cursor: "not-allowed" }}
              >
                <Icon size={15} strokeWidth={1.8} color="#aaaaaa" />
                <span style={{ fontSize: "13px", lineHeight: 1, color: "#888888", flex: 1 }}>{label}</span>
                <span style={{
                  fontSize: "9px", background: "#f0f0f0", color: "#aaaaaa",
                  padding: "1px 5px", borderRadius: "3px", lineHeight: "14px",
                }}>
                  Soon
                </span>
              </span>
            );
          }

          const isActive = to === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(to);

          return (
            <Link
              key={to}
              href={to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[7px] transition-all"
              style={
                isActive
                  ? { background: `${color}12`, color }
                  : { color: "#888888" }
              }
            >
              <Icon
                size={15}
                strokeWidth={isActive ? 2 : 1.8}
                color={isActive ? color : "#aaaaaa"}
              />
              <span style={{ fontSize: "13px", lineHeight: 1, fontWeight: isActive ? 500 : 400 }}>
                {label}
              </span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-0.5 border-t border-[#f0f0f0] pt-4 mt-4">
        <button
          onClick={() => setOpenModal("profile")}
          className="flex items-center gap-3 px-3 py-2 rounded-[6px] w-full text-left transition-colors hover:bg-[#f5f5f5]"
          style={{ color: "#888888" }}
        >
          <User size={15} strokeWidth={1.8} />
          <span style={{ fontSize: "13px", lineHeight: 1 }}>Profile</span>
        </button>
        <button
          onClick={() => setOpenModal("settings")}
          className="flex items-center gap-3 px-3 py-2 rounded-[6px] w-full text-left transition-colors hover:bg-[#f5f5f5]"
          style={{ color: "#888888" }}
        >
          <Settings size={15} strokeWidth={1.8} />
          <span style={{ fontSize: "13px", lineHeight: 1 }}>Settings</span>
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-[6px] w-full text-left transition-colors hover:bg-[#f5f5f5]"
          style={{ color: "#888888" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaaaaa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span style={{ fontSize: "13px", lineHeight: 1 }}>Sign Out</span>
        </button>
        <button
          onClick={() => setOpenModal("upgrade")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[7px] w-full text-left transition-all border"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))",
            color: "#6366f1",
            borderColor: "rgba(99,102,241,0.15)",
          }}
        >
          <Zap size={15} strokeWidth={1.8} />
          <span style={{ fontSize: "13px", lineHeight: 1, fontWeight: 500 }}>Upgrade to Pro</span>
        </button>
      </div>

      <ProfileModal isOpen={openModal === "profile"} onClose={() => setOpenModal(null)} />
      <SettingsModal isOpen={openModal === "settings"} onClose={() => setOpenModal(null)} />
      <UpgradeModal isOpen={openModal === "upgrade"} onClose={() => setOpenModal(null)} />
    </aside>
  );
}
