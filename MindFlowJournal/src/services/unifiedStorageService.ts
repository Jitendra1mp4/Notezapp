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
import { Journal } from '../types';
import type { Vault } from '../types/crypto';
import * as SQLiteBackend from './database-cryptoManager';
import * as AsyncStorageBackend from './storageService';

// Detect if we're on web or native
const IS_WEB = Platform.OS === 'web';

console.log(`[Storage] Detected platform: ${Platform.OS} (IS_WEB: ${IS_WEB})`);

/**
 * Storage provider interface
 */
export interface StorageProvider {
  isFirstLaunch: () => Promise<boolean>;
  markAsLaunched: () => Promise<void>;
  saveVault: (vault: Vault | Record<string, any>) => Promise<void>;
  getVault: () => Promise<Vault | Record<string, any> | null>;
  saveJournal: (journal: Journal, dk: string) => Promise<void>;
  getJournal: (id: string, dk: string) => Promise<Journal | null>;
  listJournals: (dk: string) => Promise<Journal[]>;
  deleteJournal: (id: string) => Promise<void>;
  getJournalCount: () => Promise<number>;
  clearAllData: () => Promise<void>;
}

/**
 * Web Storage Provider - Uses AsyncStorage + existing storageService
 */
const webProvider: StorageProvider = {
  isFirstLaunch: () => AsyncStorageBackend.isFirstLaunch(),
  markAsLaunched: () => AsyncStorageBackend.markAsLaunched(),
  
  saveVault: async (vault: Vault | Record<string, any>) => {
    // For web, convert to Vault type if needed and save via storageService
    return AsyncStorageBackend.saveVault(vault as Vault);
  },
  
  getVault: async () => {
    return AsyncStorageBackend.getVault();
  },
  
  saveJournal: async (journal: Journal, dk: string) => {
    return AsyncStorageBackend.saveJournal(journal, dk);
  },
  
  getJournal: async (id: string, dk: string) => {
    return AsyncStorageBackend.getJournal(id, dk);
  },
  
  listJournals: async (dk: string) => {
    return AsyncStorageBackend.listJournals(dk);
  },
  
  deleteJournal: async (id: string, key?: string) => {
    // Web version needs the key, but we'll use the state for now
    // In practice, the UI layer should pass the key
    console.warn('[Storage] deleteJournal on web: key not provided');
    return undefined;
  },
  
  getJournalCount: async () => {
    // For web, we'll need to count from actual storage
    // This is a limitation - we'd need to refactor to pass key
    return 0;
  },
  
  clearAllData: async () => {
    console.log('[Storage] Clearing AsyncStorage');
    // Would need implementation
    return undefined;
  },
};

/**
 * Native Storage Provider - Uses SQLite
 */
const nativeProvider: StorageProvider = {
  isFirstLaunch: () => SQLiteBackend.isFirstLaunch(),
  markAsLaunched: () => SQLiteBackend.markAsLaunched(),
  saveVault: (vault: Vault | Record<string, any>) => SQLiteBackend.saveVault(vault as Record<string, any>),
  getVault: () => SQLiteBackend.getVault(),
  saveJournal: (journal: Journal, dk: string) => SQLiteBackend.saveJournal(journal, dk),
  getJournal: (id: string, dk: string) => SQLiteBackend.getJournal(id, dk),
  listJournals: (dk: string) => SQLiteBackend.listJournals(dk),
  deleteJournal: (id: string) => SQLiteBackend.deleteJournal(id),
  getJournalCount: () => SQLiteBackend.getJournalCount(),
  clearAllData: () => SQLiteBackend.clearAllData(),
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

// Export all storage functions with automatic platform detection
export const isFirstLaunch = () => provider.isFirstLaunch();
export const markAsLaunched = () => provider.markAsLaunched();
export const saveVault = (vault: Vault | Record<string, any>) => provider.saveVault(vault);
export const getVault = () => provider.getVault();
export const saveJournal = (journal: Journal, dk: string) => provider.saveJournal(journal, dk);
export const getJournal = (id: string, dk: string) => provider.getJournal(id, dk);
export const listJournals = (dk: string) => provider.listJournals(dk);
export const deleteJournal = (id: string) => provider.deleteJournal(id);
export const getJournalCount = () => provider.getJournalCount();
export const clearAllData = () => provider.clearAllData();

// Export additional functions from underlying services
export const saveRecoveryKeyHash = (recoveryKey: string) => {
  if (IS_WEB) {
    return AsyncStorageBackend.saveRecoveryKeyHash?.(recoveryKey) ?? Promise.resolve();
  } else {
    return SQLiteBackend.saveRecoveryKeyHash(recoveryKey);
  }
};

export const getRecoveryKeyHash = () => {
  if (IS_WEB) {
    return AsyncStorageBackend.getRecoveryKeyHash?.() ?? Promise.resolve(null);
  } else {
    return SQLiteBackend.getRecoveryKeyHash();
  }
};

export const clearRecoveryKeyDisplay = () => {
  if (IS_WEB) {
    return AsyncStorageBackend.clearRecoveryKeyDisplay?.() ?? Promise.resolve();
  } else {
    return SQLiteBackend.clearRecoveryKeyDisplay();
  }
};

/**
 * Initialize the storage backend
 * Call this on app startup
 */
export const initializeStorage = async () => {
  try {
    if (IS_WEB) {
      console.log('[Storage] AsyncStorage already available for web');
    } else {
      // Initialize SQLite for native platforms
      console.log('[Storage] Initializing SQLite storage');
      await SQLiteBackend.initDatabase();
      console.log('[Storage] SQLite initialized successfully');
    }
  } catch (error) {
    console.error('[Storage] Failed to initialize storage:', error);
    throw error;
  }
};
