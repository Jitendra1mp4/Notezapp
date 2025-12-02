import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import APP_CONFIG from '../../config/appConfig';
import CryptoManager from '../../services/cryptoManager';
import {
  getVault,
  isFirstLaunch,
} from '../../services/unifiedStorageService';
import { useAppDispatch } from '../../stores/hooks';
import { setAuthenticated } from '../../stores/slices/authSlice';
import { Alert } from '../../utils/alert';
import { useAuth } from '../../utils/authContext';

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { setEncryptionKey } = useAuth();

  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    const firstTime = await isFirstLaunch();
    setIsFirstTime(firstTime);
  };

  const handleLogin = async () => {
    if (!password) {
      Alert.alert('Oops!', 'Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Retrieve vault from storage
      const vaultData = await getVault();
      if (!vaultData) {
        Alert.alert('Oops!', 'No account found. Please create an account.');
        setIsLoading(false);
        return;
      }

      // 2. Unlock vault with password using CryptoManager
      // This derives the password-based key and decrypts the Data Key (DK)
      const { dk } = CryptoManager.unlockWithPassword(vaultData as any, password);

      // 3. Password is correct - update state
      dispatch(setAuthenticated(true));
      setEncryptionKey(dk);

      // Success! Navigation will happen automatically via RootNavigator
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Wrong Password',
        'The password you entered is incorrect. Please try again or use password recovery.'
      );
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Text variant="displaySmall" style={styles.title}>
          {APP_CONFIG.displayName}
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Secure. Private. Yours.
        </Text>

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          mode="outlined"
          style={styles.input}
          autoFocus
          onSubmitEditing={handleLogin}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          style={styles.button}
          disabled={isLoading || !password}
          loading={isLoading}
        >
          {isLoading ? "Unlocking & Securing the environment..." : "Unlock"}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.link}
          disabled={isLoading}
        >
          Forgot Password?
        </Button>

        {isFirstTime && (
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Signup')}
            style={styles.signupButton}
            disabled={isLoading}
          >
            First time? Create Password
          </Button>
        )}
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
  signupButton: {
    marginTop: 32,
  },
});

export default LoginScreen;
