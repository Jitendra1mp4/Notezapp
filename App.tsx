// App.tsx
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform, View } from 'react-native';


// ✅ SAFE POLYFILL STRATEGY
if (Platform.OS !== 'web') {
  // Only require and install quick-crypto on Native (iOS/Android)
  const QuickCrypto = require('react-native-quick-crypto');
  QuickCrypto.install();
}

import { Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider } from './src/components/common/ThemeProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getPreferenceStorageProvider } from './src/services/preferenceStorageProvider';
import { getVaultStorageProvider } from './src/services/vaultStorageProvider';
import { store } from './src/stores';
import {
  useAppDispatch,
  useAppSelector
} from './src/stores/hooks';
import {
  logout
} from './src/stores/slices/authSlice';
import { setIsExportImportInProgress, setIsImagePickingInProgress, updateSettings } from './src/stores/slices/settingsSlice';


const PreferenceStorageProvider = getPreferenceStorageProvider()
const VaultStorageProvider = getVaultStorageProvider()


function AppContent() {
  const appState = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);
  
  // Redux state and dispatch - NO CONTEXT DEPENDENCY
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
 const [storageReady, setStorageReady] = useState(false); // 🔑 NEW
 
  useEffect(() => {
    const initStorage = async () => {
      try {
        await VaultStorageProvider.initializeStorage();
        console.log('✅ Storage initialized - App ready');
        
        // Load preferences from separate storage
        const savedSettings = await PreferenceStorageProvider.getSettings();
        if (savedSettings) {
          console.log('✅ Loaded preferences:', savedSettings);
          dispatch(updateSettings(savedSettings));
        } else {
          console.log('ℹ️ No saved preferences, using defaults');
        }
        
        setStorageReady(true);
      } catch (error) {
        console.error('❌ Storage init failed:', error);
        // Don't set ready=false, allow app to proceed with error handling
        setStorageReady(true);
      }
    };
    initStorage();
  }, []);

 useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`AppState changed from ${appState.current} to ${nextAppState}`);
      
      // 1. App goes to Background/Inactive
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        backgroundTimeRef.current = Date.now();

        // ✅ CRITICAL FIX: Skip instant lock if export is in progress
        if (
          isAuthenticated 
          && settings.instantLockOnBackground  
          && !settings.isExportImportInProgress // ✅ NEW CONDITION
          && !settings.isImagePickingInProgress // ✅ NEW CONDITION
        ) {
          console.log('🔒 INSTANT LOCK: Locking app immediately');
          dispatch(logout());
        } else if (settings.isExportImportInProgress) {
          console.log('📤 EXPORT IN PROGRESS: Skipping instant lock');
        }
      } 
      
      // 2. App returns to Foreground
      else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // ✅ Clear export flag when returning to foreground
        if (settings.isExportImportInProgress) {
          console.log('📤 EXPORT COMPLETE: Clearing export flag');
          dispatch(setIsExportImportInProgress(false));
        }


        // ✅ Clear export flag when returning to foreground
        if (settings.isImagePickingInProgress) {
          console.log('📤 Image picking COMPLETE: Clearing isImagePickingInProgress flag');
          dispatch(setIsImagePickingInProgress(false));
        }

        if (isAuthenticated && backgroundTimeRef.current !== null && !settings.instantLockOnBackground) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          
          if (elapsed >= settings.autoLockTimeout) {
            console.log(`🔒 TIME LOCK: Elapsed ${Math.round(elapsed/1000)}s > ${settings.autoLockTimeout/1000}s`);
            dispatch(logout());
          } else {
            console.log(`✅ UNLOCKED: Only ${Math.round(elapsed/1000)}s elapsed`);
          }
        }
        backgroundTimeRef.current = null;
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [
    isAuthenticated, 
    settings.autoLockTimeout, 
    settings.instantLockOnBackground,
    settings.isExportImportInProgress, // ✅ NEW DEPENDENCY
    settings.isImagePickingInProgress, // ✅ NEW DEPENDENCY
    dispatch
  ]);


    if (!storageReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Initializing secure storage...</Text>
        </View>
      </SafeAreaProvider>
    );
  }


  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </ThemeProvider>
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
