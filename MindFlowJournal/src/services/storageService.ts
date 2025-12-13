import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptJSON, decryptJSON, encryptText } from './encryptionService';
import { Journal, SecurityQuestion } from '../types';

// Storage keys
const KEYS = {
  SALT: '@mindflow_salt',
  SECURITY_QUESTIONS: '@mindflow_security_questions',
  SECURITY_ANSWERS_HASH: '@mindflow_security_answers_hash', // ADD THIS
  JOURNALS: '@mindflow_journals',
  SETTINGS: '@mindflow_settings',
  FIRST_LAUNCH: '@mindflow_first_launch',
  VERIFICATION_TOKEN: '@mindflow_verification_token',
};

/**
 * Check if this is the first app launch
 */
export const isFirstLaunch = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.FIRST_LAUNCH);
    return value === null;
  } catch (error) {
    console.error('Error checking first launch:', error);
    return false;
  }
};

/**
 * Mark app as launched
 */
export const markAsLaunched = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.FIRST_LAUNCH, 'true');
  } catch (error) {
    console.error('Error marking as launched:', error);
  }
};

/**
 * Save the salt used for key derivation
 */
export const saveSalt = async (salt: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.SALT, salt);
  } catch (error) {
    console.error('Error saving salt:', error);
    throw new Error('Failed to save encryption salt');
  }
};

/**
 * Get the stored salt
 */
export const getSalt = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(KEYS.SALT);
  } catch (error) {
    console.error('Error getting salt:', error);
    return null;
  }
};

/**
 * Save security questions (encrypted)
 */
export const saveSecurityQuestions = async (
  questions: SecurityQuestion[],
  key: string
): Promise<void> => {
  try {
    const encrypted = encryptJSON(key, questions);
    await AsyncStorage.setItem(KEYS.SECURITY_QUESTIONS, encrypted);
  } catch (error) {
    console.error('Error saving security questions:', error);
    throw new Error('Failed to save security questions');
  }
};

/**
 * Get security questions (decrypted)
 */
export const getSecurityQuestions = async (
  key: string
): Promise<SecurityQuestion[] | null> => {
  try {
    const encrypted = await AsyncStorage.getItem(KEYS.SECURITY_QUESTIONS);
    if (!encrypted) return null;
    
    return decryptJSON(key, encrypted) as SecurityQuestion[];
  } catch (error) {
    console.error('Error getting security questions:', error);
    return null;
  }
};

/**
 * Save security answer hashes (unencrypted for recovery)
 */
export const saveSecurityAnswerHashes = async (
  answerHashes: Array<{ questionId: string; answerHash: string }>
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      KEYS.SECURITY_ANSWERS_HASH,
      JSON.stringify(answerHashes)
    );
  } catch (error) {
    console.error('Error saving answer hashes:', error);
    throw new Error('Failed to save security answer hashes');
  }
};

/**
 * Get security answer hashes (for verification during recovery)
 */
export const getSecurityAnswerHashes = async (): Promise<
  Array<{ questionId: string; answerHash: string }> | null
> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SECURITY_ANSWERS_HASH);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting answer hashes:', error);
    return null;
  }
};

/**
 * Get security questions without decryption (for recovery flow)
 * Returns only the questions, not the hashed answers
 */
export const getSecurityQuestionsForRecovery = async (): Promise<
  Array<{ questionId: string; question: string }> | null
> => {
  try {
    // We need to store a separate unencrypted copy of just the questions
    const questionsOnly = await AsyncStorage.getItem(
      KEYS.SECURITY_QUESTIONS + '_public'
    );
    if (!questionsOnly) return null;
    
    return JSON.parse(questionsOnly);
  } catch (error) {
    console.error('Error getting security questions for recovery:', error);
    return null;
  }
};

/**
 * Save public copy of security questions (just the question text)
 */
export const savePublicSecurityQuestions = async (
  questions: Array<{ questionId: string; question: string }>
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      KEYS.SECURITY_QUESTIONS + '_public',
      JSON.stringify(questions)
    );
  } catch (error) {
    console.error('Error saving public security questions:', error);
    throw new Error('Failed to save security questions');
  }
};

/**
 * Save a journal entry (encrypted)
 */
export const saveJournal = async (
  journal: Journal,
  key: string
): Promise<void> => {
  try {
    const journals = await listJournals(key);
    const existingIndex = journals.findIndex(j => j.id === journal.id);
    
    if (existingIndex >= 0) {
      journals[existingIndex] = journal;
    } else {
      journals.push(journal);
    }
    
    const encrypted = encryptJSON(key, journals);
    await AsyncStorage.setItem(KEYS.JOURNALS, encrypted);
  } catch (error) {
    console.error('Error saving journal:', error);
    throw new Error('Failed to save journal');
  }
};

/**
 * Get a single journal by ID
 */
export const getJournal = async (
  id: string,
  key: string
): Promise<Journal | null> => {
  try {
    const journals = await listJournals(key);
    return journals.find(j => j.id === id) || null;
  } catch (error) {
    console.error('Error getting journal:', error);
    return null;
  }
};

/**
 * List all journals (decrypted)
 */
export const listJournals = async (key: string): Promise<Journal[]> => {
  try {
    const encrypted = await AsyncStorage.getItem(KEYS.JOURNALS);
    if (!encrypted) return [];
    
    return decryptJSON(key, encrypted) as Journal[];
  } catch (error) {
    console.error('Error listing journals:', error);
    throw new Error('Failed to load journals - wrong password?');
  }
};

/**
 * Delete a journal
 */
export const deleteJournal = async (
  id: string,
  key: string
): Promise<void> => {
  try {
    const journals = await listJournals(key);
    const filtered = journals.filter(j => j.id !== id);
    
    const encrypted = encryptJSON(key, filtered);
    await AsyncStorage.setItem(KEYS.JOURNALS, encrypted);
  } catch (error) {
    console.error('Error deleting journal:', error);
    throw new Error('Failed to delete journal');
  }
};

/**
 * Re-encrypt all data with a new key (used when password changes)
 */
export const reEncryptAllData = async (
  oldKey: string,
  newKey: string
): Promise<void> => {
  try {
    // Re-encrypt journals
    const journals = await listJournals(oldKey);
    const encryptedJournals = encryptJSON(newKey, journals);
    await AsyncStorage.setItem(KEYS.JOURNALS, encryptedJournals);
    
    // Re-encrypt security questions
    const securityQuestions = await getSecurityQuestions(oldKey);
    if (securityQuestions) {
      const encryptedQuestions = encryptJSON(newKey, securityQuestions);
      await AsyncStorage.setItem(KEYS.SECURITY_QUESTIONS, encryptedQuestions);
    }
  } catch (error) {
    console.error('Error re-encrypting data:', error);
    throw new Error('Failed to re-encrypt data - please try again');
  }
};


export const saveVerificationToken = async (key: string): Promise<void> => {
  try {
    const verificationData = {
      timestamp: new Date().toISOString(),
      verified: true,
    };
    const encrypted = encryptJSON(key, verificationData);
    await AsyncStorage.setItem(KEYS.VERIFICATION_TOKEN, encrypted);
  } catch (error) {
    console.error('Error saving verification token:', error);
    throw new Error('Failed to save verification token');
  }
};

/**
 * Verify password by trying to decrypt the verification token
 */
export const verifyPassword = async (key: string): Promise<boolean> => {
  try {
    const encrypted = await AsyncStorage.getItem(KEYS.VERIFICATION_TOKEN);
    if (!encrypted) {
      // No token stored yet - this shouldn't happen in production
      return true; // Allow for backward compatibility
    }
    
    const decrypted = decryptJSON(key, encrypted);
    return decrypted && decrypted.verified === true;
  } catch (error) {
    // Decryption failed = wrong password
    return false;
  }
};

/**
 * Clear all app data (for testing or reset)
 */
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.SALT,
      KEYS.SECURITY_QUESTIONS,
      KEYS.SECURITY_QUESTIONS + '_public',
      KEYS.JOURNALS,
      KEYS.SETTINGS,
      KEYS.FIRST_LAUNCH,
    ]);
  } catch (error) {
    console.error('Error clearing data:', error);
    throw new Error('Failed to clear data');
  }
};
