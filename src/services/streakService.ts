import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { MD3Colors } from "react-native-paper/lib/typescript/types";
import { Journal } from "../types";

/**
 * Calculate the current streak of consecutive days with journal entries
 */
export const calculateCurrentStreak = (journals: Journal[]): number => {
  if (journals.length === 0) return 0;

  // Sort journals by date (newest first)
  const sortedJournals = [...journals].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Get unique dates (in case multiple entries on same day)
  const uniqueDates = Array.from(
    new Set(
      sortedJournals.map((j) => {
        const dateStr = startOfDay(parseISO(j.date)).toISOString();
        console.log("Journal date:", j.date, "-> Start of day:", dateStr);
        return dateStr;
      }),
    ),
  ).map((dateStr) => parseISO(dateStr));

  console.log("Unique dates count:", uniqueDates.length);

  const today = startOfDay(new Date());
  const mostRecentEntry = startOfDay(parseISO(sortedJournals[0].date));

  // Check if the most recent entry is today or yesterday
  const daysDiff = differenceInDays(today, mostRecentEntry);
  console.log("Days difference from today:", daysDiff);

  if (daysDiff > 1) {
    // Streak is broken
    console.log("Streak broken - more than 1 day gap");
    return 0;
  }

  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = uniqueDates[i];
    const previousDate = uniqueDates[i - 1];
    const diff = differenceInDays(previousDate, currentDate);

    console.log(`Comparing day ${i}: diff = ${diff}`);

    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  console.log("Final current streak:", streak);
  return streak;
};

/**
 * Calculate the longest streak ever achieved
 */
export const calculateLongestStreak = (journals: Journal[]): number => {
  if (journals.length === 0) return 0;

  // Sort journals by date (oldest first for longest streak calculation)
  const sortedJournals = [...journals].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Get unique dates
  const uniqueDates = Array.from(
    new Set(
      sortedJournals.map((j) => startOfDay(parseISO(j.date)).toISOString()),
    ),
  ).map((dateStr) => parseISO(dateStr));

  if (uniqueDates.length === 0) return 0;
  if (uniqueDates.length === 1) return 1;

  let longestStreak = 1;
  let currentStreakCount = 1;

  // Iterate through dates and find longest consecutive sequence
  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = uniqueDates[i];
    const previousDate = uniqueDates[i - 1];
    const diff = differenceInDays(currentDate, previousDate);

    if (diff === 1) {
      // Consecutive day
      currentStreakCount++;
      longestStreak = Math.max(longestStreak, currentStreakCount);
    } else {
      // Streak broken, reset counter
      currentStreakCount = 1;
    }
  }

  console.log("Longest streak ever:", longestStreak);
  return longestStreak;
};

/**
 * Get dates with journal entries for calendar marking
 */
export const getMarkedDates = (
  journals: Journal[],
  colors: MD3Colors,
): { [key: string]: { marked: boolean; dotColor: string } } => {
  const marked: { [key: string]: { marked: boolean; dotColor: string } } = {};

  journals.forEach((journal) => {
    try {
      // Use local date to avoid timezone offset issues
      const date = new Date(journal.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      marked[dateKey] = {
        marked: true,
        dotColor: colors.inversePrimary,
      };
      console.log("Marked date:", dateKey, "from journal date:", journal.date);
    } catch (error) {
      console.error("Error parsing journal date:", journal.date, error);
    }
  });

  console.log("Total marked dates:", Object.keys(marked).length);
  return marked;
};
