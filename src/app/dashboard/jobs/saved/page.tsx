"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ScoreBreakdown } from "@/lib/supabase/types";

interface SavedMatch {
  id: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  status_updated_at: string | null;
  jobs: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    is_remote: boolean;
    salary_min: number | null;
    salary_max: number | null;
    application_url: string | null;
    posted_at: string | null;
  };
}

export default function SavedJobsPage() {
  const [matches, setMatches] = useState<SavedMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    const response = await fetch("/api/jobs/saved");
    const data = await response.json();
    setMatches(data.matches || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const handleUnsave = async (jobId: string) => {
    await fetch(`/api/jobs/${jobId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unsave" }),
    });
    setMatches((prev) => prev.filter((m) => m.jobs.id !== jobId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Saved Jobs</h1>
      {matches.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          No saved jobs yet. Save jobs from your daily matches to track them
          here.
        </p>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Card key={match.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {match.jobs.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {match.jobs.company}
                    </p>
                    <div className="flex gap-2 mt-1 text-sm text-muted-foreground">
                      {match.jobs.location && (
                        <span>{match.jobs.location}</span>
                      )}
                      {match.jobs.is_remote && (
                        <Badge variant="secondary" className="text-xs">
                          Remote
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      {match.score_breakdown.explanation}
                    </p>
                  </div>
                  <div className="text-xl font-bold">{match.score}</div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnsave(match.jobs.id)}
                  >
                    Unsave
                  </Button>
                  {match.jobs.application_url && (
                    <Button
                      size="sm"
                      className="ml-auto"
                      onClick={() =>
                        window.open(match.jobs.application_url!, "_blank")
                      }
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
