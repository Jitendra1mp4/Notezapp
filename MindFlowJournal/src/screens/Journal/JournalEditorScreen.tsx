import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet
} from 'react-native';
import {
  Button,
  HelperText,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  const journalId = route.params?.journalId;
  const selectedDate = route.params?.selectedDate;
  const isAlreadyExist = !!journalId;

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imageBase64List, setImageBase64List] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
 
 const [isJournalCreated,setIsJournalCreated] = useState(isAlreadyExist) ;
 const [generatedJournalId,setGeneratedJournalId] = useState(journalId) ;
 const [isJournalModified,setIsJournalModified] = useState(false) ;

 BackHandler.addEventListener('hardwareBackPress', () => {
  if (isJournalModified){
    Alert.alert("Got it!","🔐Your Journal entry is saved securely")
  }
  navigation.goBack()
  return true ;
 }
) 

  useEffect(() => {
    if (isJournalCreated) {
      loadJournal();
    }
  }, [journalId]);

  useEffect(() => {

     const callSaveAsync = async () => {
       await handleSave(false);
     }
     callSaveAsync() ;
  }, [ encryptionKey, text, title, imageBase64List]);

  const loadJournal = async () => {
    if (!encryptionKey) return;

    setIsLoading(true);
    try {
      const journal = await getJournal(generatedJournalId, encryptionKey);
      if (journal) {
        setTitle(journal.title || '');
        setText(journal.text);
        if (journal.images && journal.images.length > 0) {
          setImageBase64List(journal.images);
        }
      }
    } catch (error) {
      console.error('Error loading journal:', error);
      Alert.alert('Error', 'Failed to load journal entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (showAlert = false) => {
    if (!encryptionKey) {
      if (showAlert)
        Alert.alert('Error', 'Encryption key not found. Please login again.');
      return false;
    }

    if (!text.trim()) {
      if (showAlert)
        Alert.alert('Validation', 'Please write something before saving');
      return false;
    }

    setIsSaving(true);

    try {
      const now = new Date().toISOString();
      let existingJournal: Journal | null = null;

      if (generatedJournalId) {
        existingJournal = await getJournal(generatedJournalId, encryptionKey);
      }

      let journalDate = now;
      if (existingJournal?.date) {
        journalDate = existingJournal.date;
      } else if (selectedDate) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day, 12);
        journalDate = dateObj.toISOString();
      }

      const journal: Journal = {
        id: generatedJournalId || uuidv4(),
        date: journalDate,
        createdAt: existingJournal?.createdAt || now,
        updatedAt: now,
        title: title.trim() || undefined,
        text: text.trim(),
        mood: undefined,
        images: imageBase64List.length > 0 ? imageBase64List : undefined,
      };

      await saveJournal(journal, encryptionKey);

      if (isJournalCreated) {
        dispatch(updateJournal(journal));
      } else {
        dispatch(addJournal(journal));
      }
      
      setIsJournalCreated(true) ;
      setIsJournalModified(true) ;
      
      if (!generatedJournalId)
      setGeneratedJournalId(journal.id) ;
    
      if (showAlert) {
        Alert.alert('Yep!', '🔐Your Journal entry is saved securely!')
      } 
      return true;
    } catch (error) {
      console.error('Error saving journal:', error);
      if (showAlert) {
        Alert.alert('Oops!', 'Failed to save journal entry');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}
      >
        <HelperText type='info' style={styles.loadingText}>
          Loading journal...
        </HelperText>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
        >
          <TextInput
            label='Title (optional)'
            value={title}
            onChangeText={setTitle}
            mode='outlined'
            style={styles.titleInput}
            placeholder='Title'
            returnKeyType='next'
            blurOnSubmit={false}
          />

          <TextInput
            label="What's on your mind?"
            value={text}
            onChangeText={setText}
            mode='outlined'
            multiline
            style={styles.textInput}
            autoFocus
          />

          <Button
            mode='contained'
            onPress={async () => await handleSave(true)}
            style={styles.saveButton}
            loading={isSaving}
            disabled={isSaving || !text.trim()}            
          >
            {isJournalCreated?"Saved":"Start typing, You don't need to save.."}
          </Button>
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
    flexGrow: 1,
    padding: 16,
    justifyContent: 'flex-start',
  },
  titleInput: {
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    minHeight: 400,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 20,
  },
  loadingText: {
    marginTop: 30,
    textAlign: 'center',
  },
});

export default JournalEditorScreen;
