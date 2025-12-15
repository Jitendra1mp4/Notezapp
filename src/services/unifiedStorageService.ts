/**
 * Unified Storage Service
 * 
 * Automatically selects the appropriate backend:
 * - Web: AsyncStorage (from storageService)
 * - Native (iOS/Android): SQLite (from database-cryptoManager)
 * 
 * This abstraction ensures the app works seamlessly across all platforms
 */

import { Platform } from 'react-native';
import { AppSettings, Journal } from '../types';
import type { Vault } from '../types/crypto';
import * as AsyncStorageBackend from './asyncStoreStorageService';
import preferencesStorage from './preferencesStorage';
import * as SQLiteBackend from './sqliteDatabaseStorageService';

// Detect if we're on web or native
const IS_WEB = Platform.OS === 'web';

console.log(`[Storage] Detected platform: ${Platform.OS} (IS_WEB: ${IS_WEB})`);

/**
 * Storage provider interface
 */
export interface StorageProvider {
    // Vault operations
  saveVault: (vault: Vault | Record<string, any>) => Promise<void>;
  getVault: () => Promise<Vault | Record<string, any> | null>

  // Journal operations
  saveJournal: (journal: Journal, encryptionKey: string) => Promise<void>;
  getJournal: (id: string, encryptionKey: string) => Promise<Journal | null>;
  listJournals: (encryptionKey: string) => Promise<Journal[]>;
  deleteJournal: (id: string) => Promise<void>;
  getJournalCount: () => Promise<number>;

  // Metadata operations
  isFirstLaunch: () => Promise<boolean>;
  markAsLaunched: () => Promise<void>;
  saveRecoveryKeyHash: (hash: string) => Promise<void>;
  getRecoveryKeyHash: () => Promise<string | null>;
  clearRecoveryKeyDisplay: () => Promise<void>;

  // Data management
  clearAllData: () => Promise<void>;
  initializeStorage: () => Promise<void>;
}

/**
 * Web Storage Provider - Uses AsyncStorage + existing storageService
 */
const webProvider: StorageProvider = {
   saveVault: AsyncStorageBackend.saveVault,
  getVault: AsyncStorageBackend.getVault,
  saveJournal: AsyncStorageBackend.saveJournal,
  getJournal: AsyncStorageBackend.getJournal,
  listJournals: AsyncStorageBackend.listJournals,

    deleteJournal: async (id: string, key?: string) => {
    // Web version needs the key, but we'll use the state for now
    // In practice, the UI layer should pass the key
    console.warn('[Storage] deleteJournal on web: key not provided');
    return undefined;
  },

  isFirstLaunch: AsyncStorageBackend.isFirstLaunch,
  markAsLaunched: AsyncStorageBackend.markAsLaunched,
  saveRecoveryKeyHash: AsyncStorageBackend.saveRecoveryKeyHash,
  getRecoveryKeyHash: AsyncStorageBackend.getRecoveryKeyHash,
  clearRecoveryKeyDisplay: AsyncStorageBackend.clearRecoveryKeyDisplay,
  clearAllData: AsyncStorageBackend.clearAllData,
    getJournalCount: async () => {
    // For web, we'll need to count from actual storage
    // This is a limitation - we'd need to refactor to pass key
    return 0;
  },
  initializeStorage: async () => {
    console.log('✅ [Web] AsyncStorage ready');
  },
};

/**
 * Native Storage Provider - Uses SQLite
 */
const nativeProvider: StorageProvider = {
  saveVault: SQLiteBackend.saveVault,
  getVault: SQLiteBackend.getVault,
  saveJournal: SQLiteBackend.saveJournal,
  getJournal: SQLiteBackend.getJournal,
  listJournals: SQLiteBackend.listJournals,
  deleteJournal: SQLiteBackend.deleteJournal,
  isFirstLaunch: SQLiteBackend.isFirstLaunch,
  markAsLaunched: SQLiteBackend.markAsLaunched,
  saveRecoveryKeyHash: SQLiteBackend.saveRecoveryKeyHash,
  getRecoveryKeyHash: SQLiteBackend.getRecoveryKeyHash,
  clearRecoveryKeyDisplay: SQLiteBackend.clearRecoveryKeyDisplay,
  clearAllData: SQLiteBackend.clearAllData,
  getJournalCount: () => SQLiteBackend.getJournalCount(),
  initializeStorage: SQLiteBackend.initDatabase,
};

/**
 * Get the active storage provider based on platform
 */
const getProvider = (): StorageProvider => {
  if (IS_WEB) {
    console.log('[Storage] Using AsyncStorage backend for web');
    return webProvider;
  } else {
    console.log('[Storage] Using SQLite backend for native');
    return nativeProvider;
  }
};

const provider = getProvider();

export const saveVault = (vault: Vault | Record<string, any>) => provider.saveVault(vault);
export const getVault = () => provider.getVault();

export const saveJournal = (journal: Journal, encryptionKey: string) =>
  provider.saveJournal(journal, encryptionKey);

export const getJournal = (id: string, encryptionKey: string) =>
  provider.getJournal(id, encryptionKey);

export const listJournals = (encryptionKey: string) =>
  provider.listJournals(encryptionKey);

export const deleteJournal = (id: string) => provider.deleteJournal(id);

export const isFirstLaunch = () => provider.isFirstLaunch();
export const markAsLaunched = () => provider.markAsLaunched();
export const getJournalCount = () => provider.getJournalCount();
export const saveRecoveryKeyHash = (hash: string) =>
  provider.saveRecoveryKeyHash(hash);

export const getRecoveryKeyHash = () => provider.getRecoveryKeyHash();
export const clearRecoveryKeyDisplay = () => provider.clearRecoveryKeyDisplay();

export const initializeStorage = () => provider.initializeStorage();

// ============================================================================
// PREFERENCES STORAGE EXPORTS (Unencrypted Settings)
// ============================================================================

/**
 * Save user preferences/settings
 * Stored separately from encrypted journal data
 */
export const saveSettings = (settings: AppSettings): Promise<void> => {
  return preferencesStorage.saveSettings(settings);
};

/**
 * Load user preferences/settings
 */
export const getSettings = (): Promise<AppSettings | null> => {
  return preferencesStorage.getSettings();
};

/**
 * Clear preferences/settings
 */
export const clearSettings = (): Promise<void> => {
  return preferencesStorage.clearSettings();
};

// ============================================================================
// DATA MANAGEMENT
// ============================================================================


/**
 * Complete reset of ALL storage
 * This is the NUCLEAR OPTION - destroys everything and recreates fresh
 * 
 * Clears:
 * - Journal database (vault, journals, metadata)
 * - Preferences database (settings, UI state)
 */
export const ResetStorage = async (): Promise<void> => {
  try {
    console.log('🗑️ FULL RESET: Destroying all storage...');
    
    if (IS_WEB) {
      // Web: Use nuclear localStorage.clear()
      console.log('💥 [Web] Clearing localStorage and sessionStorage');
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ [Web] All storage destroyed');
    } else {
      // Native: Drop all SQLite databases
      console.log('💥 [Native] Destroying SQLite databases');
      
      // 1. Destroy main journal database
      await SQLiteBackend.DestroyAndReInitializeDatabase();
      console.log('✅ [Native] Journal database destroyed and recreated');
      
      // 2. Destroy preferences database
      await preferencesStorage.clearSettings(); // This will handle preferences.db
      console.log('✅ [Native] Preferences database cleared');
    }
    
    console.log('✅ FULL RESET COMPLETE');
  } catch (error) {
    console.error('❌ Error during full reset:', error);
    throw error;
  }
};
export const clearAllData = ResetStorage; // Alias for compatibility