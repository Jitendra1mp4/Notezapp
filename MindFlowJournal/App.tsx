import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import 'react-native-get-random-values';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider } from './src/components/common/ThemeProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { store } from './src/stores';
import { AuthProvider } from './src/utils/authContext';

// Memory cleanup constants
const DK_WIPE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function AppContent() {
  const appState = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize storage backend (SQLite for native, AsyncStorage for web)
    const initStorage = async () => {
      try {
        const { initializeStorage } = await import('./src/services/unifiedStorageService');
        await initializeStorage();
        console.log('Storage initialized successfully');
      } catch (error) {
        console.error('Failed to initialize storage:', error);
      }
    };
    
    initStorage();
  }, []);

  useEffect(() => {
    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App has come to foreground
      if (
        backgroundTimeRef.current &&
        Date.now() - backgroundTimeRef.current > DK_WIPE_TIMEOUT
      ) {
        // If more than 5 minutes have passed, trigger lock
        console.log(
          'App locked due to inactivity - Data Key wiped from memory'
        );
        // Note: The logout will be handled by checking if DK exists
        // and prompting for re-authentication
      }
      backgroundTimeRef.current = null;
    } else if (nextAppState.match(/inactive|background/)) {
      // App has gone to background
      backgroundTimeRef.current = Date.now();
    }

    appState.current = nextAppState;
  };

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ReduxProvider store={store}>
      <AppContent />
    </ReduxProvider>
  );
}
