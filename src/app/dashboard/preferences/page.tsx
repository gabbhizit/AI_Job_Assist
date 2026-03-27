"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState({
    target_roles: [] as string[],
    target_locations: [] as string[],
    min_salary: null as number | null,
    experience_level: "entry" as string,
    remote_preference: "any" as string,
    notify_email: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [roleInput, setRoleInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  const fetchPrefs = useCallback(async () => {
    const response = await fetch("/api/preferences");
    const data = await response.json();
    if (data.preferences) {
      setPrefs({
        target_roles: data.preferences.target_roles || [],
        target_locations: data.preferences.target_locations || [],
        min_salary: data.preferences.min_salary,
        experience_level: data.preferences.experience_level || "entry",
        remote_preference: data.preferences.remote_preference || "any",
        notify_email: data.preferences.notify_email ?? true,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addItem = (field: "target_roles" | "target_locations", value: string) => {
    if (value.trim() && !prefs[field].includes(value.trim())) {
      setPrefs({ ...prefs, [field]: [...prefs[field], value.trim()] });
    }
  };

  const removeItem = (field: "target_roles" | "target_locations", value: string) => {
    setPrefs({ ...prefs, [field]: prefs[field].filter((v) => v !== value) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Job Preferences</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Target Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {prefs.target_roles.map((role) => (
              <Badge
                key={role}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeItem("target_roles", role)}
              >
                {role} &times;
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Software Engineer"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("target_roles", roleInput);
                  setRoleInput("");
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                addItem("target_roles", roleInput);
                setRoleInput("");
              }}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {prefs.target_locations.map((loc) => (
              <Badge
                key={loc}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeItem("target_locations", loc)}
              >
                {loc} &times;
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. San Francisco, CA"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("target_locations", locationInput);
                  setLocationInput("");
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                addItem("target_locations", locationInput);
                setLocationInput("");
              }}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Other Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Minimum Salary (annual, USD)</Label>
            <Input
              type="number"
              placeholder="e.g. 80000"
              value={prefs.min_salary ?? ""}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  min_salary: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <div>
            <Label>Experience Level</Label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              value={prefs.experience_level}
              onChange={(e) =>
                setPrefs({ ...prefs, experience_level: e.target.value })
              }
            >
              <option value="entry">Entry Level (0-3 years)</option>
              <option value="mid">Mid Level (3-7 years)</option>
              <option value="senior">Senior Level (7+ years)</option>
            </select>
          </div>
          <div>
            <Label>Remote Preference</Label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              value={prefs.remote_preference}
              onChange={(e) =>
                setPrefs({ ...prefs, remote_preference: e.target.value })
              }
            >
              <option value="any">Any</option>
              <option value="remote">Remote Only</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notify_email"
              checked={prefs.notify_email}
              onChange={(e) =>
                setPrefs({ ...prefs, notify_email: e.target.checked })
              }
              className="h-4 w-4"
            />
            <Label htmlFor="notify_email">
              Send me daily email notifications
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Preferences saved!
          </span>
        )}
      </div>
    </div>
  );
}
