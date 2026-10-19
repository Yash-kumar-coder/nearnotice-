import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  HelpCircle,
  MessageSquare,
  Flag,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Send,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  User,
  ExternalLink,
  ShieldAlert,
  Lock,
  Eye,
  Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupportService } from '../services/supportService';

type TabKey = 'faqs' | 'contact' | 'report' | 'safety';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQS_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Posting Notices',
    question: 'How do I post a notice on NearNotice?',
    answer:
      'Tap the "+" button in the navigation bar to open the Create Notice page. Select a category, enter a clear title, description, and price (if applicable), and optionally add up to 3 photos. Your notice will instantly appear on your neighborhood board.',
  },
  {
    id: 'faq-2',
    category: 'Posting Notices',
    question: 'How long do notices stay active?',
    answer:
      'Notices remain active for 30 days by default. You can edit, update, or remove your notice at any time by going to your Profile and selecting "Manage My Notices".',
  },
  {
    id: 'faq-3',
    category: 'Privacy & Contact',
    question: 'Is my phone number visible to everyone?',
    answer:
      'NearNotice uses privacy protection to shield your direct phone number from web scrapers and unauthenticated bots. Genuine neighbors must be logged in and intentionally click "Contact" or "WhatsApp" to connect with you.',
  },
  {
    id: 'faq-4',
    category: 'Privacy & Contact',
    question: 'Can I change my public neighbor display name?',
    answer:
      'Yes! Navigate to your Profile page and click the "Edit" button next to your display name. You can update your name at any time, and it updates across all your published notices.',
  },
  {
    id: 'faq-5',
    category: 'Safety & Trust',
    question: 'How can I ensure safe transactions when meeting neighbors?',
    answer:
      'Always arrange meetups during daylight in busy, well-lit public places such as a popular local cafe, supermarket lobby, or nearby transit station. Never send advance deposits or money transfers before physically seeing the item.',
  },
  {
    id: 'faq-6',
    category: 'Safety & Trust',
    question: 'What should I do if I see a scam or offensive notice?',
    answer:
      'Click the "Report notice/user" tab right here or tap the Flag icon on any notice detail page. Our moderators review all submitted reports and take prompt action, including removing violating notices and banning suspicious accounts.',
  },
  {
    id: 'faq-7',
    category: 'Location & Feed',
    question: 'How does NearNotice calculate notice distance?',
    answer:
      'When you grant browser location permissions, NearNotice uses high-efficiency geolocation to calculate the distance in kilometers between your current area and the posted notice, helping you find nearby items first.',
  },
  {
    id: 'faq-8',
    category: 'General',
    question: 'Is NearNotice free to use?',
    answer:
      'Yes, NearNotice is 100% free for community members to browse, post, search, and connect with local neighbors.',
  },
];

const REPORT_REASONS = [
  'Fraud, scam or suspicious payment request',
  'Commercial spam or repetitive advertising',
  'Offensive, abusive, or hateful content',
  'Misleading or counterfeit item description',
  'Prohibited or dangerous items',
  'Harassment or impersonation of another neighbor',
  'Other violation',
];

export default function HelpSupport() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Active tab state
  const initialTab = (searchParams.get('tab') as TabKey) || 'faqs';
  const [activeTab, setActiveTab] = useState<TabKey>(
    ['faqs', 'contact', 'report', 'safety'].includes(initialTab) ? initialTab : 'faqs'
  );

  // Sync tab with URL
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // FAQ search & expanded state
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq-1');

  // Contact Form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Report Form state
  const [reportType, setReportType] = useState<'notice' | 'user'>('notice');
  const [reportTargetId, setReportTargetId] = useState('');
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Prefill contact & reporter details from auth user
  useEffect(() => {
    if (user?.email) {
      setContactEmail((prev) => prev || user.email || '');
      setReporterEmail((prev) => prev || user.email || '');
    }
  }, [user]);

  // Handle Contact Submit
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError('Please fill in all required fields.');
      return;
    }

    setContactLoading(true);
    setContactError(null);

    try {
      await SupportService.submitContactSupport({
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        subject: contactSubject.trim() || 'General Inquiry',
        message: contactMessage,
      });

      setContactSuccess(true);
      setContactMessage('');
      setContactSubject('');
    } catch (err: unknown) {
      setContactError(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
    } finally {
      setContactLoading(false);
    }
  };

  // Handle Report Submit
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTargetId.trim() || !reportDetails.trim()) {
      setReportError('Please provide the notice or user details and explanation.');
      return;
    }

    setReportLoading(true);
    setReportError(null);

    try {
      await SupportService.submitReport({
        targetType: reportType,
        targetId: reportTargetId,
        reason: reportReason,
        details: reportDetails,
        reporterName,
        reporterEmail,
      });

      setReportSuccess(true);
      setReportTargetId('');
      setReportDetails('');
    } catch (err: unknown) {
      setReportError(err instanceof Error ? err.message : 'Failed to submit report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  const filteredFaqs = FAQS_DATA.filter(
    (faq) =>
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.category.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-16 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Help & Support</h1>
              <p className="text-[11px] text-gray-500 hidden sm:block">
                Assistance, FAQs, safety advice & reporting
              </p>
            </div>
          </div>

          <Link
            to="/profile"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            My Profile
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* Navigation Tabs (4 Core Buttons) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('faqs')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'faqs'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            <HelpCircle size={16} />
            <span>FAQs</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('contact')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'contact'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            <MessageSquare size={16} />
            <span>Contact Support</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('report')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'report'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            <Flag size={16} />
            <span>Report Notice/User</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('safety')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'safety'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Privacy & Safety</span>
          </button>
        </div>

        {/* TAB 1: FAQs */}
        {activeTab === 'faqs' && (
          <div className="space-y-4">
            {/* Search Box */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search frequently asked questions..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
              />
              {faqSearch && (
                <button
                  type="button"
                  onClick={() => setFaqSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Questions List */}
            <div className="space-y-2.5">
              {filteredFaqs.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-xs text-gray-500">
                  <HelpCircle size={24} className="mx-auto text-gray-300 mb-2" />
                  No matching questions found for &quot;{faqSearch}&quot;.
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaq === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                        className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors cursor-pointer"
                      >
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {faq.category}
                          </span>
                          <h2 className="text-xs sm:text-sm font-semibold text-gray-900 pt-1">
                            {faq.question}
                          </h2>
                        </div>
                        <div className="text-gray-400 shrink-0">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50/30">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Contact Prompt */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-semibold text-xs text-blue-900">Still have a question?</span>
                <p className="text-[11px] text-blue-700">
                  Our community support team is always ready to assist you.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('contact')}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors shadow-2xs"
              >
                Send Us a Message
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Contact Support Form */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Contact Support Form</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Have questions or need assistance? Send our support team a direct message.
              </p>
            </div>

            {contactSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Support request received successfully!</span>
                </div>
                <p className="text-[11px] text-emerald-700 pl-6">
                  Thank you for reaching out. Our administrator team will review your inquiry and follow up promptly.
                </p>
                <button
                  type="button"
                  onClick={() => setContactSuccess(false)}
                  className="mt-2 ml-6 text-xs font-semibold text-emerald-800 underline hover:text-emerald-900"
                >
                  Send another inquiry
                </button>
              </div>
            )}

            {contactError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-red-600" />
                <span>{contactError}</span>
              </div>
            )}

            {!contactSuccess && (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Your Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="e.g. neighbor@example.com"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Subject / Topic <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="e.g. Question about my posted notice"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Message / Issue Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Please explain how we can help you with details..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none resize-y"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={14} />
                    <span>{contactLoading ? 'Sending...' : 'Submit Support Request'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: Report Notice / User */}
        {activeTab === 'report' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Report Notice or User</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Help keep the NearNotice community safe, authentic, and trustworthy for all neighbors.
              </p>
            </div>

            {reportSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Report submitted successfully!</span>
                </div>
                <p className="text-[11px] text-emerald-700 pl-6">
                  Thank you for keeping our neighborhood secure. Our author and moderation team will inspect this item promptly.
                </p>
                <button
                  type="button"
                  onClick={() => setReportSuccess(false)}
                  className="mt-2 ml-6 text-xs font-semibold text-emerald-800 underline hover:text-emerald-900"
                >
                  Submit another report
                </button>
              </div>
            )}

            {reportError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-red-600" />
                <span>{reportError}</span>
              </div>
            )}

            {!reportSuccess && (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                {/* Target Type Switcher */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    What are you reporting? <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReportType('notice')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                        reportType === 'notice'
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      A Notice / Post
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType('user')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                        reportType === 'user'
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      A User Account
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {reportType === 'notice' ? 'Notice Title, ID or Link' : 'User Name, Email or Phone'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reportTargetId}
                    onChange={(e) => setReportTargetId(e.target.value)}
                    placeholder={
                      reportType === 'notice'
                        ? 'e.g. Notice title or paste URL'
                        : 'e.g. Neighbor name or contact detail'
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Reason for Report <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Explanation & Evidence <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Please explain what happened and why this item violates community safety..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="Optional"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Your Contact Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={reporterEmail}
                      onChange={(e) => setReporterEmail(e.target.value)}
                      placeholder="Optional for follow-up"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={reportLoading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Flag size={14} />
                    <span>{reportLoading ? 'Submitting...' : 'Submit Abuse Report'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 4: Privacy & Safety Help */}
        {activeTab === 'safety' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 text-blue-600">
                <ShieldCheck size={22} />
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Neighborhood Safety Guidelines
                </h2>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                NearNotice is designed to foster thriving local communities. Please follow these best practices for safe, pleasant neighborly interactions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                    <Eye size={15} className="text-blue-600" />
                    <span>Meet in Public Places</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Always arrange exchanges during daylight hours in populated public areas like market squares, tea shops, or transit stops.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                    <ShieldAlert size={15} className="text-rose-600" />
                    <span>Inspect Before Paying</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Never send advance payments or UPI deposits to reserve items. Physically inspect goods and verify quality in person first.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                    <Lock size={15} className="text-emerald-600" />
                    <span>Shielded Contact Info</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    We protect notice posters from automated web scraping. Contact details are never indexed publicly in plain text.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                    <Info size={15} className="text-indigo-600" />
                    <span>Report Violations Fast</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    If anyone asks for unusual banking credentials or acts suspiciously, use the Report tab above for immediate intervention.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Policy and Terms quick links */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-gray-500">Need our legal agreements & full data disclosures?</span>
              <div className="flex items-center gap-4">
                <Link
                  to="/privacy"
                  className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>Privacy Policy</span>
                  <ExternalLink size={12} />
                </Link>
                <Link
                  to="/terms"
                  className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>Terms of Service</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
