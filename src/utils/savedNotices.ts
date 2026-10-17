import type { PublicNotice } from '../types/database.types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const SAVED_IDS_KEY = 'nearnotice_saved_ids';
const SAVED_CACHE_KEY = 'nearnotice_saved_notices_cache';

export function getSavedNoticeIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading saved notice IDs:', err);
    return [];
  }
}

export function isNoticeSaved(id: string): boolean {
  if (!id) return false;
  const ids = getSavedNoticeIds();
  return ids.includes(id);
}

export function getSavedNoticesCache(): Record<string, PublicNotice> {
  try {
    const raw = localStorage.getItem(SAVED_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function toggleSaveNotice(notice: PublicNotice): boolean {
  try {
    const ids = getSavedNoticeIds();
    const cache = getSavedNoticesCache();
    const exists = ids.includes(notice.id);

    let updatedIds: string[];
    let nowSaved: boolean;

    if (exists) {
      updatedIds = ids.filter((id) => id !== notice.id);
      delete cache[notice.id];
      nowSaved = false;
    } else {
      updatedIds = [notice.id, ...ids];
      cache[notice.id] = notice;
      nowSaved = true;
    }

    localStorage.setItem(SAVED_IDS_KEY, JSON.stringify(updatedIds));
    localStorage.setItem(SAVED_CACHE_KEY, JSON.stringify(cache));

    // Dispatch event so any component on screen can react immediately
    window.dispatchEvent(
      new CustomEvent('nearnotice_saved_changed', {
        detail: { id: notice.id, isSaved: nowSaved },
      })
    );

    return nowSaved;
  } catch (err) {
    console.error('Error toggling saved notice:', err);
    return false;
  }
}

export async function fetchSavedNotices(): Promise<PublicNotice[]> {
  const ids = getSavedNoticeIds();
  if (ids.length === 0) return [];

  const cache = getSavedNoticesCache();

  // If Supabase is configured, fetch latest notices
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('public_notices')
        .select(
          'id, owner_id, title, body, category, image_path, images, area_label, price, contact_type, views_count, latitude, longitude, created_at, expires_at, author_name'
        )
        .in('id', ids);

      if (!error && data && data.length > 0) {
        // Map database records and fill any missing from cache
        const dbMap = new Map(data.map((n) => [n.id, n as PublicNotice]));
        
        // Preserve saved order
        return ids
          .map((id) => dbMap.get(id) || cache[id])
          .filter((n): n is PublicNotice => Boolean(n));
      }
    } catch (err) {
      console.warn('Could not fetch saved notices from Supabase, falling back to cache:', err);
    }
  }

  // Fallback to cache
  return ids
    .map((id) => cache[id])
    .filter((n): n is PublicNotice => Boolean(n));
}
