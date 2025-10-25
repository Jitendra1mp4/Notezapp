import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Switch, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../stores/hooks';
import {
  setTheme,
  setNotificationsEnabled,
} from '../../stores/slices/settingsSlice';

const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
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
          <List.Item
            title="Daily Reminders"
            description="Get reminded to journal daily"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={value =>
                  dispatch(setNotificationsEnabled(value))
                }
              />
            )}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Security</List.Subheader>
          <List.Item
            title="Change Password"
            description="Coming in Sprint 6"
            left={props => <List.Icon {...props} icon="lock" />}
            disabled
          />
          <List.Item
            title="Security Questions"
            description="Coming in Sprint 6"
            left={props => <List.Icon {...props} icon="help-circle" />}
            disabled
          />
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SettingsScreen;
