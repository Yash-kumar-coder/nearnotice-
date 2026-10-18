import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shareNotice } from './shareNotice';

describe('shareNotice utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses navigator.share when available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
      writable: true,
    });

    const result = await shareNotice({
      id: 'notice-123',
      title: 'Apartment for rent',
      areaLabel: 'Patna',
      price: 15000,
    });

    expect(shareMock).toHaveBeenCalledWith({
      title: 'Apartment for rent',
      text: 'Check out "Apartment for rent" on NearNotice in Patna (₹15,000)',
      url: expect.stringContaining('/notice/notice-123'),
    });
    expect(result).toEqual({ shared: true, copied: false });
  });

  it('falls back to clipboard when navigator.share is not supported', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const result = await shareNotice({
      id: 'notice-456',
      title: 'Used Bicycle',
    });

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/notice/notice-456'));
    expect(result).toEqual({ shared: false, copied: true });
  });

  it('handles user cancellation of native share sheet cleanly without error', async () => {
    const abortErr = new Error('AbortError');
    abortErr.name = 'AbortError';
    const shareMock = vi.fn().mockRejectedValue(abortErr);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
      writable: true,
    });

    const result = await shareNotice({
      id: 'notice-789',
      title: 'Study Table',
    });

    expect(result).toEqual({ shared: false, copied: false });
  });
});
