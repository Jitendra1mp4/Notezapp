import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import { getVaultStorageProvider } from '../services/vaultStorageProvider';

const Stack = createNativeStackNavigator();
const VaultStorageProvider = getVaultStorageProvider()

export const AuthStack: React.FC = () => {

  const [isFirstTime, setIsFirstTime] = useState(false);
  
 useEffect(() => {
    const initializeLoginState = async () => {
      try {
        // Check first launch
        setIsFirstTime( await VaultStorageProvider.isFirstLaunch());

      } catch (error) {
        console.error("❌ init failed:", error);        
      }
    };

    initializeLoginState();
  }, []);

  return (
    <Stack.Navigator    
    initialRouteName="Signup"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Signup" component={SignupScreen} /> 
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};
