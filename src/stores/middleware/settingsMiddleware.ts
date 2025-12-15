// src/stores/middleware/settingsMiddleware.ts
import { saveSettings } from '@/src/services/unifiedStorageService';
import { Middleware, isAction } from '@reduxjs/toolkit';
import type { AppSettings } from '../../types';

// Create middleware without importing RootState
export const settingsMiddleware: Middleware = (storeAPI) => (next) => (action) => {
  const result = next(action);

  // Use isAction type guard from Redux Toolkit
  if (isAction(action) && action.type.startsWith('settings/')) {
    const state = storeAPI.getState() as { settings: AppSettings };
    
    saveSettings(state.settings).catch((error) => {
      console.error('❌ Failed to save settings:', error);
    });
  }

  return result;
};
