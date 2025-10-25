import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import journalsReducer from './slices/journalsSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    journals: journalsReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
