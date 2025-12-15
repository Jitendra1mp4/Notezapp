// src/screens/Import/ImportScreen.tsx
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, RadioButton, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImportMode, parseExportedJournals } from '../services/importService';
import { listJournals, saveJournal } from '../services/unifiedStorageService';
import { useAppDispatch, useAppSelector } from '../stores/hooks';
import { setJournals } from '../stores/slices/journalsSlice';
import { Alert } from '../utils/alert';


const ImportScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const encryptionKey = useAppSelector((s) => s.auth.encryptionKey);

  const [mode, setMode] = useState<ImportMode>('skip-duplicates');
  const [isImporting, setIsImporting] = useState(false);
  const [lastInfo, setLastInfo] = useState<string>('');

  const canImport = useMemo(() => !!encryptionKey && !isImporting, [encryptionKey, isImporting]);

  const readJsonFromPicker = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return resolve(null);

          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ''));
          reader.onerror = () => resolve(null);
          reader.readAsText(file);
        };
        input.click();
      });
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', 'public.json', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
  };

  const handleImport = async () => {
    if (!encryptionKey) {
      Alert.alert('Oops!', 'Encryption key not found. Please log in again.');
      return;
    }

    setIsImporting(true);
    setLastInfo('');

    try {
      const jsonText = await readJsonFromPicker();
      if (!jsonText) return;

      const imported = parseExportedJournals(jsonText);

      const existing = await listJournals(encryptionKey);
      const existingIds = new Set(existing.map((j) => j.id));

      let importedCount = 0;
      let skipped = 0;

      for (const j of imported) {
        const isDup = existingIds.has(j.id);

        if (isDup && mode === 'skip-duplicates') {
          skipped++;
          continue;
        }

        await saveJournal(j, encryptionKey);
        importedCount++;
      }

      const refreshed = await listJournals(encryptionKey);
      dispatch(setJournals(refreshed));

      setLastInfo(`Imported: ${importedCount}, Skipped: ${skipped}`);
      Alert.alert('Import complete', `Imported: ${importedCount}\nSkipped: ${skipped}`);
    } catch (e: any) {
      console.error('Import failed:', e);
      Alert.alert('Import failed', e?.message ?? 'Invalid file or corrupted JSON.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge">Import from JSON</Text>

            <HelperText type="info">
              This will import the same JSON structure created by Export as JSON.
            </HelperText>

            <Text variant="titleMedium" style={{ marginTop: 12 }}>
              Duplicate handling
            </Text>

            <RadioButton.Group value={mode} onValueChange={(v) => setMode(v as ImportMode)}>
              <RadioButton.Item label="Skip duplicates (keep existing)" value="skip-duplicates" />
              <RadioButton.Item label="Overwrite duplicates (use imported)" value="overwrite-duplicates" />
            </RadioButton.Group>

            <Button mode="contained" onPress={handleImport} disabled={!canImport} loading={isImporting}>
              {isImporting ? 'Importing…' : 'Pick JSON and Import'}
            </Button>

            {!!lastInfo && <HelperText type="info">{lastInfo}</HelperText>}
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  card: { marginBottom: 16 },
});

export default ImportScreen;
