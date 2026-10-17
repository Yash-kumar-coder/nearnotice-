import { formatDistanceToNow } from 'date-fns';

export function formatRelativeTime(date) {
    if (!date) return '';
    
    try {
        // Check if it's a Firestore Timestamp
        const jsDate = date.toDate ? date.toDate() : new Date(date);
        return formatDistanceToNow(jsDate, { addSuffix: true });
    } catch (e) {
        return '';
    }
}
