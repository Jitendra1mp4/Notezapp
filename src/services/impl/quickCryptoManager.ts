/**
 * CryptoManager: Core cryptographic operations for Centralized Data Key architecture
 *
 * Migrated from crypto-js to react-native-quick-crypto without changing:
 * - Public method signatures
 * - Storage formats (hex strings)
 * - Encrypted payload layout: ivHex + ciphertextHex
 */

import 'react-native-get-random-values';
import QuickCrypto from 'react-native-quick-crypto';
import { v4 as uuidv4 } from 'uuid';

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
} from '../../types/crypto';

import APP_CONFIG from '../../config/appConfig';
import { UnifiedCryptoManager } from '../unifiedCryptoManager';

class RNQuickCryptoManager implements UnifiedCryptoManager {
  
  
  static obj: RNQuickCryptoManager | null = null;

  private constructor() {}

  // Singleton object
  static getObject(): RNQuickCryptoManager {
    if (RNQuickCryptoManager.obj == null) {
      RNQuickCryptoManager.obj = new RNQuickCryptoManager();
    }
    return RNQuickCryptoManager.obj;
  }
   
  // -------------------------
  // Internal helpers
  // -------------------------

  private  hexToBuf(hex: string): Buffer {
    if (hex.length % 2 !== 0) {
      throw new Error('Invalid hex string length');
    }
    return Buffer.from(hex, 'hex');
  }

  private  utf8ToBuf(text: string): Buffer {
    return Buffer.from(text, 'utf8');
  }

  /**
   * Your app historically uses a 12-byte IV (24 hex chars) even for CBC.
   * Node/OpenSSL AES-CBC requires a 16-byte IV, so we pad with zeros internally.
   *
   * IMPORTANT: We do NOT change what gets stored. We only pad for the cipher call.
   */
  private  normalizeCbcIv(ivRaw: Buffer): Buffer {
    if (ivRaw.length === 16) return ivRaw;
    if (ivRaw.length > 16) return ivRaw.subarray(0, 16);
    return Buffer.concat([ivRaw, Buffer.alloc(16 - ivRaw.length, 0)]);
  }

  /**
   * Generate cryptographically secure random bytes
   * @param sizeInBytes - Number of bytes to generate
   * @returns Hex string
   */
  private  generateRandomBytes(sizeInBytes: number): string {
    return QuickCrypto.randomBytes(sizeInBytes).toString('hex');
  }

   generateSalt(): string {
    return this.generateRandomBytes(APP_CONFIG.SALT_SIZE);
  }

   generateDataKey(): string {
    return this.generateRandomBytes(APP_CONFIG.DK_SIZE);
  }

   generateIV(): string {
    return this.generateRandomBytes(APP_CONFIG.IV_SIZE);
  }

  /**
   * PBKDF2-SHA256
   *
   * COMPATIBILITY NOTE:
   * Your CryptoJS version passed `salt` as a string, which CryptoJS treats as UTF-8 text,
   * not hex-decoded bytes. To preserve behavior, salt is used as UTF-8 here too.
   */
  private  deriveKeyFromPassword(password: string, salt: string): string {
   
    const key = QuickCrypto.pbkdf2Sync(
      this.utf8ToBuf(password),
      this.utf8ToBuf(salt), // keep UTF-8 salt semantics for compatibility
      APP_CONFIG.KDF_ITERATIONS,
      APP_CONFIG.DK_SIZE, // bytes
      'SHA-256'
    );
    return key.toString('hex');
  }

  private  normalizeAnswers(answers: string[]): NormalizedAnswers {
    const normalized = answers.map(a =>
      a
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
    );

    return {
      combined: normalized.join('@@'),
      individual: normalized,
    };
  }

  /**
   * Encrypt data using AES-256-CBC with PKCS7 padding.
   * Storage format remains: ivHex (APP_CONFIG.IV_SIZE bytes) + ciphertextHex
   */
  private  encryptAES256(plaintext: string, keyHex: string, ivHex: string): string {
    try {
      const key = this.hexToBuf(keyHex); // 32 bytes
      const ivRaw = this.hexToBuf(ivHex); // historically 12 bytes in your app
      const iv = this.normalizeCbcIv(ivRaw); // padded to 16 bytes for OpenSSL

      const cipher = QuickCrypto.createCipheriv('aes-256-cbc', key, iv);
      cipher.setAutoPadding(true);

      const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]).toString('hex');

      return ivHex + ciphertext;
    } catch (error) {
      throw new Error(
        `AES encryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Decrypt data using AES-256-CBC with PKCS7 padding.
   * Expects format: ivHex + ciphertextHex (where ivHex is APP_CONFIG.IV_SIZE bytes).
   */
  private  decryptAES256(ivAndCiphertextHex: string, keyHex: string): string {
    try {
      const ivHexLen = APP_CONFIG.IV_SIZE * 2;
      const ivHex = ivAndCiphertextHex.substring(0, ivHexLen);
      const ciphertextHex = ivAndCiphertextHex.substring(ivHexLen);

      if (!ivHex || !ciphertextHex) {
        throw new Error('Invalid encrypted data format');
      }

      const key = this.hexToBuf(keyHex);
      const ivRaw = this.hexToBuf(ivHex);
      const iv = this.normalizeCbcIv(ivRaw);

      const decipher = QuickCrypto.createDecipheriv('aes-256-cbc', key, iv);
      decipher.setAutoPadding(true);

      const plaintext = Buffer.concat([
        decipher.update(this.hexToBuf(ciphertextHex)),
        decipher.final(),
      ]).toString('utf8');

      if (!plaintext) {
        throw new Error('Decryption failed or resulted in empty plaintext - wrong key?');
      }

      return plaintext;
    } catch (error) {
      throw new Error(
        `AES decryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }


  
  private  hashSHA256(text: string): string {
      return (QuickCrypto as any).createHash('sha256').update(text, 'utf8').digest('hex');
  }
  // ============================================================================
  // PUBLIC METHODS: Vault Operations
  // ============================================================================

   rebuildVaultWithNewPassword(vault: Vault, dk: string, newPassword: string): Vault {
    try {
      if (dk.length !== 64) throw new Error('Invalid Data Key length');

      const newVault = JSON.parse(JSON.stringify(vault)) as Vault;

      newVault.salts.master_salt = this.generateSalt();

      const newPwdk = this.deriveKeyFromPassword(newPassword, newVault.salts.master_salt);

      const newPasswordIV = this.generateIV();

      newVault.key_wraps.dk_wrapped_by_password = this.encryptAES256(dk, newPwdk, newPasswordIV);

      newVault.updated_at = new Date().toISOString();
      return newVault;
    } catch (error) {
      throw new Error(
        `Failed to rebuild vault with new password: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

   rebuildVaultWithNewSecurityAnswers(vault: Vault, dk: string, newQAPairs: QAPair[]): Vault {
    try {
      if (newQAPairs.length !== 3) throw new Error('Exactly 3 security question-answer pairs required');
      if (dk.length !== 64) throw new Error('Invalid Data Key length');

      const newVault = JSON.parse(JSON.stringify(vault)) as Vault;

      newVault.salts.security_salt = this.generateSalt();

      const answerStrings = newQAPairs.map(qa => qa.answer);
      const normalizedAnswers = this.normalizeAnswers(answerStrings);

      const newSADK = this.deriveKeyFromPassword(normalizedAnswers.combined, newVault.salts.security_salt);

      const newSecurityIV = this.generateIV();

      newVault.key_wraps.dk_wrapped_by_security = this.encryptAES256(dk, newSADK, newSecurityIV);

      newVault.security_questions = newQAPairs.map((qa, idx) => ({
        id: idx + 1,
        question: qa.questionId,
      }));

      newVault.updated_at = new Date().toISOString();
      return newVault;
    } catch (error) {
      throw new Error(
        `Failed to rebuild vault with new security answers: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

   initializeVault(password: string, qaPairs: QAPair[]): { vault: Vault; recoveryKey: string; dk: string } {
    if (qaPairs.length !== 3) throw new Error('Exactly 3 security question-answer pairs required');

    const dk = this.generateDataKey();

    const salts: Salts = {
      master_salt: this.generateSalt(),
      security_salt: this.generateSalt(),
      recovery_salt: this.generateSalt(),
    };

    const pwdk = this.deriveKeyFromPassword(password, salts.master_salt);
    const passwordIV = this.generateIV();
    const dk_wrapped_by_password = this.encryptAES256(dk, pwdk, passwordIV);

    const answerStrings = qaPairs.map(qa => qa.answer);
    const normalizedAnswers = this.normalizeAnswers(answerStrings);
    const SADerivedKey = this.deriveKeyFromPassword(normalizedAnswers.combined, salts.security_salt);
    const securityIV = this.generateIV();
    const dk_wrapped_by_security = this.encryptAES256(dk, SADerivedKey, securityIV);

    const recoveryKey = uuidv4();
    const rkdk = this.deriveKeyFromPassword(recoveryKey, salts.recovery_salt);
    const recoveryIV = this.generateIV();
    const dk_wrapped_by_recovery = this.encryptAES256(dk, rkdk, recoveryIV);

    const securityQuestions: VaultSecurityQuestion[] = qaPairs.map((qa, idx) => ({
      id: idx + 1,
      question: qa.questionId,
    }));

    const kdfParams: KDFParams = {
      algorithm: 'PBKDF2-SHA256',
      iterations: APP_CONFIG.KDF_ITERATIONS,
    };

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

   unlockWithPassword(vault: Vault, password: string): UnlockResult {
    try {
      const pwdk = this.deriveKeyFromPassword(password, vault.salts.master_salt);
      const dk = this.decryptAES256(vault.key_wraps.dk_wrapped_by_password, pwdk);

      if (dk.length !== 64) throw new Error('Decrypted DK has invalid length');
      return { dk, vault };
    } catch {
      throw new Error(`Password unlock failed: Invalid password or corrupted vault`);
    }
  }

   unlockWithAnswers(vault: Vault, qaPairs: QAPair[]): UnlockResult {
    try {
      if (qaPairs.length !== 3) throw new Error('Exactly 3 question-answer pairs required');

      const answerStrings = qaPairs.map(qa => qa.answer);
      const normalizedAnswers = this.normalizeAnswers(answerStrings);

      const sadk = this.deriveKeyFromPassword(normalizedAnswers.combined, vault.salts.security_salt);

      const dk = this.decryptAES256(vault.key_wraps.dk_wrapped_by_security, sadk);

      if (dk.length !== 64) throw new Error('Decrypted DK has invalid length');
      return { dk, vault };
    } catch {
      throw new Error(`Security answer unlock failed: Invalid answers or corrupted vault`);
    }
  }

   recoverAndReset(vault: Vault, recoveryKey: string, newPassword: string): RecoveryResult {
    try {
      const rkdk = this.deriveKeyFromPassword(recoveryKey, vault.salts.recovery_salt);
      const dk = this.decryptAES256(vault.key_wraps.dk_wrapped_by_recovery, rkdk);

      if (dk.length !== 64) throw new Error('Decrypted DK has invalid length');

      const newVault = JSON.parse(JSON.stringify(vault)) as Vault;

      newVault.salts.master_salt = this.generateSalt();
      newVault.salts.recovery_salt = this.generateSalt();

      const newPwdk = this.deriveKeyFromPassword(newPassword, newVault.salts.master_salt);
      const newPasswordIV = this.generateIV();
      newVault.key_wraps.dk_wrapped_by_password = this.encryptAES256(dk, newPwdk, newPasswordIV);

      const newRecoveryKey = uuidv4();
      const newRkdk = this.deriveKeyFromPassword(newRecoveryKey, newVault.salts.recovery_salt);
      const newRecoveryIV = this.generateIV();
      newVault.key_wraps.dk_wrapped_by_recovery = this.encryptAES256(dk, newRkdk, newRecoveryIV);

      newVault.updated_at = new Date().toISOString();
      return { newVault, newRecoveryKey };
    } catch {
      throw new Error(`Recovery reset failed: Invalid recovery key or corrupted vault`);
    }
  }

  // ============================================================================
  // PUBLIC METHODS: Note Encryption/Decryption
  // ============================================================================

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
  ): EncryptedNote {
    try {
      const iv = this.generateIV();

      // NOTE: content remains "ivHex + ciphertextHex" (same as before)
      const encryptedContent = this.encryptAES256(noteText, dk, iv);

      let encryptedTags: string | undefined;
      if (noteMetadata?.tags && noteMetadata.tags.length > 0) {
        const tagsJSON = JSON.stringify(noteMetadata.tags);
        const tagsIV = this.generateIV();
        encryptedTags = this.encryptAES256(tagsJSON, dk, tagsIV);
      }

      const now = new Date().toISOString();
      return {
        id: noteMetadata?.id || uuidv4(),
        date: noteMetadata?.date || now.split('T')[0],
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
      throw new Error(`Note encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

   decryptNote(dk: string, encryptedNote: EncryptedNote): string {
    try {
      return this.decryptAES256(encryptedNote.content, dk);
    } catch (error) {
      throw new Error(`Note decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

   decryptNoteTags(dk: string, encryptedNote: EncryptedNote): string[] {
    try {
      if (!encryptedNote.tags_encrypted) return [];
      const decryptedTags = this.decryptAES256(encryptedNote.tags_encrypted, dk);
      return JSON.parse(decryptedTags);
    } catch (error) {
      console.error(`Tag decryption failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

   verifySecurityAnswers(vault: Vault, qaPairs: QAPair[]): boolean {
    try {
      this.unlockWithAnswers(vault, qaPairs);
      return true;
    } catch {
      return false;
    }
  }

   getSecurityQuestions(vault: Vault): string[] {
    return vault.security_questions.map(sq => sq.question);
  }
}

export default RNQuickCryptoManager;
