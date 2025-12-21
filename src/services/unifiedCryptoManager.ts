/**
 * CryptoManager: Core cryptographic operations for Centralized Data Key architecture
 *
 * This utility class implements the security protocol from security-v1.3pro.md
 * All data is encrypted by ONE random Master Data Key (DK).
 * Access methods (Password, Security Answers, Recovery Key) decrypt this one key.
 *
 * Encryption: AES-256-GCM (authenticated)
 * Key Derivation: PBKDF2-SHA256 with high iterations
 *
 * @author Security Team
 * @version 1.0.0
 */

import { Platform } from "react-native";
import "react-native-get-random-values";
import APP_CONFIG from "../config/appConfig";
import {
  EncryptedNote,
  QAPair,
  RecoveryResult,
  UnlockResult,
  Vault,
} from "../types/crypto";
import CryptoJSCryptoManager from "./impl/cryptoJSCryptoManager";
import RNQuickCryptoManager from "./impl/quickCryptoManager";

/**
 * Constants for key derivation
 */

export interface UnifiedCryptoManager {
  /**
   * Generate cryptographically secure random bytes
   * @param sizeInBytes - Number of bytes to generate
   * @returns Hex string
   */
  // private static generateRandomBytes(sizeInBytes: number): string;

  /**
   * Generate a random salt for key derivation
   * @returns Hex string (32 bytes = 256 bits)
   */
  generateSalt(): string;

  /**
   * Generate the Master Data Key (DK)
   * This ONE key encrypts all user data
   * @returns Hex string (32 bytes = 256 bits)
   */
  generateDataKey(): string;

  /**
   * Generate a random IV for GCM mode
   * Must be unique for each encryption operation with same key
   * @returns Hex string (12 bytes = 96 bits)
   */
  generateIV(): string;

  /**
   * Encrypt data using AES-256-CBC with HMAC authentication
   *
   * Note: Using CBC mode with explicit IV. For production with true GCM support,
   * consider upgrading to react-native-quick-crypto.
   *
   * @param plaintext - Data to encrypt
   * @param key - Encryption key (hex string)
   * @param iv - Initialization vector (hex string)
   * @returns IV + ciphertext concatenated (hex string)
   */

  /**
   * ============================================================================
   * PUBLIC METHODS: Vault Operations
   * ============================================================================
   */

  /**
   * Rebuild vault with a new password (used in forgot password recovery)
   *
   * This is a public method to avoid accessing private methods.
   * Use this when user recovers via security answers and wants to set new password.
   *
   * @param vault - Current vault
   * @param dk - The decrypted Data Key (already obtained from unlocking)
   * @param newPassword - User's new password
   * @returns Updated vault with new password wrap
   */
  rebuildVaultWithNewPassword(
    vault: Vault,
    dk: string,
    newPassword: string,
  ): Vault;
  /**
   * Rebuild vault with new security answers (used if user wants to change security questions)
   *
   * NOTE: This requires updating security_questions array separately!
   *
   * @param vault - Current vault
   * @param dk - The decrypted Data Key
   * @param newQAPairs - New question-answer pairs (must be exactly 3)
   * @returns Updated vault with new security answer wrap
   */
  rebuildVaultWithNewSecurityAnswers(
    vault: Vault,
    dk: string,
    newQAPairs: QAPair[],
  ): Vault;

  /**
   * Initialize Vault during user registration
   *
   * Flow:
   * 1. Generate DK (the master key that encrypts all data)
   * 2. Generate 3 unique salts
   * 3. Wrap DK with password-derived key
   * 4. Wrap DK with security answer-derived key
   * 5. Wrap DK with recovery key-derived key
   * 6. Return complete Vault object
   *
   * @param password - User's password
   * @param qaPairs - Array of { questionId, answer } pairs (must be exactly 3)
   * @returns { vault, recoveryKey } where recoveryKey must be shown to user
   */
  initializeVault(
    password: string,
    qaPairs: QAPair[],
  ): { vault: Vault; recoveryKey: string; dk: string };

  /**
   * Standard Login: Unlock vault with password
   *
   * Flow:
   * 1. Derive PWDK from password + master_salt
   * 2. Decrypt DK from dk_wrapped_by_password
   * 3. Return DK and Vault on success
   * 4. Throw error if decryption fails (wrong password)
   *
   * @param vault - Vault object from storage
   * @param password - User's password
   * @returns { dk, vault } or throws error
   */
  unlockWithPassword(vault: Vault, password: string): UnlockResult;

  /**
   * Security Answer Login: Unlock vault without password
   *
   * Scenario: User forgot password or prefers Q/A login.
   * After unlock, user can read/edit notes but cannot change password
   * (unless they use recovery key).
   *
   * Flow:
   * 1. Normalize provided answers
   * 2. Derive SADK from combined answers + security_salt
   * 3. Decrypt DK from dk_wrapped_by_security
   * 4. Return DK and Vault on success
   *
   * @param vault - Vault object
   * @param qaPairs - Provided question-answer pairs (must match vault questions)
   * @returns { dk, vault } or throws error
   */
  unlockWithAnswers(vault: Vault, qaPairs: QAPair[]): UnlockResult;

  /**
   * Recovery Key Reset: Force credential rotation
   *
   * Scenario: User lost password and security answers. They have recovery key.
   *
   * Flow:
   * 1. Decrypt DK using recovery key (CRITICAL STEP)
   * 2. Ask user for new password
   * 3. Re-wrap DK with new password
   * 4. Generate NEW recovery key
   * 5. Re-wrap DK with new recovery key
   * 6. Update vault and return new recovery key
   *
   * IMPORTANT: After this flow, the OLD recovery key is invalidated!
   *
   * @param vault - Current vault
   * @param recoveryKey - The stored recovery key
   * @param newPassword - User's new password
   * @returns { newVault, newRecoveryKey }
   */
  recoverAndReset(
    vault: Vault,
    recoveryKey: string,
    newPassword: string,
  ): RecoveryResult;

  /**
   * ============================================================================
   * PUBLIC METHODS: Note Encryption/Decryption
   * ============================================================================
   */

  /**
   * Encrypt a note with the Data Key
   *
   * Each note gets a unique IV for authenticated encryption.
   *
   * @param dk - The Data Key (hex string, 32 bytes)
   * @param noteText - Plain text note content
   * @param noteMetadata - Optional metadata (title, mood, etc.)
   * @returns EncryptedNote object ready for storage
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
    },
  ): EncryptedNote;

  /**
   * Decrypt a note with the Data Key
   *
   * @param dk - The Data Key (hex string, 32 bytes)
   * @param encryptedNote - EncryptedNote object from storage
   * @returns Decrypted note content (plain text)
   */
  decryptNote(dk: string, encryptedNote: EncryptedNote): string;

  /**
   * Decrypt note tags if present
   *
   * @param dk - The Data Key (hex string, 32 bytes)
   * @param encryptedNote - EncryptedNote object
   * @returns Decrypted tags array or empty array
   */
  decryptNoteTags(dk: string, encryptedNote: EncryptedNote): string[];

  /**
   * ============================================================================
   * UTILITY METHODS
   * ============================================================================
   */

  /**
   * Verify security answers without decrypting vault
   * Used during Q/A recovery flow to validate answers before unlock
   *
   * @param vault - Vault object (contains security_salt)
   * @param qaPairs - Provided question-answer pairs
   * @returns true if answers are correct, false otherwise
   */
  verifySecurityAnswers(vault: Vault, qaPairs: QAPair[]): boolean;
  /**
   * Get public security questions from vault (for UI display)
   *
   * @param vault - Vault object
   * @returns Array of questions
   */
  getSecurityQuestions(vault: Vault): string[];
}

export const getCryptoProvider = (): UnifiedCryptoManager => {
  // return CryptoJSCryptoManager.getObject();
  
  if (APP_CONFIG.IS_DEVELOPMENT || Platform.OS === "web" ) {
    console.log("In Development mode / Web Platform using CryptoJSCryptoManager..");
    return CryptoJSCryptoManager.getObject();
  } else {
    console.log("Using NativeCryptoManager");
    return RNQuickCryptoManager.getObject();
  }
};
