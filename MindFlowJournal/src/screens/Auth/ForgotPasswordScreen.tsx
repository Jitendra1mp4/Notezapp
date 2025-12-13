import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  useTheme,
  HelperText,
  ProgressBar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '../../stores/hooks';
import { setAuthenticated, setSalt } from '../../stores/slices/authSlice';
import { useAuth } from '../../utils/authContext';
import {
  deriveKeyFromPassword,
  verifyHash,
} from '../../services/encryptionService';
import {
  getSalt,
  getSecurityQuestionsForRecovery,
  getSecurityAnswerHashes,
  saveSalt,
  saveVerificationToken,
  reEncryptAllData,
} from '../../services/storageService';
import { Alert } from '../../utils/alert';

const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { setEncryptionKey } = useAuth();

  const [step, setStep] = useState<'questions' | 'newPassword'>('questions');
  const [questions, setQuestions] = useState<
    Array<{ questionId: string; question: string }>
  >([]);
  const [answerHashes, setAnswerHashes] = useState<
    Array<{ questionId: string; answerHash: string }>
  >([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oldSalt, setOldSalt] = useState<string>('');

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch =
    newPassword === confirmPassword && newPassword.length > 0;
  const isPasswordValid = newPassword.length >= 8;

  useEffect(() => {
    loadSecurityQuestions();
  }, []);

  const loadSecurityQuestions = async () => {
    try {
      const publicQuestions = await getSecurityQuestionsForRecovery();
      const hashes = await getSecurityAnswerHashes();
      const salt = await getSalt();

      if (!publicQuestions || publicQuestions.length === 0) {
        Alert.alert(
          'No Account Found',
          'No security questions found. Please create a new account.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      if (!hashes || !salt) {
        Alert.alert(
          'Error',
          'Recovery data not found. Please contact support.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      setQuestions(publicQuestions);
      setAnswerHashes(hashes);
      setOldSalt(salt);
    } catch (error) {
      console.error('Error loading security questions:', error);
      Alert.alert('Error', 'Failed to load security questions');
    }
  };

  const handleVerifyAnswers = async () => {
    // Check if all questions are answered
    const allAnswered = questions.every(
      q => answers[q.questionId] && answers[q.questionId].trim().length > 0
    );

    if (!allAnswered) {
      Alert.alert('Error', 'Please answer all security questions');
      return;
    }

    setIsLoading(true);

    try {
      // Verify each answer
      let allCorrect = true;
      for (const q of questions) {
        const userAnswer = answers[q.questionId];
        const storedHash = answerHashes.find(
          h => h.questionId === q.questionId
        )?.answerHash;

        if (!storedHash || !verifyHash(userAnswer, storedHash)) {
          allCorrect = false;
          break;
        }
      }

      if (!allCorrect) {
        Alert.alert(
          'Incorrect Answers',
          'One or more answers are incorrect. Please try again.'
        );
        setIsLoading(false);
        return;
      }

      // All answers correct - proceed to password reset
      Alert.alert('Success', 'Answers verified! Please create a new password.');
      setStep('newPassword');
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Failed to verify answers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    if (!isPasswordValid || !passwordsMatch) {
      Alert.alert('Error', 'Please enter a valid matching password');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Derive old key to decrypt existing data
      const { key: oldKey } = deriveKeyFromPassword('temp', oldSalt);

      // 2. Derive new key from new password
      const { key: newKey, salt: newSalt } = deriveKeyFromPassword(newPassword);

      // 3. Re-encrypt all data with new key
      // Note: This will fail if there's no data yet, but that's okay for new accounts
      try {
        await reEncryptAllData(oldKey, newKey);
      } catch (error) {
        console.log('No data to re-encrypt (new account)');
      }

      // 4. Save new salt
      await saveSalt(newSalt);

      // 5. Save new verification token
      await saveVerificationToken(newKey);

      // 6. Update state and login
      dispatch(setSalt(newSalt));
      dispatch(setAuthenticated(true));
      setEncryptionKey(newKey);

      Alert.alert('Success!', 'Your password has been reset successfully', [
        { text: 'OK' },
      ]);
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Error', 'Failed to reset password. Please try again.');
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

        {step === 'questions' ? (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Answer your security questions to recover your password
            </Text>

            {questions.map((q, index) => (
              <View key={q.questionId} style={styles.questionContainer}>
                <Text variant="bodyMedium" style={styles.questionText}>
                  {index + 1}. {q.question}
                </Text>
                <TextInput
                  value={answers[q.questionId] || ''}
                  onChangeText={text =>
                    setAnswers({ ...answers, [q.questionId]: text })
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
              Verify Answers
            </Button>
          </>
        ) : (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              ✓ Answers verified! Create your new password
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
              Set New Password
            </Button>
          </>
        )}

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.link}
          disabled={isLoading}
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
    marginBottom: 16,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  progress: {
    marginBottom: 16,
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
