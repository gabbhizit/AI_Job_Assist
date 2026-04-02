"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ClipboardList, TrendingUp, BarChart2, DollarSign } from "lucide-react";
import type { ParsedResume } from "@/lib/supabase/types";
import { CoachChat } from "@/components/coach/coach-chat";
import { InterviewPrep } from "@/components/coach/interview-prep";
import { SkillPlan } from "@/components/coach/skill-plan";
import { AnalyticsTab } from "@/components/coach/analytics-tab";
import { SalaryIntel } from "@/components/coach/salary-intel";

type Tab = "chat" | "interview" | "skills" | "analytics" | "salary";

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "chat",      label: "Coach Chat",    icon: MessageSquare, color: "#6366f1" },
  { id: "interview", label: "Interview Prep",icon: ClipboardList,  color: "#0ea5e9" },
  { id: "skills",    label: "Skill Plan",    icon: TrendingUp,    color: "#d97706" },
  { id: "analytics", label: "Analytics",     icon: BarChart2,     color: "#8b5cf6" },
  { id: "salary",    label: "Salary Intel",  icon: DollarSign,    color: "#16a34a" },
];

export default function CoachPage() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [resume, setResume] = useState<ParsedResume | null>(null);

  // Load resume once — shared across all tabs that need it
  useEffect(() => {
    fetch("/api/resume")
      .then((r) => r.json())
      .then(({ resume: r }) => {
        if (r?.parsing_status === "completed" && r?.parsed_data) {
          setResume(r.parsed_data as ParsedResume);
        }
      })
      .catch(() => {/* resume stays null — tabs handle gracefully */});
  }, []);

  const active = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Page header */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111111", letterSpacing: "-0.03em" }}>
          AI Coach
        </h1>
        <p style={{ fontSize: "13px", color: "#888888", marginTop: "2px" }}>
          Personalised guidance for your job search
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#e8e8e8] pb-0 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon, color }) => {
          const isActive = id === activeTab;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-t-[7px] border border-transparent transition-all flex-shrink-0"
              style={{
                fontSize: "13px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? color : "#888888",
                background: isActive ? "white" : "transparent",
                borderColor: isActive ? "#e8e8e8" : "transparent",
                borderBottomColor: isActive ? "white" : "transparent",
                marginBottom: isActive ? "-1px" : "0",
              }}
            >
              <Icon size={14} color={isActive ? color : "#aaaaaa"} strokeWidth={isActive ? 2 : 1.8} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div
        className="bg-white rounded-[12px] border border-[#e8e8e8] p-5"
        style={{ minHeight: "500px" }}
      >
        {/* Tab header */}
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[#f0f0f0]">
          <div
            className="flex items-center justify-center rounded-[7px]"
            style={{ width: "30px", height: "30px", background: `${active.color}15` }}
          >
            <active.icon size={15} color={active.color} />
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#111111" }}>{active.label}</p>
            <p style={{ fontSize: "11px", color: "#aaaaaa" }}>
              {active.id === "chat"      && "Ask anything about your job search, interviews, or visa"}
              {active.id === "interview" && "Questions tailored to your skills and target roles"}
              {active.id === "skills"    && "Skills ranked by demand across your matched jobs"}
              {active.id === "analytics" && "Your application pipeline conversion rates"}
              {active.id === "salary"    && "Salary ranges from your matched job listings"}
            </p>
          </div>
        </div>

        {/* Render active tab */}
        {activeTab === "chat"      && <CoachChat />}
        {activeTab === "interview" && <InterviewPrep resume={resume} />}
        {activeTab === "skills"    && <SkillPlan resume={resume} />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "salary"    && <SalaryIntel />}
      </div>
    </div>
  );
}
