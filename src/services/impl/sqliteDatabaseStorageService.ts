/**
 * Database Service with Per-Note Encryption (using expo-sqlite for Expo Go compatibility)
 *
 * This service uses CryptoManager to encrypt/decrypt individual notes
 * and stores them in expo-sqlite database
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import APP_CONFIG from "../../config/appConfig";
import { Journal } from "../../types";
import { EncryptedNote } from "../../types/crypto";
import { CryptoServiceProvider, getCryptoProvider } from "../cryptoServiceProvider";
import { VaultStorageProvider } from "../vaultStorageProvider";

class SQLiteStorageProvider implements VaultStorageProvider {

  static db: SQLite.SQLiteDatabase | null = null;

  // --- Database Initialization ---

   CryptoManager:CryptoServiceProvider ;


  static obj: SQLiteStorageProvider | null = null;

  private constructor() {
    this.CryptoManager = getCryptoProvider();
  }

  // Singleton object
  static getObject(): SQLiteStorageProvider {
    if (SQLiteStorageProvider.obj == null) {
      SQLiteStorageProvider.obj = new SQLiteStorageProvider();
    }
    return SQLiteStorageProvider.obj;
  }





  initializeStorage = async () => {
    try {
      // Open the database (creates if doesn't exist)
      SQLiteStorageProvider.db = await SQLite.openDatabaseAsync(APP_CONFIG.SQLITE_VAULT_DB_NAME);

      // Create key-value store table
      await SQLiteStorageProvider.db.execAsync(`
      CREATE TABLE IF NOT EXISTS key_value_store (
        key TEXT PRIMARY KEY,
        value TEXT
        );
        `);

      // Create journals table with per-note encryption
      // Each row is one encrypted note with its own IV
      await SQLiteStorageProvider.db.execAsync(`
          CREATE TABLE IF NOT EXISTS journals (
            id TEXT PRIMARY KEY,
            date TEXT,
            iv TEXT,
            content TEXT NOT NULL,
            title TEXT,
            mood TEXT,
            tags_encrypted TEXT,
            images TEXT,
            created_at TEXT,
            updated_at TEXT
            );
            `);

      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  };

  DestroyAndReInitializeDatabase = async () => {
    try {
      if (SQLiteStorageProvider.db != null) {
        await SQLiteStorageProvider.db.closeAsync();
        await SQLite.deleteDatabaseAsync(APP_CONFIG.SQLITE_VAULT_DB_NAME);
        console.log("Database Destroyed successfully");
        // Initialize a new database;
        await this.initializeStorage();
        console.log("Database Reinitialized successfully");
      } else {
        throw Error("unable to destroy SQLiteBackend.db as SQLiteBackend.db is null");
      }
    } catch (error) {
      console.error("Error Destroying database:", error);
      throw error;
    }
  };

  // --- Helper for Key-Value Store ---

  setValue = async (key: string, value: string) => {
    try {
      if (!SQLiteStorageProvider.db) throw new Error("Database not initialized");
      await SQLiteStorageProvider.db.runAsync(
        "INSERT OR REPLACE INTO key_value_store (key, value) VALUES (?, ?)",
        [key, value],
      );
    } catch (error) {
      console.error("Error setting value:", error);
      throw error;
    }
  };

  getValue = async (key: string): Promise<string | null> => {
    try {
      if (!SQLiteStorageProvider.db) throw new Error("Database not initialized");
      const result = await SQLiteStorageProvider.db.getFirstAsync<{ value: string }>(
        "SELECT value FROM key_value_store WHERE key = ?",
        [key],
      );
      return result?.value ?? null;
    } catch (error) {
      console.error("Error getting value:", error);
      return null;
    }
  };

  deleteValue = async (key: string) => {
    try {
      if (!SQLiteStorageProvider.db) throw new Error("Database not initialized");
      await SQLiteStorageProvider.db.runAsync("DELETE FROM key_value_store WHERE key = ?", [
        key,
      ]);
    } catch (error) {
      console.error("Error deleting value:", error);
      throw error;
    }
  };

  // --- Storage Keys ---
  static KEYS = APP_CONFIG.STORAGE_KEYS;

  // --- Core Functions ---

  isFirstLaunch = async (): Promise<boolean> => {
    try {
      const value = await this.getValue(SQLiteStorageProvider.KEYS.FIRST_LAUNCH);
      return value === null;
    } catch (error) {
      console.error("Error checking first launch:", error);
      return false;
    }
  };

  markAsLaunched = async (): Promise<void> => {
    try {
      await this.setValue(SQLiteStorageProvider.KEYS.FIRST_LAUNCH, "true");
    } catch (error) {
      console.error("Error marking as launched:", error);
    }
  };

  // --- Vault Functions ---

  saveVault = async (vault: Record<string, any>): Promise<void> => {
    try {
      await this.setValue(SQLiteStorageProvider.KEYS.VAULT, JSON.stringify(vault));
    } catch (error) {
      console.error("Error saving vault:", error);
      throw new Error("Failed to save vault");
    }
  };

  getVault = async (): Promise<Record<string, any> | null> => {
    try {
      const vaultStr = await this.getValue(SQLiteStorageProvider.KEYS.VAULT);
      if (!vaultStr) return null;
      return JSON.parse(vaultStr);
    } catch (error) {
      console.error("Error retrieving vault:", error);
      return null;
    }
  };

  saveRecoveryKeyHash = async (recoveryKey: string): Promise<void> => {
    try {
      await this.setValue(SQLiteStorageProvider.KEYS.RECOVERY_KEY_DISPLAY, recoveryKey);
    } catch (error) {
      console.error("Error saving recovery key:", error);
      throw new Error("Failed to save recovery key");
    }
  };

  getRecoveryKeyHash = async (): Promise<string | null> => {
    try {
      return await this.getValue(SQLiteStorageProvider.KEYS.RECOVERY_KEY_DISPLAY);
    } catch (error) {
      console.error("Error retrieving recovery key hash:", error);
      return null;
    }
  };

  clearRecoveryKeyDisplay = async (): Promise<void> => {
    try {
      await this.deleteValue(SQLiteStorageProvider.KEYS.RECOVERY_KEY_DISPLAY);
    } catch (error) {
      console.error("Error clearing recovery key display:", error);
    }
  };

  // --- Journal Functions with Per-Note Encryption ---

  /**
   * Save a journal entry (encrypted per-note)
   *
   * @param journal - Journal object with text content
   * @param dk - The Data Key for encryption
   */
  saveJournal = async (journal: Journal, dk: string): Promise<void> => {
    try {
      if (!SQLiteStorageProvider.db) throw new Error("Database not initialized");

      // Encrypt the note using CryptoManager
      const encryptedNote = await this.CryptoManager.encryptNote(dk, journal.text, {
        id: journal.id,
        date: journal.date,
        title: journal.title,
        mood: journal.mood,
        tags: [], // Can be extended to support tags
        images: journal.images,
      });

      // Save encrypted note to database
      await SQLiteStorageProvider.db.runAsync(
        `INSERT OR REPLACE INTO journals 
       (id, date, iv, content, title, mood, tags_encrypted, images, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          encryptedNote.id,
          encryptedNote.date || "",
          encryptedNote.iv,
          encryptedNote.content,
          encryptedNote.title || "",
          encryptedNote.mood || "",
          encryptedNote.tags_encrypted || "",
          JSON.stringify(encryptedNote.images || []),
          encryptedNote.created_at || new Date().toISOString(),
          encryptedNote.updated_at || new Date().toISOString(),
        ],
      );
    } catch (error) {
      console.error("Error saving journal:", error);
      throw new Error("Failed to save journal");
    }
  };

  /**
   * Get a single journal by ID (decrypted)
   *
   * @param id - Journal ID
   * @param dk - The Data Key for decryption
   * @returns Decrypted Journal object
   */
  getJournal = async (id: string, dk: string): Promise<Journal | null> => {
    try {
      if (!SQLiteStorageProvider.db) throw new Error("Database not initialized");

      const row = await SQLiteStorageProvider.db.getFirstAsync<{
        id: string;
        date: string;
        iv: string;
        content: string;
        title: string;
        mood: string;
        images: string;
        created_at: string;
        updated_at: string;
      }>(
        `SELECT id, date, iv, content, title, mood, images, created_at, updated_at 
       FROM journals WHERE id = ?`,
        [id],
      );

      if (!row) {
        return null;
      }

      const encryptedNoteObject: EncryptedNote = {
        id: row.id,
        date: row.date,
        iv: row.iv,
        content: row.content,
        title: row.title,
        mood: row.mood,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      // Decrypt the content
      const decryptedText = await this.CryptoManager.decryptNote(dk, encryptedNoteObject);

      // Parse images if stored as JSON
      let images: string[] = [];
      if (row.images) {
        try {
          images = JSON.parse(row.images);
        } catch {
          images = [];
        }
      }

      return {
        id: row.id,
        date: row.date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        title: row.title,
        text: decryptedText,
        mood: row.mood,
        images,
      };
    } catch (error) {
      console.error("Error getting journal:", error);
      throw new Error("Failed to get journal - decryption failed");
    }
  };

  /**
   * List all journals (decrypted)
   *
   * @param dk - The Data Key for decryption
   * @returns Array of decrypted Journal objects
   */
  listJournals = async (dk: string): Promise<Journal[]> => {
    try {
      if (!SQLiteStorageProvider.db) throw new Error("Database not initialized");

      const rows = await SQLiteStorageProvider.db.getAllAsync<{
        id: string;
        date: string;
        iv: string;
        content: string;
        title: string;
        mood: string;
        images: string;
        created_at: string;
        updated_at: string;
      }>(
        `SELECT id, date, iv, content, title, mood, images, created_at, updated_at 
       FROM journals ORDER BY date DESC`,
      );

      const journals: Journal[] = [];

      for (const row of rows) {
        try {
          const noteObject: EncryptedNote = {
            id: row.id,
            date: row.date,
            iv: row.iv,
            content: row.content,
            title: row.title,
            mood: row.mood,
            created_at: row.created_at,
            updated_at: row.updated_at,
          };

          // Decrypt content
          const decryptedText = await this.CryptoManager.decryptNote(dk, noteObject);

          // Parse images
          let images: string[] = [];
          if (row.images) {
            try {
              images = JSON.parse(row.images);
            } catch {
              images = [];
            }
          }

          journals.push({
            id: row.id,
            date: row.date,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            title: row.title,
            text: decryptedText,
            mood: row.mood,
            images,
          });
        } catch (decryptError) {
          console.error(`Failed to decrypt journal ${row.id}:`, decryptError);
          // Skip this journal on decryption error
          continue;
        }
      }

      return journals;
    } catch (error) {
      console.error("Error listing journals:", error);
      throw new Error("Failed to load journals - wrong password?");
    }
  };

  /**
   * Delete a journal by ID
   *
   * @param id - Journal ID to delete
   */
  deleteJournal = async (id: string): Promise<void> => {
    try {
      if (!SQLiteStorageProvider.db) throw new Error("Database not initialized");

      await SQLiteStorageProvider.db.runAsync("DELETE FROM journals WHERE id = ?", [id]);
    } catch (error) {
      console.error("Error deleting journal:", error);
      throw new Error("Failed to delete journal");
    }
  };

  /**
   * Re-encrypt all journals with a new Data Key
   * Used when user changes password/recovery method
   *
   * @param oldDk - Current Data Key
   * @param newDk - New Data Key
   */
  reEncryptAllJournals = async (
    oldDk: string,
    newDk: string,
  ): Promise<void> => {
    try {
      if (!SQLiteStorageProvider.db) throw new Error("Database not initialized");

      // Get all encrypted journals
      const journals = await this.listJournals(oldDk);

      // Re-encrypt each journal with new DK
      for (const journal of journals) {
        const encryptedNote = await this.CryptoManager.encryptNote(newDk, journal.text, {
          id: journal.id,
          date: journal.date,
          title: journal.title,
          mood: journal.mood,
          images: journal.images,
        });

        await SQLiteStorageProvider.db.runAsync(
          `UPDATE journals 
         SET iv = ?, content = ?, updated_at = ? 
         WHERE id = ?`,
          [
            encryptedNote.iv,
            encryptedNote.content,
            new Date().toISOString(),
            journal.id,
          ],
        );
      }
    } catch (error) {
      console.error("Error re-encrypting journals:", error);
      throw new Error("Failed to re-encrypt journals");
    }
  };

  /**
   * Get journal count (useful for UI)
   *
   * @returns Number of journals
   */
  getJournalCount = async (): Promise<number> => {
    try {
      if (!SQLiteStorageProvider.db) throw new Error("Database not initialized");

      const result = await SQLiteStorageProvider.db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM journals",
      );

      return result?.count ?? 0;
    } catch (error) {
      console.error("Error getting journal count:", error);
      return 0;
    }
  };

  /**
   * Clear all app data (for testing or reset)
   */
  clearAllData = async (): Promise<void> => {
    try {
      await this.DestroyAndReInitializeDatabase();
      // if (!SQLiteBackend.db) throw new Error('Database not initialized');
      // await SQLiteBackend.db.execAsync('DELETE FROM journals; DELETE FROM key_value_store;');
    } catch (error) {
      console.error("Error clearing data:", error);
      throw new Error("Failed to clear data");
    }
  };

  /**
   * Migration helper: Migrate old AsyncStorage format to new SQLite + per-note encryption
   * (Run once on app startup for backward compatibility)
   */
  migrateFromAsyncStorage = async (dk: string): Promise<void> => {
    const isMigrated = await this.getValue(SQLiteStorageProvider.KEYS.MIGRATION_COMPLETE_V1);
    if (isMigrated) {
      return;
    }

    try {
      // Check if old format exists in AsyncStorage
      const oldJournalsStr = await AsyncStorage.getItem(
        APP_CONFIG.STORAGE_KEYS.JOURNALS,
      );
      if (oldJournalsStr) {
        // This would be old encrypted format
        // You'd need the old key to decrypt if it was encrypted
        console.log(
          "Old journal format detected - manual migration may be needed",
        );
      }

      // Mark migration as complete
      await this.setValue(SQLiteStorageProvider.KEYS.MIGRATION_COMPLETE_V1, "true");
      console.log("Migration check complete");
    } catch (error) {
      console.error("Migration error:", error);
      // Don't throw - allow app to continue
    }
  };

  /**
   * Export function to get all journals as JSON (for backup)
   * WARNING: This exports PLAINTEXT - use with caution!
   *
   * @param dk - The Data Key for decryption
   * @returns JSON string of all journals
   */
  exportAllJournals = async (dk: string): Promise<string> => {
    try {
      const journals = await this.listJournals(dk);
      return JSON.stringify(journals, null, 2);
    } catch (error) {
      console.error("Error exporting journals:", error);
      throw new Error("Failed to export journals");
    }
  };
}

export default SQLiteStorageProvider ;
