import { setIsExportImportInProgress } from "@/src/stores/slices/settingsSlice";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Checkbox,
  Chip,
  ProgressBar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExportPasswordDialog } from "../../components/common/ExportPasswordDialog";
// ✅ Import the shared generator function
import { generateExportFile, shareFile } from "../../services/exportService";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { Alert } from "../../utils/alert";
import { resolveImmediately } from "../../utils/immediatePromiseResolver";

// Helper type to match the service
type ExportFormat = 'json' | 'pdf' | 'text' | 'encrypted';

const ExportScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const encryptionKey = useAppSelector((state) => state.auth.encryptionKey);
  const journals = useAppSelector((state) => state.journals.journals);
  const dispatch = useAppDispatch();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAll, setSelectedAll] = useState(true);
  
  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // --- Filtering Logic (Same as before) ---
  const getFilteredJournals = () => {
    if (selectedAll || (!startDate && !endDate)) {
      return journals;
    }

    return journals.filter((journal) => {
      const journalDate = new Date(journal.date);

        const dispatch = useAppDispatch(); // ✅ ADD DISPATCH

      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && end) {
        return journalDate >= start && journalDate <= end;
      } else if (start) {
        return journalDate >= start;
      } else if (end) {
        return journalDate <= end;
      }
      return true;
    });
  };

  const filteredJournals = getFilteredJournals();
  const filteredCount = filteredJournals.length;

  // --- Handlers ---

  const handleExportClick = (format: ExportFormat) => {
    if (!encryptionKey) {
      Alert.alert('Oops!', 'Encryption key not found. Please log in again.');
      return;
    }

    if (filteredCount === 0) {
      Alert.alert('No Journals', 'No journals match your criteria.');
      return;
    }

    if (format === 'encrypted') {
      setShowPasswordDialog(true);
    } else {
      performExport(format);
    }
  };

  const handleEncryptedSubmit = (password: string) => {
    setShowPasswordDialog(false);
    setTimeout(() => {
      performExport('encrypted', password);
    }, 100);
  };

  const performExport = async (format: ExportFormat, password?: string) => {
    setIsExporting(true);
    dispatch(setIsExportImportInProgress(true));

    // Yield to UI
    await new Promise(resolve => resolveImmediately(resolve));

    try {
      // ✅ REUSE: Calling the unified service function
      const { uri, filename } = await generateExportFile(format, filteredJournals, password);

      // Share Logic
      if (Platform.OS !== 'web') {
        await shareFile(uri, filename);
      }

      if (Platform.OS === 'web') {
        // above share file function downloads on web so show alert.
        Alert.alert(
          'Success',
          `Exported ${filteredJournals.length} journal(s) as ${format.toUpperCase()}\n\nFile downloaded: ${filename}`
        );
      } 

    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Oops!','Export Failed', error.message || 'An unknown error occurred.');
    } finally {
      setIsExporting(false);
      dispatch(setIsExportImportInProgress(false));
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 80 }]}>
         <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              Import Existing Journals
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              Export your journal entries from json formats export. You can import all
              entries or filter by date range.
            </Text>
            <Button
            mode="contained-tonal"
            onPress={() => navigation.navigate('Import')}
            style={[{marginTop:20,paddingVertical:4},styles.mainButton]}
            icon="database-import"
          >
            Import from Encrypted Backup/Json
          </Button>
          </Card.Content>
        </Card>
        {/* Header & Filter Cards (Same as before) */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>Export Journals</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Create a backup of your memories or export them for reading.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Select Entries</Text>
            <View style={styles.checkboxRow}>
              <Checkbox status={selectedAll ? 'checked' : 'unchecked'} onPress={() => setSelectedAll(!selectedAll)} />
              <Text onPress={() => setSelectedAll(!selectedAll)}>Export All ({journals.length})</Text>
            </View>

            {!selectedAll && (
              <View style={styles.dateContainer}>
                 <TextInput
                  label="Start Date (YYYY-MM-DD)"
                  value={startDate}
                  onChangeText={setStartDate}
                  mode="outlined"
                  style={styles.dateInput}
                  placeholder="2025-01-01"
                />
                <TextInput
                  label="End Date (YYYY-MM-DD)"
                  value={endDate}
                  onChangeText={setEndDate}
                  mode="outlined"
                  style={styles.dateInput}
                  placeholder="2025-12-31"
                />              </View>
            )}

            <View style={styles.statsContainer}>
              <Chip icon="file-document-outline" style={{backgroundColor: theme.colors.elevation.level2}}>
                Selected: {filteredCount}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Export Options Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Export Format</Text>

            <Button
              mode="contained"
              icon="lock"
              buttonColor={theme.colors.primary}
              onPress={() => handleExportClick("encrypted")}
              style={styles.mainButton}
              contentStyle={{ height: 48 }}
              disabled={isExporting || filteredCount === 0}
            >
              Encrypted Backup
            </Button>
            <Text variant="bodySmall" style={styles.formatDesc}>
              Secure, password-protected file. Best for full backups.
            </Text>

            <View style={styles.secondaryButtons}>
              <Button 
                mode="outlined" 
                icon="code-json" 
                onPress={() => handleExportClick("json")} 
                style={styles.flexBtn}
                disabled={isExporting || filteredCount === 0}
              >
                JSON
              </Button>
              {/* Note: changed 'txt' to 'text' to match the unified service type */}
              <Button 
                mode="outlined" 
                icon="file-document-outline" 
                onPress={() => handleExportClick("text")} 
                style={styles.flexBtn}
                disabled={isExporting || filteredCount === 0}
              >
               Markdown Text
              </Button>
              <Button 
                mode="outlined" 
                icon="file-pdf-box" 
                onPress={() => handleExportClick("pdf")} 
                style={styles.flexBtn}
                disabled={isExporting || filteredCount === 0}
              >
               PDF
              </Button>
            </View>

            {isExporting && (
              <View style={styles.loadingContainer}>
                <ProgressBar indeterminate color={theme.colors.primary} />
                <Text variant="bodySmall" style={styles.loadingText}>Processing export...</Text>
              </View>
            )}

            

          </Card.Content>
        </Card>

        
       <Card style={styles.card}>
          <Card.Content>
             <Text variant="titleMedium" style={styles.sectionTitle}>
               ℹ️ Important Notes
             </Text>
             <Text variant="bodySmall" style={styles.infoText}>
               • ⚠️ Plain Exported files are not encrypted consequently they are not
               secure, and can be threat to your privacy.
             </Text>
             <Text variant="bodySmall" style={styles.infoText}>
               • ✅ Images are embedded in exports
             </Text>
             <Text variant="bodySmall" style={styles.infoText}>
               • 🔒 Keep exported files secure as they contain your personal data
             </Text>
             {Platform.OS !== "web" && (
               <>
                 <Text variant="bodySmall" style={styles.infoText}>
                   • On mobile: Use "Save to Files" (iOS) or "Save" (Android) in
                   the share dialog
                 </Text>
               </>
             )}
          </Card.Content>
        </Card>
      </ScrollView>

      <ExportPasswordDialog 
        visible={showPasswordDialog}
        onDismiss={() => setShowPasswordDialog(false)}
        onSubmit={handleEncryptedSubmit}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  card: { marginBottom: 16 },
  title: { fontWeight: "bold", marginBottom: 4 },
    description: {
    opacity: 0.7,
    lineHeight: 20,
  },
  sectionTitle: { marginBottom: 16, fontWeight: "bold" },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: -8 },
  dateContainer: { marginTop: 0, marginBottom: 12, paddingLeft: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statsContainer: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 8 },

  dateInputs: {
    marginTop: 16,
  },
  dateInput: {
    marginBottom: 12,
  },
    mainButton: { marginBottom: 4, borderRadius: 8 },
  formatDesc: { opacity: 0.6, marginBottom: 20, paddingHorizontal: 4 },
  secondaryButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  flexBtn: { flex: 1, borderRadius: 8 },
  loadingContainer: { marginTop: 24 },
  loadingText: { marginTop: 8, textAlign: "center", opacity: 0.7 },

  infoText: {
    marginBottom: 8,
    opacity: 0.7,
  },
});

export default ExportScreen;
