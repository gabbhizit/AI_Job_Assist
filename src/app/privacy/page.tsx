import Link from "next/link";

export const metadata = { title: "Privacy Policy – OfferPath" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">
          ← Back
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">What we collect</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Account info:</strong> Your name and email address from Google OAuth.</li>
              <li><strong>Resume data:</strong> PDF files you upload and the structured data we extract from them (skills, experience, education). Used solely to generate job matches for you.</li>
              <li><strong>Job preferences:</strong> Target roles, locations, salary, and other preferences you set.</li>
              <li><strong>Gmail read access (optional):</strong> If you grant it, we read email metadata (subject, sender, snippet) to categorize job-related emails (applications, interviews, offers). We do not store email body content. We do not read personal emails unrelated to job searching.</li>
              <li><strong>Usage data:</strong> Which jobs you save, dismiss, or apply to. Used to improve match quality.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">How we use your data</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>To generate personalised job recommendations using a rule-based matching algorithm.</li>
              <li>Your resume text is sent to the Anthropic Claude API for structured data extraction. Anthropic&apos;s data handling is governed by their <a href="https://www.anthropic.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">privacy policy</a>.</li>
              <li>To send you daily job digest emails (if you opt in).</li>
              <li>We do not sell, rent, or share your data with third parties for advertising.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Data retention</h2>
            <p className="text-sm">We retain your data for as long as your account is active. You can delete your account and all associated data at any time by emailing us.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Security</h2>
            <p className="text-sm">Your data is stored in Supabase (hosted on AWS) with row-level security. Connections are encrypted with TLS. We do not store passwords — authentication is handled entirely by Google OAuth.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Your rights</h2>
            <p className="text-sm">You may request access to, correction of, or deletion of your personal data at any time. Contact us at the email below.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
            <p className="text-sm">Questions about this policy? Email us at <a href="mailto:privacy@offerpath.app" className="underline">privacy@offerpath.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
