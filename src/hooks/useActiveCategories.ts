import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CategoryItem } from '../author/types';

export const DEFAULT_CATEGORIES = [
  'Items for Sale',
  'Services',
  'Community',
  'Jobs & Gigs',
  'Events',
  'Lost & Found',
  'Rentals',
];

export const DEFAULT_CATEGORY_ITEMS: CategoryItem[] = [
  { id: 'cat-study', name: 'Study', slug: 'study', icon: 'graduation-cap', color: 'blue', is_active: true, sort_order: 1 },
  { id: 'cat-jobs', name: 'Jobs', slug: 'jobs', icon: 'briefcase-business', color: 'indigo', is_active: true, sort_order: 2 },
  { id: 'cat-rentals', name: 'Rentals', slug: 'rentals', icon: 'house', color: 'cyan', is_active: true, sort_order: 3 },
  { id: 'cat-events', name: 'Events', slug: 'events', icon: 'calendar-days', color: 'purple', is_active: true, sort_order: 4 },
  { id: 'cat-services', name: 'Services', slug: 'services', icon: 'wrench', color: 'emerald', is_active: true, sort_order: 5 },
  { id: 'cat-items', name: 'Items', slug: 'items', icon: 'shopping-bag', color: 'amber', is_active: true, sort_order: 6 },
  { id: 'cat-community', name: 'Community', slug: 'community', icon: 'megaphone', color: 'blue', is_active: true, sort_order: 7 },
];

// In-memory cache to avoid redundant queries across component re-renders
let cachedCategories: string[] | null = null;
let cachedObjects: CategoryItem[] | null = null;
let fetchPromise: Promise<CategoryItem[]> | null = null;

export async function fetchActiveCategories(): Promise<CategoryItem[]> {
  try {
    let query: any = supabase.from('categories').select('*');
    if (typeof query?.eq === 'function') {
      query = query.eq('is_active', true);
    }
    if (typeof query?.order === 'function') {
      query = query.order('sort_order', { ascending: true });
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return [];
    }

    return data as CategoryItem[];
  } catch (err) {
    console.warn('Could not fetch dynamic categories from Supabase, using defaults:', err);
    return [];
  }
}

export function useActiveCategories() {
  const [categories, setCategories] = useState<string[]>(
    cachedCategories || DEFAULT_CATEGORIES
  );
  const [categoryObjects, setCategoryObjects] = useState<CategoryItem[]>(
    cachedObjects || DEFAULT_CATEGORY_ITEMS
  );
  const [loading, setLoading] = useState(!cachedCategories);

  const load = useCallback(async (force = false) => {
    if (!force && cachedCategories && cachedObjects) {
      setCategories(cachedCategories);
      setCategoryObjects(cachedObjects);
      setLoading(false);
      return;
    }

    if (!fetchPromise || force) {
      fetchPromise = fetchActiveCategories();
    }

    const rows = await fetchPromise;
    fetchPromise = null;

    if (rows && rows.length > 0) {
      const names = rows.map((r) => r.name);
      cachedCategories = names;
      cachedObjects = rows;
      setCategories(names);
      setCategoryObjects(rows);
    } else {
      // Fallback to defaults
      cachedCategories = DEFAULT_CATEGORIES;
      cachedObjects = DEFAULT_CATEGORY_ITEMS;
      setCategories(DEFAULT_CATEGORIES);
      setCategoryObjects(DEFAULT_CATEGORY_ITEMS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    load();

    const handleInvalidation = () => {
      if (isMounted) {
        load(true);
      }
    };

    window.addEventListener('nearnotice:categories_invalidated', handleInvalidation);

    return () => {
      isMounted = false;
      window.removeEventListener('nearnotice:categories_invalidated', handleInvalidation);
    };
  }, [load]);

  return { categories, categoryObjects, loading, refresh: () => load(true) };
}

/**
 * Invalidate category cache (called after Author creates/edits/deletes category)
 */
export function invalidateCategoryCache() {
  cachedCategories = null;
  cachedObjects = null;
  fetchPromise = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nearnotice:categories_invalidated'));
  }
}
