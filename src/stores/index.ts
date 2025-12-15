// src/stores/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { settingsMiddleware } from './middleware/settingsMiddleware';
import authReducer from './slices/authSlice';
import journalsReducer from './slices/journalsSlice';
import settingsReducer from './slices/settingsSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    journals: journalsReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(settingsMiddleware),
});

export { store };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
