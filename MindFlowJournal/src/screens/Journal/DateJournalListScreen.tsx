import { ExportModal } from '@/src/components/common/ExportModal';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  FAB,
  IconButton,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exportAsJSON, exportAsPDF, exportAsText } from '../../services/exportService';
import { useAppSelector } from '../../stores/hooks';
import { Journal } from '../../types';

const DateJournalListScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const journals = useAppSelector(state => state.journals.journals);
  const { selectedDate } = route.params || {};

  const [journalsForDate, setJournalsForDate] = useState<Journal[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (selectedDate) {
        loadJournalsForDate(selectedDate);
      }
    }, [journals, selectedDate])
  );

  useEffect(() => {
    if (selectedDate) {
      loadJournalsForDate(selectedDate);
    }
  }, [selectedDate]);

  const loadJournalsForDate = (dateKey: string) => {
    const journalsForDate = journals.filter(j => {
      const date = new Date(j.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const journalDateKey = `${year}-${month}-${day}`;
      return journalDateKey === dateKey;
    });
    setJournalsForDate(journalsForDate);
  };

  const handleExport = async (exportFormat: 'json' | 'text' | 'pdf') => {
    if (journalsForDate.length === 0) {
      Alert.alert('No Journals', 'There are no journals to export for this date.');
      return;
    }

    setIsExporting(true);
    try {
      let fileUri: string;
      let fileName: string;
      let mimeType: string;

      const dateFormatted = format(parseISO(selectedDate), 'yyyy-MM-dd');
      
      if (exportFormat === 'json') {
        const content = await exportAsJSON(journalsForDate);
        fileName = `journals-${dateFormatted}.json`;
        mimeType = 'application/json';
        fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } else if (exportFormat === 'text') {
        const content = await exportAsText(journalsForDate);
        fileName = `journals-${dateFormatted}.txt`;
        mimeType = 'text/plain';
        fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } else {
        // PDF returns a URI directly
        fileUri = await exportAsPDF(journalsForDate);
        mimeType = 'application/pdf';
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: `Export Journals - ${format(parseISO(selectedDate), 'MMMM dd, yyyy')}`,
        });
      } else {
        Alert.alert('Export Complete', `File saved to: ${fileUri}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export journals. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const showExportOptions = () => {
    setShowExportModal(true) ;
  };

  const renderJournalItem = ({ item }: { item: Journal }) => {
    const time = format(parseISO(item.date), 'hh:mm a');
    const hasImages = item.images && item.images.length > 0;

    return (
      <Card
        style={styles.journalCard}
        onPress={() => navigation.navigate('JournalDetail', { journalId: item.id })}
      >

        <ExportModal
          visible={showExportModal}
          journalsForDate={journalsForDate}
          selectedDate={selectedDate}
          onExport={handleExport}
          onClose={() => setShowExportModal(false)}
        />

        <Card.Content>
          <View style={styles.journalHeader}>
            <View style={styles.journalTitleRow}>
              {item.title && (
                <Text variant="titleMedium" style={styles.journalTitle}>
                  {item.title}
                </Text>
              )}
              <Chip icon="clock-outline" compact style={styles.timeChip}>
                {time}
              </Chip>
            {hasImages && (
              <Chip icon="image" compact style={styles.imageIndicator}>
                {item.images!.length} {item.images!.length === 1 ? 'image' : 'images'}
              </Chip>
            )}
            </View>
            <IconButton
              icon="chevron-right"
              size={20}
              onPress={() => navigation.navigate('JournalDetail', { journalId: item.id })}
            />
          </View>
          <Text variant="bodyMedium" numberOfLines={2} style={styles.journalPreview}>
            {item.text}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  const selectedDateFormatted = selectedDate
    ? format(parseISO(selectedDate), 'EEEE, MMMM dd, yyyy')
    : '';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header Section */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.headerTextContainer}>
              <Text variant="titleLarge" style={styles.headerTitle}>
                {selectedDateFormatted}
              </Text>
              <Text variant="bodySmall" style={styles.entryCount}>
                {journalsForDate.length}{' '}
                {journalsForDate.length === 1 ? 'entry' : 'entries'}
              </Text>
            </View>
            <Button
              mode="contained"
              icon="export"
              onPress={showExportOptions}
              disabled={isExporting || journalsForDate.length === 0}
              compact
            >
              Export
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Journal List */}
      {journalsForDate.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No entries for this day
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              Tap the + button to start writing
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={journalsForDate}
          renderItem={renderJournalItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.journalList, { paddingBottom: 80 }]}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('JournalEditor', { selectedDate })}
        label="New Entry"
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  entryCount: {
    opacity: 0.7,
    marginTop: 4,
  },
  journalList: {
    padding: 16,
  },
  journalCard: {
    marginBottom: 12,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  journalTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  journalTitle: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  timeChip: {
    marginRight: 8,
  },
  journalPreview: {
    marginBottom: 8,
    opacity: 0.8,
  },
  imageIndicator: {
    alignSelf: 'flex-start',
  },
  emptyCard: {
    margin: 16,
    marginTop: 24,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginBottom: 8,
    opacity: 0.7,
  },
  emptySubtext: {
    opacity: 0.5,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default DateJournalListScreen;

