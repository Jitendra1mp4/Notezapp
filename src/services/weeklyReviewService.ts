// src/services/weeklyReviewService.ts
import {
  addDays,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { MOOD_OPTIONS } from '../components/journal/MoodSelector';
import { Journal } from '../types';
import { base64ToDataUri } from './imageService';

export type WeeklyReviewMood = {
  value: string;
  emoji: string;
  label: string;
};

export type WeeklyReviewDay = {
  dateKey: string; // yyyy-MM-dd
  label: string; // Mon, Tue...
  entryCount: number;
  mood?: WeeklyReviewMood;
};

export type WeeklyReviewSummary = {
  weekStart: string; // yyyy-MM-dd
  weekEnd: string; // yyyy-MM-dd
  weekLabel: string; // "Dec 29 – Jan 04"
  entryCount: number;
  daysWritten: number; // distinct days with >= 1 entry
  days: WeeklyReviewDay[];
  topMood?: WeeklyReviewMood & { count: number };
  imageUris: string[]; // up to 4
  highlight?: {
    journalId: string;
    title?: string;
    snippet: string;
  };
};

const WEEK_STARTS_ON: 1 = 1; // Monday

export const getPreviousWeekRange = (now: Date = new Date()) => {
  const thisWeekStart = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON });
  const start = subWeeks(thisWeekStart, 1);
  const end = endOfWeek(start, { weekStartsOn: WEEK_STARTS_ON });
  return { start, end };
};

const toDateKey = (d: Date) => format(d, 'yyyy-MM-dd');

const safeSnippet = (text: string, max = 180) => {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length > max ? `${t.slice(0, max)}…` : t;
};

const moodFromValue = (value?: string): WeeklyReviewMood | undefined => {
  if (!value) return undefined;
  const found = MOOD_OPTIONS.find((m) => m.value === value);
  if (!found) return undefined;
  return { value: found.value, emoji: found.emoji, label: found.label };
};

export const buildWeeklyReviewSummary = (
  journals: Journal[],
  now: Date = new Date(),
): WeeklyReviewSummary => {
  const { start, end } = getPreviousWeekRange(now);

  const entries = (journals ?? []).filter((j) => {
    const d = startOfDay(new Date(j.date));
    return isWithinInterval(d, { start: startOfDay(start), end: startOfDay(end) });
  });

  // Map entries by dayKey
  const byDay = new Map<string, Journal[]>();
  for (const j of entries) {
    const k = toDateKey(new Date(j.date));
    const arr = byDay.get(k) ?? [];
    arr.push(j);
    byDay.set(k, arr);
  }

  // Build 7-day timeline
  const days: WeeklyReviewDay[] = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(start, i);
    const dateKey = toDateKey(date);
    const dayEntries = byDay.get(dateKey) ?? [];

    // Dominant mood for the day (simple count)
    const moodCounts = new Map<string, number>();
    for (const e of dayEntries) {
      if (!e.mood) continue;
      moodCounts.set(e.mood, (moodCounts.get(e.mood) ?? 0) + 1);
    }
    let topMoodValue: string | undefined;
    let topCount = 0;
    for (const [m, c] of moodCounts.entries()) {
      if (c > topCount) {
        topCount = c;
        topMoodValue = m;
      }
    }

    return {
      dateKey,
      label: format(date, 'EEE'),
      entryCount: dayEntries.length,
      mood: moodFromValue(topMoodValue),
    };
  });

  // Week top mood
  const weekMoodCounts = new Map<string, number>();
  for (const e of entries) {
    if (!e.mood) continue;
    weekMoodCounts.set(e.mood, (weekMoodCounts.get(e.mood) ?? 0) + 1);
  }
  let weekTopMoodValue: string | undefined;
  let weekTopMoodCount = 0;
  for (const [m, c] of weekMoodCounts.entries()) {
    if (c > weekTopMoodCount) {
      weekTopMoodCount = c;
      weekTopMoodValue = m;
    }
  }
  const topMoodBase = moodFromValue(weekTopMoodValue);

  // Images (up to 4)
  const imageUris: string[] = [];
  for (const e of entries) {
    for (const b64 of e.images ?? []) {
      if (imageUris.length >= 4) break;
      imageUris.push(base64ToDataUri(b64));
    }
    if (imageUris.length >= 4) break;
  }

  // Highlight: pick the entry with the longest text (best chance of meaningful snippet)
  let highlightJournal: Journal | undefined;
  let bestLen = 0;
  for (const e of entries) {
    const len = (e.text ?? '').trim().length;
    if (len > bestLen) {
      bestLen = len;
      highlightJournal = e;
    }
  }

  const weekStartKey = toDateKey(start);
  const weekEndKey = toDateKey(end);

  return {
    weekStart: weekStartKey,
    weekEnd: weekEndKey,
    weekLabel: `${format(start, 'MMM dd')} – ${format(end, 'MMM dd')}`,
    entryCount: entries.length,
    daysWritten: byDay.size,
    days,
    topMood: topMoodBase ? { ...topMoodBase, count: weekTopMoodCount } : undefined,
    imageUris,
    highlight: highlightJournal
      ? {
          journalId: highlightJournal.id,
          title: (highlightJournal.title ?? '').trim() || undefined,
          snippet: safeSnippet(highlightJournal.text ?? ''),
        }
      : undefined,
  };
};
