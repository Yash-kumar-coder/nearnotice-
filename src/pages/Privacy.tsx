import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Download, Trash2 } from 'lucide-react';
import { Alert } from '../components/common/Alert';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 max-w-2xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-blue-700 hover:bg-blue-50 py-2 px-3 rounded-xl transition-colors mb-4 min-h-[44px]"
      >
        <ArrowLeft size={18} /> Back to NearNotice
      </Link>

      <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-xs space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Privacy Policy</h1>

        <Alert variant="warning" title="Notice for Project Owner & Legal Counsel">
          This is a placeholder document. Final privacy notices must be reviewed and
          customized by legal counsel according to applicable privacy regimes (e.g., GDPR
          Articles 13/14, CCPA/CPRA disclosures, and Japan's APPI).
        </Alert>

        <section className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <h2 className="font-semibold text-base text-gray-900">1. Data Minimization</h2>
          <p>
            NearNotice collects only the minimum necessary information to provide
            hyperlocal notice services: account email for authentication, display name,
            and user-submitted notice content. Approximate area labels are used instead
            of precise GPS coordinates to protect user privacy.
          </p>

          <h2 className="font-semibold text-base text-gray-900">2. Storage & Security</h2>
          <p>
            Authentication credentials and profile data are protected using cryptographic
            hashing, Row Level Security (RLS) policies in PostgreSQL, and PKCE-authenticated
            sessions.
          </p>

          <h2 className="font-semibold text-base text-gray-900">
            3. Account Deletion & Data Portability Plan
          </h2>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <Download size={18} className="text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="block text-gray-900 text-xs uppercase tracking-wide">
                  Data Export Right
                </strong>
                <span className="text-xs text-gray-600">
                  Users may request a machine-readable JSON copy of their profile records
                  and published notices via the account settings panel or by contacting
                  support.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-2 border-t border-gray-200">
              <Trash2 size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-gray-900 text-xs uppercase tracking-wide">
                  Account Deletion (Right to Erasure)
                </strong>
                <span className="text-xs text-gray-600">
                  Deleting an account initiates a cascading deletion across the auth.users,
                  public.profiles, and public.notices tables, removing all associated notice
                  images within 30 days.
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
