"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  width?: string;
  children: React.ReactNode;
}

export function Sheet({ isOpen, onClose, title, width = "420px", children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className="bg-white border-l border-[#e8e8e8] h-full overflow-y-auto shadow-2xl flex flex-col"
        style={{ width }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] flex-shrink-0">
            <h2 style={{ color: "#111111", fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em" }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[5px] text-[#aaaaaa] hover:text-[#555] hover:bg-[#f5f5f5] transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
