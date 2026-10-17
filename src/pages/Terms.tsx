import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Alert } from '../components/common/Alert';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 max-w-2xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-blue-700 hover:bg-blue-50 py-2 px-3 rounded-xl transition-colors mb-4 min-h-[44px]"
      >
        <ArrowLeft size={18} /> Back to NearNotice
      </Link>

      <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-xs space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Terms of Service</h1>

        <Alert variant="warning" title="Notice for Project Owner & Legal Counsel">
          This is a placeholder document. Final legal terms must be drafted, customized,
          and approved by legal counsel to ensure compliance with relevant jurisdictions
          (including GDPR, CCPA, Japan APPI, and local consumer laws).
        </Alert>

        <section className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <h2 className="font-semibold text-base text-gray-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using NearNotice, you agree to comply with and be bound by
            these Terms of Service. If you do not agree to these terms, please do not use
            the service.
          </p>

          <h2 className="font-semibold text-base text-gray-900">2. Hyperlocal Community Standards</h2>
          <p>
            NearNotice is intended for neighborhood and local community postings. Users
            agree not to publish harmful, defamatory, deceptive, unlawful, or spam
            content. Postings are monitored and subject to immediate removal.
          </p>

          <h2 className="font-semibold text-base text-gray-900">3. User Responsibility & Safety</h2>
          <p>
            Users are solely responsible for interactions with others. Always exercise
            prudence when meeting neighbors or transacting locally.
          </p>
        </section>
      </div>
    </div>
  );
}
