import { Journal } from '@/src/types';
import { format as formatDate, parseISO } from 'date-fns';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { ExportPasswordDialog } from './ExportPasswordDialog';

export type ExportFormat = 'json' | 'pdf' | 'text' | 'encrypted';

interface ExportModalProps {
  visible: boolean;
  journalsList: Journal[];
  selectedDate: string;
  onExport: (format: ExportFormat, password?: string) => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  journalsList,
  selectedDate,
  onExport,
  onClose,
}) => {
  const theme = useTheme();
  
  // Internal state for the password flow
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  const handleClose = () => {
    setShowPasswordInput(false);
    onClose();
  };

  const handleEncryptedClick = () => {
    onClose(); 
    // Small delay to ensure the first modal disappears before the second appears
    setTimeout(() => setShowPasswordInput(true), 200); 
  };

  const handlePasswordSubmit = (password: string) => {
    setShowPasswordInput(false);
    onExport('encrypted', password);
  };

  const entryCount = journalsList.length;
  const dateLabel = selectedDate ? formatDate(parseISO(selectedDate), 'MMMM dd, yyyy') : 'Selected Date';

  return (
    <>
      {/* 1. SELECTION MODAL */}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={[styles.modal, { backgroundColor: theme.colors.elevation.level3 }]} onPress={() => {}}>
            
            <Text variant="titleLarge" style={styles.title}>Export Memories</Text>
            <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
              {`Export ${entryCount} journal${entryCount === 1 ? '' : 's'} for \n${dateLabel}?`}
            </Text>
            
          
            <Button 
              mode="contained" 
              icon="lock" 
              onPress={handleEncryptedClick}
              style={styles.mainButton}
              contentStyle={styles.btnContent}
            >
              Encrypted Backup
            </Button>

            {/* Standard Options */}
            <View style={styles.row}>
              <Button 
                mode="outlined" 
                onPress={() => { onExport('json'); onClose(); }}
                style={styles.smallButton}
                compact
              >
                JSON
              </Button>

              <Button 
                mode="outlined" 
                onPress={() => { onExport('text'); onClose(); }}
                style={styles.smallButton}
                compact
              >
                Markdown Text
              </Button>

              <Button 
                mode="outlined" 
                onPress={() => { onExport('pdf'); onClose(); }}
                style={styles.smallButton}
                compact
              >
                PDF
              </Button>
            </View>
            
            <Button mode="text" onPress={handleClose} style={{ marginTop: 8 }}>
              Cancel
            </Button>

          </Pressable>
        </Pressable>
      </Modal>

      {/* 2. PASSWORD DIALOG (Component we created earlier) */}
      <ExportPasswordDialog 
        visible={showPasswordInput}
        onDismiss={() => setShowPasswordInput(false)}
        onSubmit={handlePasswordSubmit}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  mainButton: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 8,
  },
  btnContent: {
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8, // Adds spacing between flex items
  },
  smallButton: {
    flex: 1,
    borderRadius: 8,
  },
});