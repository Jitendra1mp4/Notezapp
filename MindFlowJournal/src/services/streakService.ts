import { Journal } from '../types';
import { differenceInDays, startOfDay, parseISO } from 'date-fns';

/**
 * Calculate the current streak of consecutive days with journal entries
 */
export const calculateCurrentStreak = (journals: Journal[]): number => {
  if (journals.length === 0) return 0;

  // Sort journals by date (newest first)
  const sortedJournals = [...journals].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Get unique dates (in case multiple entries on same day)
  const uniqueDates = Array.from(
    new Set(
      sortedJournals.map(j => startOfDay(parseISO(j.date)).toISOString())
    )
  ).map(dateStr => parseISO(dateStr));

  const today = startOfDay(new Date());
  const mostRecentEntry = startOfDay(parseISO(sortedJournals[0].date));

  // Check if the most recent entry is today or yesterday
  const daysDiff = differenceInDays(today, mostRecentEntry);
  if (daysDiff > 1) {
    // Streak is broken
    return 0;
  }

  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = uniqueDates[i];
    const previousDate = uniqueDates[i - 1];
    const diff = differenceInDays(previousDate, currentDate);

    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Get the longest streak
 */
export const calculateLongestStreak = (journals: Journal[]): number => {
  if (journals.length === 0) return 0;

  // Sort journals by date
  const sortedJournals = [...journals].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Get unique dates
  const uniqueDates = Array.from(
    new Set(
      sortedJournals.map(j => startOfDay(parseISO(j.date)).toISOString())
    )
  ).map(dateStr => parseISO(dateStr));

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = uniqueDates[i];
    const previousDate = uniqueDates[i - 1];
    const diff = differenceInDays(currentDate, previousDate);

    if (diff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
};

/**
 * Get dates with journal entries for calendar marking
 */
export const getMarkedDates = (
  journals: Journal[]
): { [key: string]: { marked: boolean; dotColor: string } } => {
  const marked: { [key: string]: { marked: boolean; dotColor: string } } = {};

  journals.forEach(journal => {
    const dateKey = startOfDay(parseISO(journal.date))
      .toISOString()
      .split('T')[0];
    marked[dateKey] = {
      marked: true,
      dotColor: '#6200EE',
    };
  });

  return marked;
};
