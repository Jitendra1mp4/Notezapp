import type { Journal } from '../types';
import { EncryptedBackupPayload } from '../types/crypto';
import { getCryptoProvider } from './cryptoServiceProvider';

type ExportedJournalsPayload = {
  version?: string;
  appName?: string;
  exportDate?: string;
  totalEntries?: number;
  journals?: unknown;
};

export type ImportMode = 'skip-duplicates' | 'overwrite-duplicates';

export const parseExportedJournals = async (
  jsonText: string, 
  password?: string
): Promise<Journal[]> => {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Invalid JSON format');
  }

  // ✅ Auto-detect Encrypted Backup
  if (parsed.type === 'encrypted_backup') {
    if (!password) {
      throw new Error('PASSWORD_REQUIRED'); // Signal UI to ask for password
    }

    const backupPayload = parsed as EncryptedBackupPayload;
    const CryptoManager = getCryptoProvider();

    try {
      const decryptedString = await CryptoManager.decryptStringWithPassword(
        password,
        backupPayload.data,
        backupPayload.salt,
        backupPayload.iv
      );
      
      // Parse the decrypted inner JSON
      parsed = JSON.parse(decryptedString);
    } catch (error) {
      throw new Error('Invalid Password');
    }
  }

  // --- Standard Import Logic ---

  if (!parsed || !Array.isArray(parsed.journals)) {
    throw new Error('Invalid file: missing journals[]');
  }

  const now = new Date().toISOString();

  const journals = (parsed.journals as any[])
    .filter((j) => j && typeof j.id === 'string' && typeof j.text === 'string')
    .map(
      (j): Journal => ({
        id: String(j.id),
        date: typeof j.date === 'string' ? j.date : now,
        createdAt: typeof j.createdAt === 'string' ? j.createdAt : now,
        updatedAt: typeof j.updatedAt === 'string' ? j.updatedAt : now,
        title: typeof j.title === 'string' ? j.title : undefined,
        text: String(j.text ?? ''),
        mood: typeof j.mood === 'string' ? j.mood : undefined,
        images: Array.isArray(j.images) ? j.images.filter((x:unknown) => typeof x === 'string') : undefined,
      }),
    );

  return journals;
};
