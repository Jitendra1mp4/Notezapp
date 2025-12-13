import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '../../stores/hooks';
import { setAuthenticated, setSalt } from '../../stores/slices/authSlice';
import { useAuth } from '../../utils/authContext';
import { deriveKeyFromPassword } from '../../services/encryptionService';
import {
  getSalt,
  isFirstLaunch,
  verifyPassword,
} from '../../services/storageService';
import { Alert } from '../../utils/alert';

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
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Get stored salt
      const salt = await getSalt();
      if (!salt) {
        Alert.alert('Error', 'No account found. Please create an account.');
        setIsLoading(false);
        return;
      }

      // 2. Derive key from password
      const { key } = deriveKeyFromPassword(password, salt);

      // 3. Verify password using verification token
      const isValid = await verifyPassword(key);
      if (!isValid) {
        Alert.alert(
          'Wrong Password',
          'The password you entered is incorrect. Please try again or use password recovery.'
        );
        setIsLoading(false);
        return;
      }

      // 4. Password is correct - update state
      dispatch(setSalt(salt));
      dispatch(setAuthenticated(true));
      setEncryptionKey(key);

      // Success! Navigation will happen automatically via RootNavigator
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
          Unlock
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
