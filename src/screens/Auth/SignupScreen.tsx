import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { Alert } from "../../utils/alert";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAppDispatch } from "../../stores/hooks";
import {
  setAuthenticated,
  setEncryptionKey,
} from "../../stores/slices/authSlice";

import APP_CONFIG from "@/src/config/appConfig";
import { getCryptoProvider } from "@/src/services/cryptoServiceProvider";
import { requestNotificationPermissions } from "@/src/services/notificationService";
import { getVaultStorageProvider } from "@/src/services/vaultStorageProvider";
import { resolveImmediately } from "@/src/utils/immediatePromiseResolver";
import { useFocusEffect } from "@react-navigation/native";
import { QAPair } from "../../types/crypto";
import { PREDEFINED_SECURITY_QUESTIONS } from "../../utils/securityQuestions";

const CryptoManager = getCryptoProvider();
const VaultStorageProvider = getVaultStorageProvider()

const SignupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const askPermission = async () => {
      // Request Notification Permissions
      const granted = await requestNotificationPermissions();
      if (!granted ) {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings.",
        );
      }
    };
    if (Platform.OS !== 'web') askPermission();
  },[]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      (async () => {
        try {
          const isFirst = await VaultStorageProvider.isFirstLaunch();
          console.log(`isFirstLaunch: ${isFirst}`);
          if (!isFirst && isMounted) {
            navigation.navigate("Login");
          }
        } catch (err) {
          console.error("Error checking first launch:", err);
        }
      })();

      return () => {
        isMounted = false;
      };
    }, [navigation]),
  );

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isPasswordValid = password.length >= 8;
  const hasSelectedQuestions = selectedQuestions.length === 3;
  const allQuestionsAnswered = selectedQuestions.every(
    (q) => answers[q] && answers[q].trim().length > 0,
  );

  const canSubmit =
    isPasswordValid &&
    passwordsMatch &&
    hasSelectedQuestions &&
    allQuestionsAnswered;

  const toggleQuestionSelection = useCallback(
    (questionId: string) => {
      if (selectedQuestions.includes(questionId)) {
        setSelectedQuestions((prev) => prev.filter((q) => q !== questionId));
        setAnswers((prev) => {
          const newAnswers = { ...prev };
          delete newAnswers[questionId];
          return newAnswers;
        });
      } else if (selectedQuestions.length < 3) {
        setSelectedQuestions((prev) => [...prev, questionId]);
      } else {
        Alert.alert("Maximum Reached", "You can only select 3 questions");
      }
    },
    [selectedQuestions.length],
  );

  // Force immediate UI update before heavy crypto work
  const handleSignup = useCallback(async () => {
    if (!canSubmit || isLoading) return;

    // ✅ CRITICAL: Force immediate state update and yield to React render
    setIsLoading(true);

    // Yield control to let React paint the loading state FIRST
    await new Promise(resolve => resolveImmediately(resolve));

    try {
      // Prepare QA pairs
      const qaPairs: QAPair[] = selectedQuestions.map((qId) => ({
        questionId: qId,
        answer: answers[qId],
      }));

      // 2. Initialize vault using CryptoManager
      // This generates:
      // - Master Data Key (DK)
      // - Three key wraps (password, security answers, recovery key)
      // - Three salts for key derivation
      const { vault, recoveryKey, dk } = await CryptoManager.initializeVault(
        password,
        qaPairs,
      );

      await  VaultStorageProvider.saveVault(vault);

      // 4. Save recovery key hash (for verification purposes)
      // Note: Full recovery key is shown once to user
      await  VaultStorageProvider.saveRecoveryKeyHash(recoveryKey);

      // 5. Mark app as launched
      await  VaultStorageProvider.markAsLaunched();

      // 6. Update Redux state
      dispatch(setAuthenticated(true));

      // 7. Store the DK in context (user is now logged in with this key)
      // Decrypt DK using password for immediate access
      // const { dk } = await CryptoManager.unlockWithPassword(vault, password);
      dispatch(setEncryptionKey(dk));

      // 8. Show recovery key to user and ask them to save it
      Alert.alert(
        "Account Created!",
        `Your account has been created successfully.\n\n` +
          `⚠️ IMPORTANT: Save this Recovery Key somewhere safe:\n\n` +
          `${recoveryKey}\n\n` +
          `You will need this if you ever forget your password. ` +
          `Write it down or take a screenshot.`,
        [
          {
            text: "I have saved my Recovery Key",
            onPress: () => {
               VaultStorageProvider.clearRecoveryKeyDisplay().catch((err: any) =>
                console.error("Error clearing recovery key:", err),
              );
              Alert.alert(
                "Great!",
                "Your journals are now protected with encryption. Start journaling!",
              );
            },
          },
        ],
      );
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert(
        "Error",
        `Failed to create account: ${error instanceof Error ? error.message : "Unknown error"}`,
        [{ text: "OK" }],
      );
    } finally {
      setIsLoading(false);
    }
  }, [canSubmit, isLoading, password, selectedQuestions, answers, dispatch]);

  const controlDisabled = isLoading;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text
              variant="displaySmall"
              style={[styles.appTitle, { color: theme.colors.onBackground }]}
            >
              {APP_CONFIG.displayName}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.subtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Create a secure vault for your journals.
            </Text>
          </View>

          {/* Password section */}
          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
            mode="elevated"
          >
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Create password
              </Text>

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                mode="outlined"
                disabled={controlDisabled}
                style={styles.input}
                left={
                  <TextInput.Icon
                    icon="lock-outline"
                    disabled={controlDisabled}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={controlDisabled}
                  />
                }
              />
              <HelperText type="info" visible={password.length > 0}>
                {isPasswordValid
                  ? "Password looks good."
                  : "Use at least 8 characters."}
              </HelperText>

              <TextInput
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                mode="outlined"
                disabled={controlDisabled}
                style={styles.input}
                left={
                  <TextInput.Icon
                    icon="lock-check-outline"
                    disabled={controlDisabled}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? "eye-off" : "eye"}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={controlDisabled}
                  />
                }
              />
              <HelperText
                type={passwordsMatch ? "info" : "error"}
                visible={confirmPassword.length > 0}
              >
                {passwordsMatch
                  ? "Passwords match."
                  : "Passwords do not match."}
              </HelperText>
            </Card.Content>
          </Card>

          {/* Security Questions */}
          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
            mode="elevated"
          >
            <Card.Content>
              <View style={styles.sectionHeaderRow}>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  Security questions
                </Text>
                <Chip compact icon="shield-key-outline">
                  {selectedQuestions.length}/3
                </Chip>
              </View>

              <Text
                variant="bodySmall"
                style={[
                  styles.sectionHint,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Select 3 questions to recover your account if you forget your
                password.
              </Text>

              <View style={styles.questionsWrap}>
                {PREDEFINED_SECURITY_QUESTIONS.map((q) => {
                  const selected = selectedQuestions.includes(q.id);
                  return (
                    <Chip
                      key={q.id}
                      selected={selected}
                      onPress={() => toggleQuestionSelection(q.id)}
                      disabled={controlDisabled}
                      style={[
                        styles.questionChip,
                        {
                          backgroundColor: selected
                            ? theme.colors.primaryContainer
                            : theme.colors.surfaceVariant,
                          borderColor: theme.colors.outlineVariant,
                        },
                      ]}
                      textStyle={{
                        color: selected
                          ? theme.colors.onPrimaryContainer
                          : theme.colors.onSurfaceVariant,
                      }}
                      mode="outlined"
                    >
                      {q.question}
                    </Chip>
                  );
                })}
              </View>
            </Card.Content>
          </Card>

          {/* Answers */}
          {selectedQuestions.length > 0 && (
            <Card
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
              mode="elevated"
            >
              <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  Your answers
                </Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.sectionHint,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Answers are used only for recovery. Keep them memorable.
                </Text>

                {selectedQuestions.map((qId) => {
                  const question = PREDEFINED_SECURITY_QUESTIONS.find(
                    (q) => q.id === qId,
                  );
                  return (
                    <View key={qId} style={styles.answerBlock}>
                      <Text
                        variant="labelLarge"
                        style={{ color: theme.colors.onSurface }}
                      >
                        {question?.question}
                      </Text>
                      <TextInput
                        value={answers[qId] ?? ""}
                        onChangeText={(text) =>
                          setAnswers({ ...answers, [qId]: text })
                        }
                        mode="outlined"
                        placeholder="Your answer"
                        disabled={controlDisabled}
                        style={styles.input}
                      />
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
          )}

          {/* CTA */}
          <Button
            mode="contained"
            onPress={handleSignup}
            disabled={!canSubmit || controlDisabled}
            loading={isLoading}
            style={styles.cta}
            contentStyle={styles.ctaContent}
          >
            {isLoading ? "Creating secure vault..." : "Create account"}
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate("Login")}
            disabled={controlDisabled}
            style={styles.link}
          >
            Already set up? Login
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  header: { marginTop: 8, marginBottom: 8, alignItems: "center" },
  appTitle: { textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: 6 },
  card: { borderRadius: 16, paddingVertical: 10 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { marginBottom: 8, fontWeight: "700" },
  sectionHint: { marginBottom: 12 },
  input: { marginBottom: 8 },
  questionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  questionChip: { borderWidth: 1 },
  answerBlock: { marginTop: 10 },
  cta: { marginTop: 6, borderRadius: 14 },
  ctaContent: { paddingVertical: 8 },
  link: { marginTop: 6 },
});

export default SignupScreen;
