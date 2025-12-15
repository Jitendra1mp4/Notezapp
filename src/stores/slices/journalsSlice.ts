import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Journal } from '../../types';
import { calculateCurrentStreak, calculateLongestStreak } from '../../services/streakService';

interface JournalsState {
  journals: Journal[];
  isLoading: boolean;
  currentStreak: number;
  longestStreak: number;
}

const initialState: JournalsState = {
  journals: [],
  isLoading: false,
  currentStreak: 0,
  longestStreak: 0,
};

const journalsSlice = createSlice({
  name: 'journals',
  initialState,
  reducers: {
    setJournals: (state, action: PayloadAction<Journal[]>) => {
      state.journals = action.payload;
      // Auto-calculate streaks when journals are loaded
      state.currentStreak = calculateCurrentStreak(action.payload);
      state.longestStreak = calculateLongestStreak(action.payload);
    },
    addJournal: (state, action: PayloadAction<Journal>) => {
      state.journals.push(action.payload);
      // Recalculate streaks
      state.currentStreak = calculateCurrentStreak(state.journals);
      state.longestStreak = calculateLongestStreak(state.journals);
    },
    updateJournal: (state, action: PayloadAction<Journal>) => {
      const index = state.journals.findIndex(j => j.id === action.payload.id);
      if (index !== -1) {
        state.journals[index] = action.payload;
      }
      // Recalculate streaks
      state.currentStreak = calculateCurrentStreak(state.journals);
      state.longestStreak = calculateLongestStreak(state.journals);
    },
    deleteJournal: (state, action: PayloadAction<string>) => {
      state.journals = state.journals.filter(j => j.id !== action.payload);
      // Recalculate streaks
      state.currentStreak = calculateCurrentStreak(state.journals);
      state.longestStreak = calculateLongestStreak(state.journals);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setCurrentStreak: (state, action: PayloadAction<number>) => {
      state.currentStreak = action.payload;
    },
    setLongestStreak: (state, action: PayloadAction<number>) => {
      state.longestStreak = action.payload;
    },
  },
});

export const {
  setJournals,
  addJournal,
  updateJournal,
  deleteJournal,
  setLoading,
  setCurrentStreak,
  setLongestStreak,
} = journalsSlice.actions;

export default journalsSlice.reducer;
