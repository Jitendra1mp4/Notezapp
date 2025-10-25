import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const JournalDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const { journalId } = route.params;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Journal Entry
        </Text>
        <Text variant="bodySmall" style={styles.date}>
          {new Date().toLocaleDateString()}
        </Text>
        <Text variant="bodyLarge" style={styles.text}>
          Journal content will be loaded in Sprint 3. Journal ID: {journalId}
        </Text>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() =>
              navigation.navigate('JournalEditor', { journalId })
            }
            style={styles.actionButton}
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            onPress={() => {
              // TODO: Implement delete in Sprint 3
              navigation.goBack();
            }}
            style={styles.actionButton}
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
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  date: {
    opacity: 0.6,
    marginBottom: 24,
  },
  text: {
    marginBottom: 32,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default JournalDetailScreen;
