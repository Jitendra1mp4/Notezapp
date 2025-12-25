import { Platform } from "react-native";
import { AppSettings } from "../types";
import AsyncStorePreferenceStorageProvider from "./impl/asyncStorePreferenceStorageProvider";
import SQLiteStorePreferencesStorage from "./impl/sqlitePreferenceStorageService";

export default interface PreferenceStorageProvider {
  // initializeStorage: () => Promise<void>;
  saveSettings : (settings: AppSettings) => Promise<void> 
  getSettings : () => Promise<AppSettings | null>
  clearSettings : () => Promise<void> 
}

// Detect if we're on web or native
const IS_WEB = Platform.OS === 'web';

export const getPreferenceStorageProvider  = ():PreferenceStorageProvider => {
  if (IS_WEB) {
    console.log('[Storage] Using AsyncStorage backend for web');
    return AsyncStorePreferenceStorageProvider.getObject();
  } else {
    console.log('[Storage] Using SQLite backend for native');
    return SQLiteStorePreferencesStorage.getObject();
  }
} 
