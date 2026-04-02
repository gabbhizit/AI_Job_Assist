"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmailCategory } from "@/lib/supabase/types";

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

const CATEGORY_LABELS: Record<EmailCategory, string> = {
  application_confirmation: "Application",
  interview_invite: "Interview",
  offer: "Offer",
  rejection: "Rejection",
  recruiter_outreach: "Recruiter",
  unknown: "Other",
};

const CATEGORY_CLASSES: Record<EmailCategory, string> = {
  application_confirmation: "bg-gray-100 text-gray-700",
  interview_invite: "bg-blue-100 text-blue-800",
  offer: "bg-green-100 text-green-800",
  rejection: "bg-red-100 text-red-800",
  recruiter_outreach: "bg-purple-100 text-purple-800",
  unknown: "bg-slate-100 text-slate-600",
};

const FILTER_TABS: Array<{ label: string; value: EmailCategory | "all" }> = [
  { label: "All", value: "all" },
  { label: "Applications", value: "application_confirmation" },
  { label: "Interviews", value: "interview_invite" },
  { label: "Offers", value: "offer" },
  { label: "Rejections", value: "rejection" },
  { label: "Recruiters", value: "recruiter_outreach" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function EmailsPage() {
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<EmailEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState<EmailCategory | "all">("all");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
            : "Already up to date"
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

  // Loading state
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

  // Not connected state
  if (!gmailConnected) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Job Emails</h1>
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
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
                <svg
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Job Emails</h1>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">{total} email{total !== 1 ? "s" : ""} found</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {syncMessage && (
            <span className="text-sm text-muted-foreground">{syncMessage}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Syncing…
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                Sync Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveCategory(tab.value)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              activeCategory === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Email list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : emails.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="font-medium mb-1">No emails found</p>
            <p className="text-sm">
              We scan for application confirmations, interview invites, offers,
              and rejections from the last 90 days.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {emails.map((email) => (
            <Card key={email.id} className="hover:bg-accent/30 transition-colors">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_CLASSES[email.category]}`}
                      >
                        {CATEGORY_LABELS[email.category]}
                      </span>
                      <span className="text-sm font-semibold truncate">
                        {email.subject ?? "(no subject)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {email.sender_name ?? email.sender_email ?? "Unknown"}
                      </span>
                      {email.company_name && email.job_match_id && (
                        <>
                          <span>·</span>
                          <Badge variant="secondary" className="text-xs py-0">
                            Linked: {email.company_name}
                          </Badge>
                        </>
                      )}
                    </div>
                    {email.snippet && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {email.snippet}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap ml-2 mt-0.5">
                    {formatDate(email.received_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
