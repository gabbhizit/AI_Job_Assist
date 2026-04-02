"use client";

import { useState } from "react";
import type { ApplicationItem } from "@/app/api/applications/route";
import { KanbanCard } from "./kanban-card";

export const KANBAN_COLUMNS: { status: string; label: string; color: string }[] = [
  { status: "saved",        label: "Saved",        color: "#8b5cf6" },
  { status: "applied",      label: "Applied",      color: "#0ea5e9" },
  { status: "phone_screen", label: "Phone Screen", color: "#f59e0b" },
  { status: "interview",    label: "Interview",    color: "#d97706" },
  { status: "offer",        label: "Offer",        color: "#16a34a" },
  { status: "rejected",     label: "Rejected",     color: "#dc2626" },
];

interface KanbanBoardProps {
  applications: ApplicationItem[];
  onStatusChange: (matchId: string, newStatus: string) => void;
  onSelect: (matchId: string) => void;
}

export function KanbanBoard({ applications, onStatusChange, onSelect }: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const byStatus = (status: string) =>
    applications.filter((a) => a.userStatus === status);

  const handleDrop = (targetStatus: string) => {
    if (draggingId) {
      const current = applications.find((a) => a.matchId === draggingId);
      if (current && current.userStatus !== targetStatus) {
        onStatusChange(draggingId, targetStatus);
      }
    }
    setDraggingId(null);
    setOverColumn(null);
  };

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-4"
      style={{ minHeight: "500px" }}
      onDragEnd={() => { setDraggingId(null); setOverColumn(null); }}
    >
      {KANBAN_COLUMNS.map(({ status, label, color }) => {
        const cards = byStatus(status);
        const isOver = overColumn === status;

        return (
          <div
            key={status}
            className="flex flex-col flex-shrink-0 rounded-[10px] border transition-all"
            style={{
              width: "220px",
              background: isOver ? `${color}08` : "#f9f9f9",
              borderColor: isOver ? color : "#e8e8e8",
            }}
            onDragOver={(e) => { e.preventDefault(); setOverColumn(status); }}
            onDragLeave={(e) => {
              // Only clear if leaving the column entirely (not entering a child)
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setOverColumn(null);
              }
            }}
            onDrop={() => handleDrop(status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#e8e8e8]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span style={{ fontSize: "12px", fontWeight: 500, color: "#333333" }}>{label}</span>
              </div>
              <span
                className="rounded-full px-1.5 py-0.5"
                style={{ fontSize: "10px", fontWeight: 600, color, background: `${color}15` }}
              >
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 p-2 flex-1">
              {cards.map((item) => (
                <KanbanCard
                  key={item.matchId}
                  item={item}
                  onSelect={onSelect}
                  onDragStart={(id) => setDraggingId(id)}
                />
              ))}
              {cards.length === 0 && (
                <div
                  className="flex-1 flex items-center justify-center rounded-[6px] border-2 border-dashed"
                  style={{ borderColor: isOver ? color : "#e0e0e0", minHeight: "80px" }}
                >
                  <span style={{ fontSize: "11px", color: "#cccccc" }}>Drop here</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
