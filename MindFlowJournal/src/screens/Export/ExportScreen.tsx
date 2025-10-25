import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const ExportScreen: React.FC = () => {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="headlineMedium">Export Journals</Text>
        <Text variant="bodyMedium" style={styles.description}>
          Export functionality coming in Sprint 6
        </Text>
        <Button mode="outlined" disabled style={styles.button}>
          Export as JSON
        </Button>
        <Button mode="outlined" disabled style={styles.button}>
          Export as TXT
        </Button>
        <Button mode="outlined" disabled style={styles.button}>
          Export as PDF
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    marginTop: 16,
    marginBottom: 32,
    opacity: 0.7,
  },
  button: {
    marginBottom: 12,
  },
});

export default ExportScreen;
