// src/navigation/MainStack.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { View } from "react-native"; // Don't forget this import
import { IconButton, useTheme } from "react-native-paper";
import APP_CONFIG from "../config/appConfig";
import { useScreenProtection } from "../hooks/useScreenProtection";
import ExportScreen from "../screens/Export/ExportScreen";
import HomeScreen from "../screens/Home/HomeScreen";
import ImportScreen from "../screens/ImportScreen";
import JournalDetailScreen from "../screens/Journal/JournalDetailScreen";
import JournalEditorScreen from "../screens/Journal/JournalEditorScreen";
import JournalListScreen from "../screens/Journal/JournalListScreen";
import SettingsScreen from "../screens/Settings/SettingsScreen";
import { useAppDispatch } from "../stores/hooks";
import { logout } from "../stores/slices/authSlice";

const Stack = createNativeStackNavigator();

export const MainStack: React.FC = () => {

   // 🔒 Enable Security for the Main Stack
  // This hook ensures that as long as the user is authenticated 
  // (and this component is rendered), the screen is secure.
  useScreenProtection(); 

  const theme = useTheme();
  const dispatch = useAppDispatch();

  // We define a helper function that takes 'navigation' as an argument
  const getHeaderOptions = (navigation: any, title: string) => ({
    title,
    headerStyle: { backgroundColor: theme.colors.surface , borderBottomWidth:0, },
    headerTintColor: theme.colors.onSurface,
    headerRight: () => (
      <View style={{ display: "flex", flexDirection: "row" }}>
        {/* Settings Button */}
        <IconButton
          icon="cog-outline"
          onPress={() => navigation.navigate("Settings")}
          iconColor={theme.colors.primary}
        />
        {/* Lock/Logout Button */}
        <IconButton
          icon="lock-outline"
          onPress={() => dispatch(logout())}
          iconColor={theme.colors.primary}
        />
      </View>
    ),
  });

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
        options={({ navigation }) =>
          getHeaderOptions(navigation, APP_CONFIG.displayName)
        }
      />
      <Stack.Screen
        name="JournalList"
        component={JournalListScreen}
        options={({ navigation }) =>
          getHeaderOptions(navigation, "📖 My Journals")
        }
      />
      <Stack.Screen
        name="JournalEditor"
        component={JournalEditorScreen}
        options={({ navigation }) =>
          getHeaderOptions(navigation, "✍️ New Journal")
        }
      />
      <Stack.Screen
        name="JournalDetail"
        component={JournalDetailScreen}
        options={({ navigation }) => getHeaderOptions(navigation, "📄 Journal")}
      />
      <Stack.Screen
        name="Export"
        component={ExportScreen}
        options={({ navigation }) => getHeaderOptions(navigation, "📤 Export")}
      />

      <Stack.Screen
        name="Import"
        component={ImportScreen}
        options={({ navigation }) => getHeaderOptions(navigation, "🗃️ Import")}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        // Settings screen doesn't need a settings button, so we can use a simpler header or just the lock
        options={{
          title: "⚙️ Settings",
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          headerRight: () => (
            <IconButton
              icon="lock-outline"
              onPress={() => dispatch(logout())}
              iconColor={theme.colors.primary}
            />
          ),
        }}
      />
    </Stack.Navigator>
  );
};
