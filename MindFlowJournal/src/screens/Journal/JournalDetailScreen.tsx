import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteJournal, getJournal } from '../../services/storageService';
import { useAppDispatch } from '../../stores/hooks';
import { deleteJournal as deleteJournalAction } from '../../stores/slices/journalsSlice';
import { Journal } from '../../types';
import { Alert } from '../../utils/alert';
import { useAuth } from '../../utils/authContext';

const JournalDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { encryptionKey } = useAuth();

  const { journalId } = route.params;
  const [journal, setJournal] = useState<Journal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadJournal();
  }, [journalId]);

  const loadJournal = async () => {
    if (!encryptionKey) return;

    setIsLoading(true);
    try {
      const loadedJournal = await getJournal(journalId, encryptionKey);
      setJournal(loadedJournal);
    } catch (error) {
      console.error('Error loading journal:', error);
      Alert.alert('Error', 'Failed to load journal entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Journal Entry',
      'Are you sure you want to delete this entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!encryptionKey) return;

    setIsDeleting(true);
    try {
      await deleteJournal(journalId, encryptionKey);
      dispatch(deleteJournalAction(journalId));
      
      Alert.alert('Deleted', 'Journal entry has been deleted', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error deleting journal:', error);
      Alert.alert('Error', 'Failed to delete journal entry');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!journal) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text>Journal not found</Text>
          <Button mode="outlined" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const dateObj = new Date(journal.date);
  const formattedDate = format(dateObj, 'EEEE, MMMM dd, yyyy');
  const formattedTime = format(dateObj, 'hh:mm a');

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {journal.title && (
          <Text variant="headlineMedium" style={styles.title}>
            {journal.title}
          </Text>
        )}

        <View style={styles.metaContainer}>
          <Chip icon="calendar" style={styles.chip}>
            {formattedDate}
          </Chip>
          <Chip icon="clock-outline" style={styles.chip}>
            {formattedTime}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        <Text variant="bodyLarge" style={styles.text}>
          {journal.text}
        </Text>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            Created: {format(new Date(journal.createdAt), 'MMM dd, yyyy hh:mm a')}
          </Text>
          <Text variant="bodySmall" style={styles.footerText}>
            Updated: {format(new Date(journal.updatedAt), 'MMM dd, yyyy hh:mm a')}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={() =>
              navigation.navigate('JournalEditor', { journalId: journal.id })
            }
            style={styles.actionButton}
            icon="pencil"
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            onPress={handleDelete}
            style={styles.actionButton}
            buttonColor={theme.colors.errorContainer}
            textColor={theme.colors.error}
            icon="delete"
            disabled={isDeleting}
            loading={isDeleting}
          >
            Delete
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  text: {
    marginBottom: 24,
    lineHeight: 24,
  },
  footer: {
    marginBottom: 24,
    opacity: 0.6,
  },
  footerText: {
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default JournalDetailScreen;
