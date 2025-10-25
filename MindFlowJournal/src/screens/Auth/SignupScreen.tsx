import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const SignupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignup = () => {
    // TODO: Implement signup logic in Sprint 2
    console.log('Signup attempt');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Create Your Password
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Choose a strong password to protect your journals
        </Text>

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          mode="outlined"
          style={styles.input}
        />

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Security Questions (Coming in Sprint 2)
        </Text>

        <Button mode="contained" onPress={handleSignup} style={styles.button}>
          Create Account
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.link}
        >
          Back to Login
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 24,
    marginBottom: 16,
  },
  link: {
    marginTop: 8,
  },
});

export default SignupScreen;
