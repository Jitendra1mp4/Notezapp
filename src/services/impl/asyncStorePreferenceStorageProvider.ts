// ============================================================================
// WEB IMPLEMENTATION (localStorage)
// ============================================================================

import APP_CONFIG from "@/src/config/appConfig";
import { AppSettings } from "@/src/types";
import PreferenceStorageProvider from "../preferenceStorageProvider";


class AsyncStorePreferenceStorageProvider  implements PreferenceStorageProvider{

 static obj: AsyncStorePreferenceStorageProvider | null = null;

  private constructor() {
  }

  // Singleton object
  static getObject(): AsyncStorePreferenceStorageProvider {
    if (AsyncStorePreferenceStorageProvider.obj == null) {
      AsyncStorePreferenceStorageProvider.obj = new AsyncStorePreferenceStorageProvider();
    }
    return AsyncStorePreferenceStorageProvider.obj;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.PREFERENCE_DB_KEY, JSON.stringify(settings));
      console.log("✅ [Web] Preferences saved to localStorage");
    } catch (error) {
      console.error("❌ [Web] Error saving preferences:", error);
      throw new Error("Failed to save preferences");
    }
  }

  async getSettings(): Promise<AppSettings | null> {
    try {
      const data = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.PREFERENCE_DB_KEY);
      if (!data) {
        console.log("ℹ️ [Web] No saved preferences found");
        return null;
      }
      const settings = JSON.parse(data) as AppSettings;
      console.log("✅ [Web] Preferences loaded from localStorage");
      return settings;
    } catch (error) {
      console.error("❌ [Web] Error loading preferences:", error);
      return null;
    }
  }

  async clearSettings(): Promise<void> {
    try {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.PREFERENCE_DB_KEY);
      console.log("✅ [Web] Preferences cleared");
    } catch (error) {
      console.error("❌ [Web] Error clearing preferences:", error);
      throw new Error("Failed to clear preferences");
    }
  }
};

export default AsyncStorePreferenceStorageProvider;