"use client";

import { useState } from "react";
import { X, Share2, SendHorizonal, ExternalLink, Check } from "lucide-react";

interface ShareModalProps {
  jobTitle: string;
  company: string;
  applicationUrl: string | null;
  onClose: () => void;
}

export function ShareModal({ jobTitle, company, applicationUrl, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = applicationUrl ?? `https://offerpath.co/jobs`;

  function handleCopy() {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shareOptions = [
    {
      label: "Copy link",
      icon: copied ? Check : Share2,
      action: handleCopy,
      color: "#6366f1",
    },
    {
      label: "Share via email",
      icon: SendHorizonal,
      action: () => {
        window.open(
          `mailto:?subject=Check out: ${jobTitle} at ${company}&body=Found this on OfferPath — ${shareUrl}`,
          "_blank"
        );
        onClose();
      },
      color: "#0ea5e9",
    },
    {
      label: "Open original job posting",
      icon: ExternalLink,
      action: () => {
        if (applicationUrl) window.open(applicationUrl, "_blank");
        onClose();
      },
      color: "#888888",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] border border-[#e8e8e8] w-[380px] p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 style={{ color: "#111111", fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em" }}>
              Share job
            </h3>
            <p style={{ fontSize: "12px", color: "#888888", marginTop: "2px" }}>
              {jobTitle} at {company}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[5px] text-[#aaaaaa] hover:text-[#555] hover:bg-[#f5f5f5] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Link box */}
        <div className="flex items-center gap-2 bg-[#fafafa] border border-[#e8e8e8] rounded-[8px] px-3 py-2.5 mb-4">
          <span
            style={{
              fontSize: "12px",
              color: "#888888",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {shareUrl}
          </span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 px-3 py-1 bg-[#6366f1] text-white rounded-[5px] hover:bg-[#4f46e5] transition-colors"
            style={{ fontSize: "11px" }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {shareOptions.map((s) => (
            <button
              key={s.label}
              onClick={s.action}
              className="flex items-center gap-3 px-4 py-3 border border-[#e8e8e8] rounded-[8px] text-left hover:bg-[#f8f8f8] transition-colors"
            >
              <div
                className="w-7 h-7 rounded-[6px] flex items-center justify-center"
                style={{ background: `${s.color}12` }}
              >
                <s.icon size={13} color={s.color} />
              </div>
              <span style={{ fontSize: "13px", color: "#333333" }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
