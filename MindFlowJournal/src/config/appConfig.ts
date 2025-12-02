/**
 * Centralized App Configuration
 * All app identifiers, database names, and storage keys derive from a single APP_NAME
 * This ensures consistency across the entire application
 */

// The universal app name - change this to rename everything at once
const APP_NAME = 'D Journal HUB';

// Normalized versions for different contexts
// Using replace with global unicode flag to replace all whitespace
// eslint-disable-next-line unicorn/prefer-string-replace-all
const APP_NAME_NORMALIZED = APP_NAME.replace(/\s+/g, '-').toLowerCase(); // e.g., "d-journal-hub"
// eslint-disable-next-line unicorn/prefer-string-replace-all
const APP_NAME_NORMALIZED_UNDERSCORE = APP_NAME.replace(/\s+/g, '_').toLowerCase(); // e.g., "d_journal_hub"
// eslint-disable-next-line unicorn/prefer-string-replace-all
const APP_NAME_SLUG = APP_NAME.replace(/\s+/g, '-'); // e.g., "D-Journal-HUB"
const APP_NAME_PACKAGE = 'djournalhub'; // lowercase, no separators for package name

export const APP_CONFIG = {
  // Display name
  displayName: APP_NAME,

  // Normalized versions for different use cases
  slug: APP_NAME_SLUG, // For expo slug
  packageName: `pro.corelogik.${APP_NAME_PACKAGE}`, // Android package name
  scheme: APP_NAME_PACKAGE, // Deep linking scheme

  // Database configuration
  dbName: `${APP_NAME_NORMALIZED_UNDERSCORE}.db`, // e.g., "d_journal_hub.db"

  // Storage key prefix - used for AsyncStorage and other storage mechanisms
  storageKeyPrefix: `@${APP_NAME_NORMALIZED_UNDERSCORE}`, // e.g., "@d_journal_hub"

  // Storage keys - all derived from the prefix
  storageKeys: {
    VAULT: `@${APP_NAME_NORMALIZED_UNDERSCORE}_vault`,
    RECOVERY_KEY_DISPLAY: `@${APP_NAME_NORMALIZED_UNDERSCORE}_recovery_key_display`,
    MASTER_KEY_SALT: `@${APP_NAME_NORMALIZED_UNDERSCORE}_master_key_salt`,
    SECURITY_ANS_SALT: `@${APP_NAME_NORMALIZED_UNDERSCORE}_security_ans_key_salt`,
    RECOVERY_KEY_SALT: `@${APP_NAME_NORMALIZED_UNDERSCORE}_recovery_key_salt`,
    SECURITY_QUESTIONS: `@${APP_NAME_NORMALIZED_UNDERSCORE}_security_questions`,
    SECURITY_ANSWERS_HASH: `@${APP_NAME_NORMALIZED_UNDERSCORE}_security_answers_hash`,
    JOURNALS: `@${APP_NAME_NORMALIZED_UNDERSCORE}_journals`,
    SETTINGS: `@${APP_NAME_NORMALIZED_UNDERSCORE}_settings`,
    FIRST_LAUNCH: `@${APP_NAME_NORMALIZED_UNDERSCORE}_first_launch`,
    VERIFICATION_TOKEN: `@${APP_NAME_NORMALIZED_UNDERSCORE}_verification_token`,
    MIGRATION_COMPLETE_V1: `${APP_NAME_NORMALIZED_UNDERSCORE}_migration_complete_v1`,
  },
};

export default APP_CONFIG;
