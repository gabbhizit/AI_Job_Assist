"use client";

import { useState } from "react";
import { Menu, X, Flame } from "lucide-react";
import { Sidebar } from "./sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#e8e8e8] px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-[7px]"
            style={{ width: "24px", height: "24px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Flame size={11} color="white" />
          </div>
          <span style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "-0.03em", color: "#111111" }}>
            OfferPath
          </span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 rounded-[6px] text-[#888888] hover:bg-[#f5f5f5] transition-colors"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in sidebar */}
      <div
        className={`md:hidden fixed top-0 left-0 z-50 h-full transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>
    </>
  );
}
