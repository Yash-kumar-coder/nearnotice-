import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateTargetDimensions,
  validateImageFile,
  formatBytes,
  optimizeImage,
  MAX_DIMENSION,
  SKIP_COMPRESSION_SIZE_BYTES,
} from './imageOptimizer';

describe('Image Optimizer Utility', () => {
  describe('calculateTargetDimensions', () => {
    it('scales down large landscape images to max 1600px width while preserving aspect ratio', () => {
      const origWidth = 3200;
      const origHeight = 1600;
      const result = calculateTargetDimensions(origWidth, origHeight, MAX_DIMENSION);

      expect(result.width).toBe(1600);
      expect(result.height).toBe(800);
      expect(result.scaled).toBe(true);
      // Aspect ratio must be exactly equal
      expect(origWidth / origHeight).toBeCloseTo(result.width / result.height);
    });

    it('scales down large portrait images to max 1600px height while preserving aspect ratio', () => {
      const origWidth = 1200;
      const origHeight = 3600;
      const result = calculateTargetDimensions(origWidth, origHeight, MAX_DIMENSION);

      expect(result.width).toBe(533);
      expect(result.height).toBe(1600);
      expect(result.scaled).toBe(true);
      expect(origWidth / origHeight).toBeCloseTo(result.width / result.height, 2);
    });

    it('scales down large square images to 1600x1600', () => {
      const origWidth = 2400;
      const origHeight = 2400;
      const result = calculateTargetDimensions(origWidth, origHeight, MAX_DIMENSION);

      expect(result.width).toBe(1600);
      expect(result.height).toBe(1600);
      expect(result.scaled).toBe(true);
    });

    it('leaves already-small images unchanged in dimension', () => {
      const origWidth = 1024;
      const origHeight = 768;
      const result = calculateTargetDimensions(origWidth, origHeight, MAX_DIMENSION);

      expect(result.width).toBe(1024);
      expect(result.height).toBe(768);
      expect(result.scaled).toBe(false);
    });

    it('handles edge cases with non-positive dimensions gracefully', () => {
      const result = calculateTargetDimensions(0, 0, MAX_DIMENSION);
      expect(result.width).toBe(MAX_DIMENSION);
      expect(result.height).toBe(MAX_DIMENSION);
      expect(result.scaled).toBe(false);
    });
  });

  describe('validateImageFile', () => {
    it('accepts valid JPEG, PNG, and WebP images within size limits', () => {
      const jpegFile = new File(['fake-content'], 'photo.jpg', { type: 'image/jpeg' });
      const pngFile = new File(['fake-content'], 'screenshot.png', { type: 'image/png' });
      const webpFile = new File(['fake-content'], 'graphic.webp', { type: 'image/webp' });

      expect(validateImageFile(jpegFile).valid).toBe(true);
      expect(validateImageFile(pngFile).valid).toBe(true);
      expect(validateImageFile(webpFile).valid).toBe(true);
    });

    it('rejects unsupported file formats', () => {
      const pdfFile = new File(['fake-pdf'], 'document.pdf', { type: 'application/pdf' });
      const exeFile = new File(['fake-exe'], 'program.exe', { type: 'application/x-msdownload' });
      const textFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });

      expect(validateImageFile(pdfFile).valid).toBe(false);
      expect(validateImageFile(pdfFile).error).toMatch(/not a supported image format/i);
      expect(validateImageFile(exeFile).valid).toBe(false);
      expect(validateImageFile(textFile).valid).toBe(false);
    });

    it('rejects files exceeding the 25 MB limit', () => {
      const hugeBlob = new Blob([new Uint8Array(26 * 1024 * 1024)], { type: 'image/jpeg' });
      const hugeFile = new File([hugeBlob], 'huge.jpg', { type: 'image/jpeg' });

      const result = validateImageFile(hugeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceeds the maximum allowed size/i);
    });
  });

  describe('formatBytes', () => {
    it('formats byte numbers into human readable string', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(350 * 1024)).toBe('350.0 KB');
      expect(formatBytes(4.5 * 1024 * 1024)).toBe('4.5 MB');
    });
  });

  describe('optimizeImage', () => {
    it('skips compression for already-small images (<= 350 KB and dimensions <= 1600x1600)', async () => {
      // 100 KB image file
      const smallContent = new Uint8Array(100 * 1024);
      const smallFile = new File([smallContent], 'small.jpg', { type: 'image/jpeg' });

      const progressSpy = vi.fn();
      const result = await optimizeImage(smallFile, progressSpy);

      expect(result.wasCompressed).toBe(false);
      expect(result.file).toBe(smallFile);
      expect(result.optimizedSize).toBe(smallFile.size);
      expect(progressSpy).toHaveBeenCalledWith(100);
    });

    it('rejects invalid files', async () => {
      const invalidFile = new File(['fake'], 'virus.exe', { type: 'application/octet-stream' });
      await expect(optimizeImage(invalidFile)).rejects.toThrow(/not a supported image format/i);
    });
  });
});
