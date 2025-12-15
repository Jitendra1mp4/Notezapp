/**
 * Preferences Storage Service
 * Handles user preferences/settings separately from encrypted journal data
 *
 * Web: Uses localStorage (synchronous, fast)
 * Native: Uses preferences.db SQLite database
 *
 * NOTE: Preferences are stored UNENCRYPTED (theme, notifications, UI settings)
 */

import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import APP_CONFIG from "../config/appConfig";
import { AppSettings } from "../types";

// ============================================================================
// WEB IMPLEMENTATION (localStorage)
// ============================================================================

const WEB_STORAGE_KEY = `${APP_CONFIG.storageKeyPrefix}_preferences`;

const webPreferencesStorage = {
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(settings));
      console.log("✅ [Web] Preferences saved to localStorage");
    } catch (error) {
      console.error("❌ [Web] Error saving preferences:", error);
      throw new Error("Failed to save preferences");
    }
  },

  async getSettings(): Promise<AppSettings | null> {
    try {
      const data = localStorage.getItem(WEB_STORAGE_KEY);
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
  },

  async clearSettings(): Promise<void> {
    try {
      localStorage.removeItem(WEB_STORAGE_KEY);
      console.log("✅ [Web] Preferences cleared");
    } catch (error) {
      console.error("❌ [Web] Error clearing preferences:", error);
      throw new Error("Failed to clear preferences");
    }
  },
};

// ============================================================================
// NATIVE IMPLEMENTATION (SQLite - preferences.db)
// ============================================================================

const PREFERENCES_DB_NAME = "preferences.db";
let preferencesDbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Open/create preferences database
 */
async function openPreferencesDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (preferencesDbInstance) {
    return preferencesDbInstance;
  }

  try {
    const db = await SQLite.openDatabaseAsync(PREFERENCES_DB_NAME);

    // Create settings table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    preferencesDbInstance = db;
    console.log("✅ [Native] Preferences database initialized");
    return db;
  } catch (error) {
    console.error("❌ [Native] Failed to open preferences database:", error);
    throw new Error("Failed to initialize preferences storage");
  }
}

const nativePreferencesStorage = {
  async clearSettings(): Promise<void> {
    try {
      const db = await openPreferencesDatabase();

      // NUCLEAR OPTION: Drop the entire table
      await db.execAsync("DROP TABLE IF EXISTS settings;");
      console.log("💥 [Native] Settings table dropped");

      // Recreate fresh table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          data TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      console.log("✅ [Native] Settings table recreated");

      // Reset cached instance to force reconnect
      preferencesDbInstance = null;
    } catch (error) {
      console.error("❌ [Native] Error clearing preferences:", error);
      throw new Error("Failed to clear preferences");
    }
  },

  /**
   * Complete database destruction (for testing/reset)
   * More aggressive than clearSettings - deletes the entire DB file
   */
  async destroyAndReInitPrefDatabase(): Promise<void> {
    try {
      // Close connection
      if (preferencesDbInstance) {
        await preferencesDbInstance.closeAsync();
        preferencesDbInstance = null;
      }

      // Delete the database file
      await SQLite.deleteDatabaseAsync(PREFERENCES_DB_NAME);
      console.log("💥 [Native] preferences.db DELETED");

      // Recreate fresh
      await openPreferencesDatabase();
      console.log("✅ [Native] preferences.db recreated fresh");
    } catch (error) {
      console.error(
        "❌ [Native] Error destroying preferences database:",
        error,
      );
      throw new Error("Failed to destroy preferences database");
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const db = await openPreferencesDatabase();

      const settingsData = JSON.stringify(settings);
      const now = new Date().toISOString();

      // Escape single quotes for SQL
      const escapedData = settingsData.replace(/'/g, "''");

      // Upsert: replace if exists, insert if not
      await db.execAsync(`
        INSERT OR REPLACE INTO settings (id, data, updated_at)
        VALUES (1, '${escapedData}', '${now}');
      `);

      console.log("✅ [Native] Preferences saved to preferences.db");
    } catch (error) {
      console.error("❌ [Native] Error saving preferences:", error);
      throw new Error("Failed to save preferences");
    }
  },

  async getSettings(): Promise<AppSettings | null> {
    try {
      const db = await openPreferencesDatabase();

      const result = await db.getAllAsync<{ data: string }>(
        "SELECT data FROM settings WHERE id = 1 LIMIT 1",
      );

      if (result.length === 0) {
        console.log("ℹ️ [Native] No saved preferences found");
        return null;
      }

      const settings = JSON.parse(result[0].data) as AppSettings;
      console.log("✅ [Native] Preferences loaded from preferences.db");
      return settings;
    } catch (error) {
      console.error("❌ [Native] Error loading preferences:", error);
      return null;
    }
  },
};

// ============================================================================
// PLATFORM DETECTION & EXPORT
// ============================================================================

const isWeb = Platform.OS === "web";

export const preferencesStorage = {
  saveSettings: (settings: AppSettings) =>
    isWeb
      ? webPreferencesStorage.saveSettings(settings)
      : nativePreferencesStorage.saveSettings(settings),

  getSettings: () =>
    isWeb
      ? webPreferencesStorage.getSettings()
      : nativePreferencesStorage.getSettings(),

  clearSettings: () =>
    isWeb
      ? webPreferencesStorage.clearSettings()
      : nativePreferencesStorage.clearSettings(),
};

export default preferencesStorage;
