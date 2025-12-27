import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { Button, Dialog, HelperText, Portal, Text, TextInput } from "react-native-paper";

interface ExportPasswordDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (password: string) => void;
}

export const ExportPasswordDialog: React.FC<ExportPasswordDialogProps> = ({
  visible,
  onDismiss,
  onSubmit,
}) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (visible) {
      setPassword("");
      setConfirm("");
      setIsVisible(false);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (password.length < 4) {
      Alert.alert("Weak Password", "Please enter at least 4 characters.");
      return;
    }
    if (password !== confirm) {
      // Allow UI to update with error state instead of Alert if preferred, 
      // but Alert is safer for immediate feedback
      return; 
    }
    onSubmit(password);
  };

  const hasMismatch = password !== confirm && confirm.length > 0;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Encrypt Backup</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
            Set a password for this export. You will need it to import the file later.
          </Text>

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isVisible}
            right={
              <TextInput.Icon 
                icon={isVisible ? "eye-off" : "eye"} 
                onPress={() => setIsVisible(!isVisible)} 
              />
            }
            style={{ marginBottom: 12 }}
          />

          <TextInput
            label="Confirm Password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!isVisible}
            error={hasMismatch}
          />
          
          {hasMismatch && (
            <HelperText type="error">Passwords do not match</HelperText>
          )}
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button 
            onPress={handleSubmit} 
            disabled={!password || hasMismatch}
          >
            Export
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};