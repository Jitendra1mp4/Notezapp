import APP_CONFIG from "@/src/config/appConfig";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import CryptoManager from "../../services/cryptoManager";
import { getVault, isFirstLaunch } from "../../services/unifiedStorageService";
import { useAppDispatch } from "../../stores/hooks";
import {
  setAuthenticated,
  setEncryptionKey,
} from "../../stores/slices/authSlice";
import { Alert } from "../../utils/alert";

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  // const { setEncryptionKey } = useAuth();

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [vaultReady, setVaultReady] = useState(false);

  useEffect(() => {
    const initializeLoginState = async () => {
      try {
        console.log(
          "🔑 LoginScreen: Initializing via unifiedStorageService...",
        );

        // Check first launch
        const firstTime = await isFirstLaunch();
        setIsFirstTime(firstTime);

        // Preload vault via unified service
        const vaultData = await getVault();
        console.log("✅ Vault status via unifiedStorageService:", !!vaultData);
        setVaultReady(!!vaultData);
      } catch (error) {
        console.error("❌ unifiedStorageService init failed:", error);
        setVaultReady(false);
      }
    };

    initializeLoginState();
  }, []);

  const handleLogin = async () => {
    setShowPassword(false)
    if (!password.trim()) {
      Alert.alert("Oops!", "Please enter your password");
      return;
    }

    if (!vaultReady) {
      Alert.alert(
        "Error",
        "Secure storage not ready. Please wait and try again.",
      );
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔓 Unlocking...");

      const vaultData = await getVault();
      if (!vaultData) {
        Alert.alert("Oops!", "No account found. Please create an account.");
        return;
      }

      const { dk } = CryptoManager.unlockWithPassword(vaultData as any, password);
      
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
<SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="displaySmall" style={styles.title}>
         {APP_CONFIG.displayName}
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Secure. Private. Yours.
        </Text>

        {!vaultReady && (
          <View style={styles.vaultLoading}>
            <Text>Loading secure storage...</Text>
          </View>
        )}

       <TextInput
          label="🔑"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          mode="outlined"
          style={styles.input}
          autoFocus={vaultReady}
          onSubmitEditing={handleLogin}
          // ✅ FIX: Disable editing when loading OR vault not ready
          editable={vaultReady && !isLoading} 
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
          disabled={isLoading || !vaultReady || !password.trim()}
          loading={isLoading}
          style={styles.button}
        >
          {isLoading ? '🔓 Unlocking...' : '🔐 Unlock'}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('ForgotPassword')}
          disabled={isLoading}
          style={styles.link}
        >
         😵‍💫 Forgot Password?
        </Button>

        {isFirstTime && (
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Signup')}
            disabled={isLoading}
            style={styles.signupButton}
          >
            First time? Lets set it up...
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
  vaultLoading: { // NEW - minimal addition
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
  }

});

export default LoginScreen;
