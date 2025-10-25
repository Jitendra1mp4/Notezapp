import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Text, FAB, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../stores/hooks';

const JournalListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const journals = useAppSelector(state => state.journals.journals);

  const renderJournalItem = ({ item }: { item: any }) => (
    <Card
      style={styles.journalCard}
      onPress={() =>
        navigation.navigate('JournalDetail', { journalId: item.id })
      }
    >
      <Card.Content>
        <Text variant="titleMedium">{item.title || 'Untitled'}</Text>
        <Text variant="bodySmall" style={styles.date}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
        <Text variant="bodyMedium" numberOfLines={2}>
          {item.text}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {journals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="titleLarge">No journals yet</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Tap the + button to create your first entry
          </Text>
        </View>
      ) : (
        <FlatList
          data={journals}
          renderItem={renderJournalItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('JournalEditor')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  journalCard: {
    marginBottom: 12,
  },
  date: {
    opacity: 0.6,
    marginTop: 4,
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default JournalListScreen;
