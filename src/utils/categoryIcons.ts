import React from 'react';
import {
  GraduationCap,
  BriefcaseBusiness,
  Briefcase,
  House,
  Home as HomeIcon,
  ShoppingBag,
  Package,
  Megaphone,
  Users,
  CalendarDays,
  Calendar,
  Search,
  Wrench,
  HeartHandshake,
  PawPrint,
  Car,
  Utensils,
  HeartPulse,
  Heart,
  CalendarCheck,
  BookOpen,
  Trophy,
  PartyPopper,
  ShieldAlert,
  AlertTriangle,
  Recycle,
  Ellipsis,
  Tag,
  Layers,
  LayoutGrid,
  Coffee,
  Smartphone,
  Sparkles,
  Compass,
} from 'lucide-react';

export interface CategoryIconOption {
  id: string; // e.g. "graduation-cap"
  key: string; // e.g. "education"
  label: string; // e.g. "Education (graduation-cap)"
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

// 20 primary icon identifiers requested by user
export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { id: 'graduation-cap', key: 'education', label: 'education: "graduation-cap"', icon: GraduationCap },
  { id: 'briefcase-business', key: 'jobs', label: 'jobs: "briefcase-business"', icon: BriefcaseBusiness },
  { id: 'house', key: 'rentals', label: 'rentals: "house"', icon: House },
  { id: 'shopping-bag', key: 'buySell', label: 'buySell: "shopping-bag"', icon: ShoppingBag },
  { id: 'megaphone', key: 'community', label: 'community: "megaphone"', icon: Megaphone },
  { id: 'calendar-days', key: 'events', label: 'events: "calendar-days"', icon: CalendarDays },
  { id: 'search', key: 'lostFound', label: 'lostFound: "search"', icon: Search },
  { id: 'wrench', key: 'localServices', label: 'localServices: "wrench"', icon: Wrench },
  { id: 'heart-handshake', key: 'donations', label: 'donations: "heart-handshake"', icon: HeartHandshake },
  { id: 'paw-print', key: 'pets', label: 'pets: "paw-print"', icon: PawPrint },
  { id: 'car', key: 'transport', label: 'transport: "car"', icon: Car },
  { id: 'utensils', key: 'food', label: 'food: "utensils"', icon: Utensils },
  { id: 'heart-pulse', key: 'health', label: 'health: "heart-pulse"', icon: HeartPulse },
  { id: 'calendar-check', key: 'bookings', label: 'bookings: "calendar-check"', icon: CalendarCheck },
  { id: 'book-open', key: 'books', label: 'books: "book-open"', icon: BookOpen },
  { id: 'trophy', key: 'sports', label: 'sports: "trophy"', icon: Trophy },
  { id: 'party-popper', key: 'celebrations', label: 'celebrations: "party-popper"', icon: PartyPopper },
  { id: 'shield-alert', key: 'safety', label: 'safety: "shield-alert"', icon: ShieldAlert },
  { id: 'recycle', key: 'recycling', label: 'recycling: "recycle"', icon: Recycle },
  { id: 'ellipsis', key: 'other', label: 'other: "ellipsis"', icon: Ellipsis },
];

// Additional backwards-compatible icons
export const EXTRA_ICON_OPTIONS: CategoryIconOption[] = [
  { id: 'tag', key: 'tag', label: 'general: tag', icon: Tag },
  { id: 'layers', key: 'layers', label: 'layers: layers', icon: Layers },
  { id: 'coffee', key: 'coffee', label: 'cafe: coffee', icon: Coffee },
  { id: 'smartphone', key: 'smartphone', label: 'gadgets: smartphone', icon: Smartphone },
];

export const ALL_CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  ...CATEGORY_ICON_OPTIONS,
  ...EXTRA_ICON_OPTIONS,
];

// Normalized lookup map supporting kebab-case, camelCase keys, PascalCase, and lowercase
const ICON_LOOKUP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  // education / graduation-cap
  'graduation-cap': GraduationCap,
  'graduationcap': GraduationCap,
  'education': GraduationCap,
  'GraduationCap': GraduationCap,

  // jobs / briefcase-business
  'briefcase-business': BriefcaseBusiness,
  'briefcasebusiness': BriefcaseBusiness,
  'briefcase': BriefcaseBusiness,
  'jobs': BriefcaseBusiness,
  'BriefcaseBusiness': BriefcaseBusiness,
  'Briefcase': Briefcase,

  // rentals / house
  'house': House,
  'home': HomeIcon,
  'rentals': House,
  'House': House,
  'Home': HomeIcon,

  // buySell / shopping-bag
  'shopping-bag': ShoppingBag,
  'shoppingbag': ShoppingBag,
  'buysell': ShoppingBag,
  'buySell': ShoppingBag,
  'ShoppingBag': ShoppingBag,
  'package': Package,
  'Package': Package,

  // community / megaphone
  'megaphone': Megaphone,
  'community': Megaphone,
  'Megaphone': Megaphone,
  'users': Users,
  'Users': Users,

  // events / calendar-days
  'calendar-days': CalendarDays,
  'calendardays': CalendarDays,
  'calendar': Calendar,
  'events': CalendarDays,
  'CalendarDays': CalendarDays,
  'Calendar': Calendar,

  // lostFound / search
  'search': Search,
  'lostfound': Search,
  'lostFound': Search,
  'Search': Search,

  // localServices / wrench
  'wrench': Wrench,
  'localservices': Wrench,
  'localServices': Wrench,
  'services': Wrench,
  'Wrench': Wrench,

  // donations / heart-handshake
  'heart-handshake': HeartHandshake,
  'hearthandshake': HeartHandshake,
  'donations': HeartHandshake,
  'HeartHandshake': HeartHandshake,

  // pets / paw-print
  'paw-print': PawPrint,
  'pawprint': PawPrint,
  'pets': PawPrint,
  'PawPrint': PawPrint,

  // transport / car
  'car': Car,
  'transport': Car,
  'Car': Car,

  // food / utensils
  'utensils': Utensils,
  'food': Utensils,
  'Utensils': Utensils,
  'coffee': Coffee,
  'Coffee': Coffee,

  // health / heart-pulse
  'heart-pulse': HeartPulse,
  'heartpulse': HeartPulse,
  'health': HeartPulse,
  'HeartPulse': HeartPulse,
  'heart': Heart,
  'Heart': Heart,

  // bookings / calendar-check
  'calendar-check': CalendarCheck,
  'calendarcheck': CalendarCheck,
  'bookings': CalendarCheck,
  'CalendarCheck': CalendarCheck,

  // books / book-open
  'book-open': BookOpen,
  'bookopen': BookOpen,
  'books': BookOpen,
  'BookOpen': BookOpen,

  // sports / trophy
  'trophy': Trophy,
  'sports': Trophy,
  'Trophy': Trophy,

  // celebrations / party-popper
  'party-popper': PartyPopper,
  'partypopper': PartyPopper,
  'celebrations': PartyPopper,
  'PartyPopper': PartyPopper,

  // safety / shield-alert
  'shield-alert': ShieldAlert,
  'shieldalert': ShieldAlert,
  'safety': ShieldAlert,
  'ShieldAlert': ShieldAlert,
  'alert-triangle': AlertTriangle,
  'AlertTriangle': AlertTriangle,

  // recycling / recycle
  'recycle': Recycle,
  'recycling': Recycle,
  'Recycle': Recycle,

  // other / ellipsis
  'ellipsis': Ellipsis,
  'other': Ellipsis,
  'Ellipsis': Ellipsis,

  // Additional
  'tag': Tag,
  'Tag': Tag,
  'layers': Layers,
  'Layers': Layers,
  'all': LayoutGrid,
  'All': LayoutGrid,
  'LayoutGrid': LayoutGrid,
  'smartphone': Smartphone,
  'Smartphone': Smartphone,
  'sparkles': Sparkles,
  'Sparkles': Sparkles,
  'compass': Compass,
  'Compass': Compass,
};

/**
 * Resolve Lucide React icon component from icon identifier or category name
 */
export function getCategoryIcon(
  iconIdentifier?: string,
  categoryName?: string
): React.ComponentType<{ size?: number; className?: string }> {
  // 1. Direct match on iconIdentifier (raw string or trimmed)
  if (iconIdentifier) {
    const raw = iconIdentifier.trim();
    if (ICON_LOOKUP[raw]) return ICON_LOOKUP[raw];

    const clean = raw.toLowerCase().replace(/[\s_-]+/g, '-');
    if (ICON_LOOKUP[clean]) return ICON_LOOKUP[clean];

    const stripped = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ICON_LOOKUP[stripped]) return ICON_LOOKUP[stripped];
  }

  // 2. Keyword heuristic fallback based on category name
  if (categoryName) {
    const lower = categoryName.toLowerCase();
    if (lower.includes('study') || lower.includes('edu') || lower.includes('course') || lower.includes('school')) return GraduationCap;
    if (lower.includes('job') || lower.includes('gig') || lower.includes('work') || lower.includes('career') || lower.includes('hiring')) return BriefcaseBusiness;
    if (lower.includes('rent') || lower.includes('home') || lower.includes('house') || lower.includes('flat') || lower.includes('room') || lower.includes('pg') || lower.includes('hostel')) return House;
    if (lower.includes('item') || lower.includes('sale') || lower.includes('buy') || lower.includes('shop') || lower.includes('product') || lower.includes('sell')) return ShoppingBag;
    if (lower.includes('community') || lower.includes('social') || lower.includes('announce') || lower.includes('megaphone') || lower.includes('notice')) return Megaphone;
    if (lower.includes('event') || lower.includes('fest') || lower.includes('party') || lower.includes('celebrat') || lower.includes('birthday')) return PartyPopper;
    if (lower.includes('lost') || lower.includes('found') || lower.includes('search') || lower.includes('missing')) return Search;
    if (lower.includes('service') || lower.includes('repair') || lower.includes('plumb') || lower.includes('mechanic') || lower.includes('electric') || lower.includes('fix')) return Wrench;
    if (lower.includes('donat') || lower.includes('charity') || lower.includes('aid') || lower.includes('volunteer')) return HeartHandshake;
    if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat') || lower.includes('animal') || lower.includes('puppy')) return PawPrint;
    if (lower.includes('car') || lower.includes('vehicle') || lower.includes('auto') || lower.includes('bike') || lower.includes('transport') || lower.includes('ride') || lower.includes('taxi')) return Car;
    if (lower.includes('food') || lower.includes('cafe') || lower.includes('dine') || lower.includes('restaurant') || lower.includes('kitchen') || lower.includes('tiffin') || lower.includes('meal')) return Utensils;
    if (lower.includes('health') || lower.includes('medical') || lower.includes('doctor') || lower.includes('hospital') || lower.includes('clinic') || lower.includes('pharma') || lower.includes('fitness')) return HeartPulse;
    if (lower.includes('book') && (lower.includes('appoint') || lower.includes('slot') || lower.includes('ticket') || lower.includes('seat'))) return CalendarCheck;
    if (lower.includes('book') || lower.includes('read') || lower.includes('library') || lower.includes('novel')) return BookOpen;
    if (lower.includes('sport') || lower.includes('game') || lower.includes('tournament') || lower.includes('cricket') || lower.includes('football') || lower.includes('gym')) return Trophy;
    if (lower.includes('safe') || lower.includes('security') || lower.includes('alert') || lower.includes('emergency') || lower.includes('warn') || lower.includes('police')) return ShieldAlert;
    if (lower.includes('recyc') || lower.includes('waste') || lower.includes('scrap') || lower.includes('eco')) return Recycle;
    if (lower.includes('phone') || lower.includes('mobile') || lower.includes('gadget') || lower.includes('electro')) return Smartphone;
  }

  // 3. Fallback
  return Ellipsis;
}
