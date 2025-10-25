import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // TODO: Implement login logic in Sprint 2
    console.log('Login attempt');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="displaySmall" style={styles.title}>
          MindFlow Journal
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Secure. Private. Yours.
        </Text>

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
          style={styles.input}
        />

        <Button mode="contained" onPress={handleLogin} style={styles.button}>
          Unlock
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.link}
        >
          Forgot Password?
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Signup')}
          style={styles.link}
        >
          First time? Create Password
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
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  link: {
    marginTop: 8,
  },
});

export default LoginScreen;
