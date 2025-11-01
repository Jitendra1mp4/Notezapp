import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-get-random-values';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider } from './src/components/common/ThemeProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { store } from './src/stores';
import { AuthProvider } from './src/utils/authContext';

export default function App() {
  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ReduxProvider>
  );
}
