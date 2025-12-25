import APP_CONFIG from "@/src/config/appConfig";
import { getCryptoProvider } from "@/src/services/cryptoServiceProvider";
import { getVaultStorageProvider } from "@/src/services/vaultStorageProvider";
import { resolveImmediately } from "@/src/utils/immediatePromiseResolver";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Divider,
  Text,
  TextInput,
  useTheme
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch } from "../../stores/hooks";
import {
  setAuthenticated,
  setEncryptionKey,
} from "../../stores/slices/authSlice";
import { Alert } from "../../utils/alert";

const CryptoManager = getCryptoProvider() ;
const VaultStorageProvider = getVaultStorageProvider()

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [vaultReady, setVaultReady] = useState(false);
  const [cachedVault, setCachedVault] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const initializeLoginState = async () => {
        try {
          // optional: show loading state while checking
          setVaultReady(false);

          const firstTime = await  VaultStorageProvider.isFirstLaunch();
          const vaultData = await  VaultStorageProvider.getVault();

          if (!isActive) return;

          setIsFirstTime(firstTime);
          setCachedVault(vaultData); // if you added caching
          setVaultReady(!!vaultData);
        } catch (error) {
          console.error("Login init failed:", error);

          if (!isActive) return;

          setCachedVault(null);
          setVaultReady(false);
        }
      };

      initializeLoginState();

      // cleanup when screen loses focus/unmount
      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleLogin = async () => {
    setShowPassword(false);
    if (!password.trim()) {
      Alert.alert("Oops!", "Please enter your password");
      return;
    }

    if (!vaultReady) {
      Alert.alert(
        "Oops!",
        "Secure storage not ready. Please wait and try again.",
      );
      return;
    }

    setIsLoading(true);
     // Yield control to let React paint the loading state FIRST
    await new Promise(resolve => resolveImmediately(resolve));
    try {
      console.log("🔓 Unlocking...");

      const vaultToUse = cachedVault ?? (await  VaultStorageProvider.getVault());
      if (!vaultToUse) {
        Alert.alert("Oops!", "No account found. Please create an account.");
        return;
      }

      const unlockResult: any = await CryptoManager.unlockWithPassword(
        vaultToUse as any,
        password,
      );
      const dk =
        typeof unlockResult === "string" ? unlockResult : unlockResult.dk;

      console.log("✅ DK unlocked successfully");

      // Update Redux
      dispatch(setAuthenticated(true));
      dispatch(setEncryptionKey(dk)); // ✅ Now passing a string

      console.log("🎉 Login complete");
    } catch (error) {
      console.error("❌ Login error:", error);
      Alert.alert(
        "Wrong Password",
        "The password is incorrect. Try again or use password recovery.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              {APP_CONFIG.displayName}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.subtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Secure. Private. Yours.
            </Text>
          </View>

          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content style={styles.cardContent}>             
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                mode="outlined"
                style={styles.input}
                autoFocus={vaultReady}
                onSubmitEditing={handleLogin}
                editable={vaultReady && !isLoading}
                left={<TextInput.Icon icon="lock-outline" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword((v) => !v)}
                    disabled={!vaultReady || isLoading}
                  />
                }
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                disabled={isLoading || !vaultReady || !password.trim()}
                loading={isLoading}
                style={styles.primaryButton}
                contentStyle={styles.primaryButtonContent}
              >
                {isLoading ? "Unlocking..." : "Unlock"}
              </Button>

              <Divider style={styles.divider} />

              <Button
                mode="text"
                onPress={() => navigation.navigate("ForgotPassword")}
                disabled={isLoading}
                style={styles.link}
              >
                Forgot password?
              </Button>

              {(isFirstTime || !vaultReady) && (
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate("Signup")}
                  disabled={isLoading}
                  icon="account-plus-outline"
                  style={styles.secondaryButton}
                  contentStyle={styles.secondaryButtonContent}
                >
                  First time? Let’s set it up
                </Button>
              )}

              <Text
                variant="bodySmall"
                style={[
                  styles.footer,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Your journals are encrypted and stored on your device.
              </Text>
            </Card.Content>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    textAlign: "center",
  },
  card: {
    borderRadius: 16,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  cardContent: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingBox: {
    marginBottom: 12,
    gap: 8,
  },
  loadingText: {
    textAlign: "center",
  },
  inlineProgress: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 12,
  },
  primaryButtonContent: {
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 14,
  },
  link: {
    alignSelf: "center",
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 12,
  },
  secondaryButtonContent: {
    paddingVertical: 6,
  },
  footer: {
    marginTop: 14,
    textAlign: "center",
    opacity: 0.9,
  },
});

export default LoginScreen;
