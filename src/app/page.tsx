import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">AI Job Copilot</h1>
      <p className="text-lg text-[var(--muted-foreground)] mb-8 text-center max-w-md">
        AI-powered job matching for CS students. Upload your resume, get
        personalized job matches daily.
      </p>
      <Link
        href="/login"
        className="bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
      >
        Get Started
      </Link>
    </div>
  );
}
