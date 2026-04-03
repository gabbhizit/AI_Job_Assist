interface ConfidenceBannerProps {
  confidence: "high" | "medium" | "low";
  flags: string[];
}

const FLAG_LABELS: Record<string, string> = {
  missing_name: "Name not detected",
  no_skills_found: "No skills detected",
  missing_experience: "No work experience found",
  missing_education: "No education found",
  missing_degree: "Degree level not detected",
  suspicious_experience_years: "Experience years seem unusual",
  missing_email: "Email not detected",
};

export function ConfidenceBanner({ confidence, flags }: ConfidenceBannerProps) {
  if (confidence === "high") {
    return (
      <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-[10px] dark:bg-green-950/30 dark:border-green-800 dark:text-green-300">
        Resume parsed successfully. Review the details below and make any
        corrections if needed.
      </div>
    );
  }

  if (confidence === "medium") {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-[10px] dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-300">
        <p className="font-medium mb-1">
          We detected some issues. Please review and correct:
        </p>
        <ul className="list-disc list-inside">
          {flags.map((flag) => (
            <li key={flag}>{FLAG_LABELS[flag] || flag}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-[10px] dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
      <p className="font-medium mb-1">
        Parsing had significant issues. Please review carefully:
      </p>
      <ul className="list-disc list-inside">
        {flags.map((flag) => (
          <li key={flag}>{FLAG_LABELS[flag] || flag}</li>
        ))}
      </ul>
    </div>
  );
}
