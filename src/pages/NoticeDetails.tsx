import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  X,
  Lock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Bookmark,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PublicNotice } from '../types/database.types';
import { formatRelativeTime } from '../utils/formatTime';
import { getNoticeAuthor, sanitizeDisplayName, humanizeAuthorName } from '../utils/author';
import { getEstimatedNoticeDistance } from '../utils/distance';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { useAuth } from '../contexts/AuthContext';
import { AuthPromptModal } from '../components/auth/AuthPromptModal';
import { isNoticeSaved, toggleSaveNotice } from '../utils/savedNotices';
import { fetchNoticeContact } from '../utils/noticeContact';

export default function NoticeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, status } = useAuth();

  const [notice, setNotice] = useState<PublicNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState('connect with this neighbor');
  const [isSaved, setIsSaved] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setIsSaved(isNoticeSaved(id));
    }
  }, [id]);

  useEffect(() => {
    const handleSavedChange = () => {
      if (id) {
        setIsSaved(isNoticeSaved(id));
      }
    };
    window.addEventListener('nearnotice_saved_changed', handleSavedChange);
    return () => {
      window.removeEventListener('nearnotice_saved_changed', handleSavedChange);
    };
  }, [id]);

  useEffect(() => {
    async function loadNotice() {
      if (!id) return;
      setLoading(true);
      try {
        let fetchedNotice: PublicNotice | null = null;

        // Try public_notices first
        const { data, error } = await supabase
          .from('public_notices')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (data) {
          fetchedNotice = data as PublicNotice;
        } else {
          // Fallback to notices table directly (e.g. if draft, just created, or view filtered)
          const { data: directData, error: directErr } = await supabase
            .from('notices')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (directErr) throw directErr;
          if (directData) {
            fetchedNotice = directData as unknown as PublicNotice;
          }
        }

        if (!fetchedNotice) {
          setNotice(null);
          return;
        }

        // Ensure owner_id and author_name are resolved from notices table
        if (!fetchedNotice.owner_id || !fetchedNotice.author_name) {
          try {
            const { data: directNotice } = await supabase
              .from('notices')
              .select('owner_id, author_name')
              .eq('id', id)
              .maybeSingle();

            if (directNotice) {
              if (directNotice.owner_id && !fetchedNotice.owner_id) {
                fetchedNotice.owner_id = directNotice.owner_id;
              }
              if (directNotice.author_name && !fetchedNotice.author_name) {
                fetchedNotice.author_name = directNotice.author_name;
              }
            }
          } catch {
            // Silently continue
          }
        }

        // Check local cache for author name
        if (!fetchedNotice.author_name) {
          const cached =
            localStorage.getItem(`nearnotice_post_author_${id}`) ||
            (fetchedNotice.owner_id
              ? localStorage.getItem(`nearnotice_owner_name_${fetchedNotice.owner_id}`)
              : null);
          if (cached) {
            fetchedNotice.author_name = cached;
          }
        }

        // Resolve author display name
        if (user && fetchedNotice.owner_id === user.id) {
          const myName =
            sanitizeDisplayName(user.user_metadata?.display_name as string) ||
            sanitizeDisplayName(user.user_metadata?.full_name as string) ||
            (user.email ? humanizeAuthorName(user.email.split('@')[0]) : null);
          if (myName) {
            fetchedNotice.author_name = myName;
            localStorage.setItem(`nearnotice_owner_name_${user.id}`, myName);
            localStorage.setItem(`nearnotice_post_author_${id}`, myName);
          }
        } else if (fetchedNotice.owner_id && !fetchedNotice.author_name) {
          try {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', fetchedNotice.owner_id)
              .maybeSingle();

            const profileName = sanitizeDisplayName(profileRow?.display_name);
            if (profileName) {
              fetchedNotice.author_name = profileName;
            }
          } catch {
            // Silently fallback if profiles query is restricted
          }
        }

        // Increment notice views (guarded by session storage to prevent spam / strict mode double counts)
        const sessionKey = `viewed_notice_${id}`;
        let currentViews = fetchedNotice.views_count ?? 0;

        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, '1');
          currentViews += 1;

          // Call RPC in background to atomically increment in database
          supabase
            .rpc('increment_notice_views', { notice_id: id })
            .then(({ error: rpcErr }) => {
              if (rpcErr) {
                console.warn('[NearNotice] Failed to record view:', rpcErr);
              }
            });
        }

        setNotice({
          ...fetchedNotice,
          views_count: currentViews,
        });
      } catch (err: unknown) {
        console.error('[NearNotice] Failed to load notice details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadNotice();
  }, [id, user]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white p-6 text-center pt-20 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Notice Not Found</h2>
        <p className="text-sm text-gray-500">
          This notice may have expired or been removed.
        </p>
        <Link to="/">
          <Button variant="primary" size="md">
            Return to Noticeboard
          </Button>
        </Link>
      </div>
    );
  }

  // Multi-image list or single fallback
  const images: string[] =
    Array.isArray(notice.images) && notice.images.length > 0
      ? notice.images
      : notice.image_path
        ? [notice.image_path]
        : [];

  const handleConnectClick = () => {
    if (!user) {
      setAuthModalReason('connect with this neighbor');
      setShowAuthModal(true);
      return;
    }
    setShowConnectModal(true);
  };

  const resolveContactNumber = async (): Promise<string | null> => {
    if (!notice) return null;
    setContactError(null);
    setContactLoading(true);
    try {
      const result = await fetchNoticeContact(
        notice.id,
        notice.owner_id,
        user?.id,
        notice.contact_number
      );

      if (result.error || !result.contact_number) {
        setContactError(result.error || 'Contact number not available');
        return null;
      }

      return result.contact_number;
    } finally {
      setContactLoading(false);
    }
  };

  const handleWhatsAppAction = async () => {
    if (!user) {
      setAuthModalReason('chat on WhatsApp with this neighbor');
      setShowAuthModal(true);
      return;
    }
    const phone = await resolveContactNumber();
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
      `Hi, I saw your listing for "${notice?.title}" on NearNotice.`
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCallAction = async () => {
    if (!user) {
      setAuthModalReason('call this neighbor');
      setShowAuthModal(true);
      return;
    }
    const phone = await resolveContactNumber();
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.location.href = `tel:+91${cleanPhone}`;
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white pb-28 relative">
      {/* Top Header Bar */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <Link
          to="/"
          className="w-11 h-11 min-w-[44px] min-h-[44px] -ml-2 text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full flex items-center justify-center transition-colors shadow-2xs"
          aria-label="Back to feed"
        >
          <ArrowLeft size={24} className="stroke-[2.25]" />
        </Link>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Notice Details
        </span>
        <button
          type="button"
          onClick={() => {
            if (!notice) return;
            if (status !== 'authenticated') {
              setAuthModalReason('save this notice');
              setShowAuthModal(true);
              return;
            }
            const updated = toggleSaveNotice(notice);
            setIsSaved(updated);
          }}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
          aria-label={isSaved ? 'Remove from saved' : 'Save notice'}
        >
          <Bookmark
            size={20}
            className={isSaved ? 'fill-blue-600 text-blue-600' : 'text-gray-500'}
          />
        </button>
      </div>

      <div className="px-6 pt-2 space-y-4">
        {/* Label: Title */}
        <div>
          <span className="text-xs font-medium text-gray-400 block mb-1">
            Title
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug">
            {notice.title}
          </h1>
        </div>

        {/* Large Rounded Image Card preserving full aspect ratio without cropping */}
        {images.length > 0 ? (
          <div className="w-full min-h-[260px] max-h-[500px] rounded-3xl overflow-hidden bg-gray-950/5 relative shadow-xs border border-gray-150 flex items-center justify-center">
            {/* Ambient blurred backdrop for letterbox areas */}
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${images[activeImageIdx]})` }}
            />
            <img
              src={images[activeImageIdx]}
              alt={notice.title}
              className="relative z-10 w-full max-h-[500px] object-contain transition-all"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveImageIdx((prev) =>
                      prev === 0 ? images.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() =>
                    setActiveImageIdx((prev) =>
                      prev === images.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-2.5 left-1/2 -translate-y-1/2 -translate-x-1/2 z-20 bg-black/50 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {activeImageIdx + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full aspect-16/9 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-medium">
            No image attached
          </div>
        )}

        {/* Price & Category Tag */}
        <div className="flex items-center justify-between pt-1">
          {notice.price != null && Number(notice.price) > 0 ? (
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              ₹{Number(notice.price).toLocaleString('en-IN')}
            </div>
          ) : (
            <div />
          )}

          <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {notice.category}
          </span>
        </div>

        {/* Author / Who Posted */}
        {(() => {
          const currentUserName =
            sanitizeDisplayName(user?.user_metadata?.display_name as string) ||
            sanitizeDisplayName(user?.user_metadata?.full_name as string) ||
            undefined;
          const author = getNoticeAuthor(notice, user?.id, currentUserName);
          const isLocEnabled = localStorage.getItem('nearnotice_loc_enabled') === 'true';
          const savedLat = isLocEnabled ? localStorage.getItem('nearnotice_lat') : null;
          const savedLng = isLocEnabled ? localStorage.getItem('nearnotice_lng') : null;
          const userLat = savedLat ? parseFloat(savedLat) : null;
          const userLng = savedLng ? parseFloat(savedLng) : null;
          const distance = getEstimatedNoticeDistance(
            notice.id,
            userLat,
            userLng,
            notice.latitude,
            notice.longitude,
            notice.distance_km
          );
          return (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {author.initial}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm sm:text-base font-bold text-gray-900 truncate">
                      {author.postedBy}
                    </span>
                    <span className="block text-xs text-gray-500">
                      • {formatRelativeTime(notice.created_at)}
                    </span>
                  </div>
                </div>

                {author.isOwner && (
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full shrink-0">
                    Your Post
                  </span>
                )}
              </div>

              {/* Location & Distance */}
              <div className="flex items-center justify-between text-xs text-gray-600 px-1">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  <span className="font-semibold text-gray-800">{notice.area_label}</span>
                  <span className="text-gray-300">|</span>
                  <Clock size={13} className="text-gray-400 shrink-0" />
                  <span className="font-medium text-gray-600">{distance}</span>
                </div>

                <div className="flex items-center gap-1.5 text-gray-500 font-medium shrink-0">
                  <Eye size={13} className="text-gray-400" />
                  <span>{notice.views_count ?? 1} views</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Description */}
        {notice.body && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {notice.body}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action: CONNECT (Normal view for everyone) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 p-4 z-40">
        <div className="max-w-md mx-auto space-y-2">
          {contactError && (
            <Alert
              variant="error"
              title="Unable to connect"
              className="text-xs py-2 px-3"
            >
              {contactError}
            </Alert>
          )}

          <div className="w-full">
            {(!notice.contact_type || notice.contact_type !== 'none') ? (
              <div className="grid grid-cols-2 gap-3 w-full">
                {(!notice.contact_type ||
                  notice.contact_type === 'whatsapp' ||
                  notice.contact_type === 'both') && (
                    <button
                      type="button"
                      disabled={contactLoading}
                      onClick={handleWhatsAppAction}
                      className={`py-3.5 px-4 rounded-2xl font-bold text-sm text-white bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-70 active:scale-[0.99] transition-all shadow-md shadow-[#00a884]/20 flex items-center justify-center gap-2 cursor-pointer ${notice.contact_type === 'whatsapp' ? 'col-span-2' : ''
                        }`}
                    >
                      {contactLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <MessageCircle size={18} />
                      )}
                      <span>WhatsApp</span>
                    </button>
                  )}

                {(!notice.contact_type ||
                  notice.contact_type === 'call' ||
                  notice.contact_type === 'both') && (
                    <button
                      type="button"
                      disabled={contactLoading}
                      onClick={handleCallAction}
                      className={`py-3.5 px-4 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 active:scale-[0.99] transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer ${notice.contact_type === 'call' ? 'col-span-2' : ''
                        }`}
                    >
                      {contactLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Phone size={18} />
                      )}
                      <span>Call</span>
                    </button>
                  )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectClick}
                className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle size={18} />
                <span>Connect with Poster</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connect Modal Drawer */}
      {showConnectModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center relative animate-in slide-in-from-bottom duration-200">
            <button
              onClick={() => setShowConnectModal(false)}
              aria-label="Close dialog"
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="font-bold text-gray-900 text-lg mb-1">
              Contact Neighbor
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Connect directly regarding "{notice.title}"
            </p>

            <div className="space-y-3">
              {contactError && (
                <Alert variant="error" className="text-xs py-2 px-3 text-left">
                  {contactError}
                </Alert>
              )}

              {(!notice.contact_type ||
                notice.contact_type === 'whatsapp' ||
                notice.contact_type === 'both') && (
                  <Button
                    fullWidth
                    size="lg"
                    disabled={contactLoading}
                    onClick={handleWhatsAppAction}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl"
                  >
                    {contactLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <MessageCircle size={18} />
                    )}
                    <span>Chat on WhatsApp</span>
                  </Button>
                )}

              {(!notice.contact_type ||
                notice.contact_type === 'call' ||
                notice.contact_type === 'both') && (
                  <Button
                    fullWidth
                    size="lg"
                    variant="outline"
                    disabled={contactLoading}
                    onClick={handleCallAction}
                    className="gap-2 font-bold rounded-2xl"
                  >
                    {contactLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Phone size={18} />
                    )}
                    <span>Call Directly</span>
                  </Button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Sign-In / Login Popup Modal */}
      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        reason={authModalReason}
        nextPath={window.location.pathname}
      />
    </div>
  );
}
