import React from 'react';
import { Alert as RNAlert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

// Store reference to custom alert setter
let showCustomAlert: ((
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => void) | null = null;

export const setCustomAlertHandler = (
  handler: (title: string, message?: string, buttons?: AlertButton[]) => void
) => {
  showCustomAlert = handler;
};

export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ): void => {
    if (Platform.OS === 'web' && showCustomAlert) {
      showCustomAlert(title, message, buttons);
    } else {
      RNAlert.alert(title, message, buttons);
    }
  },
};
