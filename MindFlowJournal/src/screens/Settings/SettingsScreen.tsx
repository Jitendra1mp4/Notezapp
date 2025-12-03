import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, List, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../stores/hooks';

import CryptoManager from '../../services/cryptoManager';
import {
    cancelAllNotifications,
    requestNotificationPermissions,
    scheduleDailyReminder,
} from '../../services/notificationService';
import {
    getVault,
    saveVault,
} from '../../services/unifiedStorageService';
import { logout } from '../../stores/slices/authSlice';
import {
    setNotificationsEnabled,
    setNotificationTime,
    setTheme,
} from '../../stores/slices/settingsSlice';
import { Alert } from '../../utils/alert';
import { useAuth } from '../../utils/authContext';


const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { encryptionKey, logout: authLogout } = useAuth();
  const settings = useAppSelector(state => state.settings);

  const [timeHour, setTimeHour] = useState('20');
  const [timeMinute, setTimeMinute] = useState('00');
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    // Parse stored time
    const [hour, minute] = settings.notificationTime.split(':');
    setTimeHour(hour);
    setTimeMinute(minute);
  }, [settings.notificationTime]);

  const handleNotificationToggle = async (value: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available',
        'Notifications are not supported on web browsers'
      );
      return;
    }

    if (value) {
      // Request permissions
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings'
        );
        return;
      }

      // Schedule notification
      const hour = parseInt(timeHour);
      const minute = parseInt(timeMinute);
      await scheduleDailyReminder(hour, minute);

      dispatch(setNotificationsEnabled(true));
      Alert.alert('Success', 'Daily reminder has been set!');
    } else {
      // Cancel notifications
      await cancelAllNotifications();
      dispatch(setNotificationsEnabled(false));
    }
  };

  const handleTimeUpdate = async () => {
    const hour = parseInt(timeHour);
    const minute = parseInt(timeMinute);

    if (isNaN(hour) || hour < 0 || hour > 23) {
      Alert.alert('Invalid Time', 'Hour must be between 0 and 23');
      return;
    }

    if (isNaN(minute) || minute < 0 || minute > 59) {
      Alert.alert('Invalid Time', 'Minute must be between 0 and 59');
      return;
    }

    const timeString = `${hour.toString().padStart(2, '0')}:${minute
      .toString()
      .padStart(2, '0')}`;
    dispatch(setNotificationTime(timeString));

    // Reschedule if notifications are enabled
    if (settings.notificationsEnabled && Platform.OS !== 'web') {
      await scheduleDailyReminder(hour, minute);
      Alert.alert('Updated', 'Reminder time has been updated!');
    }

    setShowTimePicker(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('⚠️ Oops!', 'New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('⚠️ Oops!', 'New passwords do not match');
      return;
    }

    if (!encryptionKey) {
      Alert.alert('⚠️ Oops!', 'Not authenticated');
      return;
    }

    setIsChangingPassword(true);

    try {
      // Get current vault
      const vaultData = await getVault();
      if (!vaultData) {
        Alert.alert('Oops!', 'Account not found');
        setIsChangingPassword(false);
        return;
      }

      // Verify current password
      try {
        CryptoManager.unlockWithPassword(vaultData as any, currentPassword);
      } catch (error) {
        Alert.alert('Oops!', 'Current password is incorrect');
        setIsChangingPassword(false);
        return;
      }

      // The encryptionKey we have is already decrypted DK
      // Use it to rebuild vault with new password
      const updatedVault = CryptoManager.rebuildVaultWithNewPassword(
        vaultData as any,
        encryptionKey,
        newPassword
      );

      // Save updated vault
      await saveVault(updatedVault);

      // Update encryption key in context (it stays the same)
      // setEncryptionKey(encryptionKey); // Already set

      Alert.alert('Success', 'Password changed successfully!');
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error('Password change error:', error);
      Alert.alert(
        'Oops!',
        `Failed to change password: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? Your encryption key will be removed from memory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // Wipe DK from memory and Redux state
            authLogout(); // Wipe from auth context
            dispatch(logout()); // Wipe from Redux - this will trigger RootNavigator to switch to AuthStack
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          <List.Item
            title="Dark Mode"
            description={`Current: ${settings.theme}`}
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch
                value={settings.theme === 'dark'}
                onValueChange={value =>
                  dispatch(setTheme(value ? 'dark' : 'light'))
                }
              />
            )}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Notifications</List.Subheader>
          {Platform.OS === 'web' && (
            <List.Item
              title="Not Available on Web"
              description="Notifications only work on mobile devices"
              left={props => <List.Icon {...props} icon="alert-circle" />}
            />
          )}
          {Platform.OS !== 'web' && (
            <>
              <List.Item
                title="Daily Reminders"
                description="Get reminded to journal daily"
                left={props => <List.Icon {...props} icon="bell" />}
                right={() => (
                  <Switch
                    value={settings.notificationsEnabled}
                    onValueChange={handleNotificationToggle}
                  />
                )}
              />
              {settings.notificationsEnabled && (
                <List.Item
                  title="Reminder Time"
                  description={`${timeHour}:${timeMinute}`}
                  left={props => <List.Icon {...props} icon="clock-outline" />}
                  onPress={() => setShowTimePicker(!showTimePicker)}
                />
              )}
              {showTimePicker && (
                <View style={styles.timePicker}>
                  <View style={styles.timeInputRow}>
                    <TextInput
                      label="Hour (0-23)"
                      value={timeHour}
                      onChangeText={setTimeHour}
                      keyboardType="number-pad"
                      mode="outlined"
                      style={styles.timeInput}
                      maxLength={2}
                    />
                    <TextInput
                      label="Minute (0-59)"
                      value={timeMinute}
                      onChangeText={setTimeMinute}
                      keyboardType="number-pad"
                      mode="outlined"
                      style={styles.timeInput}
                      maxLength={2}
                    />
                  </View>
                  <Button mode="contained" onPress={handleTimeUpdate}>
                    Update Time
                  </Button>
                </View>
              )}
            </>
          )}
        </List.Section>

        <List.Section>
          <List.Subheader>Security</List.Subheader>
          <List.Item
            title="Change Password"
            description="Update your master password"
            left={props => <List.Icon {...props} icon="lock" />}
            onPress={() => setShowPasswordDialog(true)}
          />
          <List.Item
            title="Logout"
            description="Sign out of your account"
            left={props => <List.Icon {...props} icon="logout" />}
            onPress={handleLogout}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>About</List.Subheader>
          <List.Item
            title="Version"
            description="1.0.0 (Sprint 6)"
            left={props => <List.Icon {...props} icon="information" />}
          />
          <List.Item
            title="Developer"
            description="Built with React Native & Expo"
            left={props => <List.Icon {...props} icon="code-tags" />}
          />
        </List.Section>
      </ScrollView>

      {/* Password Change Dialog */}
      {showPasswordDialog && (
        <View style={styles.dialogOverlay}>
          <Card style={styles.dialog}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.dialogTitle}>
                Change Password
              </Text>

              <TextInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                mode="outlined"
                style={styles.dialogInput}
              />

              <TextInput
                label="New Password (min 8 characters)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                mode="outlined"
                style={styles.dialogInput}
              />

              <TextInput
                label="Confirm New Password"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry
                mode="outlined"
                style={styles.dialogInput}
              />

              <View style={styles.dialogButtons}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowPasswordDialog(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}
                  disabled={isChangingPassword}
                  style={styles.dialogButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleChangePassword}
                  loading={isChangingPassword}
                  disabled={isChangingPassword}
                  style={styles.dialogButton}
                >
                  Change
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timePicker: {
    padding: 16,
    paddingTop: 8,
  },
  timeInputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
  },
  dialogTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  dialogInput: {
    marginBottom: 12,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  dialogButton: {
    marginLeft: 8,
  },
});

export default SettingsScreen;
