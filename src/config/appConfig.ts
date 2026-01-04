/**
 * Centralized App Configuration
 * All app identifiers, database names, and storage keys derive from a single APP_NAME
 * This ensures consistency across the entire application
 */

// The universal app name - change this to rename everything at once
const APP_NAME = 'Enchronofy';

// Normalized versions for different contexts
// Using replace with global unicode flag to replace all whitespace
// eslint-disable-next-line unicorn/prefer-string-replace-all
const APP_NAME_NORMALIZED = APP_NAME.replace(/\s+/g, '-').toLowerCase(); // e.g., "d-journal-hub"
// eslint-disable-next-line unicorn/prefer-string-replace-all
const APP_NAME_NORMALIZED_UNDERSCORE = APP_NAME.replace(/\s+/g, '_').toLowerCase(); // e.g., "d_journal_hub"
// eslint-disable-next-line unicorn/prefer-string-replace-all
const APP_NAME_SLUG = APP_NAME.replace(/\s+/g, '-'); // e.g., "D-Journal-HUB"
const APP_NAME_PACKAGE = 'enchronofy'; // lowercase, no separators for package name

const IS_DEVELOPMENT:boolean = false ;
const KDF_ITERATIONS =  IS_DEVELOPMENT? 10 : 100999 ;// NIST recommended: 100,000+
const SALT_SIZE = 32; // 256 bits
const DK_SIZE = 32; // 256 bits for AES-256
const IV_SIZE = 12; // 96 bits for GCM
const STORAGE_KEY_PREFIX = `pro_corelogik_journal_app`;

const LOCK_TIMEOUT_OPTIONS = [
  { label: '1 Minute', value: 60000 },
  { label: '5 Minutes', value: 300000 },
  { label: '15 Minutes', value: 900000 },
  { label: '30 Minutes', value: 1800000 },
  { label: '1 Hour', value: 3600000 },
];

export const APP_CONFIG = {

  IS_DEVELOPMENT,

  // Display name
  displayName:  "Enchronofy", // APP_NAME,

  // Normalized versions for different use cases
  slug: APP_NAME_SLUG, // For expo slug
  packageName: `pro.corelogik.${APP_NAME_PACKAGE}`, // Android package name
  scheme: APP_NAME_PACKAGE, // Deep linking scheme
  SQLITE_PREFERENCES_DB_NAME : `pro.corelogik.preferences.db`,
  
  // we want to make db name independent of app name
  SQLITE_VAULT_DB_NAME: `pro.corelogik.journal_app.db`, 

  APP_TAGLINE:`Your Vault for Feelings, thoughts, Emotions and Memories`,

  // Storage key prefix - used for AsyncStorage and other storage mechanisms
  STORAGE_KEY_PREFIX, // e.g., "@d_journal_hub"

  KDF_ITERATIONS ,
  SALT_SIZE ,
  DK_SIZE ,
  IV_SIZE ,

  LOCK_TIMEOUT_OPTIONS, 

  // Storage keys - all derived from the prefix
  STORAGE_KEYS: {
    VAULT: `@${STORAGE_KEY_PREFIX}_vault`,
    PREFERENCE_DB_KEY:`@${STORAGE_KEY_PREFIX}_preferences`,
    RECOVERY_KEY_DISPLAY: `@${STORAGE_KEY_PREFIX}_recovery_key_display`,
    MASTER_KEY_SALT: `@${STORAGE_KEY_PREFIX}_master_key_salt`,
    SECURITY_ANS_SALT: `@${STORAGE_KEY_PREFIX}_security_ans_key_salt`,
    RECOVERY_KEY_SALT: `@${STORAGE_KEY_PREFIX}_recovery_key_salt`,
    SECURITY_QUESTIONS: `@${STORAGE_KEY_PREFIX}_security_questions`,
    SECURITY_ANSWERS_HASH: `@${STORAGE_KEY_PREFIX}_security_answers_hash`,
    JOURNALS: `@${STORAGE_KEY_PREFIX}_journals`,
    SETTINGS: `@${STORAGE_KEY_PREFIX}_settings`,
    FIRST_LAUNCH: `@${STORAGE_KEY_PREFIX}_first_launch`,
    VERIFICATION_TOKEN: `@${STORAGE_KEY_PREFIX}_verification_token`,
    MIGRATION_COMPLETE_V1: `${STORAGE_KEY_PREFIX}_migration_complete_v1`,
  },
};

export default APP_CONFIG;
