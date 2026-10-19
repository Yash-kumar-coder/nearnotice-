import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X, MapPin, Phone, MessageCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { sanitizeDisplayName, humanizeAuthorName } from '../utils/author';
import { CategorySelect } from '../components/common/CategorySelect';
import { LocationInput } from '../components/common/LocationInput';
import { geocode } from '../utils/geocode';
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

export default function CreateNotice() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [areaLabel, setAreaLabel] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Images state (Max 4)
  const [imageItems, setImageItems] = useState<NoticeImageItem[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Contact state
  const [contactType, setContactType] = useState<'both' | 'whatsapp' | 'call'>('both');
  const [phone, setPhone] = useState('');
  const [price, setPrice] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle image selections up to 4 with immediate previews & async background optimization
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const availableSlots = 4 - imageItems.length;

    if (availableSlots <= 0) {
      alert('You can upload a maximum of 4 images.');
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
          setImageItems((prev) =>
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
          setImageItems((prev) =>
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

    setImageItems((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageItems((prev) => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    if (!user) {
      setError('You must be logged in to create a notice');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Wait for any in-flight image optimizations to finish
      if (imageItems.some((item) => item.isOptimizing)) {
        setUploadStatus('Finishing image optimization...');
        await Promise.all(
          imageItems.map((item) => item.promise || Promise.resolve(item.file))
        );
      }

      // 2. Upload images to Supabase Storage
      const uploadedUrls: string[] = [];

      for (let i = 0; i < imageItems.length; i++) {
        setUploadStatus(`Uploading image ${i + 1} of ${imageItems.length}...`);
        const item = imageItems[i];
        const file = item.file;
        const ext = file.name.split('.').pop() || 'webp';
        const filePath = `${user.id}/${Date.now()}_${i}.${ext}`;

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
            uploadedUrls.push(publicUrlData.publicUrl);
          }
        }
      }

      // 2. Ensure coordinates are resolved before saving notice
      let finalLat = latitude;
      let finalLng = longitude;

      if ((finalLat == null || finalLng == null) && areaLabel.trim()) {
        setUploadStatus('Resolving location coordinates...');
        try {
          const geo = await geocode(areaLabel.trim());
          if (geo) {
            finalLat = geo.latitude;
            finalLng = geo.longitude;
            setLatitude(geo.latitude);
            setLongitude(geo.longitude);
          }
        } catch {
          // Graceful fallback
        }
      }

      // 3. Prepare notice row
      const noticePayload: Record<string, unknown> = {
        owner_id: user.id,
        title: title.trim(),
        body: description.trim() || null,
        category,
        area_label: areaLabel.trim(),
        latitude: finalLat,
        longitude: finalLng,
        image_path: uploadedUrls[0] || null,
        images: uploadedUrls,
        status: 'published',
      };

      if (price.trim()) {
        const numPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
        if (!isNaN(numPrice)) {
          noticePayload.price = numPrice;
        }
      }

      if (phone.trim()) {
        noticePayload.contact_number = phone.trim();
        noticePayload.contact_type = contactType;
      }

      // 3. Ensure author's display name is stored in profiles and cached locally
      const authorDisplayName =
        sanitizeDisplayName(user.user_metadata?.display_name as string) ||
        sanitizeDisplayName(user.user_metadata?.full_name as string) ||
        (user.email ? humanizeAuthorName(user.email.split('@')[0]) : null) ||
        'Neighbor';

      localStorage.setItem(`nearnotice_owner_name_${user.id}`, authorDisplayName);

      if (authorDisplayName && authorDisplayName !== 'Neighbor') {
        try {
          await supabase
            .from('profiles')
            .upsert(
              { id: user.id, display_name: authorDisplayName.trim() },
              { onConflict: 'id' }
            );
        } catch {
          // ignore profile sync error
        }
      }

      // 4. Insert notice (attempt with author_name, graceful fallback if column not yet added)
      let insertError: unknown = null;
      try {
        const { data: insertedNotice, error: err1 } = await supabase
          .from('notices')
          .insert({ ...noticePayload, author_name: authorDisplayName })
          .select('id')
          .maybeSingle();

        if (err1) {
          const { data: fallbackNotice, error: err2 } = await supabase
            .from('notices')
            .insert(noticePayload)
            .select('id')
            .maybeSingle();

          insertError = err2;
          if (fallbackNotice?.id) {
            localStorage.setItem(`nearnotice_post_author_${fallbackNotice.id}`, authorDisplayName);
          }
        } else if (insertedNotice?.id) {
          localStorage.setItem(`nearnotice_post_author_${insertedNotice.id}`, authorDisplayName);
        }
      } catch {
        const { error: err3 } = await supabase.from('notices').insert(noticePayload);
        insertError = err3;
      }

      if (insertError) {
        throw insertError;
      }

      navigate('/', { replace: true });
    } catch (err: unknown) {
      console.error('[NearNotice] Failed to create notice:', err);
      setError('Unable to publish notice. Please verify all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-5 pb-24 min-h-screen bg-white">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/"
          className="w-11 h-11 min-w-[44px] min-h-[44px] -ml-2 text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full flex items-center justify-center transition-colors shadow-2xs"
          aria-label="Back to feed"
        >
          <ArrowLeft size={24} className="stroke-[2.25]" />
        </Link>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-6">
        Create a Notice
      </h1>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Buy my i-phone"
            maxLength={120}
            required
            className="w-full bg-gray-100/80 border border-transparent rounded-2xl py-3.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>

        {/* Select Category */}
        <CategorySelect
          value={category}
          onChange={setCategory}
          label="Select category"
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
            className="w-full bg-gray-100/80 border border-transparent rounded-2xl py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Add Image (Max 4, Optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Add images <span className="text-gray-400 font-normal text-xs">(Optional, max 4)</span>
          </label>

          <div className="flex flex-wrap gap-3 items-center">
            {imageItems.map((item, idx) => (
              <div
                key={item.id}
                className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden relative border border-gray-200 bg-gray-50 shadow-2xs group"
              >
                <img
                  src={item.previewUrl}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
                {item.isOptimizing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 size={16} className="text-white animate-spin" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors cursor-pointer"
                  aria-label="Remove photo"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {imageItems.length < 4 && (
              <label className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-100/70 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors text-gray-500 hover:text-gray-800">
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
          {imageItems.some((item) => item.isOptimizing) ? (
            <div className="flex items-center gap-2 text-xs text-blue-600 font-medium mt-2 bg-blue-50/70 py-1.5 px-3 rounded-xl border border-blue-100">
              <Loader2 size={13} className="animate-spin text-blue-600 shrink-0" />
              <span>Optimizing images for faster loading...</span>
            </div>
          ) : imageItems.length > 0 &&
            imageItems.some((item) => item.optimizedSize && item.optimizedSize < item.originalSize) ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mt-2 bg-emerald-50/70 py-1.5 px-3 rounded-xl border border-emerald-100">
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span>
                Images optimized ({formatBytes(imageItems.reduce((acc, curr) => acc + curr.originalSize, 0))} →{' '}
                {formatBytes(imageItems.reduce((acc, curr) => acc + (curr.optimizedSize || curr.originalSize), 0))})
              </span>
            </div>
          ) : null}
        </div>

        {/* Location with Autocomplete, Geocoding & Use Current */}
        <LocationInput
          value={areaLabel}
          onChange={setAreaLabel}
          latitude={latitude}
          longitude={longitude}
          onCoordinatesChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
          placeholder="e.g. Motihari, Bihar or Connaught Place, Delhi"
          required
        />

        {/* Contact Selector (Whatsapp & Call) */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Contact <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              type="button"
              onClick={() =>
                setContactType(
                  contactType === 'whatsapp' ? 'both' : 'whatsapp'
                )
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

          {/* Phone Number with +91 prefix */}
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
              className="w-full bg-gray-100/80 border border-transparent rounded-2xl py-3.5 pl-12 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-mono"
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
              className="w-full bg-gray-100/80 border border-transparent rounded-2xl py-3.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium"
            />
          </div>
        </div>

        {/* Post Button */}
        <div className="pt-4 text-center">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={submitting}
            className="w-full sm:w-2/3 mx-auto py-3.5 rounded-full font-bold shadow-md shadow-primary/20"
          >
            {submitting && uploadStatus ? uploadStatus : 'Post'}
          </Button>
        </div>
      </form>
    </div>
  );
}
