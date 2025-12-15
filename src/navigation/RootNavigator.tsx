import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { useAppSelector } from '../stores/hooks';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack/> : <AuthStack />}
    </NavigationContainer>
  );
};
