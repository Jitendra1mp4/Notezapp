This is a comprehensive **low-level design specification** for an Expo React Native application. You can hand this document directly to a developer or feed it into a coding LLM to generate the specific functions.

***

# Secure Journal: Cryptographic Protocol & Implementation Guide
**Platform:** Expo / React Native
**Key Concept:** Centralized Data Key (DK) wrapped by multiple access methods.

## 1. Core Terminology & Key Hierarchy

All data is encrypted by **one** random Master Data Key. Access methods (Password, Security Answers, Recovery Key) simply decrypt this one key.

### The Keys
1.  **DK (Data Key):** 32-byte random sequence. **NEVER** stored in plaintext. This encrypts the actual notes.
2.  **PWDK (Password Derived Key):** Derived from User Password + Salt.
3.  **SADK (Security Answer Derived Key):** Derived from User’s Custom Answers + Salt.
4.  **RKDK (Recovery Key Derived Key):** Derived from a System-Generated Recovery Phrase + Salt.

### The Encrypted Vault (Stored in Async Storage  Database)
<!-- ### The Encrypted Vault (stored in Database) -->
The "Vault" is a JSON object that stores the DK in three different locked boxes.
```json
{
  "user_id": "uuid-v4",
  "kdf_params": {
    "algorithm": "Argon2id", // or PBKDF2-SHA256 if Argon not supported
    "iterations": 100000,
    "memory": 65536
  },
  "salts": {
    "master_salt": "random_32_bytes_hex",
    "security_salt": "random_32_bytes_hex",
    "recovery_salt": "random_32_bytes_hex"
  },
  "key_wraps": {
    "dk_wrapped_by_password": "AES_GCM(DK, key=PWDK)",
    "dk_wrapped_by_security": "AES_GCM(DK, key=SADK)",
    "dk_wrapped_by_recovery": "AES_GCM(DK, key=RKDK)"
  },
  "security_questions": [
    {"id": 1, "question": "What is your pet's name?"},
    {"id": 2, "question": "City where you met your spouse?"}
    {"id": 3, "question": "Place where your x?"}
  ],
  
  "created_at": "ISO8601_timestamp",
  "updated_at": "ISO8601_timestamp"
}
```

***

## 2. Recommended Technology Stack (Expo/RN)
*   **Crypto Operations:** `react-native-quick-crypto` (Faster, complete node crypto polyfill)
*   **Storage:** `expo-secure-store` (for small sensitive tokens) + `AsyncStorage` (for the encrypted notes database).
<!-- *   **Storage:** `expo-secure-store` (for small sensitive tokens) + `AsyncStorage` / `SQLite` (for the encrypted notes database). -->
<!-- *   **State Management:** React Context or Zustand (to hold the decrypted `DK` in memory while app is open). -->

***

## 3. Cryptographic Primitives (The Rules)
*   **Encryption:** AES-256-GCM.
    *   *Why:* Authenticated encryption. If the password is wrong, decryption fails instantly (throws error), confirming "Wrong Password" without needing a separate hash check.
*   **Key Derivation (KDF):** PBKDF2 with high iteration count.
*   **Security Answer Format:** Normalize before hashing.
    *   Convert to lowercase -> Trim whitespace -> Concatenate with separator.
    *   Format: `answer1@@answer2@@answer3`

***

## 4. Implementation Flows

### A. User Registration (Setup)
**Inputs:** `UserPassword`, `[ {Q1, A1}, {Q2, A2}, {Q3, A3} ]`
 where Q is can be chosen from provided answer or entered by the user and A is necessary
1.  **Generate DK:** Generate 32 bytes of secure random data.
2.  **Generate Salts:** Generate 3 unique random salts (`master_salt`, `security_salt`, `recovery_salt`).
3.  **Wrap with Password:**
    *   Derive `PWDK` = `KDF(UserPassword, master_salt)`.
    *   `dk_wrapped_by_password` = `Encrypt(DK, key=PWDK)`.
4.  **Wrap with Security Answers:**
    *   Normalize Answers: `combined_string` = "a1@@a2@@a3".
    *   Derive `SADK` = `KDF(combined_string, security_salt)`.
    *   `dk_wrapped_by_security` = `Encrypt(DK, key=SADK)`.
5.  **Wrap with Recovery Key:**
    *   Generate `RecoveryPhrase` UUID. *Display this to user once and guid to write it down*
    *   Derive `RKDK` = `KDF(RecoveryPhrase, recovery_salt)`.
    *   `dk_wrapped_by_recovery` = `Encrypt(DK, key=RKDK)`.
6.  **Save:** Store the Vault object (Salts, Wrapped Keys, Questions) to DB.
7.  **State:** Store `DK` in App Memory. User is logged in.

### B. Standard Login (Password)
**Inputs:** `UserPassword`

1.  Fetch Vault from DB.
2.  Derive `PWDK` = `KDF(UserPassword, master_salt)`.
3.  Attempt Decrypt: `AES_Decrypt(dk_wrapped_by_password, key=PWDK)`.
4.  **Success:** Result is `DK`. Store in Memory. Grant Access.
5.  **Failure:** "Invalid Password".

### C. Security Answer Login (No Reset)
*Scenario: User forgot password or prefers Q/A login. They want to browse/edit notes.*
**Inputs:** `[Answer1, Answer2]`

1.  Fetch Vault from DB.
2.  Normalize inputs -> `combined_string`.
3.  Derive `SADK` = `KDF(combined_string, security_salt)`.
4.  Attempt Decrypt: `AES_Decrypt(dk_wrapped_by_security, key=SADK)`.
5.  **Success:** Result is `DK`. Store in Memory.
6.  **UX Note:** The user is now logged in. They can read/write notes because they have the `DK`.
    *   *Constraint:* They cannot view the old password (it's a hash).
    *   *Constraint:* If they want to change the password now, they can (because they have the `DK` to re-encrypt), but you don't *force* it.

### D. Recovery Key Reset (Forced Reset)
*Scenario: Catastrophic loss. User inputs the long secret key.*
**Inputs:** `RecoveryPhrase`

1.  Fetch Vault from DB.
2.  Derive `RKDK` = `KDF(RecoveryPhrase, recovery_salt)`.
3.  Attempt Decrypt: `AES_Decrypt(dk_wrapped_by_recovery, key=RKDK)`.
4.  **Success:** Result is `DK`.
5.  **Forced Flow - Rotate Credentials:**
    *   **Step 5a (New Password):** Ask user for `NewPassword`.
        *   Derive `New_PWDK`.
        *   Update `dk_wrapped_by_password` = `Encrypt(DK, key=New_PWDK)`.
    *   **Step 5b (New Recovery Key):** Generate `NewRecoveryPhrase`.
        *   Derive `New_RKDK`.
        *   Update `dk_wrapped_by_recovery` = `Encrypt(DK, key=New_RKDK)`.
        *   **Alert:** Show user the new Recovery Phrase. Invalidate the old one.
6.  Save updated Vault to DB.

***

## 5. Note Encryption/Storage Schema
Since we have the `DK` in memory, saving notes is simple. We do **not** re-derive keys for every note.

**Note Object Structure:**
```json
{
  "id": "unique_id",
  "date": "2025-11-25",
  "iv": "unique_random_iv_for_this_note", 
  "content": "AES_GCM_Encrypt(Text, key=DK, iv=this_iv)",
  "tags_encrypted": "AES_GCM_Encrypt(JSON_Tags, key=DK, iv=this_iv)"
}
```
*   **Read:** `Decrypt(content, key=DK, iv=iv)`
*   **Write:** `Encrypt(content, key=DK, iv=new_random_iv)`

***

## 6. Security Checklist for Developer

1.  **Memory Hygiene:** When the user logs out or the app goes to background for > 5 mins, wipe the `DK` from the React State/Context.
2.  **Normalization:** Ensure `Trim()` and `ToLowerCase()` are applied to security answers strictly. " Paris " and "paris" must result in the same Hash.
3.  **Salt Uniqueness:** Never reuse salts. If the user changes their security questions, generate a NEW `security_salt`.
4.  **Recovery Key Rotation:** Crucial requirement. If a user uses the Recovery Key, assume that key is compromised (maybe they wrote it down and lost it). Always generate a new one upon use.

