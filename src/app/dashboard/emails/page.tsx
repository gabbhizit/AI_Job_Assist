"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmailCategory } from "@/lib/supabase/types";
import Link from "next/link";
import { Mail, ExternalLink } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface EmailEvent {
  id: string;
  gmail_message_id: string;
  subject: string | null;
  sender_email: string | null;
  sender_name: string | null;
  snippet: string | null;
  received_at: string | null;
  category: EmailCategory;
  company_name: string | null;
  job_match_id: string | null;
  is_read: boolean;
}

interface EmailsResponse {
  emails: EmailEvent[];
  total: number;
  page: number;
  limit: number;
}

interface ProfileResponse {
  gmail_connected_at: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<EmailCategory, string> = {
  application_confirmation: "Application",
  interview_invite:         "Interview",
  offer:                    "Offer",
  rejection:                "Rejection",
  recruiter_outreach:       "Recruiter",
  unknown:                  "Other",
};

const CATEGORY_CLASSES: Record<EmailCategory, string> = {
  application_confirmation: "bg-gray-100 text-gray-600",
  interview_invite:         "bg-blue-100 text-blue-700",
  offer:                    "bg-green-100 text-green-700",
  rejection:                "bg-red-100 text-red-600",
  recruiter_outreach:       "bg-purple-100 text-purple-700",
  unknown:                  "bg-slate-100 text-slate-500",
};

const FILTER_TABS: Array<{ label: string; value: EmailCategory | "all" }> = [
  { label: "All",          value: "all" },
  { label: "Applications", value: "application_confirmation" },
  { label: "Interviews",   value: "interview_invite" },
  { label: "Offers",       value: "offer" },
  { label: "Rejections",   value: "rejection" },
  { label: "Recruiters",   value: "recruiter_outreach" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function formatFullDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── EmailListItem ─────────────────────────────────────────────────────────────
function EmailListItem({
  email,
  isActive,
  onSelect,
}: {
  email: EmailEvent;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative px-4 py-3.5 cursor-pointer border-b border-[#f5f5f5] transition-all border-l-2 ${
        isActive
          ? "bg-[#0891b2]/5 border-l-[#0891b2]"
          : "border-l-transparent hover:bg-[#fafafa]"
      }`}
    >
      {/* Unread dot */}
      {!email.is_read && (
        <div className="absolute top-3.5 right-3 w-1.5 h-1.5 rounded-full bg-[#0891b2]" />
      )}

      {/* Row 1: category badge + date */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${CATEGORY_CLASSES[email.category]}`}
        >
          {CATEGORY_LABELS[email.category]}
        </span>
        <span style={{ fontSize: "11px", color: "#cccccc", paddingRight: email.is_read ? "0" : "14px" }}>
          {formatDate(email.received_at)}
        </span>
      </div>

      {/* Row 2: subject */}
      <p
        className="truncate"
        style={{
          fontSize: "13px",
          color: "#111111",
          fontWeight: isActive ? 600 : 500,
          lineHeight: 1.4,
        }}
      >
        {email.subject ?? "(no subject)"}
      </p>

      {/* Row 3: sender + company chip */}
      <div className="flex items-center gap-2 mt-0.5">
        <span className="truncate" style={{ fontSize: "12px", color: "#888888" }}>
          {email.sender_name ?? email.sender_email ?? "Unknown sender"}
        </span>
        {email.company_name && email.job_match_id && (
          <span
            className="flex-shrink-0"
            style={{
              fontSize: "10px", color: "#0891b2",
              background: "#0891b210", padding: "1px 5px",
              borderRadius: "3px", border: "1px solid #0891b220",
            }}
          >
            {email.company_name}
          </span>
        )}
      </div>

      {/* Row 4: snippet preview */}
      {email.snippet && (
        <p className="truncate mt-0.5" style={{ fontSize: "11px", color: "#cccccc" }}>
          {decodeEntities(email.snippet)}
        </p>
      )}
    </div>
  );
}

// ── EmailDetail ───────────────────────────────────────────────────────────────
function EmailDetail({ email }: { email: EmailEvent }) {
  const gmailUrl = `https://mail.google.com/mail/u/0/#all/${email.gmail_message_id}`;

  const detailRows = [
    { label: "From",     value: email.sender_name ?? email.sender_email ?? "—" },
    { label: "Email",    value: email.sender_email ?? "—" },
    { label: "Received", value: formatFullDate(email.received_at) },
    { label: "Category", value: CATEGORY_LABELS[email.category] },
    { label: "Company",  value: email.company_name ?? "—" },
    { label: "Status",   value: email.is_read ? "Read" : "Unread" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "#f7f8fc" }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <div style={{ maxWidth: "660px" }}>

          {/* Header */}
          <div className="flex items-start gap-4 mb-5">
            <div
              className="flex items-center justify-center flex-shrink-0 rounded-[10px] shadow-sm"
              style={{ width: "44px", height: "44px", background: "white", border: "1px solid #e8e8e8" }}
            >
              <Mail size={18} color="#0891b2" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <h2
                className="leading-snug"
                style={{ color: "#111111", fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em" }}
              >
                {email.subject ?? "(no subject)"}
              </h2>
              <p style={{ fontSize: "13px", color: "#888888", marginTop: "3px" }}>
                {email.sender_name ?? email.sender_email ?? "Unknown"}
                {email.company_name && ` · ${email.company_name}`}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${CATEGORY_CLASSES[email.category]}`}
                >
                  {CATEGORY_LABELS[email.category]}
                </span>
                {email.received_at && (
                  <span style={{ fontSize: "11px", color: "#cccccc" }}>
                    {formatDate(email.received_at)}
                  </span>
                )}
                {!email.is_read && (
                  <span
                    style={{
                      fontSize: "10px", background: "#0891b210", color: "#0891b2",
                      padding: "1px 6px", borderRadius: "4px", border: "1px solid #0891b220",
                      fontWeight: 500,
                    }}
                  >
                    Unread
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details card */}
          <div
            className="rounded-[10px] p-5 mb-4 shadow-sm"
            style={{ background: "white", border: "1px solid #e8e8e8" }}
          >
            <p style={{ fontSize: "11px", color: "#aaaaaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
              Details
            </p>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              {detailRows.map(({ label, value }) => (
                <div key={label}>
                  <span className="block" style={{ fontSize: "11px", color: "#cccccc", marginBottom: "2px" }}>
                    {label}
                  </span>
                  <span className="block truncate" style={{ fontSize: "13px", color: "#555555" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Snippet card */}
          {email.snippet && (
            <div
              className="rounded-[10px] p-5 mb-4 shadow-sm"
              style={{ background: "white", border: "1px solid #e8e8e8" }}
            >
              <p style={{ fontSize: "11px", color: "#aaaaaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                Preview
              </p>
              <p style={{ fontSize: "13px", color: "#555555", lineHeight: 1.7 }}>
                {decodeEntities(email.snippet)}
              </p>
              <p style={{ fontSize: "11px", color: "#cccccc", marginTop: "10px" }}>
                Only the email preview is stored — open in Gmail to read the full message.
              </p>
            </div>
          )}

          {/* Linked job card */}
          {email.job_match_id && (
            <div
              className="rounded-[10px] p-5 mb-4 shadow-sm"
              style={{ background: "white", border: "1px solid #e8e8e8" }}
            >
              <p style={{ fontSize: "11px", color: "#aaaaaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                Linked Job
              </p>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: "13px", color: "#555555" }}>
                  {email.company_name ?? "Job match found"}
                </span>
                <Link
                  href="/dashboard/jobs"
                  style={{ fontSize: "12px", color: "#0891b2" }}
                  className="hover:opacity-75 transition-opacity"
                >
                  View jobs →
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Fixed action bar */}
      <div className="flex-shrink-0 border-t border-[#e8e8e8] bg-white px-7 py-4">
        <div className="flex items-center gap-3" style={{ maxWidth: "660px" }}>
          <a
            href={gmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-white hover:opacity-90 transition-opacity shadow-sm"
            style={{ fontSize: "13px", fontWeight: 500, background: "linear-gradient(135deg, #111111, #333333)" }}
          >
            <ExternalLink size={13} />
            Open in Gmail
          </a>
          {email.job_match_id && (
            <Link
              href="/dashboard/jobs"
              className="flex items-center gap-2 px-4 py-2.5 border rounded-[8px] transition-all hover:border-[#0891b2]/25 hover:text-[#0891b2]"
              style={{ fontSize: "13px", color: "#555555", borderColor: "#e8e8e8" }}
            >
              View job →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── EmptyDetail ───────────────────────────────────────────────────────────────
function EmptyDetail() {
  return (
    <div className="flex items-center justify-center h-full" style={{ background: "#f7f8fc" }}>
      <div className="text-center">
        <div
          className="flex items-center justify-center mx-auto mb-4 rounded-full"
          style={{ width: "52px", height: "52px", background: "#f0f0f0" }}
        >
          <Mail size={20} color="#cccccc" strokeWidth={1.5} />
        </div>
        <p style={{ fontSize: "14px", color: "#aaaaaa" }}>Select an email to view details</p>
      </div>
    </div>
  );
}

// ── EmailsPage ────────────────────────────────────────────────────────────────
export default function EmailsPage() {
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<EmailEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState<EmailCategory | "all">("all");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Auto-select first email when list loads
  useEffect(() => {
    if (emails.length > 0 && !selectedEmailId) {
      setSelectedEmailId(emails[0].id);
    }
  }, [emails]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) ?? null;

  // Check if Gmail is connected
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: { profile: ProfileResponse }) => {
        setGmailConnected(!!data.profile?.gmail_connected_at);
      })
      .catch(() => setGmailConnected(false));
  }, []);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (activeCategory !== "all") params.set("category", activeCategory);
      const res = await fetch(`/api/emails?${params}`);
      const data: EmailsResponse = await res.json();
      setEmails(data.emails ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (gmailConnected) loadEmails();
  }, [gmailConnected, loadEmails]);

  // Reset selection when category changes
  useEffect(() => {
    setSelectedEmailId(null);
  }, [activeCategory]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/emails/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(
          data.synced > 0
            ? `Synced ${data.synced} new email${data.synced !== 1 ? "s" : ""}`
            : "Up to date"
        );
        await loadEmails();
      } else {
        setSyncMessage(data.error ?? "Sync failed");
      }
    } catch {
      setSyncMessage("Sync failed");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  // ── Initial loading state ──────────────────────────────────────────────────
  if (gmailConnected === null) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ── Not connected state ────────────────────────────────────────────────────
  if (!gmailConnected) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Job Emails</h1>
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Connect Gmail</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                See all your job emails in one place — application confirmations,
                interview invites, offers, and rejections, auto-categorized and
                linked to your job matches.
              </p>
            </div>
            <a href="/api/emails/connect">
              <Button>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                </svg>
                Connect Gmail
              </Button>
            </a>
            <p className="text-xs text-muted-foreground">
              Read-only access — we never send email or modify your inbox.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Split-panel layout ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col h-full border-r border-[#e8e8e8] bg-[#f9f9fb]"
        style={{ width: "360px", minWidth: "360px" }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-[#e8e8e8] bg-white overflow-hidden">
          {/* Row 1: title + sync */}
          <div className="flex items-center justify-between mb-3">
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", letterSpacing: "-0.03em" }}>
              Emails
            </h1>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-[6px] transition-all ${
                syncing
                  ? "border-[#0891b2]/30 text-[#0891b2] bg-[#0891b2]/5"
                  : "border-[#e8e8e8] text-[#888888] hover:border-[#d0d0d0]"
              }`}
              style={{ fontSize: "12px" }}
            >
              <svg
                width="12" height="12"
                viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                className={syncing ? "animate-spin" : ""}
              >
                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {syncing ? "Syncing…" : "Sync Now"}
            </button>
          </div>

          {/* Row 2: category tabs — underline style matching jobs page */}
          <div className="flex overflow-x-auto no-scrollbar">
            {FILTER_TABS.map((tab) => {
              const isActive = activeCategory === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveCategory(tab.value)}
                  className="pb-2.5 mr-3 transition-colors relative flex-shrink-0"
                  style={{
                    fontSize: "13px",
                    color: isActive ? "#111111" : "#aaaaaa",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0891b2] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Count sub-bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#f5f5f5] bg-[#fafafa]">
          <p style={{ fontSize: "11px", color: "#cccccc" }}>
            {emails.length} email{emails.length !== 1 ? "s" : ""}
          </p>
          {syncMessage && (
            <span style={{ fontSize: "11px", color: "#0891b2" }}>{syncMessage}</span>
          )}
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 border-2 border-[#0891b2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-5 py-16">
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: "44px", height: "44px", background: "#f5f5f5" }}
              >
                <Mail size={18} color="#cccccc" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: "13px", color: "#aaaaaa", textAlign: "center" }}>
                {activeCategory === "all"
                  ? "No emails synced yet"
                  : `No ${CATEGORY_LABELS[activeCategory as EmailCategory]?.toLowerCase()} emails`}
              </p>
            </div>
          ) : (
            emails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isActive={email.id === selectedEmailId}
                onSelect={() => setSelectedEmailId(email.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex-1 h-full overflow-hidden">
        {selectedEmail ? (
          <EmailDetail email={selectedEmail} />
        ) : (
          <EmptyDetail />
        )}
      </div>

    </div>
  );
}
