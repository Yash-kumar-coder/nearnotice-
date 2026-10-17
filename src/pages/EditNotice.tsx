import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X, MapPin, Phone, MessageCircle, Trash2, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Notice } from '../types/database.types';
import { CategorySelect } from '../components/common/CategorySelect';
import {
  optimizeImage,
  validateImageFile,
  formatBytes,
} from '../utils/imageOptimizer';

const CATEGORIES = [
  'Items for Sale',
  'Services',
  'Community',
  'Jobs & Gigs',
  'Events',
  'Lost & Found',
  'Rentals',
];

interface NoticeImageItem {
  id: string;
  previewUrl: string;
  file: File;
  isOptimizing: boolean;
  originalSize: number;
  optimizedSize?: number;
  promise?: Promise<File>;
}

export default function EditNotice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loadingNotice, setLoadingNotice] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [areaLabel, setAreaLabel] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Existing and new images
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageItems, setNewImageItems] = useState<NoticeImageItem[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Contact state
  const [contactType, setContactType] = useState<'both' | 'whatsapp' | 'call'>('both');
  const [phone, setPhone] = useState('');
  const [price, setPrice] = useState('');

  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch notice to edit
  useEffect(() => {
    async function fetchNotice() {
      if (!id || !user) return;
      setLoadingNotice(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from('notices')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchErr) throw fetchErr;

        const notice = data as Notice;

        if (notice.owner_id !== user.id) {
          setError('You do not have permission to edit this notice.');
          return;
        }

        setTitle(notice.title);
        setCategory(notice.category);
        setDescription(notice.body || '');
        setAreaLabel(notice.area_label);
        setLatitude(notice.latitude);
        setLongitude(notice.longitude);
        setPrice(notice.price ? String(notice.price) : '');
        setPhone(notice.contact_number || '');
        setContactType(
          (notice.contact_type as 'both' | 'whatsapp' | 'call') || 'both'
        );

        const imgs = Array.isArray(notice.images) && notice.images.length > 0
          ? notice.images
          : notice.image_path
          ? [notice.image_path]
          : [];
        setExistingImages(imgs);
      } catch (err: unknown) {
        console.error('[NearNotice] Failed to fetch notice for edit:', err);
        setError('Notice not found or unable to load.');
      } finally {
        setLoadingNotice(false);
      }
    }

    fetchNotice();
  }, [id, user]);

  // Handle image selections up to 4 total
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const totalCurrent = existingImages.length + newImageItems.length;
    const availableSlots = 4 - totalCurrent;

    if (availableSlots <= 0) {
      alert('You can upload a maximum of 4 images total.');
      return;
    }

    const filesToProcess = selected.slice(0, availableSlots);

    // Validate each file
    const validFiles: File[] = [];
    for (const file of filesToProcess) {
      const val = validateImageFile(file);
      if (!val.valid) {
        setError(val.error || 'Invalid image file.');
        return;
      }
      validFiles.push(file);
    }

    // Create instant previews and kick off async optimization in background
    const newItems: NoticeImageItem[] = validFiles.map((file) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const previewUrl = URL.createObjectURL(file);

      const promise = optimizeImage(file)
        .then((result) => {
          setNewImageItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    file: result.file,
                    optimizedSize: result.optimizedSize,
                    isOptimizing: false,
                  }
                : item
            )
          );
          return result.file;
        })
        .catch((err) => {
          console.warn('[NearNotice] Image optimization error, using original:', err);
          setNewImageItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, isOptimizing: false } : item
            )
          );
          return file;
        });

      return {
        id,
        previewUrl,
        file,
        isOptimizing: true,
        originalSize: file.size,
        promise,
      };
    });

    setNewImageItems((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImageItems((prev) => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Browser Geolocation for "Use current"
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          const city =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.city ||
            data.address?.town ||
            'Local Neighborhood';
          const state = data.address?.state || '';
          setAreaLabel(state ? `${city}, ${state}` : city);
        } catch {
          setAreaLabel('Current Location');
        } finally {
          setLocating(false);
        }
      },
      () => {
        alert('Could not retrieve current location.');
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  // 2. Update notice (U in CRUD)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    setError(null);

    if (!title.trim() || title.length < 3) {
      setError('Title must be at least 3 characters');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError('Description is required (at least 10 characters)');
      return;
    }

    if (!areaLabel.trim()) {
      setError('Please provide a neighborhood or location area');
      return;
    }

    if (!phone.trim() || phone.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number for contact');
      return;
    }

    setSaving(true);

    try {
      // 1. Wait for any in-flight image optimizations to finish
      if (newImageItems.some((item) => item.isOptimizing)) {
        setUploadStatus('Finishing image optimization...');
        await Promise.all(
          newImageItems.map((item) => item.promise || Promise.resolve(item.file))
        );
      }

      // 2. Upload new images to Supabase Storage if any
      const newlyUploadedUrls: string[] = [];

      for (let i = 0; i < newImageItems.length; i++) {
        setUploadStatus(`Uploading image ${i + 1} of ${newImageItems.length}...`);
        const item = newImageItems[i];
        const file = item.file;
        const ext = file.name.split('.').pop() || 'webp';
        const filePath = `${user.id}/${Date.now()}_edit_${i}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('notice-images')
          .upload(filePath, file, {
            contentType: file.type || 'image/webp',
            upsert: true,
          });

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from('notice-images')
            .getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            newlyUploadedUrls.push(publicUrlData.publicUrl);
          }
        }
      }

      const allImages = [...existingImages, ...newlyUploadedUrls];

      const updatePayload: Record<string, unknown> = {
        title: title.trim(),
        body: description.trim() || null,
        category,
        area_label: areaLabel.trim(),
        latitude,
        longitude,
        image_path: allImages[0] || null,
        images: allImages,
        contact_number: phone.trim(),
        contact_type: contactType,
      };

      if (price.trim()) {
        const numPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
        updatePayload.price = isNaN(numPrice) ? null : numPrice;
      } else {
        updatePayload.price = null;
      }

      const { error: updateErr } = await supabase
        .from('notices')
        .update(updatePayload)
        .eq('id', id)
        .eq('owner_id', user.id);

      if (updateErr) throw updateErr;

      navigate(`/notice/${id}`, { replace: true });
    } catch (err: unknown) {
      console.error('[NearNotice] Failed to update notice:', err);
      setError('Unable to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // 3. Delete notice (D in CRUD)
  const confirmDeleteNotice = async () => {
    if (!id || !user) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { error: delErr } = await supabase
        .from('notices')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);

      if (delErr) throw delErr;

      navigate('/notices/manage', { replace: true });
    } catch (err: unknown) {
      console.error('[NearNotice] Failed to delete notice:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete notice. Please retry.');
    } finally {
      setDeleting(false);
    }
  };

  if (loadingNotice) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-5 pb-24 min-h-screen bg-white">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/notices/manage"
          className="py-2 px-2.5 -ml-2 rounded-xl text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center gap-1.5 min-h-[44px]"
        >
          <ArrowLeft size={20} className="shrink-0" />
          <span>My Notices</span>
        </Link>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer p-1"
        >
          <Trash2 size={15} />
          <span>Delete</span>
        </button>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-6">
        Edit Notice
      </h1>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <form onSubmit={handleUpdate} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            Tittle <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Buy my i-phone"
            maxLength={120}
            required
            className="w-full bg-gray-100/80 border border-transparent rounded-2xl py-3.5 px-4 text-sm text-gray-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none"
          />
        </div>

        {/* Select Category */}
        <CategorySelect
          value={category}
          onChange={setCategory}
          label="Select category"
          required
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe condition, specifications, meetup place, or reason..."
            rows={5}
            maxLength={5000}
            required
            className="w-full bg-gray-100/80 border border-transparent rounded-2xl py-3 px-4 text-sm text-gray-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Manage Images */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Photos <span className="text-gray-400 font-normal text-xs">(Optional, max 4)</span>
          </label>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Existing uploaded images */}
            {existingImages.map((src, idx) => (
              <div
                key={`existing-${idx}`}
                className="w-20 h-20 rounded-2xl overflow-hidden relative border border-gray-200 bg-gray-50 shadow-2xs"
              >
                <img src={src} alt="Notice photo" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors cursor-pointer"
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {/* Newly chosen image previews */}
            {newImageItems.map((item, idx) => (
              <div
                key={item.id}
                className="w-20 h-20 rounded-2xl overflow-hidden relative border border-blue-300 bg-blue-50/40 shadow-2xs group"
              >
                <img
                  src={item.previewUrl}
                  alt="New upload preview"
                  className="w-full h-full object-cover"
                />
                {item.isOptimizing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 size={16} className="text-white animate-spin" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeNewImage(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors cursor-pointer"
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {existingImages.length + newImageItems.length < 4 && (
              <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-100/70 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors text-gray-500 hover:text-gray-800">
                <ImagePlus size={22} className="mb-0.5 text-gray-400" />
                <span className="text-[10px] font-medium">Add Photo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Image Optimization Status Progress */}
          {newImageItems.some((item) => item.isOptimizing) ? (
            <div className="flex items-center gap-2 text-xs text-blue-600 font-medium mt-2 bg-blue-50/70 py-1.5 px-3 rounded-xl border border-blue-100">
              <Loader2 size={13} className="animate-spin text-blue-600 shrink-0" />
              <span>Optimizing new images for faster loading...</span>
            </div>
          ) : newImageItems.length > 0 &&
            newImageItems.some((item) => item.optimizedSize && item.optimizedSize < item.originalSize) ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mt-2 bg-emerald-50/70 py-1.5 px-3 rounded-xl border border-emerald-100">
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span>
                New images optimized ({formatBytes(newImageItems.reduce((acc, curr) => acc + curr.originalSize, 0))} →{' '}
                {formatBytes(newImageItems.reduce((acc, curr) => acc + (curr.optimizedSize || curr.originalSize), 0))})
              </span>
            </div>
          ) : null}
        </div>

        {/* Location with "Use current" */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm font-semibold text-gray-800">
              Location <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <MapPin size={12} />
              {locating ? 'Locating...' : 'Use current'}
            </button>
          </div>
          <input
            type="text"
            value={areaLabel}
            onChange={(e) => setAreaLabel(e.target.value)}
            placeholder="e.g. Motihari, Bihar"
            required
            className="w-full bg-gray-100/80 border border-transparent rounded-2xl py-3.5 px-4 text-sm text-gray-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none"
          />
        </div>

        {/* Contact Selector (Whatsapp & Call) */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Contact <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              type="button"
              onClick={() =>
                setContactType(contactType === 'whatsapp' ? 'both' : 'whatsapp')
              }
              className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                contactType === 'whatsapp' || contactType === 'both'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                  : 'bg-gray-100/90 text-gray-600 border-transparent hover:bg-gray-200'
              }`}
            >
              <MessageCircle size={15} /> Whatsapp
            </button>
            <button
              type="button"
              onClick={() =>
                setContactType(contactType === 'call' ? 'both' : 'call')
              }
              className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                contactType === 'call' || contactType === 'both'
                  ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs'
                  : 'bg-gray-100/90 text-gray-600 border-transparent hover:bg-gray-200'
              }`}
            >
              <Phone size={15} /> Call
            </button>
          </div>

          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-xs font-bold text-gray-500 select-none">
              +91
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="9876543210"
              maxLength={10}
              required
              className="w-full bg-gray-100/80 border border-transparent rounded-2xl py-3.5 pl-12 pr-4 text-sm text-gray-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none font-mono"
            />
          </div>
        </div>

        {/* Price (Optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            Price <span className="text-gray-400 font-normal text-xs">(Optional)</span>
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-sm font-bold text-gray-500 select-none">
              ₹
            </div>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="e.g. 4000 (leave empty if free or negotiable)"
              className="w-full bg-gray-100/80 border border-transparent rounded-2xl py-3.5 pl-9 pr-4 text-sm text-gray-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none font-medium"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 space-y-3">
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={saving}
              className="flex-1 py-3.5 rounded-full font-bold shadow-md shadow-blue-600/20"
            >
              {saving && uploadStatus ? uploadStatus : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => navigate('/notices/manage')}
              className="py-3.5 rounded-full font-bold"
            >
              Cancel
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 size={16} />
            <span>Delete Notice</span>
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center relative animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>

            <h3 className="font-bold text-gray-900 text-lg mb-2">
              Delete This Notice?
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Are you sure you want to permanently delete this notice? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs text-left">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteNotice}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
