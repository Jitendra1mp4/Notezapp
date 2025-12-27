import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, HelperText, Portal, RadioButton, Text, TextInput, useTheme } from 'react-native-paper'; // Added Dialog, Portal, TextInput
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImportMode, parseExportedJournals } from '../services/importService';
import { getVaultStorageProvider } from '../services/vaultStorageProvider';
import { useAppDispatch, useAppSelector } from '../stores/hooks';
import { setJournals } from '../stores/slices/journalsSlice';
import { setIsExportImportInProgress } from '../stores/slices/settingsSlice';
import { Alert } from '../utils/alert';
import { resolveImmediately } from "../utils/immediatePromiseResolver";

const VaultStorageProvider = getVaultStorageProvider()

const ImportScreen: React.FC<{navigation: any;}> = (navigation: any) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const encryptionKey = useAppSelector((s) => s.auth.encryptionKey);

  const [mode, setMode] = useState<ImportMode>('skip-duplicates');
  const [isImporting, setIsImporting] = useState(false);
  const [lastInfo, setLastInfo] = useState<string>('');

  // Password Dialog State
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [pendingJsonText, setPendingJsonText] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const canImport = useMemo(() => !!encryptionKey && !isImporting, [encryptionKey, isImporting]);

  const readJsonFromPicker = async (): Promise<string | null> => {
    // ... (Keep existing Web/Native logic)
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'application/json,.json';
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

    const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/json', 'public.json', '*/*'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
  };

  const handleImport = async () => {
    if (!encryptionKey) { Alert.alert('Oops!', 'Encryption key not found.'); return; }

    setIsImporting(true);
    setLastInfo('');
    
    // ✅ YIELD TO UI
    await new Promise(resolve => resolveImmediately(resolve));

    try {
      dispatch(setIsExportImportInProgress(true));
      const jsonText = await readJsonFromPicker();
      if (!jsonText) {
        setIsImporting(false);
        return;
      }

      // Try initial import (might require password)
      await processImport(jsonText);
    } catch (e: any) {
      if (e.message === 'PASSWORD_REQUIRED' && pendingJsonText) {
         // UI already handled in catch block below? No, handling here.
         // Actually processImport throws, we catch here.
      } else {
        console.error('Import failed:', e);
        Alert.alert('Import failed', e?.message ?? 'Invalid file.');
        setIsImporting(false);
      }
    } finally {
      dispatch(setIsExportImportInProgress(true));
    }
  };

  const processImport = async (jsonText: string, password?: string) => {
    try {
      // 1. Parse & Decrypt
      const imported = await parseExportedJournals(jsonText, password);

      // 2. Save
      const existing = await VaultStorageProvider.listJournals(encryptionKey!);
      const existingIds = new Set(existing.map((j) => j.id));

      let importedCount = 0;
      let skipped = 0;

      for (const j of imported) {
        if (existingIds.has(j.id) && mode === 'skip-duplicates') { skipped++; continue; }
        await VaultStorageProvider.saveJournal(j, encryptionKey!);
        importedCount++;
      }

      const refreshed = await VaultStorageProvider.listJournals(encryptionKey!);
      dispatch(setJournals(refreshed));

      setLastInfo(`Imported: ${importedCount}, Skipped: ${skipped}`);
      Alert.alert('Import complete', `Imported: ${importedCount}\nSkipped: ${skipped}`);
      
      // Cleanup
      setPendingJsonText(null);
      setImportPassword("");
      setIsImporting(false);
      // navigation.navigate("JournalList")


    } catch (error: any) {
       if (error.message === 'PASSWORD_REQUIRED') {
         setPendingJsonText(jsonText);
         setShowPasswordDialog(true);
         // Do NOT set isImporting false yet
       } else {
         throw error;
       }
    }
  };

  const handlePasswordSubmit = () => {
    setShowPasswordDialog(false);
    if (pendingJsonText) {
      // Retry import with password
      processImport(pendingJsonText, importPassword).catch(e => {
        setIsImporting(false);
        if (e.message === 'Invalid Password') {
             Alert.alert("Oops!", "Incorrect password. Import failed.");
        } else {
             Alert.alert("Error", e.message); 
        }
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge">Import from JSON</Text>
            <HelperText type="info">Import regular JSON or Encrypted Backup files.</HelperText>
            
            <Text variant="titleMedium" style={{ marginTop: 12 }}>Duplicate handling</Text>
            <RadioButton.Group value={mode} onValueChange={(v) => setMode(v as ImportMode)}>
              <RadioButton.Item label="Skip duplicates (keep existing)" value="skip-duplicates" />
              <RadioButton.Item label="Overwrite duplicates" value="overwrite-duplicates" />
            </RadioButton.Group>

            <Button mode="contained" onPress={handleImport} disabled={!canImport} loading={isImporting}>
              {isImporting ? 'Processing...' : 'Pick File & Import'}
            </Button>
            {!!lastInfo && <HelperText type="info">{lastInfo}</HelperText>}
          </Card.Content>
        </Card>
      </View>

      {/* ✅ PASSWORD DIALOG */}
      <Portal>
        <Dialog visible={showPasswordDialog} onDismiss={() => {
          setShowPasswordDialog(false);
          setIsImporting(false);
          setPendingJsonText(null);
        }}>
          <Dialog.Title>Encrypted Backup</Dialog.Title>
          <Dialog.Content>
             <Text variant="bodyMedium" style={{marginBottom: 10}}>
              This file is password protected.
            </Text>
            <TextInput
              label="Enter Password"
              value={importPassword}
              onChangeText={setImportPassword}
              secureTextEntry={!isPasswordVisible}
              right={<TextInput.Icon icon={isPasswordVisible ? "eye-off" : "eye"} onPress={() => setIsPasswordVisible(!isPasswordVisible)} />}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setShowPasswordDialog(false); setIsImporting(false); }}>Cancel</Button>
            <Button onPress={handlePasswordSubmit}>Decrypt</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>


       {/* <ExportPasswordDialog 
        visible={showPasswordDialog}
        onDismiss={() => {
          setShowPasswordDialog(false);
          setIsImporting(false);
          setPendingJsonText(null);
        }}
        onSubmit={(password)=>handlePasswordSubmit()}
      /> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  card: { marginBottom: 16 },
});

export default ImportScreen;
