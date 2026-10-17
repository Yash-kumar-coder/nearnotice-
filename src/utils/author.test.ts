import { describe, it, expect } from 'vitest';
import { sanitizeDisplayName, getNoticeAuthor } from './author';
import type { PublicNotice } from '../types/database.types';

describe('sanitizeDisplayName', () => {
  it('returns null for null, undefined, and empty string', () => {
    expect(sanitizeDisplayName(null)).toBeNull();
    expect(sanitizeDisplayName(undefined)).toBeNull();
    expect(sanitizeDisplayName('')).toBeNull();
    expect(sanitizeDisplayName('   ')).toBeNull();
  });

  it('converts email usernames and handles like yashkumar62011 into real human names', () => {
    expect(sanitizeDisplayName('yashkumar62011')).toBe('Yash Kumar');
    expect(sanitizeDisplayName('rahul123')).toBe('Rahul');
    expect(sanitizeDisplayName('ananya.roy')).toBe('Ananya Roy');
    expect(sanitizeDisplayName('amitsingh99')).toBe('Amit Singh');
  });

  it('rejects raw email addresses containing @ and generic placeholders', () => {
    expect(sanitizeDisplayName('user@example.com')).toBeNull();
    expect(sanitizeDisplayName('yashkumar62011@gmail.com')).toBeNull();
    expect(sanitizeDisplayName('user12345')).toBeNull();
    expect(sanitizeDisplayName('test@sub.domain.co.in')).toBeNull();
    expect(sanitizeDisplayName('admin')).toBeNull();
  });

  it('preserves valid human names and trims whitespace', () => {
    expect(sanitizeDisplayName('  Rahul Sharma  ')).toBe('Rahul Sharma');
    expect(sanitizeDisplayName('Sneha Verma')).toBe('Sneha Verma');
    expect(sanitizeDisplayName('Dr. A. P. J. Abdul Kalam')).toBe('Dr. A. P. J. Abdul Kalam');
  });
});

describe('getNoticeAuthor', () => {
  const baseNotice: PublicNotice = {
    id: 'n-1',
    title: 'Carpool needed',
    body: null,
    category: 'Community',
    image_path: null,
    area_label: 'Indiranagar',
    latitude: null,
    longitude: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    owner_id: 'user-123',
  };

  it('displays real notice author name when available', () => {
    const author = getNoticeAuthor(
      { ...baseNotice, author_name: 'Priya Patel' },
      'user-other'
    );
    expect(author.name).toBe('Priya Patel');
    expect(author.postedBy).toBe('Posted by Priya Patel');
    expect(author.initial).toBe('P');
    expect(author.isOwner).toBe(false);
  });

  it('converts email handle yashkumar62011 into human name Yash Kumar', () => {
    const author = getNoticeAuthor(
      { ...baseNotice, author_name: 'yashkumar62011' },
      'user-other'
    );
    expect(author.name).toBe('Yash Kumar');
    expect(author.postedBy).toBe('Posted by Yash Kumar');
    expect(author.initial).toBe('Y');
    expect(author.isOwner).toBe(false);
  });

  it('appends (You) when current user is the owner with a real author name', () => {
    const author = getNoticeAuthor(
      { ...baseNotice, author_name: 'Priya Patel' },
      'user-123'
    );
    expect(author.name).toBe('Priya Patel');
    expect(author.postedBy).toBe('Posted by Priya Patel (You)');
    expect(author.initial).toBe('P');
    expect(author.isOwner).toBe(true);
  });

  it('never outputs email address even if stored in author_name', () => {
    const author = getNoticeAuthor(
      { ...baseNotice, author_name: 'resident@example.com' },
      'user-other'
    );
    expect(author.name).toBe('Neighbor');
    expect(author.postedBy).toBe('Posted by Neighbor');
    expect(author.name).not.toContain('@');
    expect(author.name).not.toContain('example.com');
  });

  it('never outputs email address if passed in currentUserName for owner', () => {
    const author = getNoticeAuthor(
      { ...baseNotice, author_name: null },
      'user-123',
      'owner@domain.com'
    );
    expect(author.name).toBe('You');
    expect(author.postedBy).toBe('Posted by You');
    expect(author.name).not.toContain('@');
  });

  it('uses sanitized currentUserName for owner when notice author_name is null', () => {
    const author = getNoticeAuthor(
      { ...baseNotice, author_name: null },
      'user-123',
      'Amitabh Kant'
    );
    expect(author.name).toBe('Amitabh Kant');
    expect(author.postedBy).toBe('Posted by Amitabh Kant (You)');
    expect(author.initial).toBe('A');
    expect(author.isOwner).toBe(true);
  });

  it('falls back to Neighbor for non-owner when author_name is missing', () => {
    const author = getNoticeAuthor(
      { ...baseNotice, author_name: null },
      'user-other'
    );
    expect(author.name).toBe('Neighbor');
    expect(author.postedBy).toBe('Posted by Neighbor');
    expect(author.initial).toBe('N');
    expect(author.isOwner).toBe(false);
  });
});
