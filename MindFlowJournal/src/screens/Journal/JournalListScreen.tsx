import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, Chip, FAB, Searchbar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listJournals } from '../../services/unifiedStorageService';
import { useAppDispatch, useAppSelector } from '../../stores/hooks';
import { setJournals, setLoading } from '../../stores/slices/journalsSlice';
import { Journal } from '../../types';
import { useAuth } from '../../utils/authContext';

const JournalListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { encryptionKey } = useAuth();
  
  const journals = useAppSelector(state => state.journals.journals);
  const isLoading = useAppSelector(state => state.journals.isLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadJournals();
  }, [encryptionKey]);

  const loadJournals = async () => {
    if (!encryptionKey) return;

    dispatch(setLoading(true));
    try {
      const loadedJournals = await listJournals(encryptionKey);
      // Sort by date (newest first)
      const sorted = loadedJournals.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      dispatch(setJournals(sorted));
    } catch (error) {
      console.error('Error loading journals:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJournals();
    setRefreshing(false);
  };

  const filteredJournals = journals.filter(journal => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      journal.title?.toLowerCase().includes(query) ||
      journal.text.toLowerCase().includes(query)
    );
  });

  const getCardColor = (index: number) => {
    // Alternate colors for visual variety
    const colors = [
      theme.colors.primaryContainer,
      theme.colors.secondaryContainer,
      theme.colors.tertiaryContainer,
    ];
    return colors[index % colors.length];
  };

const renderJournalItem = ({ item, index }: { item: Journal; index: number }) => {
  const dateObj = new Date(item.date);
  const formattedDate = format(dateObj, 'MMM dd, yyyy');
  const formattedTime = format(dateObj, 'hh:mm a');
  const hasImages = item.images && item.images.length > 0;

  return (
    <Card
      style={[styles.journalCard, { backgroundColor: getCardColor(index) }]}
      onPress={() =>
        navigation.navigate('JournalDetail', { journalId: item.id })
      }
    >
      <Card.Content>
        {item.title && (
          <Text variant="titleMedium" style={styles.title}>
            {item.title}
          </Text>
        )}
        <View style={styles.dateContainer}>
          <Chip icon="calendar" compact>
            {formattedDate}
          </Chip>
          <Chip icon="clock-outline" compact style={styles.timeChip}>
            {formattedTime}
          </Chip>
          {hasImages && (
            <Chip icon="image" compact style={styles.imageChip}>
              {item.images!.length}
            </Chip>
          )}
        </View>
        <Text variant="bodyMedium" numberOfLines={3} style={styles.preview}>
          {item.text}
        </Text>
      </Card.Content>
    </Card>
  );
};

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      {journals.length > 0 && (
        <Searchbar
          placeholder="Search journals..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      )}

      {filteredJournals.length === 0 && !isLoading ? (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            {searchQuery ? 'No results found' : 'No journals yet'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {searchQuery
              ? 'Try a different search term'
              : 'Tap the + button to create your first entry'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredJournals}
          renderItem={renderJournalItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: 80 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('JournalEditor')}
        label="New Entry"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  list: {
    padding: 16,
  },
  journalCard: {
    marginBottom: 12,
    elevation: 2,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  dateContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  timeChip: {
    marginLeft: 8,
  },
  preview: {
    opacity: 0.8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    opacity: 0.7,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  imageChip: {
  marginLeft: 8,
},

});

export default JournalListScreen;
