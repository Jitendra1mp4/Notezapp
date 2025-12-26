/**
 * Web Crypto Manager - AES-256-GCM Implementation
 * 
 * Platform: Web only
 * Uses: window.crypto.subtle (SubtleCrypto API)
 * Encryption: AES-256-GCM (authenticated encryption)
 * Key Derivation: PBKDF2-SHA256
 * 
 * Storage Format: iv(12 bytes hex) + ciphertext(hex) + authTag(16 bytes hex)
 * 
 * All methods are async Promise-based.
 * 
 * @version 2.0.0 - AES-GCM Migration
 */

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

const subtle = window.crypto.subtle;
const cryptoAPI = window.crypto;

// ==================== Type Definitions ====================

const AUTH_TAG_LENGTH = 16; // 128 bits for GCM auth tag
const AUTH_TAG_LENGTH_HEX = AUTH_TAG_LENGTH * 2; // 32 hex characters

// ==================== Utility Functions ====================

function bufToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const len = hex.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out.buffer;
}

function utf8ToBuf(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

function bufToUtf8(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(sizeInBytes: number): string {
  const bytes = new Uint8Array(sizeInBytes);
  cryptoAPI.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * PBKDF2-SHA256 key derivation
 * @param password - Password or passphrase
 * @param salt - Salt string (used as UTF-8)
 * @returns Promise<string> - Derived key as hex string
 */
async function deriveKeyFromPassword(
  password: string,
  salt: string
): Promise<string> {
  const passwordKey = await subtle.importKey(
    'raw',
    utf8ToBuf(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  console.log('time before key derivation', new Date())
  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: utf8ToBuf(salt), // Salt as UTF-8 for compatibility
      iterations: APP_CONFIG.KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    APP_CONFIG.DK_SIZE * 8 // bits
  );
  console.log('time after key derivation',new Date())

  return bufToHex(bits);
}

/**
 * SHA-256 hash
 */
async function hashSHA256(text: string): Promise<string> {
  const digest = await subtle.digest('SHA-256', utf8ToBuf(text));
  return bufToHex(digest);
}

// ==================== Main Class ====================

class WebCryptoServiceProvider implements CryptoServiceProvider {
  private static obj: WebCryptoServiceProvider | null = null;

  private constructor() {
    // Private constructor for singleton
  }
  getSecurityQuestions(vault: Vault): string[] {
    throw new Error('Method not implemented.');
  }

  static getObject(): WebCryptoServiceProvider {
    if (WebCryptoServiceProvider.obj === null) {
      WebCryptoServiceProvider.obj = new WebCryptoServiceProvider();
    }
    return WebCryptoServiceProvider.obj;
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
        .replace(/\s+/g, ' ') // Collapse multiple spaces
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
    try {
      const keyBuf = hexToBuf(keyHex);
      const ivBuf = hexToBuf(ivHex);

      const cryptoKey = await subtle.importKey(
        'raw',
        keyBuf,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // AES-GCM returns ciphertext + auth tag concatenated
      const encryptedBuf = await subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: ivBuf,
          tagLength: 128, // 128-bit auth tag
        },
        cryptoKey,
        utf8ToBuf(plaintext)
      );

      const encryptedHex = bufToHex(encryptedBuf);

      // Storage format: iv + ciphertext+authTag
      return ivHex + encryptedHex;
    } catch (error) {
      throw new Error(
        `AES-GCM encryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Decrypt using AES-256-GCM
   * 
   * Expects: iv(12 bytes hex) + ciphertext+authTag(hex)
   */
  private async decryptAES256GCM(
    ivAndCipherTextHex: string,
    keyHex: string
  ): Promise<string> {
    try {
      const ivHexLen = APP_CONFIG.IV_SIZE * 2; // 24 hex chars
      const ivHex = ivAndCipherTextHex.substring(0, ivHexLen);
      const cipherTextWithTagHex = ivAndCipherTextHex.substring(ivHexLen);

      if (!ivHex || !cipherTextWithTagHex) {
        throw new Error('Invalid encrypted data format');
      }

      const keyBuf = hexToBuf(keyHex);
      const ivBuf = hexToBuf(ivHex);
      const cipherTextWithTagBuf = hexToBuf(cipherTextWithTagHex);

      const cryptoKey = await subtle.importKey(
        'raw',
        keyBuf,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Decrypt (GCM automatically verifies auth tag)
      const plaintextBuf = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuf,
          tagLength: 128,
        },
        cryptoKey,
        cipherTextWithTagBuf
      );

      const plaintext = bufToUtf8(plaintextBuf);

      if (!plaintext) {
        throw new Error('Decryption resulted in empty plaintext - wrong key?');
      }

      return plaintext;
    } catch (error) {
      throw new Error(
        `AES-GCM decryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ==================== Vault Operations ====================

  async initializeVault(
    password: string,
    qaPairs: QAPair[]
  ): Promise<{ vault: Vault; recoveryKey: string; dk: string }> {
    if (qaPairs.length !== 3) {
      throw new Error('Exactly 3 security question-answer pairs required');
    }

    // 1. Generate the Master Data Key
    const dk = await this.generateDataKey();

    // 2. Generate unique salts
    const salts: Salts = {
      master_salt: await this.generateSalt(),
      security_answer_salt: await this.generateSalt(),
      recovery_salt: await this.generateSalt(),
    };

    // 3. Wrap DK with Password
    const passwordDerivedKey = await deriveKeyFromPassword(password, salts.master_salt);
    const passwordIV = await this.generateIV();
    const dk_wrapped_by_password = await this.encryptAES256GCM(dk, passwordDerivedKey, passwordIV);

    // 4. Wrap DK with Security Answers
    const answerStrings = qaPairs.map((qa) => qa.answer);
    const normalizedAnswers = this.normalizeAnswers(answerStrings);
    const SADerivedKey = await deriveKeyFromPassword(
      normalizedAnswers.combined,
      salts.security_answer_salt
    );
    const securityIV = await this.generateIV();
    const dk_wrapped_by_security = await this.encryptAES256GCM(dk, SADerivedKey, securityIV);

    // 5. Wrap DK with Recovery Key
    const recoveryKey = uuidv4();
    const recoveryKeyDerivedKey = await deriveKeyFromPassword(recoveryKey, salts.recovery_salt);
    const recoveryIV = await this.generateIV();
    const dk_wrapped_by_recovery = await this.encryptAES256GCM(dk, recoveryKeyDerivedKey, recoveryIV);

    // 6. Construct security questions
    const security_questions: VaultSecurityQuestion[] = qaPairs.map((qa, idx) => ({
      id: idx + 1,
      question: qa.questionId,
    }));

    // 7. Create KDF parameters
    const kdfParams: KDFParams = {
      algorithm: 'PBKDF2-SHA256',
      iterations: APP_CONFIG.KDF_ITERATIONS,
    };

    // 8. Assemble Vault
    const now = new Date().toISOString();
    const vault: Vault = {
      user_id: uuidv4(),
      kdf_params: kdfParams,
      salts,
      key_wraps: {
        dk_wrapped_by_password: dk_wrapped_by_password,
        dk_wrapped_by_security_ans: dk_wrapped_by_security,
        dk_wrapped_by_recovery: dk_wrapped_by_recovery,
      },
      security_questions: security_questions,
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
      const securityAnswerDerivedKey = await deriveKeyFromPassword(
        normalizedAnswers.combined,
        vault.salts.security_answer_salt
      );
      const dk = await this.decryptAES256GCM(vault.key_wraps.dk_wrapped_by_security_ans, securityAnswerDerivedKey);

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
      // 1. Decrypt DK using recovery key
      const recoveryKeyDerivedKey = await deriveKeyFromPassword(recoveryKey, vault.salts.recovery_salt);
      const dk = await this.decryptAES256GCM(vault.key_wraps.dk_wrapped_by_recovery, recoveryKeyDerivedKey);

      if (dk.length !== 64) {
        throw new Error('Decrypted DK has invalid length');
      }

      // 2. Create a copy of vault
      const newVault = JSON.parse(JSON.stringify(vault)) as Vault;

      // 3. Generate NEW salts
      newVault.salts.master_salt = await this.generateSalt();
      newVault.salts.recovery_salt = await this.generateSalt();

      // 4. Re-wrap DK with new password
      const newPwdk = await deriveKeyFromPassword(newPassword, newVault.salts.master_salt);
      const newPasswordIV = await this.generateIV();
      newVault.key_wraps.dk_wrapped_by_password = await this.encryptAES256GCM(
        dk,
        newPwdk,
        newPasswordIV
      );

      // 5. Generate NEW recovery key
      const newRecoveryKey = uuidv4();
      const newRkdk = await deriveKeyFromPassword(newRecoveryKey, newVault.salts.recovery_salt);
      const newRecoveryIV = await this.generateIV();
      newVault.key_wraps.dk_wrapped_by_recovery = await this.encryptAES256GCM(
        dk,
        newRkdk,
        newRecoveryIV
      );

      // 6. Update timestamp
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

  get_security_questions(vault: Vault): string[] {
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

export default WebCryptoServiceProvider;
