import { Platform, Alert as RNAlert } from 'react-native';

export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>
  ) => {
    if (Platform.OS === 'web') {
      if (buttons && buttons.length > 1) {
        const result = window.confirm(`${title}\n\n${message || ''}`);
        if (result) {
          const confirmButton = buttons.find(b => b.style !== 'cancel');
          if (confirmButton?.onPress) {
            confirmButton.onPress();
          }
        } else {
          const cancelButton = buttons.find(b => b.style === 'cancel');
          if (cancelButton?.onPress) {
            cancelButton.onPress();
          }
        }
      } else {
        window.alert(`${title}\n\n${message || ''}`);
        if (buttons?.[0]?.onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      RNAlert.alert(title, message, buttons);
    }
  },
};
