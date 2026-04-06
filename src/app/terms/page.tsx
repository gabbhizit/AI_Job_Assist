import Link from "next/link";

export const metadata = { title: "Terms of Service – OfferPath" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">
          ← Back
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Acceptance</h2>
            <p className="text-sm">By creating an account and using OfferPath (&quot;the Service&quot;), you agree to these terms. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">The Service</h2>
            <p className="text-sm">OfferPath is a job matching tool that uses your resume and preferences to surface relevant job opportunities. We do not guarantee job placement, interview requests, or employment outcomes. Job data is sourced from third-party APIs and may be incomplete or outdated.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Your account</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>You are responsible for maintaining the security of your account.</li>
              <li>You must provide accurate information. Impersonation or fraudulent use is prohibited.</li>
              <li>You may not use the Service for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Subscriptions and billing</h2>
            <p className="text-sm">The Service offers a free trial and paid subscription tiers. Billing is handled by Stripe. You may cancel at any time; cancellation takes effect at the end of the current billing period. We do not offer refunds for partial periods.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Intellectual property</h2>
            <p className="text-sm">You retain ownership of your resume and any data you upload. You grant OfferPath a limited licence to process this data solely to provide the Service. We retain all rights to the platform, algorithms, and interface.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Disclaimers and limitation of liability</h2>
            <p className="text-sm">The Service is provided &quot;as is&quot; without warranties of any kind. OfferPath is not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including any outcomes related to job applications.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Termination</h2>
            <p className="text-sm">We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Changes</h2>
            <p className="text-sm">We may update these terms. Continued use of the Service after changes constitutes acceptance. We will notify users of material changes by email.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
            <p className="text-sm">Questions? Email <a href="mailto:hello@offerpath.app" className="underline">hello@offerpath.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
