/**
 * Cryptographic Types for Vault-based Security Architecture
 * Based on Centralized Data Key (DK) design pattern
 */

/**
 * Key Derivation Function Parameters
 * Stored in Vault for consistency across decryption attempts
 */
export interface KDFParams {
  algorithm: 'Argon2id' | 'PBKDF2-SHA256';
  iterations: number;
  memory?: number; // For Argon2id
}

/**
 * Random salts used in key derivation
 * Each salt is unique and used for specific key wrapping purposes
 */
export interface Salts {
  master_salt: string; // For password-derived key
  security_answer_salt: string; // For security answer-derived key
  recovery_salt: string; // For recovery key-derived key
}

/**
 * Three different encrypted copies of the Data Key (DK)
 * Each can independently decrypt to the same DK
 */
export interface KeyWraps {
  dk_wrapped_by_password: string; // AES-256-GCM(DK, PWDK)
  dk_wrapped_by_security_ans: string; // AES-256-GCM(DK, SADK)
  dk_wrapped_by_recovery: string; // AES-256-GCM(DK, RKDK)
}

/**
 * Security Question structure stored in Vault
 * Questions are public; answers are hashed for verification
 */
export interface VaultSecurityQuestion {
  id: number;
  question: string;
}

/**
 * Main Vault Structure
 * Contains all key material needed to unlock access to data
 * Stored in database or secure storage
 */
export interface Vault {
  user_id: string;
  kdf_params: KDFParams;
  salts: Salts;
  key_wraps: KeyWraps;
  security_questions: VaultSecurityQuestion[];
  created_at: string; // ISO8601 timestamp
  updated_at: string; // ISO8601 timestamp
}

/**
 * Encrypted Note Structure
 * Each note is encrypted independently with its own IV
 */
export interface EncryptedNote {
  id: string;
  date: string;
  iv: string; // Unique random IV for this note
  content: string; // AES-256-GCM(note text, key=DK, iv=iv)
  tags_encrypted?: string; // AES-256-GCM(tags JSON, key=DK, iv=iv)
  title?: string;
  mood?: string;
  images?: string[]; // For now, can remain unencrypted or encrypted separately
  created_at: string;
  updated_at: string;
}

/**
 * Return type for recovery flow
 */
export interface RecoveryResult {
  newVault: Vault;
  newRecoveryKey: string; // Display this to user
}

/**
 * Return type for unlock operations
 */
export interface UnlockResult {
  dk: string; // The decrypted Data Key (hex string, 32 bytes)
  vault: Vault; // The vault object
}

/**
 * QA Pair for security questions
 * Used during registration and recovery
 */
export interface QAPair {
  questionId: string;
  answer: string;
}

/**
 * Answer normalization result
 */
export interface NormalizedAnswers {
  combined: string; // "answer1@@answer2@@answer3"
  individual: string[]; // Normalized individual answers
}
