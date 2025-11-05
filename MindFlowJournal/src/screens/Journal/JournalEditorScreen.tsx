import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Alert as RNAlert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  HelperText,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { getJournal, saveJournal } from '../../services/storageService';
import { useAppDispatch } from '../../stores/hooks';
import { addJournal, updateJournal } from '../../stores/slices/journalsSlice';
import { Journal } from '../../types';
import { Alert } from '../../utils/alert';
import { useAuth } from '../../utils/authContext';

const JournalEditorScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { encryptionKey } = useAuth();

  const journalId = route.params?.journalId;
  const isEditing = !!journalId;

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadJournal();
    }
  }, [journalId]);

  // Remove default header back button
  useEffect(() => {
    navigation.setOptions({ headerLeft: () => null });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        saveAndGoBack();
        return true; // Prevent default behavior
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [title, text, encryptionKey])
  );

  const loadJournal = async () => {
    if (!encryptionKey) return;

    setIsLoading(true);
    try {
      const journal = await getJournal(journalId, encryptionKey);
      if (journal) {
        setTitle(journal.title || '');
        setText(journal.text);
      }
    } catch (error) {
      console.error('Error loading journal:', error);
      Alert.alert('Error', 'Failed to load journal entry');
    } finally {
      setIsLoading(false);
    }
  };

  const saveAndGoBack = async () => {
    if (!text.trim()) {
      // If empty, just go back without saving
      navigation.goBack();
      return;
    }

    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const now = new Date().toISOString();
      let existingJournal: Journal | null = null;

      if (journalId) {
        existingJournal = await getJournal(journalId, encryptionKey);
      }

      const journal: Journal = {
        id: journalId || uuidv4(),
        date: existingJournal?.date || now,
        createdAt: existingJournal?.createdAt || now,
        updatedAt: now,
        title: title.trim() || undefined,
        text: text.trim(),
        mood: undefined,
        images: undefined,
      };

      await saveJournal(journal, encryptionKey);

      if (isEditing) {
        dispatch(updateJournal(journal));
      } else {
        dispatch(addJournal(journal));
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving journal:', error);
      RNAlert.alert('Error', 'Failed to save journal entry');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveButton = async () => {
    await saveAndGoBack();
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <HelperText type="info">Loading...</HelperText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <TextInput
            label="Title (optional)"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.titleInput}
            placeholder="Give your entry a title..."
          />

          <TextInput
            label="What's on your mind?"
            value={text}
            onChangeText={setText}
            mode="outlined"
            multiline
            numberOfLines={15}
            style={styles.textInput}
            placeholder="Start writing..."
          />

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSaveButton}
              style={styles.saveButton}
              disabled={isSaving || !text.trim()}
              loading={isSaving}
            >
              Save & Back
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleInput: {
    marginBottom: 16,
  },
  textInput: {
    marginBottom: 16,
    minHeight: 200,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    maxWidth: 200,
  },
});

export default JournalEditorScreen;
