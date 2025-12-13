import React, { useState } from 'react';
import { Alert } from '../../utils/alert';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  useTheme,
  Chip,
  HelperText,
} from 'react-native-paper';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '../../stores/hooks';
import {
  setAuthenticated,
  setSalt,
  setSecurityQuestions,
} from '../../stores/slices/authSlice';
import { useAuth } from '../../utils/authContext';
import {
  deriveKeyFromPassword,
  hashText,
} from '../../services/encryptionService';
import {
  saveSalt,
  saveSecurityQuestions,
  savePublicSecurityQuestions,
  markAsLaunched,
  saveVerificationToken, // ADD THIS
  saveSecurityAnswerHashes, 
} from '../../services/storageService';

import { PREDEFINED_SECURITY_QUESTIONS } from '../../utils/securityQuestions';
import { SecurityQuestion } from '../../types';

const SignupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { setEncryptionKey } = useAuth();

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
    } else {
      if (selectedQuestions.length < 3) {
        setSelectedQuestions([...selectedQuestions, questionId]);
      } else {
        Alert.alert('Maximum Reached', 'You can only select 3 questions');
      }
    }
  };

  const handleSignup = async () => {
    if (!canSubmit) return;

    setIsLoading(true);

    try {
      // 1. Derive encryption key from password
      const { key, salt } = deriveKeyFromPassword(password);

      // 2. Save salt to storage
      await saveSalt(salt);

      // 3. Create security questions with hashed answers
      const securityQuestions: SecurityQuestion[] = selectedQuestions.map(
        qId => {
          const question = PREDEFINED_SECURITY_QUESTIONS.find(
            q => q.id === qId
          );
          return {
            questionId: qId,
            question: question!.question,
            answerHash: hashText(answers[qId]),
          };
        }
      );

      // 4. Save security questions (encrypted with user's key)
      await saveSecurityQuestions(securityQuestions, key);



      // 4.5 Save verification token
      await saveVerificationToken(key);

      // 4.6 Save answer hashes separately for recovery (ADD THIS)
      const answerHashes = selectedQuestions.map(qId => ({
        questionId: qId,
        answerHash: hashText(answers[qId]),
      }));
      await saveSecurityAnswerHashes(answerHashes);

      
      // 5. Save public copy (just questions, for recovery flow)
      const publicQuestions = securityQuestions.map(sq => ({
        questionId: sq.questionId,
        question: sq.question,
      }));
      await savePublicSecurityQuestions(publicQuestions);

      // 6. Mark app as launched
      await markAsLaunched();

      // 7. Update Redux state
      dispatch(setSalt(salt));
      dispatch(setSecurityQuestions(securityQuestions));
      dispatch(setAuthenticated(true));

      // 8. Store encryption key in context
      setEncryptionKey(key);

      Alert.alert(
        'Success!',
        'Your account has been created. Your journals are now protected.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert(
        'Error',
        'Failed to create account. Please try again.',
        [{ text: 'OK' }]
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
          Create Your Password
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Your password protects all your journal entries with encryption
        </Text>

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          mode="outlined"
          style={styles.input}
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
          label="Confirm Password"
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
          {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
        </HelperText>

        <View style={styles.separator} />

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Security Questions
        </Text>
        <Text variant="bodySmall" style={styles.sectionSubtitle}>
          Select 3 questions to help you recover your password if you forget it
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
                  <Text variant="bodySmall" style={styles.questionText}>
                    {question?.question}
                  </Text>
                  <TextInput
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
          disabled={!canSubmit || isLoading}
          loading={isLoading}
        >
          Create Account
        </Button>

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
