### Sprint 2 - Authentication & Recovery (2025-10-26)

#### Added
- Encryption service using PBKDF2 (100k iterations) for key derivation
- AES-256 encryption for all journal data and security questions
- SHA-256 hashing for security question answers
- Encrypted storage service with AsyncStorage
- Functional signup screen with password creation and security questions
- Functional login screen with password verification
- Password recovery screen with security question verification
- Auth context for managing encryption key during user session
- 10 predefined security questions
- Re-encryption support for password changes

#### Security
- All journal data encrypted at rest
- Password never stored (only salt and encrypted data)
- Security question answers hashed with SHA-256
- Key derivation uses PBKDF2 with 100,000 iterations
