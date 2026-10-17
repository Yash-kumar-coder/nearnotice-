/**
 * NearNotice Client-Side Image Optimizer
 *
 * Requirements:
 * - Automatically resize large images to max 1600x1600 px while preserving aspect ratio.
 * - Never stretch or unnecessarily crop images.
 * - Compress images to ~300-500 KB when practical, maintaining good visual quality.
 * - Use WebP where supported, fallback to JPEG.
 * - Skip unnecessary compression for already-small images (<= 350 KB & <= 1600x1600).
 * - Keep UI responsive on low-end Android phones and slow networks by yielding execution.
 * - Provide immediate previews and progress tracking.
 * - Validate file types and sizes.
 */

export interface ImageOptimizationResult {
  file: File;
  previewUrl?: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  wasCompressed: boolean;
  mimeType: string;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export const MAX_DIMENSION = 1600;
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB max raw input
export const SKIP_COMPRESSION_SIZE_BYTES = 350 * 1024; // 350 KB
export const TARGET_MAX_SIZE_BYTES = 500 * 1024; // 500 KB

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
];

/**
 * Validates file type and initial file size.
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  const isAllowedType =
    ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) ||
    file.name.match(/\.(jpe?g|png|webp|gif|avif|heic|heif)$/i);

  if (!isAllowedType) {
    return {
      valid: false,
      error: `"${file.name}" is not a supported image format. Please select JPG, PNG, or WebP.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `"${file.name}" exceeds the maximum allowed size of 25 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Calculates proportional target dimensions preserving aspect ratio without stretching or cropping.
 */
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxDim: number = MAX_DIMENSION
): { width: number; height: number; scaled: boolean } {
  if (width <= 0 || height <= 0) {
    return { width: maxDim, height: maxDim, scaled: false };
  }

  if (width <= maxDim && height <= maxDim) {
    return { width, height, scaled: false };
  }

  const scale = Math.min(maxDim / width, maxDim / height);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  return {
    width: targetWidth,
    height: targetHeight,
    scaled: true,
  };
}

/**
 * Checks if browser canvas supports export to WebP.
 */
export function isWebPSupported(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch {
    return false;
  }
}

/**
 * Non-blocking delay to yield main thread on low-end Android mobile devices.
 */
export function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Helper to format byte counts into clean human-readable strings.
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Reads image dimensions from a File.
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (
      typeof window === 'undefined' ||
      typeof Image === 'undefined' ||
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function'
    ) {
      return resolve({ width: 800, height: 600 });
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image "${file.name}"`));
    };

    img.src = objectUrl;
  });
}

/**
 * Converts canvas to Blob using a Promise.
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(resolve, type, quality);
    } else {
      try {
        const dataUrl = canvas.toDataURL(type, quality);
        const binStr = atob(dataUrl.split(',')[1]);
        const len = binStr.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          arr[i] = binStr.charCodeAt(i);
        }
        resolve(new Blob([arr], { type }));
      } catch {
        resolve(null);
      }
    }
  });
}

/**
 * Optimizes an image File:
 * 1. Checks if already small and within 1600x1600 (skips if so).
 * 2. Scales proportionally to max 1600x1600 px without cropping.
 * 3. Compresses to WebP (or JPEG fallback) targeting ~300-500 KB with good visual quality.
 * 4. Yields the thread to keep low-end devices fluid.
 */
export async function optimizeImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ImageOptimizationResult> {
  const originalSize = file.size;

  // 1. Initial validation
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file');
  }

  if (onProgress) onProgress(10);
  await yieldToMainThread();

  // 2. Obtain natural dimensions
  let originalDims = { width: 0, height: 0 };
  try {
    originalDims = await getImageDimensions(file);
  } catch (err) {
    console.warn('[NearNotice ImageOptimizer] Could not get dimensions, using raw file:', err);
    if (onProgress) onProgress(100);
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      width: 0,
      height: 0,
      wasCompressed: false,
      mimeType: file.type,
    };
  }

  const { width: origWidth, height: origHeight } = originalDims;

  // 3. Skip compression if already within target dimension and <= 350 KB
  if (
    originalSize <= SKIP_COMPRESSION_SIZE_BYTES &&
    origWidth <= MAX_DIMENSION &&
    origHeight <= MAX_DIMENSION
  ) {
    if (onProgress) onProgress(100);
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      width: origWidth,
      height: origHeight,
      wasCompressed: false,
      mimeType: file.type,
    };
  }

  if (onProgress) onProgress(30);
  await yieldToMainThread();

  // 4. Calculate target dimensions (never stretch or crop)
  const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
    origWidth,
    origHeight,
    MAX_DIMENSION
  );

  // 5. Draw to offscreen canvas
  if (typeof document === 'undefined') {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      width: targetWidth,
      height: targetHeight,
      wasCompressed: false,
      mimeType: file.type,
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      width: targetWidth,
      height: targetHeight,
      wasCompressed: false,
      mimeType: file.type,
    };
  }

  // Draw image onto canvas
  const imgUrl = URL.createObjectURL(file);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image for rendering'));
    img.src = imgUrl;
  });
  URL.revokeObjectURL(imgUrl);

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  if (onProgress) onProgress(60);
  await yieldToMainThread();

  // 6. Determine format and quality tuning targeting 300-500 KB
  const supportsWebP = isWebPSupported();
  const outputFormat = supportsWebP ? 'image/webp' : 'image/jpeg';
  const fileExt = supportsWebP ? 'webp' : 'jpg';

  let chosenBlob: Blob | null = null;
  const qualitySteps = [0.82, 0.72, 0.62]; // tuned for ~300-500 KB on 1600px

  for (let i = 0; i < qualitySteps.length; i++) {
    const q = qualitySteps[i];
    const blob = await canvasToBlob(canvas, outputFormat, q);
    if (!blob) break;

    chosenBlob = blob;

    // If within or under target max size (500 KB), or on the final quality step, stop
    if (blob.size <= TARGET_MAX_SIZE_BYTES || i === qualitySteps.length - 1) {
      break;
    }
    await yieldToMainThread();
  }

  // Release canvas memory on mobile
  canvas.width = 0;
  canvas.height = 0;

  if (onProgress) onProgress(90);
  await yieldToMainThread();

  // If compression resulted in larger file than original and dimensions didn't scale down, keep original
  if (chosenBlob && chosenBlob.size < originalSize) {
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const optimizedFile = new File([chosenBlob], `${baseName}.${fileExt}`, {
      type: outputFormat,
      lastModified: Date.now(),
    });

    if (onProgress) onProgress(100);
    return {
      file: optimizedFile,
      originalSize,
      optimizedSize: chosenBlob.size,
      width: targetWidth,
      height: targetHeight,
      wasCompressed: true,
      mimeType: outputFormat,
    };
  }

  // If scaled down in dimensions, use the resized blob even if original was smaller
  if (chosenBlob && (targetWidth < origWidth || targetHeight < origHeight)) {
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const optimizedFile = new File([chosenBlob], `${baseName}.${fileExt}`, {
      type: outputFormat,
      lastModified: Date.now(),
    });

    if (onProgress) onProgress(100);
    return {
      file: optimizedFile,
      originalSize,
      optimizedSize: chosenBlob.size,
      width: targetWidth,
      height: targetHeight,
      wasCompressed: true,
      mimeType: outputFormat,
    };
  }

  // Otherwise keep original file
  if (onProgress) onProgress(100);
  return {
    file,
    originalSize,
    optimizedSize: originalSize,
    width: origWidth,
    height: origHeight,
    wasCompressed: false,
    mimeType: file.type,
  };
}
