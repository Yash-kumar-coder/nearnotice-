import { useEffect, useState } from 'react';
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

// In-memory cache to avoid redundant queries across component re-renders
let cachedCategories: string[] | null = null;
let cachedObjects: CategoryItem[] | null = null;
let fetchPromise: Promise<CategoryItem[]> | null = null;

export async function fetchActiveCategories(): Promise<CategoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

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
    cachedObjects || []
  );
  const [loading, setLoading] = useState(!cachedCategories);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (cachedCategories && cachedObjects) {
        setCategories(cachedCategories);
        setCategoryObjects(cachedObjects);
        setLoading(false);
        return;
      }

      if (!fetchPromise) {
        fetchPromise = fetchActiveCategories();
      }

      const rows = await fetchPromise;
      fetchPromise = null;

      if (!isMounted) return;

      if (rows && rows.length > 0) {
        const names = rows.map((r) => r.name);
        cachedCategories = names;
        cachedObjects = rows;
        setCategories(names);
        setCategoryObjects(rows);
      } else {
        // Fallback to default
        cachedCategories = DEFAULT_CATEGORIES;
        setCategories(DEFAULT_CATEGORIES);
      }
      setLoading(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { categories, categoryObjects, loading };
}

/**
 * Invalidate category cache (called after Author creates/edits/deletes category)
 */
export function invalidateCategoryCache() {
  cachedCategories = null;
  cachedObjects = null;
  fetchPromise = null;
}
