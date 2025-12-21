// src/stores/slices/settingsSlice.ts
import APP_CONFIG from '@/src/config/appConfig';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings } from '../../types';


export interface SettingsState {
  theme: 'light' | 'dark' | 'auto';
  notificationsEnabled: boolean;
  notificationTime: string;
  autoLockTimeout: number;
  instantLockOnBackground: boolean;
  isExportInProgress: boolean;
  isImagePickingInProgress:boolean;
}


// src/stores/slices/settingsSlice.ts
const initialState: SettingsState = {
  theme: 'auto',
  notificationsEnabled: true,
  notificationTime: '20:00',
  autoLockTimeout: APP_CONFIG.LOCK_TIMEOUT_OPTIONS[0].value, // 1 minutes
  instantLockOnBackground: true,
  isExportInProgress: false,
  isImagePickingInProgress: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<AppSettings['theme']>) {
      state.theme = action.payload;
    },
    setNotificationsEnabled(state, action: PayloadAction<boolean>) {
      state.notificationsEnabled = action.payload;
    },
    setNotificationTime(state, action: PayloadAction<string>) {
      state.notificationTime = action.payload;
    },
    // New Reducers
    setAutoLockTimeout(state, action: PayloadAction<number>) {
      state.autoLockTimeout = action.payload;
    },
    setInstantLockOnBackground(state, action: PayloadAction<boolean>) {
      state.instantLockOnBackground = action.payload;
    },
    updateSettings(state, action: PayloadAction<Partial<AppSettings>>) {
      return { ...state, ...action.payload };
    },

     setIsExportInProgress(state, action: PayloadAction<boolean>) {
      state.isExportInProgress = action.payload;
    },

     setIsImagePickingInProgress(state, action: PayloadAction<boolean>) {
      state.isImagePickingInProgress = action.payload;
    },

     resetSettings: () => initialState,
    
  },
});

export const {
  setTheme,
  setNotificationsEnabled,
  setNotificationTime,
  setAutoLockTimeout,
  setInstantLockOnBackground,
  updateSettings,
  setIsExportInProgress, // ✅ NEW
  setIsImagePickingInProgress, // ✅ NEW
  resetSettings
} = settingsSlice.actions;

export default settingsSlice.reducer;
