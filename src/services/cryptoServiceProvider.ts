/**
 * UnifiedCryptoManager - Async AES-256-GCM Interface
 * 
 * Cross-platform cryptographic interface using AES-256-GCM authenticated encryption.
 * All methods are async Promise-based for consistency across Web (SubtleCrypto) and Native (QuickCrypto).
 * 
 * Storage Format: iv(24 hex chars = 12 bytes) + ciphertext(hex) + authTag(32 hex chars = 16 bytes)
 * 
 * @version 2.0.0 - AES-GCM Migration
 */

import { Platform } from 'react-native';
import {
  EncryptedNote,
  QAPair,
  RecoveryResult,
  UnlockResult,
  Vault,
} from '../types/crypto';

/**
 * Unified Crypto Manager Interface - All methods are async
 */
export interface CryptoServiceProvider {
  // ==================== Random Generation ====================
  
  /**
   * Generate a random salt for key derivation
   * @returns Promise<string> - Hex string (32 bytes = 256 bits)
   */
  generateSalt(): Promise<string>;

  /**
   * Generate the Master Data Key (DK)
   * @returns Promise<string> - Hex string (32 bytes = 256 bits)
   */
  generateDataKey(): Promise<string>;

  /**
   * Generate a random IV for GCM mode
   * @returns Promise<string> - Hex string (12 bytes = 96 bits)
   */
  generateIV(): Promise<string>;

  // ==================== Vault Operations ====================

  /**
   * Initialize vault during user registration
   * @param password - User's password
   * @param qaPairs - Array of 3 question-answer pairs
   * @returns Promise with vault, recoveryKey, and dk
   */
  initializeVault(
    password: string,
    qaPairs: QAPair[]
  ): Promise<{ vault: Vault; recoveryKey: string; dk: string }>;

  /**
   * Unlock vault with password
   * @param vault - Vault object
   * @param password - User's password
   * @returns Promise with dk and vault
   */
  unlockWithPassword(vault: Vault, password: string): Promise<UnlockResult>;

  /**
   * Unlock vault with security answers
   * @param vault - Vault object
   * @param qaPairs - Question-answer pairs
   * @returns Promise with dk and vault
   */
  unlockWithAnswers(vault: Vault, qaPairs: QAPair[]): Promise<UnlockResult>;

  /**
   * Recover and reset vault with recovery key
   * @param vault - Current vault
   * @param recoveryKey - Recovery key
   * @param newPassword - New password
   * @returns Promise with newVault and newRecoveryKey
   */
  recoverAndReset(
    vault: Vault,
    recoveryKey: string,
    newPassword: string
  ): Promise<RecoveryResult>;

  /**
   * Rebuild vault with new password
   * @param vault - Current vault
   * @param dk - Decrypted Data Key
   * @param newPassword - New password
   * @returns Promise with updated vault
   */
  rebuildVaultWithNewPassword(
    vault: Vault,
    dk: string,
    newPassword: string
  ): Promise<Vault>;

  /**
   * Rebuild vault with new security answers
   * @param vault - Current vault
   * @param dk - Decrypted Data Key
   * @param newQAPairs - New question-answer pairs
   * @returns Promise with updated vault
   */
  rebuildVaultWithNewSecurityAnswers(
    vault: Vault,
    dk: string,
    newQAPairs: QAPair[]
  ): Promise<Vault>;

  // ==================== Note Encryption/Decryption ====================

  /**
   * Encrypt a note with the Data Key using AES-256-GCM
   * @param dk - Data Key (hex string, 32 bytes)
   * @param noteText - Plain text note content
   * @param noteMetadata - Optional metadata
   * @returns Promise<EncryptedNote>
   */
  encryptNote(
    dk: string,
    noteText: string,
    noteMetadata?: {
      id?: string;
      date?: string;
      title?: string;
      mood?: string;
      tags?: string[];
      images?: string[];
    }
  ): Promise<EncryptedNote>;

  /**
   * Decrypt a note with the Data Key
   * @param dk - Data Key (hex string, 32 bytes)
   * @param encryptedNote - EncryptedNote object
   * @returns Promise<string> - Decrypted plain text
   */
  decryptNote(dk: string, encryptedNote: EncryptedNote): Promise<string>;

  /**
   * Decrypt note tags
   * @param dk - Data Key
   * @param encryptedNote - EncryptedNote object
   * @returns Promise<string[]> - Decrypted tags array
   */
  decryptNoteTags(dk: string, encryptedNote: EncryptedNote): Promise<string[]>;

  // ==================== Utility Methods ====================

  /**
   * Verify security answers
   * @param vault - Vault object
   * @param qaPairs - Question-answer pairs
   * @returns Promise<boolean>
   */
  verifySecurityAnswers(vault: Vault, qaPairs: QAPair[]): Promise<boolean>;

  /**
   * Get security questions from vault
   * @param vault - Vault object
   * @returns string[] - Array of questions
   */
  getSecurityQuestions(vault: Vault): string[];

  // ==================== Generic Data Encryption ====================
  
  /**
   * Encrypt arbitrary data using AES-256-GCM
   * @param dk - Data Key (hex string, 32 bytes)
   * @param plaintext - Plain text data to encrypt
   * @returns Promise<string> - Encrypted data as hex (iv + ciphertext + authTag)
   */
  encryptData(dk: string, plaintext: string): Promise<string>;

  /**
   * Decrypt arbitrary data using AES-256-GCM
   * @param dk - Data Key (hex string, 32 bytes)
   * @param encryptedData - Encrypted data as hex (iv + ciphertext + authTag)
   * @returns Promise<string> - Decrypted plain text
   */
  decryptData(dk: string, encryptedData: string): Promise<string>;
}

/**
 * Get the appropriate crypto provider based on platform
 */
export const getCryptoProvider = (): CryptoServiceProvider => {
  if (Platform.OS === 'web') {
    // Use Web Crypto API (SubtleCrypto) for web platform
    const WebCryptoServiceProvider = require('./impl/webCryptoServiceProvider').default;
    console.log('[CryptoProvider] Using Web Crypto API (AES-GCM)');
    return WebCryptoServiceProvider.getObject();
  } else {
    // Use React Native Quick Crypto for iOS/Android
    const QuickCryptoCryptoServiceProvider = require('./impl/quickCryptoCryptoServiceProvider').default;
    console.log('[CryptoProvider] Using QuickCrypto (AES-GCM)');
    return QuickCryptoCryptoServiceProvider.getObject();
  }
};

export default getCryptoProvider;
