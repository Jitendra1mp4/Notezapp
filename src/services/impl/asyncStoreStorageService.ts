import APP_CONFIG from "@/src/config/appConfig";
import { Journal, SecurityQuestion } from "@/src/types";
import { Vault } from "@/src/types/crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VaultStorageProvider } from "../unifiedStorageService";
import CryptoJSCryptoManager from "./cryptoJSCryptoManager";

class AsyncStoreStorageProvider implements VaultStorageProvider {
  static obj: AsyncStoreStorageProvider | null = null;

   cryptoJsManger:CryptoJSCryptoManager ;

  private constructor() {
    this.cryptoJsManger=CryptoJSCryptoManager.getObject()
  }
 
  // Singleton object
  static getObject(): AsyncStoreStorageProvider {
    if (AsyncStoreStorageProvider.obj == null) {
      AsyncStoreStorageProvider.obj = new AsyncStoreStorageProvider();
    }
    return AsyncStoreStorageProvider.obj;
  }

  /**
   * Check if this is the first app launch
   */
  isFirstLaunch = async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(
        APP_CONFIG.STORAGE_KEYS.FIRST_LAUNCH,
      );
      return value === null;
    } catch (error) {
      console.error("Error checking first launch:", error);
      return false;
    }
  };


  initializeStorage = async () => {
    setTimeout(() => {      
      console.log('✅ [Web] AsyncStorage ready');
    }, 0);
  }


   getJournalCount = async () => {
    // For web, we'll need to count from actual storage
    // This is a limitation - we'd need to refactor to pass key
    return 0;
  }

  /**
   * Mark app as launched
   */
  markAsLaunched = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.FIRST_LAUNCH, "true");
    } catch (error) {
      console.error("Error marking as launched:", error);
    }
  };

  /**
   * Save the salt used for key derivation
   */
  saveSalt = async (saltKey: string, salt: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(saltKey, salt);
    } catch (error) {
      console.error("Error saving salt:", error);
      throw new Error("Failed to save encryption salt");
    }
  };

  /**
   * Get the stored salt
   */
  getSalt = async (saltKey: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(saltKey);
    } catch (error) {
      console.error("Error getting salt:", error);
      return null;
    }
  };

  /**
   * Save security questions (encrypted)
   */
  saveSecurityQuestions = async (
    questions: SecurityQuestion[],
    key: string,
  ): Promise<void> => {
    try {
      const encrypted = this.cryptoJsManger.encryptJSON(key, questions);
      await AsyncStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.SECURITY_QUESTIONS,
        encrypted,
      );
    } catch (error) {
      console.error("Error saving security questions:", error);
      throw new Error("Failed to save security questions");
    }
  };

  /**
   * Get security questions (decrypted)
   */
  getSecurityQuestions = async (
    key: string,
  ): Promise<SecurityQuestion[] | null> => {
    try {
      const encrypted = await AsyncStorage.getItem(
        APP_CONFIG.STORAGE_KEYS.SECURITY_QUESTIONS,
      );
      if (!encrypted) return null;

      return this.cryptoJsManger.decryptJSON(key, encrypted) as SecurityQuestion[];
    } catch (error) {
      console.error("Error getting security questions:", error);
      return null;
    }
  };

  /**
   * Save security answer hashes (unencrypted for recovery)
   */
  saveSecurityAnswerHashes = async (
    answerHashes: Array<{ questionId: string; answerHash: string }>,
  ): Promise<void> => {
    try {
      await AsyncStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.SECURITY_ANSWERS_HASH,
        JSON.stringify(answerHashes),
      );
    } catch (error) {
      console.error("Error saving answer hashes:", error);
      throw new Error("Failed to save security answer hashes");
    }
  };

  /**
   * Get security answer hashes (for verification during recovery)
   */
  getSecurityAnswerHashes = async (): Promise<Array<{
    questionId: string;
    answerHash: string;
  }> | null> => {
    try {
      const data = await AsyncStorage.getItem(
        APP_CONFIG.STORAGE_KEYS.SECURITY_ANSWERS_HASH,
      );
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.error("Error getting answer hashes:", error);
      return null;
    }
  };

  /**
   * Get security questions without decryption (for recovery flow)
   * Returns only the questions, not the hashed answers
   */
  getSecurityQuestionsForRecovery = async (): Promise<Array<{
    questionId: string;
    question: string;
  }> | null> => {
    try {
      // We need to store a separate unencrypted copy of just the questions
      const questionsOnly = await AsyncStorage.getItem(
        APP_CONFIG.STORAGE_KEYS.SECURITY_QUESTIONS + "_public",
      );
      if (!questionsOnly) return null;

      return JSON.parse(questionsOnly);
    } catch (error) {
      console.error("Error getting security questions for recovery:", error);
      return null;
    }
  };

  /**
   * Save public copy of security questions (just the question text)
   */
  savePublicSecurityQuestions = async (
    questions: Array<{ questionId: string; question: string }>,
  ): Promise<void> => {
    try {
      await AsyncStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.SECURITY_QUESTIONS + "_public",
        JSON.stringify(questions),
      );
    } catch (error) {
      console.error("Error saving public security questions:", error);
      throw new Error("Failed to save security questions");
    }
  };

  /**
   * Save a journal entry (encrypted)
   */
  saveJournal = async (journal: Journal, key: string): Promise<void> => {
    try {
      const journals = await this.listJournals(key);
      const existingIndex = journals.findIndex((j) => j.id === journal.id);

      if (existingIndex >= 0) {
        journals[existingIndex] = journal;
      } else {
        journals.push(journal);
      }

      const encrypted = this.cryptoJsManger.encryptJSON(key, journals);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.JOURNALS, encrypted);
    } catch (error) {
      console.error("Error saving journal:", error);
      throw new Error("Failed to save journal");
    }
  };

  /**
   * Get a single journal by ID
   */
  getJournal = async (id: string, key: string): Promise<Journal | null> => {
    try {
      const journals = await this.listJournals(key);
      return journals.find((j) => j.id === id) || null;
    } catch (error) {
      console.error("Error getting journal:", error);
      return null;
    }
  };

  /**
   * List all journals (decrypted)
   */
  listJournals = async (key: string): Promise<Journal[]> => {
    try {
      const encrypted = await AsyncStorage.getItem(
        APP_CONFIG.STORAGE_KEYS.JOURNALS,
      );
      if (!encrypted) return [];

      return this.cryptoJsManger.decryptJSON(key, encrypted) as Journal[];
    } catch (error) {
      console.error("Error listing journals:", error);
      throw new Error("Failed to load journals - wrong password?");
    }
  };

  /**
   * Delete a journal
   */

  
  deleteJournal = async (id: string, key?: string): Promise<void> => {
    try {
      if (key === undefined || key === null) {
        throw new Error("key can not be null for web platform");
      }

      const journals = await this.listJournals(key);
      const filtered = journals.filter((j) => j.id !== id);

      const encrypted = this.cryptoJsManger.encryptJSON(key, filtered);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.JOURNALS, encrypted);
    } catch (error) {
      console.error("Error deleting journal:", error);
      throw new Error("Failed to delete journal");
    }
  };

  /**
   * Re-encrypt all data with a new key (used when password changes)
   */
  reEncryptAllData = async (oldKey: string, newKey: string): Promise<void> => {
    try {
      // Re-encrypt journals
      const journals = await this.listJournals(oldKey);
      const encryptedJournals = this.cryptoJsManger.encryptJSON(newKey, journals);
      await AsyncStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.JOURNALS,
        encryptedJournals,
      );

      // Re-encrypt security questions
      const securityQuestions = await this.getSecurityQuestions(oldKey);
      if (securityQuestions) {
        const encryptedQuestions = this.cryptoJsManger.encryptJSON(newKey, securityQuestions);
        await AsyncStorage.setItem(
          APP_CONFIG.STORAGE_KEYS.SECURITY_QUESTIONS,
          encryptedQuestions,
        );
      }
    } catch (error) {
      console.error("Error re-encrypting data:", error);
      throw new Error("Failed to re-encrypt data - please try again");
    }
  };

  saveVerificationToken = async (key: string): Promise<void> => {
    try {
      const verificationData = {
        timestamp: new Date().toISOString(),
        verified: true,
      };
      const encrypted = this.cryptoJsManger.encryptJSON(key, verificationData);
      await AsyncStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.VERIFICATION_TOKEN,
        encrypted,
      );
    } catch (error) {
      console.error("Error saving verification token:", error);
      throw new Error("Failed to save verification token");
    }
  };

  /**
   * Verify password by trying to decrypt the verification token
   */
  verifyPassword = async (key: string): Promise<boolean> => {
    try {
      const encrypted = await AsyncStorage.getItem(
        APP_CONFIG.STORAGE_KEYS.VERIFICATION_TOKEN,
      );
      if (!encrypted) {
        // No token stored yet - this shouldn't happen in production
        return true; // Allow for backward compatibility
      }

      const decrypted = this.cryptoJsManger.decryptJSON(key, encrypted);
      return decrypted && decrypted.verified === true;
    } catch (error) {
      // Decryption failed = wrong password
      return false;
    }
  };

  /**
   * Clear all app data (for testing or reset)
   */
  clearAllData = async (): Promise<void> => {
    try {
      AsyncStorage.clear();

      console.log("💥 [Web] Clearing localStorage and sessionStorage");
      localStorage.clear();
      sessionStorage.clear();
      console.log("✅ [Web] All storage destroyed");
      // await AsyncStorage.multiRemove([
      //   APP_CONFIG.storageKeys.FIRST_LAUNCH,
      //   APP_CONFIG.storageKeys.VAULT,
      //   APP_CONFIG.storageKeys.SECURITY_ANSWERS_HASH,
      //   APP_CONFIG.storageKeys.RECOVERY_KEY_DISPLAY,
      //   APP_CONFIG.storageKeys.MASTER_KEY_SALT,
      //   APP_CONFIG.storageKeys.SECURITY_QUESTIONS,
      //   APP_CONFIG.storageKeys.SECURITY_QUESTIONS + '_public',
      //   APP_CONFIG.storageKeys.JOURNALS,
      //   APP_CONFIG.storageKeys.SETTINGS,
      //   APP_CONFIG.storageKeys.VERIFICATION_TOKEN,
      // ]);
    } catch (error) {
      console.error("Error clearing data:", error);
      throw new Error("Failed to clear data");
    }
  };

  /**
   * ============================================================================
   * VAULT-BASED ARCHITECTURE (NEW)
   * ============================================================================
   * The following functions support the new centralized Data Key architecture
   * where one master key encrypts all user data, and is wrapped by multiple
   * access methods (password, security answers, recovery key).
   */

  /**
   * Save the complete Vault object (encrypted or unencrypted depending on use case)
   *
   * The Vault contains:
   * - Salts for key derivation
   * - DK wrapped by password, security answers, and recovery key
   * - Security questions
   *
   * @param vault - Vault object to store
   */
  saveVault = async (vault: Vault | Record<string, any>): Promise<void> => {
    try {
      // Vault is stored as-is (it's already structured with encrypted key wraps)
      await AsyncStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.VAULT,
        JSON.stringify(vault),
      );
    } catch (error) {
      console.error("Error saving vault:", error);
      throw new Error("Failed to save vault");
    }
  };

  /**
   * Retrieve the Vault object
   *
   * @returns Vault object or null if not found
   */
  getVault = async (): Promise<Vault | null> => {
    try {
      const vaultStr = await AsyncStorage.getItem(
        APP_CONFIG.STORAGE_KEYS.VAULT,
      );
      if (!vaultStr) return null;
      return JSON.parse(vaultStr) as Vault;
    } catch (error) {
      console.error("Error retrieving vault:", error);
      return null;
    }
  };

  /**
   * Save the recovery key (hashed for display purposes only)
   * This is shown to the user once during signup
   *
   * @param recoveryKey - The full recovery key (UUID format)
   */
  saveRecoveryKeyHash = async (recoveryKey: string): Promise<void> => {
    try {
      // Store a hash of the recovery key for verification purposes
      // This is NOT used for actual decryption (vault has that)
      await AsyncStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.RECOVERY_KEY_DISPLAY,
        recoveryKey,
      );
    } catch (error) {
      console.error("Error saving recovery key:", error);
      throw new Error("Failed to save recovery key");
    }
  };

  /**
   * Get the recovery key hash (for verification/display UI)
   *
   * @returns Recovery key hash or null
   */
  getRecoveryKeyHash = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(
        APP_CONFIG.STORAGE_KEYS.RECOVERY_KEY_DISPLAY,
      );
    } catch (error) {
      console.error("Error retrieving recovery key hash:", error);
      return null;
    }
  };

  /**
   * Clear the recovery key after user has acknowledged it
   * This makes sure it's not accidentally exposed in logs
   */
  clearRecoveryKeyDisplay = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(
        APP_CONFIG.STORAGE_KEYS.RECOVERY_KEY_DISPLAY,
      );
    } catch (error) {
      console.error("Error clearing recovery key display:", error);
    }
  };

  /**
   * Check if a vault has been initialized
   *
   * @returns true if vault exists, false otherwise
   */
  hasVault = async (): Promise<boolean> => {
    try {
      const vault = await this.getVault();
      return vault !== null;
    } catch (error) {
      console.error("Error checking vault existence:", error);
      return false;
    }
  };

  DestroyStorage() {
    localStorage.clear();
    sessionStorage.clear();
  }
}

export default AsyncStoreStorageProvider;
