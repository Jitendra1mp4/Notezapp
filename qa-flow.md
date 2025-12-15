Summary

Goal: Explain how security-question answers are stored and how the "Forgot Password" flow verifies them.
Files inspected: storageService.ts, encryptionService.ts, securityQuestions.ts, SignupScreen.tsx, ForgotPasswordScreen.tsx.
What is stored where

Salt: @mindflow_salt via saveSalt / getSalt (in storageService.ts).
Encrypted security questions + answer hashes: @mindflow_security_questions — saved encrypted with the user's encryption key using saveSecurityQuestions (Signup encrypts SecurityQuestion[] with encryptJSON).
Public (unencrypted) questions: @mindflow_security_questions_public (the code uses KEYS.SECURITY_QUESTIONS + '_public') — stores just the question text and questionId for recovery UI via savePublicSecurityQuestions / getSecurityQuestionsForRecovery.
Answer hashes (plaintext JSON): @mindflow_security_answers_hash — an array of { questionId, answerHash } saved via saveSecurityAnswerHashes and read during recovery with getSecurityAnswerHashes.
Verification token: @mindflow_verification_token — an encrypted token (JSON with verified: true) encrypted with the user's key; saved with saveVerificationToken.
How answers are hashed & verified

Hashing: hashText in encryptionService.ts computes SHA256(text.toLowerCase().trim()) and returns a hex string.
Signup: SignupScreen hashes each answer with hashText and:
embeds the answerHash inside the encrypted securityQuestions object; and
also stores a separate array of answer hashes (questionId + answerHash) unencrypted via saveSecurityAnswerHashes.
Verification (Forgot Password):
ForgotPasswordScreen loads the public questions (getSecurityQuestionsForRecovery), the answer hashes (getSecurityAnswerHashes), and the salt (getSalt).
For each user-supplied answer, it calls verifyHash(userAnswer, storedHash) which recomputes hashText(userAnswer) and compares to the stored hash.
If all hashes match, the UI allows the user to set a new password.
Critical behavior in the password reset step

After successful verification, the flow:
Derives a NEW key from the new password.
Attempts to re-encrypt existing data by calling reEncryptAllData(oldKey, newKey).
To obtain oldKey it calls deriveKeyFromPassword('temp', oldSalt) — i.e., uses the literal string 'temp' plus the saved salt.
If reEncryptAllData fails, it catches the error and continues, then saves the new salt and verification token, sets authenticated state and stores the new key in context.
Security issues & correctness concerns (important)

Answer hashes stored unencrypted: The unencrypted @mindflow_security_answers_hash JSON makes offline brute-forcing of answers easy. Security-question answers are low-entropy and vulnerable to guessing.
Weak hashing for answers: Using a plain SHA-256 (hashText) without per-answer salt or iterations is inadequate for low-entropy secrets. No per-answer salt or KDF increases risk of offline cracking.
Re-encryption logic is broken / unsafe:
The code derives oldKey from the literal password 'temp' and saved salt — this is not the user's password. That means reEncryptAllData will generally fail to decrypt existing data (unless someone used 'temp' as password), and the code ignores that failure. Effect: previously encrypted user data (journals) remains encrypted with the old key and becomes inaccessible to the user after they set a new password.
There is no secure mechanism to re-wrap the data encryption key (DEK) using the recovery answers — the app cannot re-encrypt previously encrypted data without the original password or a separately protected DEK.
PBKDF2 iteration count: PBKDF2_ITERATIONS is set to 1000 (commented out 100000). 1000 is too low for modern security (should be tens or hundreds of thousands).
Verification token not used for recovery: A verifyPassword method exists (it decrypts the token with a key to check password correctness) but the forgot flow does not use it to validate anything — verification is purely based on answer hashes.
Answer normalization: hashText lowercases and trims answers — this is user-friendly but must be documented since it changes sensitivity (e.g., "New York" and "new york" become same). This may be desired, but it should be explicit.
Recommended fixes / improvements

Short-term immediate fixes:
Stop attempting to re-encrypt data using a fake oldKey. Either:
Remove the reEncryptAllData attempt during recovery (avoid corrupting or making users think data is migrated), or
Block password reset unless there is a way to recover the original key (see below).
Do not store @mindflow_security_answers_hash unencrypted. At minimum encrypt answer-hashes with a key derived from the user's password, or better, use a protected wrapping key.
Increase PBKDF2_ITERATIONS to a secure value (e.g., >= 100,000) and consider using a stronger KDF provided by platform native APIs (or libs like libsodium).
Better, secure design (recommended architecture change):
Introduce a Data Encryption Key (DEK):
On account creation, generate a random DEK used to encrypt journals and any sensitive data.
Encrypt (wrap) the DEK with:
KEK_password: key derived from the user's password (using PBKDF2/Scrypt/Argon2 with a strong iteration/tuning).
KEK_recovery: key derived from the user's recovery answers (combine the normalized answers with a salt and run them through a KDF with iterations).
Store:
wrappedDEK_password (encrypted with password KEK),
wrappedDEK_recovery (encrypted with recovery KEK),
public questions (for UI).
Recovery flow:
When user answers questions, derive KEK_recovery (use a salted, iterated KDF).
Use wrappedDEK_recovery to unwrap the DEK — if successful, you obtain the DEK and can re-wrap it with KEK_password derived from the new password (so you don't need the old password).
This allows re-encrypting data keys without ever knowing the old password.
Use per-answer salt and a strong KDF for the recovery-derived KEK (not plain SHA-256), and store the per-answer salt(s) — or better, derive KEK_recovery from the concatenation of normalized answers plus a recovery salt.
Rate-limit recovery attempts and add exponential backoff / attempt counters to mitigate brute force.
Consider storing verification artifacts in secure device storage when available (Keychain / Keystore) rather than AsyncStorage.
Quick actionable fixes I can make now (pick any):

Fix the immediate bug: replace deriveKeyFromPassword('temp', oldSalt) with either:
Remove the reEncryptAllData call; or
Implement DEK-wrapping and use it to re-wrap data reliably.
Encrypt the @mindflow_security_answers_hash item (wrap with AES using a locally stored key or password-derived key).
Increase PBKDF2 iterations to a secure default (e.g., 100,000).
Replace hashText usage with a slow KDF (e.g., PBKDF2 with per-answer salt) if you continue to rely on stored hashes for offline verification.
Next steps / Offer

I can:
Implement the immediate safety patch (stop re-encrypt attempt or fix the 'temp' bug) — quick change.
Or implement the DEK-wrapping recovery design (requires adding wrapped DEK storage, changes in signup/login/recovery flows) — more work but secure and correct.
Or encrypt the stored answer-hash data and increase KDF iterations.
Which would you like me to do first? I recommend we either (A) implement DEK wrapping (best) or (B) at minimum fix the oldKey bug + encrypt stored answer-hashes (fast).
If you want, I can start by making the small fix now (update ForgotPasswordScreen to not use 'temp' and either skip reEncryptAllData or add an explicit warning). Which option do you