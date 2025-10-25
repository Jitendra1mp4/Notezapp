import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Journal } from '../../types';

interface JournalsState {
  journals: Journal[];
  isLoading: boolean;
  currentStreak: number;
}

const initialState: JournalsState = {
  journals: [],
  isLoading: false,
  currentStreak: 0,
};

const journalsSlice = createSlice({
  name: 'journals',
  initialState,
  reducers: {
    setJournals: (state, action: PayloadAction<Journal[]>) => {
      state.journals = action.payload;
    },
    addJournal: (state, action: PayloadAction<Journal>) => {
      state.journals.push(action.payload);
    },
    updateJournal: (state, action: PayloadAction<Journal>) => {
      const index = state.journals.findIndex(j => j.id === action.payload.id);
      if (index !== -1) {
        state.journals[index] = action.payload;
      }
    },
    deleteJournal: (state, action: PayloadAction<string>) => {
      state.journals = state.journals.filter(j => j.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setCurrentStreak: (state, action: PayloadAction<number>) => {
      state.currentStreak = action.payload;
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
} = journalsSlice.actions;

export default journalsSlice.reducer;
