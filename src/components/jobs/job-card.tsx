"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ScoreBreakdown } from "@/lib/supabase/types";

interface JobCardProps {
  matchId: string;
  jobId: string;
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  skills: string[];
  applicationUrl: string | null;
  postedAt: string | null;
  onAction: (jobId: string, action: string) => void;
}

export function JobCard({
  jobId,
  title,
  company,
  location,
  isRemote,
  salaryMin,
  salaryMax,
  score,
  scoreBreakdown,
  skills,
  applicationUrl,
  postedAt,
  onAction,
}: JobCardProps) {
  const scoreColor =
    score >= 80
      ? "text-green-600 dark:text-green-400"
      : score >= 60
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-muted-foreground";

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) =>
      n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return d.toLocaleDateString();
  };

  const salary = formatSalary(salaryMin, salaryMax);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{title}</h3>
            <p className="text-muted-foreground">{company}</p>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
              {location && <span>{location}</span>}
              {isRemote && (
                <Badge variant="secondary" className="text-xs">
                  Remote
                </Badge>
              )}
              {salary && <span>{salary}</span>}
              {postedAt && <span>{formatDate(postedAt)}</span>}
            </div>
          </div>
          <div className={`text-2xl font-bold ${scoreColor}`}>{score}</div>
        </div>

        {/* Why matched */}
        <p className="text-sm text-muted-foreground mt-3 italic">
          {scoreBreakdown.explanation}
        </p>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {skills.slice(0, 8).map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {skills.length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{skills.length - 8} more
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction(jobId, "save")}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction(jobId, "dismiss")}
          >
            Dismiss
          </Button>
          {applicationUrl && (
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => {
                onAction(jobId, "click_apply_link");
                window.open(applicationUrl, "_blank");
              }}
            >
              Apply
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
