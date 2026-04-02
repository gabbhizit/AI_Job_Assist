"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ParsedResume } from "@/lib/supabase/types";

interface InterviewPrepProps {
  resume: ParsedResume | null;
}

interface QAItem {
  q: string;
  hint: string;
}

const BEHAVIORAL: QAItem[] = [
  { q: "Tell me about yourself.", hint: "Lead with your degree, key skills, most recent role, then what you're looking for. Keep it under 90 seconds." },
  { q: "Describe a challenging technical problem you solved.", hint: "Use STAR: Situation, Task, Action, Result. Quantify the impact if possible." },
  { q: "How do you handle disagreements with teammates?", hint: "Show empathy, active listening, and a focus on project outcomes over personal opinions." },
  { q: "Tell me about a time you missed a deadline.", hint: "Be honest, focus on what you learned and the process changes you made afterward." },
  { q: "Why do you want to work here?", hint: "Research the company's tech stack and recent product launches. Connect them to your specific skills." },
  { q: "Where do you see yourself in 5 years?", hint: "Be genuine. Mention growing technically, taking ownership of systems, and mentoring others." },
];

const VISA_QUESTIONS: QAItem[] = [
  { q: "Do you require visa sponsorship now or in the future?", hint: "Be direct: 'I'm on F-1 OPT and authorized to work for 3 years. I will need H-1B sponsorship after that.' Most sponsors ask early — honesty builds trust." },
  { q: "When does your OPT expire?", hint: "State the date clearly. If you have STEM OPT, mention the extension: 'I have a 3-year STEM OPT extension available.'" },
  { q: "Have you applied for an H-1B before?", hint: "Answer honestly. If not: 'This will be my first H-1B application. I understand the lottery process and am committed to building my career here.'" },
];

function buildTechnicalQuestions(resume: ParsedResume): QAItem[] {
  const questions: QAItem[] = [];
  const skills = resume.skills_flat?.slice(0, 6) ?? [];

  for (const skill of skills) {
    const s = skill.toLowerCase();
    if (s.includes("python") || s.includes("java") || s.includes("javascript") || s.includes("typescript")) {
      questions.push({ q: `Walk me through your experience with ${skill}.`, hint: `Mention specific projects, scale (lines of code, users, requests/sec), and one tricky bug you debugged.` });
    }
    if (s.includes("react") || s.includes("next") || s.includes("vue") || s.includes("angular")) {
      questions.push({ q: `How do you optimise performance in a ${skill} application?`, hint: "Cover code-splitting, lazy loading, memoisation, and profiling tools you've actually used." });
    }
    if (s.includes("sql") || s.includes("postgres") || s.includes("mysql") || s.includes("mongo")) {
      questions.push({ q: `How do you approach database query optimisation?`, hint: "Mention indexing strategies, EXPLAIN plans, N+1 queries, and caching layers." });
    }
    if (s.includes("aws") || s.includes("gcp") || s.includes("azure") || s.includes("cloud")) {
      questions.push({ q: `Describe a system you built on ${skill}.`, hint: "Cover architecture decisions, cost optimisation, and how you handled failures." });
    }
    if (questions.length >= 4) break;
  }

  // Fallback generic tech questions
  if (questions.length < 2) {
    questions.push(
      { q: "Explain the difference between concurrency and parallelism.", hint: "Concurrency = dealing with multiple things at once (scheduling). Parallelism = doing multiple things simultaneously (hardware)." },
      { q: "How would you design a URL shortener?", hint: "Cover hashing, collision handling, DB schema, read-heavy caching, and analytics counters." }
    );
  }

  return questions;
}

function buildRoleQuestions(resume: ParsedResume): QAItem[] {
  const roles = resume.target_roles_inferred ?? [];
  const questions: QAItem[] = [];
  for (const role of roles.slice(0, 3)) {
    const r = role.toLowerCase();
    if (r.includes("frontend") || r.includes("front end") || r.includes("ui")) {
      questions.push({ q: "What's the difference between SSR, SSG, and CSR?", hint: "SSR = per-request server render. SSG = build-time render. CSR = browser-only. Cover when to use each." });
    }
    if (r.includes("backend") || r.includes("back end") || r.includes("api")) {
      questions.push({ q: "How do you design a REST API for a high-traffic service?", hint: "Cover versioning, rate limiting, idempotency, pagination, and error contracts." });
    }
    if (r.includes("fullstack") || r.includes("full stack") || r.includes("full-stack")) {
      questions.push({ q: "How do you decide what logic lives on the server vs. the client?", hint: "Security (always server for sensitive data), performance, SEO needs, and user experience tradeoffs." });
    }
    if (r.includes("machine learning") || r.includes("ml") || r.includes("data")) {
      questions.push({ q: "Walk me through your end-to-end ML pipeline.", hint: "Data ingestion → feature engineering → model selection → training → evaluation → deployment → monitoring." });
    }
  }

  if (questions.length === 0) {
    questions.push({ q: "How do you ensure code quality in a team environment?", hint: "Code reviews, linting, type safety, test coverage gates, and documentation standards." });
  }
  return questions;
}

function Section({ title, items, color }: { title: string; items: QAItem[]; color: string }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="border border-[#e8e8e8] rounded-[10px] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#f0f0f0]" style={{ background: `${color}08` }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</p>
      </div>
      <div className="flex flex-col divide-y divide-[#f0f0f0]">
        {items.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#fafafa] transition-colors"
            >
              <span style={{ fontSize: "13px", color: "#111111", fontWeight: 500, flex: 1, paddingRight: "12px" }}>{item.q}</span>
              {open === i ? <ChevronDown size={14} color="#aaaaaa" /> : <ChevronRight size={14} color="#aaaaaa" />}
            </button>
            {open === i && (
              <div className="px-4 pb-3" style={{ background: "#fafafa" }}>
                <p style={{ fontSize: "12px", color: "#555555", lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 600, color }}>Tip: </span>
                  {item.hint}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InterviewPrep({ resume }: InterviewPrepProps) {
  const technicalQuestions = resume ? buildTechnicalQuestions(resume) : [];
  const roleQuestions = resume ? buildRoleQuestions(resume) : [];

  return (
    <div className="flex flex-col gap-4">
      <p style={{ fontSize: "12px", color: "#888888" }}>
        Click a question to reveal coaching tips. Questions are generated from your resume skills and target roles.
      </p>
      <Section title="Behavioural" items={BEHAVIORAL} color="#6366f1" />
      {technicalQuestions.length > 0 && (
        <Section title="Technical" items={technicalQuestions} color="#0ea5e9" />
      )}
      {roleQuestions.length > 0 && (
        <Section title="Role-specific" items={roleQuestions} color="#d97706" />
      )}
      <Section title="Visa & Sponsorship" items={VISA_QUESTIONS} color="#16a34a" />
    </div>
  );
}
