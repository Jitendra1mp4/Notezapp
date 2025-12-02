import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  ProgressBar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import CryptoManager from '../../services/cryptoManager';
import {
  getVault,
  saveRecoveryKeyHash,
  saveVault,
} from '../../services/unifiedStorageService';
import { useAppDispatch } from '../../stores/hooks';
import { setAuthenticated } from '../../stores/slices/authSlice';
import type { QAPair } from '../../types/crypto';
import { Alert } from '../../utils/alert';
import { useAuth } from '../../utils/authContext';

type RecoveryMethod = 'answers' | 'recoveryKey';
type RecoveryStep = 'method' | 'verify' | 'newPassword';

const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { setEncryptionKey } = useAuth();

  // UI State
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('answers');
  const [step, setStep] = useState<RecoveryStep>('method');

  // Security Questions Recovery
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});

  // Recovery Key Recovery
  const [recoveryKey, setRecoveryKey] = useState('');

  // New Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading
  const [isLoading, setIsLoading] = useState(false);
  const [vault, setVaultState] = useState<any>(null);

  const passwordsMatch =
    newPassword === confirmPassword && newPassword.length > 0;
  const isPasswordValid = newPassword.length >= 8;

  useEffect(() => {
    loadVault();
  }, []);

  const loadVault = async () => {
    try {
      const loadedVault = await getVault();
      if (!loadedVault) {
        Alert.alert(
          'No Account Found',
          'No account found. Please create a new account.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      setVaultState(loadedVault);
    } catch (error) {
      console.error('Error loading vault:', error);
      Alert.alert('Error', 'Failed to load account data');
    }
  };

  /**
   * Verify security answers and unlock vault
   */
  const handleVerifyAnswers = async () => {
    if (!vault) return;

    // Get selected question IDs from vault
    const questionIds = vault.security_questions.map(
      (sq: any) => sq.question
    );

    // Check if all questions are answered
    const allAnswered = questionIds.every(
      (qId: string) => answers[qId] && answers[qId].trim().length > 0
    );

    if (!allAnswered) {
      Alert.alert('Error', 'Please answer all security questions');
      return;
    }

    setIsLoading(true);

    try {
      // Create QA pairs for verification
      const qaPairs: QAPair[] = questionIds.map((qId: string) => ({
        questionId: qId,
        answer: answers[qId],
      }));

      // Attempt to unlock vault with security answers
      CryptoManager.unlockWithAnswers(vault, qaPairs);

      // Success! Move to password reset step
      Alert.alert(
        'Answers Verified!',
        'Your security answers are correct. Now create a new password.'
      );
      setStep('newPassword');
    } catch (error) {
      console.error('Answer verification error:', error);
      Alert.alert(
        'Incorrect Answers',
        'One or more answers are incorrect. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify recovery key and unlock vault
   */
  const handleVerifyRecoveryKey = async () => {
    if (!vault) return;

    if (!recoveryKey.trim()) {
      Alert.alert('Error', 'Please enter your recovery key');
      return;
    }

    setIsLoading(true);

    try {
      // Attempt to verify recovery key by trying to recover
      CryptoManager.recoverAndReset(vault, recoveryKey, newPassword || 'temp');

      // Recovery key is valid
      Alert.alert(
        'Recovery Key Verified!',
        'Your recovery key is valid. Now create a new password.'
      );
      setStep('newPassword');
    } catch (error) {
      console.error('Recovery key verification error:', error);
      Alert.alert(
        'Invalid Recovery Key',
        'The recovery key you entered is incorrect. Please check and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Set new password and reset vault
   */
  const handleSetNewPassword = async () => {
    if (!vault) return;

    if (!isPasswordValid) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (!passwordsMatch) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      let newVault;
      let newRecoveryKeyResult: string | undefined;

      if (recoveryMethod === 'answers') {
        // For security answers, use public API to rebuild vault
        const questionIds = vault.security_questions.map(
          (sq: any) => sq.question
        );
        const qaPairs: QAPair[] = questionIds.map((qId: string) => ({
          questionId: qId,
          answer: answers[qId],
        }));

        // Unlock vault with security answers to get DK
        const { dk } = CryptoManager.unlockWithAnswers(vault, qaPairs);

        // Use public method to rebuild vault with new password
        newVault = CryptoManager.rebuildVaultWithNewPassword(
          vault,
          dk,
          newPassword
        );
      } else {
        // For recovery key method, use recoverAndReset flow
        const result = CryptoManager.recoverAndReset(
          vault,
          recoveryKey,
          newPassword
        );
        newVault = result.newVault;
        newRecoveryKeyResult = result.newRecoveryKey;
      }

      // Save updated vault
      await saveVault(newVault);

      // If recovery key was reset, save and display it
      if (newRecoveryKeyResult) {
        await saveRecoveryKeyHash(newRecoveryKeyResult);

        Alert.alert(
          'Password Reset Successfully!',
          `Your new password has been set.\n\n` +
            `⚠️ Your recovery key has also been changed:\n\n${newRecoveryKeyResult}\n\n` +
            `Please save this new key in a safe place.`,
          [
            {
              text: 'I have saved the new Recovery Key',
              onPress: () => {
                // Unlock with new password
                const { dk } = CryptoManager.unlockWithPassword(
                  newVault,
                  newPassword
                );
                dispatch(setAuthenticated(true));
                setEncryptionKey(dk);
              },
            },
          ]
        );
      } else {
        // For security answers, just unlock with new password
        const { dk } = CryptoManager.unlockWithPassword(newVault, newPassword);
        dispatch(setAuthenticated(true));
        setEncryptionKey(dk);

        Alert.alert('Success!', 'Your password has been reset successfully');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert(
        'Error',
        `Failed to reset password: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Password Recovery
        </Text>

        {isLoading && <ProgressBar indeterminate style={styles.progress} />}

        {step === 'method' && (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Choose how you want to recover your account
            </Text>

            <View style={styles.methodContainer}>
              <Button
                mode={recoveryMethod === 'answers' ? 'contained' : 'outlined'}
                onPress={() => setRecoveryMethod('answers')}
                style={styles.methodButton}
              >
                Security Questions
              </Button>
              <Button
                mode={recoveryMethod === 'recoveryKey' ? 'contained' : 'outlined'}
                onPress={() => setRecoveryMethod('recoveryKey')}
                style={styles.methodButton}
              >
                Recovery Key
              </Button>
            </View>

            {recoveryMethod === 'answers' && (
              <>
                <Text variant="bodySmall" style={styles.methodDescription}>
                  Answer the security questions you set up during registration
                </Text>
                <Button
                  mode="contained"
                  onPress={() => setStep('verify')}
                  style={styles.button}
                >
                  Continue with Security Questions
                </Button>
              </>
            )}

            {recoveryMethod === 'recoveryKey' && (
              <>
                <Text variant="bodySmall" style={styles.methodDescription}>
                  Enter the recovery key you saved during registration
                </Text>
                <Button
                  mode="contained"
                  onPress={() => setStep('verify')}
                  style={styles.button}
                >
                  Continue with Recovery Key
                </Button>
              </>
            )}
          </>
        )}

        {step === 'verify' && recoveryMethod === 'answers' && vault && (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Answer your security questions
            </Text>

            {vault.security_questions.map((sq: any, index: number) => (
              <View key={sq.id} style={styles.questionContainer}>
                <Text variant="bodyMedium" style={styles.questionText}>
                  {index + 1}. {sq.question}
                </Text>
                <TextInput
                  value={answers[sq.question] || ''}
                  onChangeText={text =>
                    setAnswers({ ...answers, [sq.question]: text })
                  }
                  mode="outlined"
                  style={styles.input}
                  placeholder="Your answer"
                  autoCapitalize="none"
                />
              </View>
            ))}

            <Button
              mode="contained"
              onPress={handleVerifyAnswers}
              style={styles.button}
              disabled={isLoading}
              loading={isLoading}
            >
              { isLoading ? "Verifying securely..." : "Verify Answers"}
            </Button>

            <Button
              mode="text"
              onPress={() => setStep('method')}
              style={styles.link}
              disabled={isLoading}
            >
              Back
            </Button>
          </>
        )}

        {step === 'verify' && recoveryMethod === 'recoveryKey' && (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Enter your recovery key
            </Text>

            <TextInput
              label="Recovery Key"
              value={recoveryKey}
              onChangeText={setRecoveryKey}
              mode="outlined"
              style={styles.input}
              placeholder="Paste your recovery key here"
              multiline
            />
            <HelperText type="info">
              Your recovery key is a long string of characters (UUID format)
            </HelperText>

            <Button
              mode="contained"
              onPress={handleVerifyRecoveryKey}
              style={styles.button}
              disabled={isLoading || !recoveryKey.trim()}
              loading={isLoading}
            >
              {isLoading ? "Verifying securely..." : "Verify Recovery Key"}
            </Button>

            <Button
              mode="text"
              onPress={() => setStep('method')}
              style={styles.link}
              disabled={isLoading}
            >
              Back
            </Button>
          </>
        )}

        {step === 'newPassword' && (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              ✓ Verified! Create your new password
            </Text>

            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              mode="outlined"
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={showNewPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                />
              }
            />
            <HelperText type="info" visible={newPassword.length > 0}>
              {isPasswordValid
                ? '✓ Password is strong enough'
                : '✗ Password must be at least 8 characters'}
            </HelperText>

            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              mode="outlined"
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
            />
            <HelperText
              type={passwordsMatch ? 'info' : 'error'}
              visible={confirmPassword.length > 0}
            >
              {passwordsMatch
                ? '✓ Passwords match'
                : '✗ Passwords do not match'}
            </HelperText>

            <Button
              mode="contained"
              onPress={handleSetNewPassword}
              style={styles.button}
              disabled={!isPasswordValid || !passwordsMatch || isLoading}
              loading={isLoading}
            >
             {isLoading?"Working Securely...":"Set New Password"}
            </Button>

            <Button
              mode="text"
              onPress={() => {
                setStep('verify');
                setNewPassword('');
                setConfirmPassword('');
              }}
              style={styles.link}
              disabled={isLoading}
            >
              Back
            </Button>
          </>
        )}

        {step === 'method' && (
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.link}
            disabled={isLoading}
          >
            Back to Login
          </Button>
        )}
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
    marginBottom: 16,
  },
  subtitle: {
    marginBottom: 16,
    opacity: 0.7,
  },
  methodDescription: {
    marginBottom: 16,
    opacity: 0.6,
  },
  progress: {
    marginBottom: 16,
  },
  methodContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  methodButton: {
    flex: 1,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    marginBottom: 4,
  },
  button: {
    marginTop: 16,
    marginBottom: 16,
  },
  link: {
    marginTop: 8,
  },
});

export default ForgotPasswordScreen;
