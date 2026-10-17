import type { PublicNotice } from '../types/database.types';


const COMMON_SURNAME_SUFFIXES = [
  'kumar', 'sharma', 'singh', 'verma', 'gupta', 'patel', 'reddy', 'yadav',
  'mishra', 'joshi', 'pandey', 'mehta', 'nair', 'iyer', 'rao', 'das',
  'sen', 'bose', 'khan', 'ali', 'ahmed', 'shah', 'jain', 'agarwal',
  'kapoor', 'malhotra', 'bhatia', 'chopra', 'saxena', 'tiwari', 'choudhary',
  'rajput', 'rawat', 'khatri', 'arora', 'grover', 'seth', 'kaur', 'devi',
  'prasad', 'lal', 'nath', 'chandra', 'kant', 'pal', 'rani', 'dutta',
  'roy', 'ghosh', 'banerjee', 'chatterjee', 'mukherjee', 'saha', 'biswas'
];

const GENERIC_USERNAMES = new Set([
  'user', 'admin', 'test', 'guest', 'resident', 'neighbor', 'anonymous', 'unknown', 'root', 'info', 'owner'
]);

/**
 * Transforms raw usernames, email handles, or concatenated names into human-readable names.
 * e.g., 'yashkumar62011' -> 'Yash Kumar'
 *       'rahul123' -> 'Rahul'
 *       'ananya.roy' -> 'Ananya Roy'
 *       'Sneha Verma' -> 'Sneha Verma'
 */
export function humanizeAuthorName(rawName?: string | null): string | null {
  if (!rawName) return null;
  let str = rawName.trim();
  if (!str) return null;

  // If already a clean human name with spaces and no '@', preserve formatting & punctuation (e.g. "Dr. A. P. J. Abdul Kalam")
  if (!str.includes('@') && str.includes(' ')) {
    if (/^[a-zA-Z\s.'-]+$/.test(str) && str.length >= 2) {
      return str;
    }
  }

  // If it's a full email address, strip the domain part
  if (str.includes('@')) {
    str = str.split('@')[0].trim();
  }

  // Replace common delimiters (. _ -) with space
  str = str.replace(/[._-]+/g, ' ');

  // Split into words or handle concatenated string
  const rawParts = str.split(/\s+/).filter(Boolean);
  const formattedWords: string[] = [];

  for (const part of rawParts) {
    // Strip trailing or leading digits (e.g. 'yashkumar62011' -> 'yashkumar', 'rahul123' -> 'rahul')
    const alphaOnly = part.replace(/[0-9]/g, '').trim().toLowerCase();
    if (!alphaOnly || alphaOnly.length < 2) continue;

    // Check if generic placeholder
    if (GENERIC_USERNAMES.has(alphaOnly)) continue;

    // Check if part ends with a known surname suffix (e.g. 'yashkumar' -> 'yash' + 'kumar')
    let splitMatch = false;
    for (const suffix of COMMON_SURNAME_SUFFIXES) {
      if (alphaOnly.endsWith(suffix) && alphaOnly.length > suffix.length + 1) {
        const first = alphaOnly.slice(0, alphaOnly.length - suffix.length);
        if (first.length >= 2) {
          formattedWords.push(
            first.charAt(0).toUpperCase() + first.slice(1).toLowerCase(),
            suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase()
          );
          splitMatch = true;
          break;
        }
      }
    }

    if (!splitMatch) {
      formattedWords.push(
        alphaOnly.charAt(0).toUpperCase() + alphaOnly.slice(1).toLowerCase()
      );
    }
  }

  if (formattedWords.length === 0) return null;

  const result = formattedWords.join(' ');
  return result.length >= 2 ? result : null;
}

/**
 * Sanitizes a display name to ensure raw email addresses containing '@' are rejected,
 * while email handles (e.g. 'yashkumar62011') are converted into real, human-readable names.
 * Returns null if name is empty, an email address with @, generic placeholder, or has no valid letters.
 */
export function sanitizeDisplayName(name?: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.includes('@')) {
    return null;
  }
  return humanizeAuthorName(trimmed);
}

/**
 * Resolves author name and details for a notice.
 * Never exposes an email address or email prefix as an author name.
 */
export interface AuthorInfo {
  name: string;
  postedBy: string;
  initial: string;
  isOwner: boolean;
}

/**
 * Resolves author name and details for a notice.
 * Formats clearly as "Posted by <Name>" without confusing verification badges.
 */
export function getNoticeAuthor(
  notice: PublicNotice,
  currentUserId?: string,
  currentUserName?: string
): AuthorInfo {
  const isOwner = Boolean(currentUserId && notice.owner_id === currentUserId);
  const cleanNoticeAuthor = sanitizeDisplayName(notice.author_name);
  const cleanCurrentUser = sanitizeDisplayName(currentUserName);

  if (cleanNoticeAuthor) {
    return {
      name: cleanNoticeAuthor,
      postedBy: isOwner ? `Posted by ${cleanNoticeAuthor} (You)` : `Posted by ${cleanNoticeAuthor}`,
      initial: cleanNoticeAuthor.charAt(0).toUpperCase(),
      isOwner,
    };
  }

  if (isOwner) {
    const realName = cleanCurrentUser || 'You';
    return {
      name: realName,
      postedBy: cleanCurrentUser ? `Posted by ${cleanCurrentUser} (You)` : 'Posted by You',
      initial: realName.charAt(0).toUpperCase(),
      isOwner: true,
    };
  }

  return {
    name: 'Neighbor',
    postedBy: 'Posted by Neighbor',
    initial: 'N',
    isOwner: false,
  };
}
