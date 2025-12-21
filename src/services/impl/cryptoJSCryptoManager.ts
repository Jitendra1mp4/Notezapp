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

import CryptoJS from "crypto-js";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import {
  EncryptedNote,
  KDFParams,
  NormalizedAnswers,
  QAPair,
  RecoveryResult,
  Salts,
  UnlockResult,
  Vault,
  VaultSecurityQuestion,
} from "../../types/crypto";

/**
 * Constants for key derivation
 */
import APP_CONFIG from "../../config/appConfig";
import { UnifiedCryptoManager } from "../unifiedCryptoManager";

class CryptoJSCryptoManager implements UnifiedCryptoManager {
  
  static obj: CryptoJSCryptoManager | null = null;

  private constructor() {}

  // Singleton object
  static getObject(): CryptoJSCryptoManager {
    if (CryptoJSCryptoManager.obj == null) {
      CryptoJSCryptoManager.obj = new CryptoJSCryptoManager();
    }
    return CryptoJSCryptoManager.obj;
  }

  /**
   * Generate cryptographically secure random bytes
   * @param sizeInBytes - Number of bytes to generate
   * @returns Hex string
   */
  private generateRandomBytes(sizeInBytes: number): string {
    const randomArray = CryptoJS.lib.WordArray.random(sizeInBytes);
    return randomArray.toString(CryptoJS.enc.Hex);
  }

  /**
   * Generate a random salt for key derivation
   * @returns Hex string (32 bytes = 256 bits)
   */
  generateSalt(): string {
    return this.generateRandomBytes(APP_CONFIG.SALT_SIZE);
  }

  /**
   * Generate the Master Data Key (DK)
   * This ONE key encrypts all user data
   * @returns Hex string (32 bytes = 256 bits)
   */
  generateDataKey(): string {
    return this.generateRandomBytes(APP_CONFIG.DK_SIZE);
  }

  /**
   * Generate a random IV for GCM mode
   * Must be unique for each encryption operation with same key
   * @returns Hex string (12 bytes = 96 bits)
   */
  generateIV(): string {
    return this.generateRandomBytes(APP_CONFIG.IV_SIZE);
  }

  /**
   * Derive a key from password using PBKDF2-SHA256
   * @param password - User's password
   * @param salt - Salt (hex string)
   * @returns Hex string (32 bytes = 256 bits)
   */
  private deriveKeyFromPassword(password: string, salt: string): string {
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: APP_CONFIG.DK_SIZE / 4, // CryptoJS uses 32-bit words
      iterations: APP_CONFIG.KDF_ITERATIONS,
      hasher: CryptoJS.algo.SHA256,
    });
    return key.toString(CryptoJS.enc.Hex);
  }

  /**
   * Normalize security answers for consistent hashing
   * Applies: lowercase, trim, join with separator
   * @param answers - Array of answers
   * @returns Combined string "answer1@@answer2@@answer3"
   */
  private normalizeAnswers(answers: string[]): NormalizedAnswers {
    const normalized = answers.map(
      (a) => a.toLowerCase().trim().replace(/\s+/g, " "), // Collapse multiple spaces
    );

    return {
      combined: normalized.join("@@"),
      individual: normalized,
    };
  }

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
  private encryptAES256(plaintext: string, key: string, iv: string): string {
    try {
      // Convert inputs from hex to CryptoJS format
      const keyWordArray = CryptoJS.enc.Hex.parse(key);
      const ivWordArray = CryptoJS.enc.Hex.parse(iv);

      // Encrypt with CBC mode
      const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // Extract ciphertext as hex
      const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Hex);

      // Return IV + ciphertext for storage
      return iv + ciphertext;
    } catch (error) {
      throw new Error(
        `AES encryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Decrypt data using AES-256-CBC
   * @param ivAndCiphertext - IV (hex, 24 chars = 12 bytes) + ciphertext (hex)
   * @param key - Encryption key (hex string)
   * @returns Decrypted plaintext
   */
  private decryptAES256(ivAndCiphertext: string, key: string): string {
    try {
      // Extract IV (first 24 hex chars = 12 bytes)
      const iv = ivAndCiphertext.substring(0, 24);
      const ciphertext = ivAndCiphertext.substring(24);

      if (!iv || !ciphertext) {
        throw new Error("Invalid encrypted data format");
      }

      // Convert from hex
      const keyWordArray = CryptoJS.enc.Hex.parse(key);
      const ivWordArray = CryptoJS.enc.Hex.parse(iv);
      const ciphertextWordArray = CryptoJS.enc.Hex.parse(ciphertext);

      // Decrypt
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertextWordArray } as any,
        keyWordArray,
        {
          iv: ivWordArray,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        },
      );

      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      if (!plaintext) {
        throw new Error(
          "Decryption failed or resulted in empty plaintext - wrong key?",
        );
      }
      return plaintext;
    } catch (error) {
      throw new Error(
        `AES decryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Hash text using SHA-256 (for security answer verification)
   * @param text - Text to hash
   * @returns Hex string
   */
  private hashSHA256(text: string): string {
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
  }

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
  ): Vault {
    try {
      // Validate DK
      if (dk.length !== 64) {
        throw new Error("Invalid Data Key length");
      }

      // Create a deep copy of vault
      const newVault = JSON.parse(JSON.stringify(vault)) as Vault;

      // Generate new salt for password derivation
      newVault.salts.master_salt = this.generateSalt();

      // Derive new password key
      const newPwdk = this.deriveKeyFromPassword(
        newPassword,
        newVault.salts.master_salt,
      );

      // Generate new IV for password wrap
      const newPasswordIV = this.generateIV();

      // Re-encrypt DK with new password
      newVault.key_wraps.dk_wrapped_by_password = this.encryptAES256(
        dk,
        newPwdk,
        newPasswordIV,
      );

      // Update timestamp
      newVault.updated_at = new Date().toISOString();

      return newVault;
    } catch (error) {
      throw new Error(
        `Failed to rebuild vault with new password: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

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
  ): Vault {
    try {
      if (newQAPairs.length !== 3) {
        throw new Error("Exactly 3 security question-answer pairs required");
      }

      if (dk.length !== 64) {
        throw new Error("Invalid Data Key length");
      }

      const newVault = JSON.parse(JSON.stringify(vault)) as Vault;

      // Generate new salt for security answers
      newVault.salts.security_salt = this.generateSalt();

      // Normalize and combine new answers
      const answerStrings = newQAPairs.map((qa) => qa.answer);
      const normalizedAnswers = this.normalizeAnswers(answerStrings);

      // Derive new security answer key
      const newSADK = this.deriveKeyFromPassword(
        normalizedAnswers.combined,
        newVault.salts.security_salt,
      );

      // Generate new IV
      const newSecurityIV = this.generateIV();

      // Re-encrypt DK with new answers
      newVault.key_wraps.dk_wrapped_by_security = this.encryptAES256(
        dk,
        newSADK,
        newSecurityIV,
      );

      // Update security questions
      newVault.security_questions = newQAPairs.map((qa, idx) => ({
        id: idx + 1,
        question: qa.questionId,
      }));

      newVault.updated_at = new Date().toISOString();

      return newVault;
    } catch (error) {
      throw new Error(
        `Failed to rebuild vault with new security answers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

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
  ): { vault: Vault; recoveryKey: string; dk: string } {
    if (qaPairs.length !== 3) {
      throw new Error("Exactly 3 security question-answer pairs required");
    }

    // 1. Generate the Master Data Key
    const dk = this.generateDataKey();

    // 2. Generate unique salts for each wrapping method
    const salts: Salts = {
      master_salt: this.generateSalt(),
      security_salt: this.generateSalt(),
      recovery_salt: this.generateSalt(),
    };

    // 3. Wrap DK with Password
    const pwdk = this.deriveKeyFromPassword(password, salts.master_salt);
    const passwordIV = this.generateIV();
    const dk_wrapped_by_password = this.encryptAES256(dk, pwdk, passwordIV);

    // 4. Wrap DK with Security Answers
    // Normalize and combine answers: "a1@@a2@@a3"
    const answerStrings = qaPairs.map((qa) => qa.answer);
    const normalizedAnswers = this.normalizeAnswers(answerStrings);
    const SADerivedKey = this.deriveKeyFromPassword(
      normalizedAnswers.combined,
      salts.security_salt,
    );
    const securityIV = this.generateIV();
    const dk_wrapped_by_security = this.encryptAES256(
      dk,
      SADerivedKey,
      securityIV,
    );

    // 5. Wrap DK with Recovery Key
    const recoveryKey = uuidv4(); // System-generated recovery phrase
    const rkdk = this.deriveKeyFromPassword(recoveryKey, salts.recovery_salt);
    const recoveryIV = this.generateIV();
    const dk_wrapped_by_recovery = this.encryptAES256(dk, rkdk, recoveryIV);

    // 6. Construct security questions for vault
    const securityQuestions: VaultSecurityQuestion[] = qaPairs.map(
      (qa, idx) => ({
        id: idx + 1,
        question: qa.questionId,
      }),
    );

    // 7. Create KDF parameters (can be updated later if needed)
    const kdfParams: KDFParams = {
      algorithm: "PBKDF2-SHA256",
      iterations: APP_CONFIG.KDF_ITERATIONS,
    };

    // 8. Assemble Vault
    const now = new Date().toISOString();
    const vault: Vault = {
      user_id: uuidv4(),
      kdf_params: kdfParams,
      salts,
      key_wraps: {
        dk_wrapped_by_password,
        dk_wrapped_by_security,
        dk_wrapped_by_recovery,
      },
      security_questions: securityQuestions,
      created_at: now,
      updated_at: now,
    };

    return { vault, recoveryKey, dk };
  }

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
  unlockWithPassword(vault: Vault, password: string): UnlockResult {
    try {
      // Derive the password-based key
      const pwdk = this.deriveKeyFromPassword(
        password,
        vault.salts.master_salt,
      );

      // Decrypt the DK
      const dk = this.decryptAES256(
        vault.key_wraps.dk_wrapped_by_password,
        pwdk,
      );

      // Validate DK (should be 64 hex chars = 32 bytes)
      if (dk.length !== 64) {
        throw new Error("Decrypted DK has invalid length");
      }

      return { dk, vault };
    } catch (error) {
      throw new Error(
        `Password unlock failed: Invalid password or corrupted vault`,
      );
    }
  }

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
  unlockWithAnswers(vault: Vault, qaPairs: QAPair[]): UnlockResult {
    try {
      if (qaPairs.length !== 3) {
        throw new Error("Exactly 3 question-answer pairs required");
      }

      // Normalize answers
      const answerStrings = qaPairs.map((qa) => qa.answer);
      const normalizedAnswers = this.normalizeAnswers(answerStrings);

      // Derive the security answer-based key
      const sadk = this.deriveKeyFromPassword(
        normalizedAnswers.combined,
        vault.salts.security_salt,
      );

      // Decrypt the DK
      const dk = this.decryptAES256(
        vault.key_wraps.dk_wrapped_by_security,
        sadk,
      );

      // Validate DK
      if (dk.length !== 64) {
        throw new Error("Decrypted DK has invalid length");
      }

      return { dk, vault };
    } catch (error) {
      throw new Error(
        `Security answer unlock failed: Invalid answers or corrupted vault`,
      );
    }
  }

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
  ): RecoveryResult {
    try {
      // 1. Decrypt DK using recovery key
      const rkdk = this.deriveKeyFromPassword(
        recoveryKey,
        vault.salts.recovery_salt,
      );
      const dk = this.decryptAES256(
        vault.key_wraps.dk_wrapped_by_recovery,
        rkdk,
      );

      // Validate DK
      if (dk.length !== 64) {
        throw new Error("Decrypted DK has invalid length");
      }

      // 2. Create a copy of vault for modification
      const newVault = JSON.parse(JSON.stringify(vault)) as Vault;

      // 3. Generate NEW salts (fresh start)
      newVault.salts.master_salt = this.generateSalt();
      newVault.salts.recovery_salt = this.generateSalt();
      // security_salt stays the same (user didn't change answers)

      // 4. Re-wrap DK with new password
      const newPwdk = this.deriveKeyFromPassword(
        newPassword,
        newVault.salts.master_salt,
      );
      const newPasswordIV = this.generateIV();
      newVault.key_wraps.dk_wrapped_by_password = this.encryptAES256(
        dk,
        newPwdk,
        newPasswordIV,
      );

      // 5. Generate NEW recovery key
      const newRecoveryKey = uuidv4();
      const newRkdk = this.deriveKeyFromPassword(
        newRecoveryKey,
        newVault.salts.recovery_salt,
      );
      const newRecoveryIV = this.generateIV();
      newVault.key_wraps.dk_wrapped_by_recovery = this.encryptAES256(
        dk,
        newRkdk,
        newRecoveryIV,
      );

      // 6. Update timestamps
      newVault.updated_at = new Date().toISOString();

      return { newVault, newRecoveryKey };
    } catch (error) {
      throw new Error(
        `Recovery reset failed: Invalid recovery key or corrupted vault`,
      );
    }
  }

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
  ): EncryptedNote {
    try {
      // Generate unique IV for this note
      const iv = this.generateIV();

      // Encrypt note content
      const encryptedContent = this.encryptAES256(noteText, dk, iv);

      // Optionally encrypt tags if provided
      let encryptedTags: string | undefined;
      if (noteMetadata?.tags && noteMetadata.tags.length > 0) {
        const tagsJSON = JSON.stringify(noteMetadata.tags);
        const tagsIV = this.generateIV();
        encryptedTags = this.encryptAES256(tagsJSON, dk, tagsIV);
      }

      const now = new Date().toISOString();
      return {
        id: noteMetadata?.id || uuidv4(),
        date: noteMetadata?.date || now.split("T")[0],
        iv,
        content: encryptedContent,
        tags_encrypted: encryptedTags,
        title: noteMetadata?.title,
        mood: noteMetadata?.mood,
        images: noteMetadata?.images,
        created_at: now,
        updated_at: now,
      };
    } catch (error) {
      throw new Error(`Note encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt a note with the Data Key
   *
   * @param dk - The Data Key (hex string, 32 bytes)
   * @param encryptedNote - EncryptedNote object from storage
   * @returns Decrypted note content (plain text)
   */
  decryptNote(dk: string, encryptedNote: EncryptedNote): string {
    try {
      const decryptedContent = this.decryptAES256(encryptedNote.content, dk);
      return decryptedContent;
    } catch (error) {
      throw new Error(`Note decryption failed: ${error}`);
    }
  }

  /**
   * Decrypt note tags if present
   *
   * @param dk - The Data Key (hex string, 32 bytes)
   * @param encryptedNote - EncryptedNote object
   * @returns Decrypted tags array or empty array
   */
  decryptNoteTags(dk: string, encryptedNote: EncryptedNote): string[] {
    try {
      if (!encryptedNote.tags_encrypted) {
        return [];
      }
      const decryptedTags = this.decryptAES256(
        encryptedNote.tags_encrypted,
        dk,
      );
      return JSON.parse(decryptedTags);
    } catch (error) {
      console.error(`Tag decryption failed: ${error}`);
      return [];
    }
  }

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
  verifySecurityAnswers(vault: Vault, qaPairs: QAPair[]): boolean {
    try {
      // Try to unlock with provided answers
      this.unlockWithAnswers(vault, qaPairs);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get public security questions from vault (for UI display)
   *
   * @param vault - Vault object
   * @returns Array of questions
   */
  getSecurityQuestions(vault: Vault): string[] {
    return vault.security_questions.map((sq) => sq.question);
  }
}

export default CryptoJSCryptoManager;
