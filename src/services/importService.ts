// src/services/importService.ts
import type { Journal } from '../types';

type ExportedJournalsPayload = {
  version?: string;
  appName?: string;
  exportDate?: string;
  totalEntries?: number;
  journals?: unknown;
};

export type ImportMode = 'skip-duplicates' | 'overwrite-duplicates';

export const parseExportedJournals = (jsonText: string): Journal[] => {
  const parsed = JSON.parse(jsonText) as ExportedJournalsPayload;

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
