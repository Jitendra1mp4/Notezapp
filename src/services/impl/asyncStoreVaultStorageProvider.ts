
import APP_CONFIG from '@/src/config/appConfig';
import { Journal, SecurityQuestion } from '@/src/types';
import { Vault } from '@/src/types/crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCryptoProvider } from '../cryptoServiceProvider';
import { VaultStorageProvider } from '../vaultStorageProvider';

class AsyncStoreVaultStorageProvider implements VaultStorageProvider {
  static obj: AsyncStoreVaultStorageProvider | null = null;

  private constructor() {}

  static getObject(): AsyncStoreVaultStorageProvider {
    if (AsyncStoreVaultStorageProvider.obj === null) {
      AsyncStoreVaultStorageProvider.obj = new AsyncStoreVaultStorageProvider();
    }
    return AsyncStoreVaultStorageProvider.obj;
  }

  // ==================== Helper Methods ====================

  /**
   * Encrypt JSON data using unified crypto manager
   * @param keyHex - Encryption key (hex string)
   * @param data - Data to encrypt
   * @returns Promise<string> - Encrypted data (hex)
   */
  private async encryptJSON(keyHex: string, data: any): Promise<string> {
    try {
      const cryptoManager = getCryptoProvider();
      const jsonString = JSON.stringify(data);
      return await cryptoManager.encryptData(keyHex, jsonString);
    } catch (error) {
      throw new Error(
        `Failed to encrypt data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Decrypt JSON data using unified crypto manager
   * @param keyHex - Encryption key (hex string)
   * @param cipherText - Encrypted data (hex)
   * @returns Promise<any> - Decrypted data
   */
  private async decryptJSON(keyHex: string, cipherText: string): Promise<any> {
    try {
      const cryptoManager = getCryptoProvider();
      const jsonString = await cryptoManager.decryptData(keyHex, cipherText);
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(
        `Failed to decrypt data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ==================== Storage Methods ====================

  async isFirstLaunch(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.FIRST_LAUNCH);
      return value === null;
    } catch (error) {
      console.error('Error checking first launch:', error);
      return false;
    }
  }

  async initializeStorage(): Promise<void> {
    setTimeout(() => {
      console.log('[Web] AsyncStorage ready');
    }, 0);
  }

  async getJournalCount(): Promise<number> {
    // For web, we'd need to count from actual storage
    // This is a limitation - we'd need to refactor to pass key
    return 0;
  }

  async markAsLaunched(): Promise<void> {
    try {
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.FIRST_LAUNCH, 'true');
    } catch (error) {
      console.error('Error marking as launched:', error);
    }
  }

  // ==================== Salt Management ====================

  async saveSalt(saltKey: string, salt: string): Promise<void> {
    try {
      await AsyncStorage.setItem(saltKey, salt);
    } catch (error) {
      console.error('Error saving salt:', error);
      throw new Error('Failed to save encryption salt');
    }
  }

  async getSalt(saltKey: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(saltKey);
    } catch (error) {
      console.error('Error getting salt:', error);
      return null;
    }
  }

  // ==================== Security Questions ====================

  async saveSecurityQuestions(
    questions: SecurityQuestion[],
    key: string
  ): Promise<void> {
    try {
      const encrypted = await this.encryptJSON(key, questions);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.SECURITY_QUESTIONS, encrypted);
    } catch (error) {
      console.error('Error saving security questions:', error);
      throw new Error('Failed to save security questions');
    }
  }

  async getSecurityQuestions(key: string): Promise<SecurityQuestion[] | null> {
    try {
      const encrypted = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.SECURITY_QUESTIONS);
      if (!encrypted) return null;
      return await this.decryptJSON(key, encrypted);
    } catch (error) {
      console.error('Error getting security questions:', error);
      return null;
    }
  }

  // ==================== Security Answer Hashes ====================

  async saveSecurityAnswerHashes(
    answerHashes: Array<{ questionId: string; answerHash: string }>
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.SECURITY_ANSWERS_HASH,
        JSON.stringify(answerHashes)
      );
    } catch (error) {
      console.error('Error saving answer hashes:', error);
      throw new Error('Failed to save security answer hashes');
    }
  }

  async getSecurityAnswerHashes(): Promise<
    Array<{ questionId: string; answerHash: string }> | null
  > {
    try {
      const data = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.SECURITY_ANSWERS_HASH);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting answer hashes:', error);
      return null;
    }
  }

  async getSecurityQuestionsForRecovery(): Promise<
    Array<{ questionId: string; question: string }> | null
  > {
    try {
      const questionsOnly = await AsyncStorage.getItem(
        `${APP_CONFIG.STORAGE_KEYS.SECURITY_QUESTIONS}_public`
      );
      if (!questionsOnly) return null;
      return JSON.parse(questionsOnly);
    } catch (error) {
      console.error('Error getting security questions for recovery:', error);
      return null;
    }
  }

  async savePublicSecurityQuestions(
    questions: Array<{ questionId: string; question: string }>
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${APP_CONFIG.STORAGE_KEYS.SECURITY_QUESTIONS}_public`,
        JSON.stringify(questions)
      );
    } catch (error) {
      console.error('Error saving public security questions:', error);
      throw new Error('Failed to save security questions');
    }
  }

  // ==================== Journal Operations ====================

  async saveJournal(journal: Journal, key: string): Promise<void> {
    try {
      const journals = await this.listJournals(key);
      const existingIndex = journals.findIndex((j) => j.id === journal.id);

      if (existingIndex >= 0) {
        journals[existingIndex] = journal;
      } else {
        journals.push(journal);
      }

      const encrypted = await this.encryptJSON(key, journals);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.JOURNALS, encrypted);
    } catch (error) {
      console.error('Error saving journal:', error);
      throw new Error('Failed to save journal');
    }
  }

  async getJournal(id: string, key: string): Promise<Journal | null> {
    try {
      const journals = await this.listJournals(key);
      return journals.find((j) => j.id === id) || null;
    } catch (error) {
      console.error('Error getting journal:', error);
      return null;
    }
  }

  async listJournals(key: string): Promise<Journal[]> {
    try {
      const encrypted = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.JOURNALS);
      if (!encrypted) return [];
      return await this.decryptJSON(key, encrypted) ;
    } catch (error) {
      console.error('Error listing journals:', error);
      throw new Error('Failed to load journals - wrong password?');
    }
  }

  async deleteJournal(id: string, key?: string): Promise<void> {
    try {
      if (key === undefined || key === null) {
        throw new Error('key cannot be null for web platform');
      }
      const journals = await this.listJournals(key);
      const filtered = journals.filter((j) => j.id !== id);
      const encrypted = await this.encryptJSON(key, filtered);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.JOURNALS, encrypted);
    } catch (error) {
      console.error('Error deleting journal:', error);
      throw new Error('Failed to delete journal');
    }
  }

  async reEncryptAllData(oldKey: string, newKey: string): Promise<void> {
    try {
      // Re-encrypt journals
      const journals = await this.listJournals(oldKey);
      const encryptedJournals = await this.encryptJSON(newKey, journals);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.JOURNALS, encryptedJournals);

      // Re-encrypt security questions
      const securityQuestions = await this.getSecurityQuestions(oldKey);
      if (securityQuestions) {
        const encryptedQuestions = await this.encryptJSON(newKey, securityQuestions);
        await AsyncStorage.setItem(
          APP_CONFIG.STORAGE_KEYS.SECURITY_QUESTIONS,
          encryptedQuestions
        );
      }
    } catch (error) {
      console.error('Error re-encrypting data:', error);
      throw new Error('Failed to re-encrypt data - please try again');
    }
  }

  // ==================== Verification Token ====================

  async saveVerificationToken(key: string): Promise<void> {
    try {
      const verificationData = {
        timestamp: new Date().toISOString(),
        verified: true,
      };
      const encrypted = await this.encryptJSON(key, verificationData);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.VERIFICATION_TOKEN, encrypted);
    } catch (error) {
      console.error('Error saving verification token:', error);
      throw new Error('Failed to save verification token');
    }
  }

  async verifyPassword(key: string): Promise<boolean> {
    try {
      const encrypted = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.VERIFICATION_TOKEN);
      if (!encrypted) {
        // No token stored yet
        return true; // Allow for backward compatibility
      }
      const decrypted = await this.decryptJSON(key, encrypted);
      return decrypted && decrypted.verified === true;
    } catch (error) {
      // Decryption failed = wrong password
      return false;
    }
  }

  // ==================== Clear Data ====================

  async clearAllData(): Promise<void> {
    try {
      console.log('[Web] Clearing localStorage,AsyncStorage and sessionStorage');
      localStorage.clear();
      sessionStorage.clear();
      await AsyncStorage.clear();
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
      console.error('Error clearing data:', error);
      throw new Error('Failed to clear data');
    }
  }

  // ==================== Vault Operations ====================

  async saveVault(vault: Vault | Record<string, any>): Promise<void> {
    try {
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.VAULT, JSON.stringify(vault));
    } catch (error) {
      console.error('Error saving vault:', error);
      throw new Error('Failed to save vault');
    }
  }

  async getVault(): Promise<Vault | null> {
    try {
      const vaultStr = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.VAULT);
      if (!vaultStr) return null;
      return JSON.parse(vaultStr) as Vault;
    } catch (error) {
      console.error('Error retrieving vault:', error);
      return null;
    }
  }

  async saveRecoveryKeyHash(recoveryKey: string): Promise<void> {
    try {
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.RECOVERY_KEY_DISPLAY, recoveryKey);
    } catch (error) {
      console.error('Error saving recovery key:', error);
      throw new Error('Failed to save recovery key');
    }
  }

  async getRecoveryKeyHash(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.RECOVERY_KEY_DISPLAY);
    } catch (error) {
      console.error('Error retrieving recovery key hash:', error);
      return null;
    }
  }

  async clearRecoveryKeyDisplay(): Promise<void> {
    try {
      await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.RECOVERY_KEY_DISPLAY);
    } catch (error) {
      console.error('Error clearing recovery key display:', error);
    }
  }

  async hasVault(): Promise<boolean> {
    try {
      const vault = await this.getVault();
      return vault !== null;
    } catch (error) {
      console.error('Error checking vault existence:', error);
      return false;
    }
  }
}

export default AsyncStoreVaultStorageProvider;
