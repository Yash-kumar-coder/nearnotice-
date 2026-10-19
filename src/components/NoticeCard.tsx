import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Bookmark, Phone, Loader2, Share2, Check } from 'lucide-react';
import type { PublicNotice } from '../types/database.types';
import { formatRelativeTime } from '../utils/formatTime';
import { getEstimatedNoticeDistance } from '../utils/distance';
import { getNoticeAuthor, sanitizeDisplayName } from '../utils/author';
import { useAuth } from '../contexts/AuthContext';
import { AuthPromptModal } from './auth/AuthPromptModal';
import { fetchNoticeContact } from '../utils/noticeContact';
import { getOptimizedThumbnailUrl } from '../utils/imageUrl';
import { shareNotice } from '../utils/shareNotice';

export interface NoticeCardProps {
  notice: PublicNotice;
  isSaved?: boolean;
  onSaveToggle: (noticeId: string) => void;
  onRequireAuthPrompt?: (actionLabel: string, returnPath: string) => void;
  userLat?: number | null;
  userLng?: number | null;
}

// Authentic WhatsApp SVG Logo
function WhatsAppIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} fill-current shrink-0`} viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// Category badge styling helper matching the mockup design
function getCategoryBadge(category: string, title?: string, body?: string) {
  const text = `${category || ''} ${title || ''} ${body || ''}`.toLowerCase();

  if (text.includes('dog') || text.includes('pet') || text.includes('cat') || text.includes('lost')) {
    return {
      label: category || 'Study',
      icon: '🐾',
      className: 'bg-orange-50 text-orange-600 border-orange-100',
    };
  }

  if (text.includes('study') || text.includes('pg') || text.includes('course') || text.includes('student')) {
    return {
      label: 'Study',
      icon: '🎓',
      className: 'bg-blue-50 text-blue-600 border-blue-100',
    };
  }

  if (text.includes('job') || text.includes('hire') || text.includes('work')) {
    return {
      label: 'Jobs',
      icon: '💼',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    };
  }

  if (text.includes('rent') || text.includes('flat') || text.includes('room') || text.includes('house')) {
    return {
      label: 'Rentals',
      icon: '🏠',
      className: 'bg-rose-50 text-rose-700 border-rose-100',
    };
  }

  if (text.includes('event')) {
    return {
      label: 'Events',
      icon: '📅',
      className: 'bg-purple-50 text-purple-700 border-purple-100',
    };
  }

  if (text.includes('service') || text.includes('repair')) {
    return {
      label: 'Services',
      icon: '🛠',
      className: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    };
  }

  if (text.includes('item') || text.includes('sale') || text.includes('buy')) {
    return {
      label: 'Items',
      icon: '📦',
      className: 'bg-blue-50 text-blue-700 border-blue-100',
    };
  }

  return {
    label: category || 'Community',
    icon: '📌',
    className: 'bg-gray-50 text-gray-700 border-gray-150',
  };
}

// Fallback image helper matching realistic mockup scenes
function getFallbackImage(category: string, title?: string, body?: string) {
  const text = `${category || ''} ${title || ''} ${body || ''}`.toLowerCase();

  if (text.includes('dog') || text.includes('retriever') || text.includes('pet') || text.includes('puppy')) {
    return 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80';
  }

  if (text.includes('pg') || text.includes('study') || text.includes('university') || text.includes('desk') || text.includes('room')) {
    return 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?auto=format&fit=crop&w=400&q=80';
  }

  if (text.includes('rent') || text.includes('flat') || text.includes('house')) {
    return 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80';
  }

  if (text.includes('job') || text.includes('work')) {
    return 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=400&q=80';
  }

  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80';
}

function NoticeCardComponent({
  notice,
  isSaved = false,
  onSaveToggle,
  onRequireAuthPrompt,
  userLat,
  userLng,
}: NoticeCardProps) {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  const badge = getCategoryBadge(notice.category, notice.title, notice.body || '');
  const currentUserName =
    sanitizeDisplayName(user?.user_metadata?.display_name as string) ||
    sanitizeDisplayName(user?.user_metadata?.full_name as string) ||
    undefined;
  const author = getNoticeAuthor(notice, user?.id, currentUserName);
  const distance = getEstimatedNoticeDistance(
    notice.id,
    userLat,
    userLng,
    notice.latitude,
    notice.longitude,
    notice.distance_km
  );

  const displayImage =
    (Array.isArray(notice.images) && notice.images[0]) ||
    notice.image_path ||
    getFallbackImage(notice.category, notice.title, notice.body || '');

  const [imgSrc, setImgSrc] = useState(() => getOptimizedThumbnailUrl(displayImage, 256, 256));
  const [hasFailedThumbnail, setHasFailedThumbnail] = useState(false);

  // Sync if notice image changes
  React.useEffect(() => {
    setImgSrc(getOptimizedThumbnailUrl(displayImage, 256, 256));
    setHasFailedThumbnail(false);
  }, [displayImage]);

  const handleImageError = () => {
    if (!hasFailedThumbnail && imgSrc !== displayImage) {
      setHasFailedThumbnail(true);
      setImgSrc(displayImage);
    } else {
      setImgSrc(getFallbackImage(notice.category, notice.title, notice.body || ''));
    }
  };

  const [showLocalAuth, setShowLocalAuth] = useState(false);
  const [localAuthReason, setLocalAuthReason] = useState('connect with this neighbor');
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const result = await shareNotice({
      id: notice.id,
      title: notice.title,
      body: notice.body,
      areaLabel: notice.area_label,
      price: notice.price,
    });

    if (result.copied) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenNotice = (e: React.MouseEvent) => {
    if (status !== 'authenticated') {
      e.preventDefault();
      if (onRequireAuthPrompt) {
        onRequireAuthPrompt('view notice details', `/notice/${notice.id}`);
      } else {
        setLocalAuthReason('view notice details');
        setShowLocalAuth(true);
      }
    }
  };

  const handleConnectClick = async (e: React.MouseEvent, type: 'whatsapp' | 'call') => {
    e.preventDefault();
    e.stopPropagation();

    if (status !== 'authenticated') {
      const reason =
        type === 'whatsapp'
          ? 'chat on WhatsApp with this neighbor'
          : 'call this neighbor';
      if (onRequireAuthPrompt) {
        onRequireAuthPrompt(reason, `/notice/${notice.id}`);
      } else {
        setLocalAuthReason(reason);
        setShowLocalAuth(true);
      }
      return;
    }

    setIsConnecting(true);
    try {
      const result = await fetchNoticeContact(
        notice.id,
        notice.owner_id,
        user?.id,
        notice.contact_number
      );

      if (result.error || !result.contact_number) {
        navigate(`/notice/${notice.id}`);
        return;
      }

      const cleanPhone = result.contact_number.replace(/[^0-9]/g, '');
      if (type === 'call') {
        window.location.href = `tel:+91${cleanPhone}`;
      } else {
        const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
          `Hi, I saw your post "${notice.title}" on NearNotice.`
        )}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <article className="bg-white rounded-2xl border border-gray-100/90 shadow-2xs hover:shadow-xs transition-all p-3 mb-3.5 group">
      <div className="flex gap-3 items-stretch">
        {/* Left: Square Thumbnail with rounded corners */}
        <Link
          to={`/notice/${notice.id}`}
          onClick={handleOpenNotice}
          className="shrink-0 w-28 h-28 sm:w-32 sm:h-32 aspect-square rounded-2xl overflow-hidden bg-gray-100 relative block group-hover:opacity-95 transition-opacity"
        >
          <img
            src={imgSrc}
            alt={notice.title}
            width={128}
            height={128}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={handleImageError}
          />
        </Link>

        {/* Right: Details & Action */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            {/* Top Row: Category Pill, Price & Bookmark */}
            <div className="flex items-center justify-between gap-1 mb-1">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badge.className}`}
              >
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                {notice.price != null && Number(notice.price) > 0 && (
                  <span className="font-extrabold text-blue-600 text-base sm:text-lg tracking-tight mr-1">
                    ₹{Number(notice.price).toLocaleString('en-IN')}
                  </span>
                )}

                {/* Share Button */}
                <button
                  type="button"
                  onClick={handleShareClick}
                  aria-label={copied ? 'Link copied' : 'Share notice'}
                  title={copied ? 'Link copied!' : 'Share with friends'}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer rounded-lg hover:bg-blue-50 relative group/share"
                >
                  {copied ? (
                    <Check size={18} className="text-emerald-600 stroke-[2.5]" />
                  ) : (
                    <Share2 size={18} className="text-gray-400 group-hover/share:text-blue-600 stroke-[1.75]" />
                  )}
                  {copied && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-sm whitespace-nowrap z-30 animate-in fade-in zoom-in-95 duration-150">
                      Copied!
                    </span>
                  )}
                </button>

                {/* Bookmark Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSaveToggle(notice.id);
                  }}
                  aria-label={isSaved ? 'Remove from saved' : 'Save notice'}
                  className="p-1 -mr-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer rounded-lg hover:bg-gray-50"
                >
                  <Bookmark
                    size={18}
                    className={
                      isSaved
                        ? 'fill-blue-600 text-blue-600'
                        : 'text-gray-400 hover:text-gray-600 stroke-[1.75]'
                    }
                  />
                </button>
              </div>
            </div>

            {/* Title */}
            <Link to={`/notice/${notice.id}`} onClick={handleOpenNotice} className="block">
              <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">
                {notice.title}
              </h3>
            </Link>

            {/* Author Byline */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
              <span className="font-semibold text-gray-700 truncate max-w-[180px]">
                {author.postedBy}
              </span>
            </div>

            {/* Short Snippet */}
            {notice.body && (
              <p className="text-gray-500 text-xs sm:text-[13px] line-clamp-2 mt-0.5 leading-relaxed">
                {notice.body}
              </p>
            )}
          </div>

          {/* Bottom Row: Location, Distance & Quick Action Button */}
          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-gray-100/70 text-[11px] text-gray-500 gap-1.5">
            {/* Location & Distance */}
            <div className="flex items-center gap-1 truncate min-w-0">
              <MapPin size={12} className="text-gray-400 shrink-0" />
              <span className="truncate font-medium text-gray-600">
                {notice.area_label || 'Local Area'}
              </span>
              <span className="text-gray-300 shrink-0 mx-1">|</span>
              <Clock size={12} className="text-gray-400 shrink-0" />
              <span className="font-medium text-gray-600 shrink-0">{distance}</span>
            </div>

            {/* Action Button: WhatsApp or Call (Compact size & triggers login popup if guest) */}
            <div className="shrink-0">
              {notice.contact_type === 'call' ? (
                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={(e) => handleConnectClick(e, 'call')}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  {isConnecting ? (
                    <Loader2 size={11} className="animate-spin shrink-0" />
                  ) : (
                    <Phone size={11} className="fill-current shrink-0" />
                  )}
                  <span>Call</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={(e) => handleConnectClick(e, 'whatsapp')}
                  className="bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-70 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  {isConnecting ? (
                    <Loader2 size={11} className="animate-spin shrink-0" />
                  ) : (
                    <WhatsAppIcon className="w-3 h-3 shrink-0" />
                  )}
                  <span>WhatsApp</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showLocalAuth && (
        <AuthPromptModal
          isOpen={showLocalAuth}
          onClose={() => setShowLocalAuth(false)}
          reason={localAuthReason}
          nextPath={`/notice/${notice.id}`}
        />
      )}
    </article>
  );
}

export const NoticeCard = React.memo(NoticeCardComponent);
