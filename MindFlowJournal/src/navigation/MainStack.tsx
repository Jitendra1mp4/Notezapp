import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import APP_CONFIG from '../config/appConfig';
import CalendarScreen from '../screens/Calendar/CalendarScreen';
import ExportScreen from '../screens/Export/ExportScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import JournalDetailScreen from '../screens/Journal/JournalDetailScreen';
import JournalEditorScreen from '../screens/Journal/JournalEditorScreen';
import JournalListScreen from '../screens/Journal/JournalListScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Stack = createNativeStackNavigator();

export const MainStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: APP_CONFIG.displayName }}
      />
      <Stack.Screen
        name="JournalList"
        component={JournalListScreen}
        options={{ title: 'My Journals' }}
      />
      <Stack.Screen
        name="JournalEditor"
        component={JournalEditorScreen}
        options={{ title: 'Write Journal' }}
      />
      <Stack.Screen
        name="JournalDetail"
        component={JournalDetailScreen}
        options={{ title: 'Journal Entry' }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: 'Calendar' }}
      />
      <Stack.Screen
        name="Export"
        component={ExportScreen}
        options={{ title: 'Export Journals' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
};
