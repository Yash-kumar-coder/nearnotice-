import React, { useState, useEffect } from 'react';
import { Bookmark, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { NoticeCard } from '../components/NoticeCard';
import { Skeleton } from '../components/common/Skeleton';
import type { PublicNotice } from '../types/database.types';
import { fetchSavedNotices, toggleSaveNotice } from '../utils/savedNotices';
import { useAuth } from '../contexts/AuthContext';
import { AuthPromptModal } from '../components/auth/AuthPromptModal';

export default function Saved() {
  const { status } = useAuth();
  const [savedNotices, setSavedNotices] = useState<PublicNotice[]>([]);
  const [loading, setLoading] = useState(true);

  // User location for distance rendering
  const [userCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const isEnabled = localStorage.getItem('nearnotice_loc_enabled') === 'true';
    if (!isEnabled) return null;
    const lat = localStorage.getItem('nearnotice_lat');
    const lng = localStorage.getItem('nearnotice_lng');
    if (lat && lng) {
      return { lat: parseFloat(lat), lng: parseFloat(lng) };
    }
    return null;
  });

  // Auth prompt state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState('connect with this neighbor');
  const [authModalNext, setAuthModalNext] = useState('/saved');

  // Load saved notices
  const loadNotices = async () => {
    setLoading(true);
    try {
      const data = await fetchSavedNotices();
      setSavedNotices(data);
    } catch (err) {
      console.error('Error fetching saved notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();

    const handleSavedChange = () => {
      loadNotices();
    };

    window.addEventListener('nearnotice_saved_changed', handleSavedChange);
    return () => {
      window.removeEventListener('nearnotice_saved_changed', handleSavedChange);
    };
  }, []);

  const handleSaveToggle = (noticeId: string) => {
    const notice = savedNotices.find((n) => n.id === noticeId);
    if (notice) {
      toggleSaveNotice(notice);
      setSavedNotices((prev) => prev.filter((n) => n.id !== noticeId));
    }
  };

  const handleRequireAuth = (actionLabel: string, returnPath: string) => {
    if (status !== 'authenticated') {
      setAuthModalReason(actionLabel);
      setAuthModalNext(returnPath);
      setShowAuthModal(true);
    }
  };

  return (
    <div className="max-w-md mx-auto p-5 pb-24 min-h-screen bg-white">
      {/* Top Header with Back Button identical to Create Notice */}
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/"
          className="w-11 h-11 min-w-[44px] min-h-[44px] -ml-2 text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full flex items-center justify-center transition-colors shadow-2xs"
          aria-label="Back to feed"
        >
          <ArrowLeft size={24} className="stroke-[2.25]" />
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Saved Notices
          </h1>
          <p className="text-xs text-gray-500 mt-1">Notices you bookmarked for later</p>
        </div>
        {!loading && savedNotices.length > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {savedNotices.length} {savedNotices.length === 1 ? 'Notice' : 'Notices'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-xs">
              <Skeleton className="w-full h-44 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="w-3/4 h-4" />
                <Skeleton className="w-1/2 h-3" />
              </div>
            </div>
          ))}
        </div>
      ) : savedNotices.length > 0 ? (
        <div className="space-y-3">
          {savedNotices.map((notice) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              isSaved={true}
              onSaveToggle={handleSaveToggle}
              onRequireAuthPrompt={handleRequireAuth}
              userLat={userCoords?.lat}
              userLng={userCoords?.lng}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50/70 rounded-3xl border border-gray-200/80 p-8 shadow-xs text-center space-y-3.5 my-6">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-2xs">
            <Bookmark size={24} />
          </div>
          <h3 className="font-bold text-gray-900 text-base">No saved notices yet</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
            When browsing the neighborhood noticeboard, tap the bookmark icon on any notice
            to save it here for quick access.
          </p>
          <div className="pt-2">
            <Link to="/">
              <Button size="sm" variant="outline" className="rounded-xl">
                Explore Community Feed
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Guest Auth Prompt Modal */}
      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        reason={authModalReason}
        nextPath={authModalNext}
      />
    </div>
  );
}
