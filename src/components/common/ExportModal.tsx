// ExportModal.tsx
import { Journal } from '@/src/types';
import { format, parseISO } from 'date-fns';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface ExportModalProps {
  visible: boolean;
  journalsList: Journal[]; // Replace with your journal type
  selectedDate: string;
  onExport: (format: 'json' | 'pdf' | 'text') => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  journalsList,
  selectedDate,
  onExport,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Export Journals</Text>
          <Text style={styles.message}>
            {`Export ${journalsList.length} journal${journalsList.length === 1 ? '' : 's'} for ${format(parseISO(selectedDate), 'MMMM dd, yyyy')}?`}
          </Text>
          
          <Pressable 
            style={styles.button} 
            onPress={() => { onExport('json'); onClose(); }}
          >
            <Text style={styles.buttonText}>JSON</Text>
          </Pressable>
          
          <Pressable 
            style={styles.button} 
            onPress={() => { onExport('pdf'); onClose(); }}
          >
            <Text style={styles.buttonText}>PDF</Text>
          </Pressable>
          
          <Pressable 
            style={styles.button} 
            onPress={() => { onExport('text'); onClose(); }}
          >
            <Text style={styles.buttonText}>Text</Text>
          </Pressable>
          
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancel: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
