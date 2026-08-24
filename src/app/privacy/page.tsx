import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - Koko Digital Studio Insights',
  description: 'Privacy Policy and Data Protection Policy for Koko Digital Studio Insights Analytics Platform',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </Link>

      <div className="bg-white border border-gray-200 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6 text-gray-800 text-sm leading-relaxed">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
          <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
              Privacy Policy & Data Protection
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Effective Date: August 24, 2026 | Koko Digital Studio Insights
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 font-heading">1. Introduction</h2>
          <p>
            Koko Digital Studio Insights (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides automated social media analytics and PDF reporting software tailored for agency clients. This Privacy Policy outlines how we handle, process, and protect data retrieved via official API integrations including the Meta Graph API (Instagram Business) and TikTok Display API v2.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 font-heading">2. Information We Collect</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>Public Account Metrics:</strong> Follower counts, reach, view counts, engagement rates, and content format performance statistics.</li>
            <li><strong>Media Performance Data:</strong> Post captions, media types (Images, Videos, Graphics, Stories), view counts, like counts, and published timestamps.</li>
            <li><strong>OAuth Tokens:</strong> Encrypted access tokens required to perform periodic metric synchronization for authorized client accounts.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 font-heading">3. How We Use Data</h2>
          <p>
            All social media data collected is exclusively used to generate interactive analytical dashboards and client-facing PDF performance reports for Koko Digital Studio account managers. We do NOT sell, license, or share client data with third-party data brokers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 font-heading">4. Data Storage & Security</h2>
          <p>
            Client credentials and API access tokens are stored securely in encrypted databases. We implement standard access controls, automated token refresh protocols, and TLS encryption for all data in transit.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 font-heading">5. User Data Deletion & Account Disconnection</h2>
          <p>
            Account managers and clients can disconnect linked social accounts at any time via the platform&apos;s Settings page or by submitting a deletion request. Disconnecting an account immediately removes all stored access tokens and associated cached metrics.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 font-heading">6. Contact Us</h2>
          <p>
            If you have any questions regarding this Privacy Policy, please contact Koko Digital Studio at:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-medium text-xs text-gray-800">
            Koko Digital Studio Privacy & Data Protection Team<br />
            Email: privacy@kokodigital.studio<br />
            Website: https://kasumbaelijah.github.io/koko-digital-studio-insights/
          </div>
        </section>
      </div>
    </div>
  );
}
