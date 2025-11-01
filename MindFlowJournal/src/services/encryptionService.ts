import CryptoJS from 'crypto-js';
import 'react-native-get-random-values';

// const PBKDF2_ITERATIONS = 100000; // High iteration count for security
const PBKDF2_ITERATIONS = 1000; // High iteration count for security
const KEY_SIZE = 256 / 32; // 256 bits = 8 words (32-bit)
const SALT_SIZE = 128 / 8; // 128 bits = 16 bytes

export interface DerivedKey {
  key: string;
  salt: string;
}

/**
 * Generate a random salt for key derivation
 */
export const generateSalt = (): string => {
  const salt = CryptoJS.lib.WordArray.random(SALT_SIZE);
  // return "jitendra kumar s"//salt.toString(CryptoJS.enc.Hex);
  return salt.toString(CryptoJS.enc.Hex);
};


/**
 * Derive an encryption key from a password using PBKDF2
 * @param password - User's password
 * @param salt - Salt (if not provided, generates a new one)
 * @returns Object containing the derived key and salt
 */
export const deriveKeyFromPassword = (
  password: string,
  salt?: string
): DerivedKey => {
  const saltToUse = salt || generateSalt();
  
  const key = CryptoJS.PBKDF2(password, saltToUse, {
    keySize: KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
  });

  return {
    key: key.toString(CryptoJS.enc.Hex),
    salt: saltToUse,
  };
};

/**
 * Encrypt a JSON object using AES
 * @param key - Encryption key (hex string)
 * @param data - Object to encrypt
 * @returns Encrypted ciphertext (base64 string)
 */
export const encryptJSON = (key: string, data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, key);
    return encrypted.toString(); // Returns base64 ciphertext
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt a ciphertext back to JSON object
 * @param key - Encryption key (hex string)
 * @param ciphertext - Encrypted data (base64 string)
 * @returns Decrypted object
 */
export const decryptJSON = (key: string, ciphertext: string): any => {
  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!jsonString) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - wrong password or corrupted data');
  }
};

/**
 * Encrypt a string (for simple text encryption)
 * @param key - Encryption key
 * @param text - Plain text to encrypt
 * @returns Encrypted ciphertext
 */
export const encryptText = (key: string, text: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, key);
    return encrypted.toString();
  } catch (error) {
    console.error('Text encryption error:', error);
    throw new Error('Failed to encrypt text');
  }
};

/**
 * Decrypt a ciphertext to plain text
 * @param key - Encryption key
 * @param ciphertext - Encrypted text
 * @returns Decrypted plain text
 */
export const decryptText = (key: string, ciphertext: string): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key);
    const text = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!text) {
      throw new Error('Decryption failed');
    }
    
    return text;
  } catch (error) {
    console.error('Text decryption error:', error);
    throw new Error('Failed to decrypt text');
  }
};

/**
 * Hash a string using SHA-256 (for security question answers)
 * @param text - Text to hash
 * @returns Hash (hex string)
 */
export const hashText = (text: string): string => {
  return CryptoJS.SHA256(text.toLowerCase().trim()).toString(CryptoJS.enc.Hex);
};

/**
 * Verify if a text matches a hash
 * @param text - Text to verify
 * @param hash - Hash to compare against
 * @returns True if match, false otherwise
 */
export const verifyHash = (text: string, hash: string): boolean => {
  const computedHash = hashText(text);
  return computedHash === hash;
};
