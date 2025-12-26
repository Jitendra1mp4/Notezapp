/**
 * QuickCrypto Manager - AES-256-GCM Implementation
 * 
 * Platform: iOS/Android (React Native)
 * Uses: react-native-quick-crypto
 * Encryption: AES-256-GCM (authenticated encryption)
 * Key Derivation: PBKDF2-SHA256
 * 
 * Storage Format: iv(12 bytes hex) + ciphertext(hex) + authTag(16 bytes hex)
 * 
 * All methods are async Promise-based for consistency.
 * 
 * @version 2.0.0 - AES-GCM Migration
 */

import 'react-native-get-random-values';
import QuickCrypto from 'react-native-quick-crypto';
import { v4 as uuidv4 } from 'uuid';
import APP_CONFIG from '../../config/appConfig';
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
import { CryptoServiceProvider } from '../cryptoServiceProvider';
// polyfill imports
import { Buffer } from '@craftzdog/react-native-buffer';

// ==================== Type Definitions ====================

const AUTH_TAG_LENGTH = 16; // 128 bits for GCM auth tag
const AUTH_TAG_LENGTH_HEX = AUTH_TAG_LENGTH * 2; // 32 hex characters

// ==================== Utility Functions ====================


function hexToBuf(hex: string): Buffer {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  return Buffer.from(hex, 'hex');
}

function utf8ToBuf(text: string): Buffer {
  return Buffer.from(text, 'utf8');
}

function generateRandomBytes(sizeInBytes: number): string {
  return QuickCrypto.randomBytes(sizeInBytes).toString('hex');
}

/**
 * PBKDF2-SHA256 key derivation (async wrapped for consistency)
 */
async function deriveKeyFromPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const key = QuickCrypto.pbkdf2Sync(
        utf8ToBuf(password),
        utf8ToBuf(salt), // UTF-8 salt for compatibility
        APP_CONFIG.KDF_ITERATIONS,
        APP_CONFIG.DK_SIZE, // bytes
        'SHA-256'
      );
      resolve(key.toString('hex'));
    } catch (error) {
      reject(error);
    }
  });
}

function hashSHA256(text: string): string {
  return (QuickCrypto as any).createHash('sha256').update(text, 'utf8').digest('hex');
}

// ==================== Main Class ====================

class QuickCryptoCryptoServiceProvider implements CryptoServiceProvider {
  private static obj: QuickCryptoCryptoServiceProvider | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getObject(): QuickCryptoCryptoServiceProvider {
    if (QuickCryptoCryptoServiceProvider.obj === null) {
      QuickCryptoCryptoServiceProvider.obj = new QuickCryptoCryptoServiceProvider();
    }
    return QuickCryptoCryptoServiceProvider.obj;
  }

  // ==================== Random Generation ====================

  async generateSalt(): Promise<string> {
    return generateRandomBytes(APP_CONFIG.SALT_SIZE);
  }

  async generateDataKey(): Promise<string> {
    return generateRandomBytes(APP_CONFIG.DK_SIZE);
  }

  async generateIV(): Promise<string> {
    return generateRandomBytes(APP_CONFIG.IV_SIZE);
  }

  // ==================== Normalization ====================

  private normalizeAnswers(answers: string[]): NormalizedAnswers {
    const normalized = answers.map((a) =>
      a
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
    );
    return {
      combined: normalized.join('∞'),
      individual: normalized,
    };
  }

  // ==================== AES-256-GCM Encryption/Decryption ====================

  /**
   * Encrypt using AES-256-GCM
   * 
   * Format: iv(12 bytes) + ciphertext + authTag(16 bytes)
   * Returns: hex string
   */
  private async encryptAES256GCM(
    plaintext: string,
    keyHex: string,
    ivHex: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const key = hexToBuf(keyHex); // 32 bytes
        const iv = hexToBuf(ivHex); // 12 bytes

        const cipher = QuickCrypto.createCipheriv('aes-256-gcm', key, iv);

        const ciphertext = Buffer.concat([
          cipher.update(plaintext, 'utf8'),
          cipher.final(),
        ]);

        // Get authentication tag (16 bytes)
        const authTag = cipher.getAuthTag();

        // Concatenate: ciphertext + authTag
        const combined = Buffer.concat([ciphertext, authTag]);

        // Storage format: iv + ciphertext + authTag
        resolve(ivHex + combined.toString('hex'));
      } catch (error) {
        reject(
          new Error(
            `AES-GCM encryption failed: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  }

  /**
   * Decrypt using AES-256-GCM
   * 
   * Expects: iv(12 bytes hex) + ciphertext+authTag(hex)
   */
  private async decryptAES256GCM(
    ivAndCiphertextHex: string,
    keyHex: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const ivHexLen = APP_CONFIG.IV_SIZE * 2; // 24 hex chars
        const ivHex = ivAndCiphertextHex.substring(0, ivHexLen);
        const ciphertextWithTagHex = ivAndCiphertextHex.substring(ivHexLen);

        if (!ivHex || !ciphertextWithTagHex) {
          throw new Error('Invalid encrypted data format');
        }

        const key = hexToBuf(keyHex);
        const iv = hexToBuf(ivHex);
        const ciphertextWithTag = hexToBuf(ciphertextWithTagHex);

        // Split ciphertext and auth tag
        // Auth tag is last 16 bytes
        const authTagStart = ciphertextWithTag.length - AUTH_TAG_LENGTH;
        const ciphertext = ciphertextWithTag.subarray(0, authTagStart);
        const authTag = ciphertextWithTag.subarray(authTagStart);

        const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        const plaintext = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]).toString('utf8');

        if (!plaintext) {
          throw new Error('Decryption resulted in empty plaintext - wrong key?');
        }

        resolve(plaintext);
      } catch (error) {
        reject(
          new Error(
            `AES-GCM decryption failed: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  }

  // ==================== Vault Operations ====================

  async initializeVault(
    password: string,
    qaPairs: QAPair[]
  ): Promise<{ vault: Vault; recoveryKey: string; dk: string }> {
    if (qaPairs.length !== 3) {
      throw new Error('Exactly 3 security question-answer pairs required');
    }

    const dk = await this.generateDataKey();

    const salts: Salts = {
      master_salt: await this.generateSalt(),
      security_answer_salt: await this.generateSalt(),
      recovery_salt: await this.generateSalt(),
    };

    const pwdk = await deriveKeyFromPassword(password, salts.master_salt);
    const passwordIV = await this.generateIV();
    const dk_wrapped_by_password = await this.encryptAES256GCM(dk, pwdk, passwordIV);

    const answerStrings = qaPairs.map((qa) => qa.answer);
    const normalizedAnswers = this.normalizeAnswers(answerStrings);
    const SADerivedKey = await deriveKeyFromPassword(
      normalizedAnswers.combined,
      salts.security_answer_salt
    );
    const securityIV = await this.generateIV();
    const dk_wrapped_by_security = await this.encryptAES256GCM(dk, SADerivedKey, securityIV);

    const recoveryKey = uuidv4();
    const rkdk = await deriveKeyFromPassword(recoveryKey, salts.recovery_salt);
    const recoveryIV = await this.generateIV();
    const dk_wrapped_by_recovery = await this.encryptAES256GCM(dk, rkdk, recoveryIV);

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
         dk_wrapped_by_security_ans: dk_wrapped_by_security,
         dk_wrapped_by_recovery,
      },
      security_questions: securityQuestions,
      created_at: now,
      updated_at: now,
    };

    return { vault, recoveryKey, dk };
  }

  async unlockWithPassword(vault: Vault, password: string): Promise<UnlockResult> {
    try {
      const pwdk = await deriveKeyFromPassword(password, vault.salts.master_salt);
      const dk = await this.decryptAES256GCM(vault.key_wraps.dk_wrapped_by_password, pwdk);

      if (dk.length !== 64) {
        throw new Error('Decrypted DK has invalid length');
      }

      return { dk, vault };
    } catch {
      throw new Error('Password unlock failed: Invalid password or corrupted vault');
    }
  }

  async unlockWithAnswers(vault: Vault, qaPairs: QAPair[]): Promise<UnlockResult> {
    try {
      if (qaPairs.length !== 3) {
        throw new Error('Exactly 3 question-answer pairs required');
      }

      const answerStrings = qaPairs.map((qa) => qa.answer);
      const normalizedAnswers = this.normalizeAnswers(answerStrings);
      const sadk = await deriveKeyFromPassword(
        normalizedAnswers.combined,
        vault.salts.security_answer_salt
      );
      const dk = await this.decryptAES256GCM(vault.key_wraps.dk_wrapped_by_security_ans, sadk);

      if (dk.length !== 64) {
        throw new Error('Decrypted DK has invalid length');
      }

      return { dk, vault };
    } catch {
      throw new Error('Security answer unlock failed: Invalid answers or corrupted vault');
    }
  }

  async recoverAndReset(
    vault: Vault,
    recoveryKey: string,
    newPassword: string
  ): Promise<RecoveryResult> {
    try {
      const rkdk = await deriveKeyFromPassword(recoveryKey, vault.salts.recovery_salt);
      const dk = await this.decryptAES256GCM(vault.key_wraps.dk_wrapped_by_recovery, rkdk);

      if (dk.length !== 64) {
        throw new Error('Decrypted DK has invalid length');
      }

      const newVault = JSON.parse(JSON.stringify(vault)) as Vault;
      newVault.salts.master_salt = await this.generateSalt();
      newVault.salts.recovery_salt = await this.generateSalt();

      const newPwdk = await deriveKeyFromPassword(newPassword, newVault.salts.master_salt);
      const newPasswordIV = await this.generateIV();
      newVault.key_wraps.dk_wrapped_by_password = await this.encryptAES256GCM(
        dk,
        newPwdk,
        newPasswordIV
      );

      const newRecoveryKey = uuidv4();
      const newRkdk = await deriveKeyFromPassword(newRecoveryKey, newVault.salts.recovery_salt);
      const newRecoveryIV = await this.generateIV();
      newVault.key_wraps.dk_wrapped_by_recovery = await this.encryptAES256GCM(
        dk,
        newRkdk,
        newRecoveryIV
      );

      newVault.updated_at = new Date().toISOString();

      return { newVault, newRecoveryKey };
    } catch {
      throw new Error('Recovery reset failed: Invalid recovery key or corrupted vault');
    }
  }

  async rebuildVaultWithNewPassword(
    vault: Vault,
    dk: string,
    newPassword: string
  ): Promise<Vault> {
    try {
      if (dk.length !== 64) {
        throw new Error('Invalid Data Key length');
      }

      const newVault = JSON.parse(JSON.stringify(vault)) as Vault;
      newVault.salts.master_salt = await this.generateSalt();

      const newPwdk = await deriveKeyFromPassword(newPassword, newVault.salts.master_salt);
      const newPasswordIV = await this.generateIV();
      newVault.key_wraps.dk_wrapped_by_password = await this.encryptAES256GCM(
        dk,
        newPwdk,
        newPasswordIV
      );

      newVault.updated_at = new Date().toISOString();

      return newVault;
    } catch (error) {
      throw new Error(
        `Failed to rebuild vault with new password: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async rebuildVaultWithNewSecurityAnswers(
    vault: Vault,
    dk: string,
    newQAPairs: QAPair[]
  ): Promise<Vault> {
    try {
      if (newQAPairs.length !== 3) {
        throw new Error('Exactly 3 security question-answer pairs required');
      }

      if (dk.length !== 64) {
        throw new Error('Invalid Data Key length');
      }

      const newVault = JSON.parse(JSON.stringify(vault)) as Vault;
      newVault.salts.security_answer_salt = await this.generateSalt();

      const answerStrings = newQAPairs.map((qa) => qa.answer);
      const normalizedAnswers = this.normalizeAnswers(answerStrings);
      const newSADK = await deriveKeyFromPassword(
        normalizedAnswers.combined,
        newVault.salts.security_answer_salt
      );

      const newSecurityIV = await this.generateIV();
      newVault.key_wraps.dk_wrapped_by_security_ans = await this.encryptAES256GCM(
        dk,
        newSADK,
        newSecurityIV
      );

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

  // ==================== Note Encryption/Decryption ====================

  async encryptNote(
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
  ): Promise<EncryptedNote> {
    try {
      const iv = await this.generateIV();
      const encryptedContent = await this.encryptAES256GCM(noteText, dk, iv);

      let encryptedTags: string | undefined = undefined;
      if (noteMetadata?.tags && noteMetadata.tags.length > 0) {
        const tagsJSON = JSON.stringify(noteMetadata.tags);
        const tagsIV = await this.generateIV();
        encryptedTags = await this.encryptAES256GCM(tagsJSON, dk, tagsIV);
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
      throw new Error(
        `Note encryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async decryptNote(dk: string, encryptedNote: EncryptedNote): Promise<string> {
    try {
      return await this.decryptAES256GCM(encryptedNote.content, dk);
    } catch (error) {
      throw new Error(
        `Note decryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async decryptNoteTags(dk: string, encryptedNote: EncryptedNote): Promise<string[]> {
    try {
      if (!encryptedNote.tags_encrypted) {
        return [];
      }

      const decryptedTags = await this.decryptAES256GCM(encryptedNote.tags_encrypted, dk);
      return JSON.parse(decryptedTags);
    } catch (error) {
      console.error(
        `Tag decryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  // ==================== Utility Methods ====================

  async verifySecurityAnswers(vault: Vault, qaPairs: QAPair[]): Promise<boolean> {
    try {
      await this.unlockWithAnswers(vault, qaPairs);
      return true;
    } catch {
      return false;
    }
  }

  getSecurityQuestions(vault: Vault): string[] {
    return vault.security_questions.map((sq) => sq.question);
  }

  /**
   * Encrypt arbitrary data using AES-256-GCM
   */
  async encryptData(dk: string, plaintext: string): Promise<string> {
    try {
      const iv = await this.generateIV();
      return await this.encryptAES256GCM(plaintext, dk, iv);
    } catch (error) {
      throw new Error(
        `Data encryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Decrypt arbitrary data using AES-256-GCM
   */
  async decryptData(dk: string, encryptedData: string): Promise<string> {
    try {
      return await this.decryptAES256GCM(encryptedData, dk);
    } catch (error) {
      throw new Error(
        `Data decryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export default QuickCryptoCryptoServiceProvider;
