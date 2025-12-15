import { setIsExportInProgress } from "@/src/stores/slices/settingsSlice";
import { formatDate } from "date-fns";
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
import APP_CONFIG from "../../config/appConfig";
import {
  exportAsJSON,
  exportAsMarkdown,
  exportAsPDF,
  saveTextFile,
  shareFile,
} from "../../services/exportService";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { Alert } from "../../utils/alert";

const ExportScreen: React.FC<{navigation:any}> = ({navigation}) => {
  const theme = useTheme();
  // const { encryptionKey } = useAuth();
  const encryptionKey = useAppSelector((state) => state.auth.encryptionKey);

  const journals = useAppSelector((state) => state.journals.journals);
  const dispatch = useAppDispatch(); // ✅ ADD DISPATCH

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAll, setSelectedAll] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

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

 const handleExport = async (format: 'json' | 'txt' | 'pdf') => {
    if (!encryptionKey) {
      Alert.alert('Oops!', 'Encryption key not found. Please log in again.');
      return;
    }

    const filteredJournals = getFilteredJournals();

    if (filteredJournals.length === 0) {
      Alert.alert('No Journals', 'No journals found to export with the selected filters.');
      return;
    }

    setIsExporting(true);
    dispatch(setIsExportInProgress(true)); // ✅ SET FLAG BEFORE EXPORT

    try {
      const timestamp = formatDate(new Date(), 'yyyy-MM-dd-HHmmss');
      let filename = '';
      let content = '';
      let uri = '';

      switch (format) {
        case 'json':
          filename = `${APP_CONFIG.slug.toLowerCase()}-journals-${timestamp}.json`;
          content = await exportAsJSON(filteredJournals);
          uri = await saveTextFile(content, filename);
          break;

        case 'txt':
          filename = `${APP_CONFIG.slug.toLowerCase()}-journals-${timestamp}.md`;
          content = await exportAsMarkdown(filteredJournals);
          uri = await saveTextFile(content, filename);
          break;

        case 'pdf':
          filename = `${APP_CONFIG.slug.toLowerCase()}-journals-${timestamp}.pdf`;
          uri = await exportAsPDF(filteredJournals);
          break;
      }

      // ✅ Share file (this will background the app)
      if (Platform.OS !== 'web') {
        await shareFile(uri, filename);
      }

      if (Platform.OS === 'web') {
        Alert.alert(
          'Success',
          `Exported ${filteredJournals.length} journal(s) as ${format.toUpperCase()}\n\nFile downloaded: ${filename}`
        );
      } else {
        // On mobile, show helpful message after share dialog
        // Alert.alert(
        //   'Export Complete',
        //   `Exported ${filteredJournals.length} journal(s) as ${format.toUpperCase()}\n\n` +
        //   `File saved: ${filename}\n\n` +
        //   `Tip: Use "Save to Files" in the share dialog to save to your device.`
        // );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Oops!', 'Failed to export journals. Please try again.');
    } finally {
      setIsExporting(false);
      // ✅ Clear flag after export completes
      // Note: The flag will also be cleared when app returns to foreground in App.tsx
      dispatch(setIsExportInProgress(false));
    }
  };

  const filteredCount = getFilteredJournals().length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]} // ✅ Changed from ['top', 'bottom']
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 80 }]}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              Export Your Journals
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              Export your journal entries in various formats. You can export all
              entries or filter by date range.
            </Text>
          </Card.Content>
        </Card>
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
            mode="outlined"
            onPress={() => navigation.navigate('Import')}
            style={{marginTop:20}}
            icon="database-import"
          >
            Import from JSON
          </Button>
          </Card.Content>
        </Card>
        {/* Date Range Filter */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Select Date Range
            </Text>

            <View style={styles.checkboxRow}>
              <Checkbox
                status={selectedAll ? "checked" : "unchecked"}
                onPress={() => setSelectedAll(!selectedAll)}
              />
              <Text
                variant="bodyLarge"
                onPress={() => setSelectedAll(!selectedAll)}
              >
                Export All Journals
              </Text>
            </View>

            {!selectedAll && (
              <View style={styles.dateInputs}>
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
                />
              </View>
            )}

            <Chip icon="file-document" style={styles.countChip}>
              {filteredCount} journal(s) will be exported
            </Chip>
          </Card.Content>
        </Card>
        {/* Export Options */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Export Format
            </Text>

            <Button
              mode="contained"
              icon="code-json"
              onPress={() => handleExport("json")}
              style={styles.exportButton}
              disabled={isExporting || filteredCount === 0}
            >
              Export as JSON
            </Button>
            <Text variant="bodySmall" style={styles.formatDesc}>
              Structured data format, good for backup and data transfer
            </Text>

            <Button
              mode="contained"
              icon="file-document-outline"
              onPress={() => handleExport("txt")}
              style={styles.exportButton}
              disabled={isExporting || filteredCount === 0}
            >
              Export as Markdown Text
            </Button>
            <Text variant="bodySmall" style={styles.formatDesc}>
              Plain text format, easy to read and edit
            </Text>

            <Button
              mode="contained"
              icon="file-pdf-box"
              onPress={() => handleExport("pdf")}
              style={styles.exportButton}
              disabled={isExporting || filteredCount === 0}
            >
              Export as PDF
            </Button>
            <Text variant="bodySmall" style={styles.formatDesc}>
              Professional format, perfect for printing or archiving
            </Text>

            {isExporting && (
              <View style={styles.loadingContainer}>
                <ProgressBar indeterminate />
                <Text variant="bodySmall" style={styles.loadingText}>
                  Exporting journals...
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
        {/* Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              ℹ️ Important Notes
            </Text>
            <Text variant="bodySmall" style={styles.infoText}>
              • Exported files do not include encryption
            </Text>
            <Text variant="bodySmall" style={styles.infoText}>
              • Images are embedded in PDF exports
            </Text>
            <Text variant="bodySmall" style={styles.infoText}>
              • Keep exported files secure as they contain your personal data
            </Text>
            {Platform.OS !== "web" && (
              <>
                <Text variant="bodySmall" style={styles.infoText}>
                  • On mobile: Use "Save to Files" (iOS) or "Save" (Android) in
                  the share dialog
                </Text>
                <Text variant="bodySmall" style={styles.infoText}>
                  • Files are saved to your device's Documents folder
                </Text>
              </>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
    fontWeight: "bold",
  },
  description: {
    opacity: 0.7,
    lineHeight: 20,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: "bold",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dateInputs: {
    marginTop: 16,
  },
  dateInput: {
    marginBottom: 12,
  },
  countChip: {
    alignSelf: "flex-start",
    marginTop: 12,
  },
  exportButton: {
    marginBottom: 8,
  },
  formatDesc: {
    opacity: 0.6,
    marginBottom: 16,
    paddingLeft: 4,
  },
  loadingContainer: {
    marginTop: 16,
  },
  loadingText: {
    marginTop: 8,
    textAlign: "center",
    opacity: 0.7,
  },
  infoText: {
    marginBottom: 8,
    opacity: 0.7,
  },
});

export default ExportScreen;
