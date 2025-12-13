import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {
  TextInput,
  Button,
  useTheme,
  HelperText,
  IconButton,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../../stores/hooks';
import { addJournal, updateJournal } from '../../stores/slices/journalsSlice';
import { useAuth } from '../../utils/authContext';
import { saveJournal, getJournal } from '../../services/storageService';
import {
  compressImage,
  imageUriToBase64,
  base64ToDataUri,
} from '../../services/imageService';
import { Journal } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../../utils/alert';

const JournalEditorScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { encryptionKey } = useAuth();

  const journalId = route.params?.journalId;
   const selectedDate = route.params?.selectedDate; // ADD THIS LINE
  const isEditing = !!journalId;

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imageBase64List, setImageBase64List] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadJournal();
    }
  }, [journalId]);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to attach images'
        );
      }
    }
  };

  const loadJournal = async () => {
    if (!encryptionKey) return;

    setIsLoading(true);
    try {
      const journal = await getJournal(journalId, encryptionKey);
      if (journal) {
        setTitle(journal.title || '');
        setText(journal.text);
        
        // Images are already base64 strings
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        await addImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Camera is not available on web. Please use "Add Photo" instead.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        await addImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

const addImage = async (uri: string) => {
  // Limit to 5 images per journal
  // if (imageBase64List.length >= 5) {
  //   Alert.alert('Limit Reached', 'You can add up to 5 images per journal');
  //   return;
  // }

  try {
    // Compress image with lower quality for smaller size
    const compressed = await compressImage(uri, 1200, 1200, 0.7);

    // Convert to base64
    const base64 = await imageUriToBase64(compressed);

    // Check size (optional - for debugging)
    const sizeInKB = (base64.length * 3) / 4 / 1024;
    console.log(`Image size: ${sizeInKB.toFixed(2)} KB`);

    // Add to list
    setImageBase64List([...imageBase64List, base64]);
  } catch (error) {
    console.error('Error adding image:', error);
    Alert.alert('Error', 'Failed to add image');
  }
};


  const removeImage = (index: number) => {
    setImageBase64List(imageBase64List.filter((_, i) => i !== index));
  };

const handleSave = async (showAlert: boolean = true) => {
  if (!text.trim()) {
    Alert.alert('Error', 'Please write something before saving');
    return false;
  }

  if (!encryptionKey) {
    Alert.alert('Error', 'Encryption key not found. Please log in again.');
    return false;
  }

  setIsSaving(true);

  try {
    const now = new Date().toISOString();
    let existingJournal: Journal | null = null;

    if (journalId) {
      existingJournal = await getJournal(journalId, encryptionKey);
    }

    // FIX: Properly format selectedDate with local timezone
    let journalDate = now;
    if (existingJournal?.date) {
      journalDate = existingJournal.date;
    } else if (selectedDate) {
      // FIXED: Use noon time to avoid timezone issues
      const [year, month, day] = selectedDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day, 12, 0, 0); // Set to noon
      journalDate = dateObj.toISOString();
      console.log('Creating journal for selected date:', selectedDate, '-> ISO:', journalDate);
    }

    const journal: Journal = {
      id: journalId || uuidv4(),
      date: journalDate,
      createdAt: existingJournal?.createdAt || now,
      updatedAt: now,
      title: title.trim() || undefined,
      text: text.trim(),
      mood: undefined,
      images: imageBase64List.length > 0 ? imageBase64List : undefined,
    };

    await saveJournal(journal, encryptionKey);

    if (isEditing) {
      dispatch(updateJournal(journal));
    } else {
      dispatch(addJournal(journal));
    }

    if (showAlert) {
      Alert.alert('Success', 'Journal entry saved!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }

    return true;
  } catch (error) {
    console.error('Error saving journal:', error);
    Alert.alert('Error', 'Failed to save journal entry');
    return false;
  } finally {
    setIsSaving(false);
  }
};


  const handleBack = async () => {
    if (text.trim()) {
      const saved = await handleSave(false);
      if (saved) {
        navigation.goBack();
      }
    } else {
      navigation.goBack();
    }
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

          <View style={styles.imageButtonsContainer}>
            <Chip
              icon="image"
              onPress={pickImage}
              style={styles.imageButton}
              mode="outlined"
            >
              Add Photo
            </Chip>
            {Platform.OS !== 'web' && (
              <Chip
                icon="camera"
                onPress={takePhoto}
                style={styles.imageButton}
                mode="outlined"
              >
                Take Photo
              </Chip>
            )}
          </View>

          {imageBase64List.length > 0 && (
            <View style={styles.imagesGrid}>
              {imageBase64List.map((base64, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image
                    source={{ uri: base64ToDataUri(base64) }}
                    style={styles.imagePreview}
                  />
                  <IconButton
                    icon="close-circle"
                    size={24}
                    onPress={() => removeImage(index)}
                    style={styles.removeButton}
                    iconColor={theme.colors.error}
                  />
                </View>
              ))}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleBack}
              style={[styles.button, styles.backButton]}
              disabled={isSaving}
            >
              Back
            </Button>

            <Button
              mode="contained"
              onPress={() => handleSave(true)}
              style={[styles.button, styles.saveButton]}
              disabled={isSaving || !text.trim()}
              loading={isSaving}
            >
              {isEditing ? 'Update' : 'Save'}
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
  imageButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imageButton: {
    marginRight: 8,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    margin: 4,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
  backButton: {
    marginRight: 8,
  },
  saveButton: {
    marginLeft: 8,
  },
});

export default JournalEditorScreen;
