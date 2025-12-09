import { TimePickerInput } from "@/src/components/common/TimePickerInput";
import { ResetStorage } from "@/src/services/unifiedStorageService";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, View } from "react-native";
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import APPCONFIG from "../../config/appConfig";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import {
  setAutoLockTimeout,
  setInstantLockOnBackground,
  setNotificationsEnabled,
  setNotificationTime,
  setTheme,
} from "../../stores/slices/settingsSlice";

const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  // Local state
  const [showTimeoutOptions, setShowTimeoutOptions] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const isPasswordValid = newPassword.length >= 8;

  const handleInstantLockToggle = () => {
    dispatch(setInstantLockOnBackground(!settings.instantLockOnBackground));
    if (!settings.instantLockOnBackground) {
      setShowTimeoutOptions(false);
    }
  };

  const handleTimeoutSelect = (timeout: number) => {
    dispatch(setAutoLockTimeout(timeout));
    setShowTimeoutOptions(false);
  };

  const handleChangePassword = async () => {
    if (!isPasswordValid) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    if (!passwordsMatch) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setIsSavingPassword(true);
    try {
      // Navigate to ForgotPasswordScreen for password change
      // This maintains the existing flow without breaking CryptoManager
      navigation.navigate("ForgotPassword");
    } catch (error) {
      Alert.alert("Error", "Failed to change password");
    } finally {
      setIsSavingPassword(false);
      setShowPasswordDialog(false);
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const getTimeoutLabel = () => {
    const option = APPCONFIG.LOCK_TIMEOUT_OPTIONS.find(
      (o) => o.value === settings.autoLockTimeout,
    );
    return option
      ? option.label
      : `${Math.round(settings.autoLockTimeout / 60000)} Minutes`;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 80 }]}
      >
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Theme
          </Text>

          <View style={styles.settingRow}>
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* <View style={styles.settingInfo}>
              <Text variant="titleMedium">Theme</Text>
              <Text variant="bodyMedium" style={styles.settingDescription}>
                App appearance mode
              </Text>
            </View>
             */}
              <View style={styles.themeButtons}>
                {(["light", "dark", "auto"] as const).map((themeOption) => (
                  <Button
                    key={themeOption}
                    mode={
                      settings.theme === themeOption ? "contained" : "outlined"
                    }
                    onPress={() => dispatch(setTheme(themeOption))}
                    style={styles.themeButton}
                    compact
                  >
                    {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                  </Button>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Notifications
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="titleMedium">Daily Reminders</Text>
              <Text variant="bodyMedium" style={styles.settingDescription}>
                Get daily journaling reminders
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) => {
                dispatch(setNotificationsEnabled(value));
              }}
              trackColor={{ true: theme.colors.primary }}
            />
          </View>

          {settings.notificationsEnabled && (
            <View style={styles.timePickerContainer}>
              <TimePickerInput
                value={settings.notificationTime}
                onChangeTime={(time) => dispatch(setNotificationTime(time))}
                label="Reminder Time"
                disabled={!settings.notificationsEnabled}
              />
              <HelperText type="info">
                📱 You'll receive a daily reminder at this time
              </HelperText>
            </View>
          )}
        </View>

        {/* Security Section */}
        <View style={[styles.section, { marginBottom: 220 }]}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Security
          </Text>

          {/* Instant Lock */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="titleMedium">Instant Lock</Text>
              <Text variant="bodyMedium" style={styles.settingDescription}>
                Lock immediately when screen turns off or app is minimized
              </Text>
            </View>
            <Switch
              value={settings.instantLockOnBackground}
              onValueChange={handleInstantLockToggle}
              trackColor={{ true: theme.colors.primary }}
            />
          </View>

          {/* Auto Lock Timeout */}
          {!settings.instantLockOnBackground && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text variant="titleMedium">Auto-Lock Timeout</Text>
                <Text variant="bodyMedium" style={styles.settingDescription}>
                  Lock after inactivity
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={() => setShowTimeoutOptions(true)}
                style={styles.timeoutButton}
              >
                {getTimeoutLabel()}
              </Button>
            </View>
          )}

          <View
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-around",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {/* Change Password */}
            <Button
              mode="outlined"
              onPress={() => setShowPasswordDialog(true)}
              style={styles.passwordButton}
              icon="lock-reset"
            >
              Change Password
            </Button>
            <Button
              mode="outlined"
              style={{
                flex: 1,
                borderColor: theme.colors.error,
                marginVertical: 10,
              }}
              onPress={async () => {
                Alert.alert(
                  "Destroy Database!",
                  "Are you sure you want to destroy DB everything will be reset.",
                  [
                    {
                      text: "Cancel",
                      onPress: () => console.log("Destroy canceled"),
                    },
                    {
                      text: "Yes",
                      onPress: () => {
                        ResetStorage();
                        navigation.navigate("Signup");
                      },
                    },
                  ],
                );
              }}
              textColor={theme.colors.error}
              icon="hammer"
            >
              Reset and Destroy Data
            </Button>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            About
          </Text>

          <View style={styles.aboutCard}>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              {APPCONFIG.displayName}
            </Text>
            <Text variant="bodyMedium" style={styles.aboutText}>
              Secure. Private. Yours.
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.aboutText, { opacity: 0.7 }]}
            >
              Your journals are end-to-end encrypted
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Timeout Options Modal */}
      <Portal>
        <Dialog
          visible={showTimeoutOptions}
          onDismiss={() => setShowTimeoutOptions(false)}
        >
          <Dialog.Title>Select Auto-Lock Timeout</Dialog.Title>
          <Dialog.Content style={{ gap: 8 }}>
            {APPCONFIG.LOCK_TIMEOUT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                mode={
                  settings.autoLockTimeout === option.value
                    ? "contained"
                    : "outlined"
                }
                onPress={() => handleTimeoutSelect(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTimeoutOptions(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Change Password Dialog */}
      {ResetPassword(
        showPasswordDialog,
        setShowPasswordDialog,
        currentPassword,
        setCurrentPassword,
        showCurrentPassword,
        setShowCurrentPassword,
        newPassword,
        setNewPassword,
        showNewPassword,
        isPasswordValid,
        setShowNewPassword,
        confirmPassword,
        setConfirmPassword,
        showConfirmPassword,
        passwordsMatch,
        setShowConfirmPassword,
        handleChangePassword,
        isSavingPassword,
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingDescription: {
    opacity: 0.7,
    marginTop: 4,
  },
  themeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  themeButton: {
    minWidth: 80,
  },
  timeoutButton: {
    minWidth: 120,
  },
  passwordButton: {
    flex: 1,
  },

   timePickerContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  timeInput: {
    minWidth: 100,
  },
  aboutCard: {
    padding: 20,
    marginBottom: 320,
    borderRadius: 12,
    alignItems: "center",
  },
  aboutText: {
    textAlign: "center",
    marginBottom: 4,
  },
  dialogInput: {
    marginBottom: 8,
  },
  logoutButton: {
    flex: 1,
  },
});

export default SettingsScreen;
function ResetPassword(
  showPasswordDialog: boolean,
  setShowPasswordDialog: React.Dispatch<React.SetStateAction<boolean>>,
  currentPassword: string,
  setCurrentPassword: React.Dispatch<React.SetStateAction<string>>,
  showCurrentPassword: boolean,
  setShowCurrentPassword: React.Dispatch<React.SetStateAction<boolean>>,
  newPassword: string,
  setNewPassword: React.Dispatch<React.SetStateAction<string>>,
  showNewPassword: boolean,
  isPasswordValid: boolean,
  setShowNewPassword: React.Dispatch<React.SetStateAction<boolean>>,
  confirmPassword: string,
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>,
  showConfirmPassword: boolean,
  passwordsMatch: boolean,
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>,
  handleChangePassword: () => Promise<void>,
  isSavingPassword: boolean,
) {
  return (
    <Portal>
      <Dialog
        visible={showPasswordDialog}
        onDismiss={() => setShowPasswordDialog(false)}
      >
        <Dialog.Title>Change Password</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrentPassword}
            mode="outlined"
            style={styles.dialogInput}
            right={
              <TextInput.Icon
                icon={showCurrentPassword ? "eye-off" : "eye"}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              />
            }
          />

          <TextInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            mode="outlined"
            style={styles.dialogInput}
            error={!isPasswordValid && newPassword.length > 0}
            right={
              <TextInput.Icon
                icon={showNewPassword ? "eye-off" : "eye"}
                onPress={() => setShowNewPassword(!showNewPassword)}
              />
            }
          />
          {!isPasswordValid && newPassword.length > 0 && (
            <HelperText type="error">
              Password must be at least 8 characters
            </HelperText>
          )}

          <TextInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            mode="outlined"
            style={styles.dialogInput}
            error={!passwordsMatch && confirmPassword.length > 0}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? "eye-off" : "eye"}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
          />
          {!passwordsMatch && confirmPassword.length > 0 && (
            <HelperText type="error">Passwords do not match</HelperText>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowPasswordDialog(false)}>Cancel</Button>
          <Button
            mode="contained"
            onPress={handleChangePassword}
            loading={isSavingPassword}
            disabled={!isPasswordValid || !passwordsMatch || isSavingPassword}
          >
            Change Password
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
