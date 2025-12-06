import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { Alert } from '../../utils/alert';

import { SafeAreaView } from 'react-native-safe-area-context';
import CryptoManager from '../../services/cryptoManager';
import {
  clearRecoveryKeyDisplay,
  markAsLaunched,
  saveRecoveryKeyHash,
  saveVault,
} from '../../services/unifiedStorageService';
import { useAppDispatch } from '../../stores/hooks';
import {
  setAuthenticated,
  setEncryptionKey,
} from '../../stores/slices/authSlice';

import { QAPair } from '../../types/crypto';
import { PREDEFINED_SECURITY_QUESTIONS } from '../../utils/securityQuestions';

const SignupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  // const { setEncryptionKey } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isPasswordValid = password.length >= 8;
  const hasSelectedQuestions = selectedQuestions.length === 3;
  const allQuestionsAnswered = selectedQuestions.every(
    q => answers[q] && answers[q].trim().length > 0
  );

  const canSubmit =
    isPasswordValid &&
    passwordsMatch &&
    hasSelectedQuestions &&
    allQuestionsAnswered;

  const toggleQuestionSelection = (questionId: string) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions(selectedQuestions.filter(q => q !== questionId));
      const newAnswers = { ...answers };
      delete newAnswers[questionId];
      setAnswers(newAnswers);
    } else if (selectedQuestions.length < 3) {
      setSelectedQuestions([...selectedQuestions, questionId]);
    } else {
      Alert.alert('Maximum Reached', 'You can only select 3 questions');
    }
  };

  const handleSignup = async () => {
    if (!canSubmit) return;

    setIsLoading(true);

    try {
      // 1. Prepare QA pairs in the order they were selected
      const qaPairs: QAPair[] = selectedQuestions.map(qId => ({
        questionId: qId,
        answer: answers[qId],
      }));

      // 2. Initialize vault using CryptoManager
      // This generates:
      // - Master Data Key (DK)
      // - Three key wraps (password, security answers, recovery key)
      // - Three salts for key derivation
      const { vault, recoveryKey } = CryptoManager.initializeVault(
        password,
        qaPairs
      );

      // 3. Save vault to persistent storage
      await saveVault(vault);

      // 4. Save recovery key hash (for verification purposes)
      // Note: Full recovery key is shown once to user
      await saveRecoveryKeyHash(recoveryKey);

      // 5. Mark app as launched
      await markAsLaunched();

      // 6. Update Redux state
      dispatch(setAuthenticated(true));

      // 7. Store the DK in context (user is now logged in with this key)
      // Decrypt DK using password for immediate access
      const { dk } = CryptoManager.unlockWithPassword(vault, password);
      dispatch(setEncryptionKey(dk)); // ✅ Use Redux instead of context

      // 8. Show recovery key to user and ask them to save it
      Alert.alert(
        'Account Created!',
        `Your account has been created successfully.\n\n` +
          `⚠️ IMPORTANT: Save this Recovery Key somewhere safe:\n\n` +
          `${recoveryKey}\n\n` +
          `You will need this if you ever forget your password. ` +
          `Write it down or take a screenshot.`,
        [
          {
            text: 'I have saved my Recovery Key',
            onPress: () => {
              clearRecoveryKeyDisplay().catch((err: any) =>
                console.error('Error clearing recovery key:', err)
              );
              Alert.alert(
                'Great!',
                'Your journals are now protected with encryption. Start journaling!'
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert(
        'Error',
        `Failed to create account: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const controlDisabled = isLoading;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Create Your Password
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Your password protects all your journal entries with encryption
        </Text>

        <TextInput
          label="Password 🔑"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          mode="outlined"
          style={styles.input}
          disabled={controlDisabled}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />
        <HelperText type="info" visible={password.length > 0}>
          {isPasswordValid
            ? '✓ Password is strong enough'
            : '✗ Password must be at least 8 characters'}
        </HelperText>

        <TextInput
          label="Confirm Password 🔑"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          mode="outlined"
          disabled={controlDisabled}
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
          {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
        </HelperText>

        <View style={styles.separator} />

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Security Questions
        </Text>
        <Text variant="bodySmall" style={styles.sectionSubtitle}>
          Select 3 questions to help you recover your account if you forget your password
        </Text>

        <View style={styles.questionsContainer}>
          {PREDEFINED_SECURITY_QUESTIONS.map(q => (
            <Chip
              key={q.id}
              selected={selectedQuestions.includes(q.id)}
              onPress={() => toggleQuestionSelection(q.id)}
              style={styles.questionChip}
              mode="outlined"
            >
              {q.question}
            </Chip>
          ))}
        </View>

        {selectedQuestions.length > 0 && (
          <View style={styles.answersContainer}>
            <Text variant="titleSmall" style={styles.answersTitle}>
              Your Answers ({selectedQuestions.length}/3)
            </Text>
            {selectedQuestions.map(qId => {
              const question = PREDEFINED_SECURITY_QUESTIONS.find(
                q => q.id === qId
              );
              return (
                <View key={qId}>
                  <Text variant="bodySmall" 
                  
                  style={styles.questionText}>
                    {question?.question}
                  </Text>
                  <TextInput
                    disabled={controlDisabled}
                    value={answers[qId] || ''}
                    onChangeText={text =>
                      setAnswers({ ...answers, [qId]: text })
                    }
                    mode="outlined"
                    style={styles.answerInput}
                    placeholder="Your answer"
                  />
                </View>
              );
            })}
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleSignup}
          style={styles.button}
          disabled={controlDisabled}
          loading={isLoading}
        >
          {isLoading ? "🔏 Creating a secure environment...":"🔒 Create Account"}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.link}
          disabled={controlDisabled}
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
  input: {
    marginBottom: 4,
  },
  separator: {
    height: 24,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  sectionSubtitle: {
    marginBottom: 16,
    opacity: 0.7,
  },
  questionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  questionChip: {
    margin: 4,
  },
  answersContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  answersTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  questionText: {
    marginTop: 12,
    marginBottom: 4,
    opacity: 0.8,
  },
  answerInput: {
    marginBottom: 8,
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
