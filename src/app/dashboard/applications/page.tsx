"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, List, Plus, RefreshCw } from "lucide-react";
import type { ApplicationItem, ApplicationStats } from "@/app/api/applications/route";
import { StatsHeader } from "@/components/applications/stats-header";
import { KanbanBoard } from "@/components/applications/kanban-board";
import { ListView } from "@/components/applications/list-view";
import { DetailDrawer } from "@/components/applications/detail-drawer";
import { AddJobModal } from "@/components/applications/add-job-modal";

type View = "kanban" | "list";

const DEFAULT_STATS: ApplicationStats = {
  totalApplied: 0,
  responseRate: 0,
  interviewCount: 0,
  offerCount: 0,
  avgMatchScore: 0,
};

export default function ApplicationsPage() {
  const [view, setView] = useState<View>("kanban");
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [stats, setStats] = useState<ApplicationStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications ?? []);
        setStats(data.stats ?? DEFAULT_STATS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (matchId: string, newStatus: string) => {
    // Optimistic update
    setApplications((prev) =>
      prev.map((a) => (a.matchId === matchId ? { ...a, userStatus: newStatus } : a))
    );
    // Recalculate stats optimistically
    setStats(computeStats(applications.map((a) => (a.matchId === matchId ? { ...a, userStatus: newStatus } : a))));

    try {
      const res = await fetch(`/api/applications/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        // Rollback on failure
        fetchData();
      }
    } catch {
      fetchData();
    }
  };

  const selectedItem = selectedMatchId
    ? applications.find((a) => a.matchId === selectedMatchId) ?? null
    : null;

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111111", letterSpacing: "-0.03em" }}>
            Applications
          </h1>
          <p style={{ fontSize: "13px", color: "#888888", marginTop: "2px" }}>
            Track your job pipeline across stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-[6px] border border-[#e8e8e8] hover:bg-[#f5f5f5] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} color="#888888" className={loading ? "animate-spin" : ""} />
          </button>

          {/* Add job */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[7px] text-white hover:opacity-90 transition-opacity"
            style={{ fontSize: "13px", fontWeight: 500, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Plus size={14} />
            Add job
          </button>

          {/* View toggle */}
          <div className="flex border border-[#e8e8e8] rounded-[7px] overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className="px-3 py-2 transition-colors"
              style={{ background: view === "kanban" ? "#6366f1" : "white" }}
              title="Kanban view"
            >
              <LayoutGrid size={14} color={view === "kanban" ? "white" : "#888888"} />
            </button>
            <button
              onClick={() => setView("list")}
              className="px-3 py-2 transition-colors border-l border-[#e8e8e8]"
              style={{ background: view === "list" ? "#6366f1" : "white" }}
              title="List view"
            >
              <List size={14} color={view === "list" ? "white" : "#888888"} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <StatsHeader stats={stats} loading={loading} />

      {/* Empty state */}
      {!loading && applications.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#e0e0e0] text-center"
          style={{ minHeight: "360px", background: "#fafafa" }}
        >
          <div
            className="flex items-center justify-center rounded-full mb-4"
            style={{ width: "48px", height: "48px", background: "#6366f115" }}
          >
            <LayoutGrid size={20} color="#6366f1" />
          </div>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "#333333" }}>No applications tracked yet</p>
          <p style={{ fontSize: "13px", color: "#aaaaaa", marginTop: "4px", maxWidth: "320px" }}>
            Save or apply to jobs from the Jobs page, or add one manually to start tracking.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-5 flex items-center gap-1.5 px-4 py-2 rounded-[7px] text-white hover:opacity-90 transition-opacity"
            style={{ fontSize: "13px", fontWeight: 500, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Plus size={14} />
            Add job manually
          </button>
        </div>
      )}

      {/* Board / list */}
      {!loading && applications.length > 0 && (
        view === "kanban" ? (
          <KanbanBoard
            applications={applications}
            onStatusChange={handleStatusChange}
            onSelect={setSelectedMatchId}
          />
        ) : (
          <ListView
            applications={applications}
            onSelect={setSelectedMatchId}
          />
        )
      )}

      {/* Detail drawer */}
      <DetailDrawer
        item={selectedItem}
        onClose={() => setSelectedMatchId(null)}
        onStatusChange={handleStatusChange}
      />

      {/* Add job modal */}
      <AddJobModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={fetchData}
      />
    </div>
  );
}

// Helper: recompute stats from an array (for optimistic updates)
function computeStats(apps: ApplicationItem[]): ApplicationStats {
  const applied = apps.filter((a) => a.userStatus === "applied").length;
  const phoneScreen = apps.filter((a) => a.userStatus === "phone_screen").length;
  const interview = apps.filter((a) => a.userStatus === "interview").length;
  const offer = apps.filter((a) => a.userStatus === "offer").length;
  const rejected = apps.filter((a) => a.userStatus === "rejected").length;
  const responded = phoneScreen + interview + offer + rejected;
  return {
    totalApplied: applied,
    responseRate: applied > 0 ? Math.round((responded / applied) * 100) : 0,
    interviewCount: interview,
    offerCount: offer,
    avgMatchScore:
      apps.length > 0
        ? Math.round(apps.reduce((s, a) => s + a.score, 0) / apps.length)
        : 0,
  };
}
