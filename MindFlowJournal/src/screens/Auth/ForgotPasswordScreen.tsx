import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Password Recovery
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Security questions recovery will be implemented in Sprint 2
        </Text>

        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Back to Login
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
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 16,
  },
  subtitle: {
    marginBottom: 32,
    opacity: 0.7,
  },
  button: {
    marginTop: 16,
  },
});

export default ForgotPasswordScreen;
