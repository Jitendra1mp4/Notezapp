import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import {
  Button,
  Chip,
  HelperText,
  IconButton,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import {
  compressImage,
  deleteEncryptedImage,
  loadEncryptedImage,
  saveEncryptedImage,
} from '../../services/imageService';
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
  const [images, setImages] = useState<string[]>([]);
  const [decryptedImages, setDecryptedImages] = useState<string[]>([]);
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to attach images'
      );
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
        
        // Load encrypted images
        if (journal.images && journal.images.length > 0) {
          setImages(journal.images);
          // Decrypt images for display
          const decrypted = await Promise.all(
            journal.images.map(img => loadEncryptedImage(img, encryptionKey))
          );
          setDecryptedImages(decrypted);
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
    if (!encryptionKey) return;

    try {
      // Compress image
      const compressed = await compressImage(uri);

      // Encrypt and save
      const imageName = `img_${Date.now()}_${uuidv4()}`;
      const encryptedPath = await saveEncryptedImage(
        compressed,
        imageName,
        encryptionKey
      );

      // Update state
      setImages([...images, encryptedPath]);
      setDecryptedImages([...decryptedImages, compressed]);
    } catch (error) {
      console.error('Error adding image:', error);
      Alert.alert('Error', 'Failed to add image');
    }
  };

  const removeImage = async (index: number) => {
    try {
      const imageToRemove = images[index];
      
      // Delete encrypted file
      if (imageToRemove) {
        await deleteEncryptedImage(imageToRemove);
      }

      // Update state
      setImages(images.filter((_, i) => i !== index));
      setDecryptedImages(decryptedImages.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error removing image:', error);
      Alert.alert('Error', 'Failed to remove image');
    }
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

      const journal: Journal = {
        id: journalId || uuidv4(),
        date: existingJournal?.date || now,
        createdAt: existingJournal?.createdAt || now,
        updatedAt: now,
        title: title.trim() || undefined,
        text: text.trim(),
        mood: undefined,
        images: images.length > 0 ? images : undefined,
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

          {/* Image Picker Buttons */}
          <View style={styles.imageButtonsContainer}>
            <Chip
              icon="image"
              onPress={pickImage}
              style={styles.imageButton}
              mode="outlined"
            >
              Add Photo
            </Chip>
            <Chip
              icon="camera"
              onPress={takePhoto}
              style={styles.imageButton}
              mode="outlined"
            >
              Take Photo
            </Chip>
          </View>

          {/* Image Preview Grid */}
          {decryptedImages.length > 0 && (
            <View style={styles.imagesGrid}>
              {decryptedImages.map((uri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.imagePreview} />
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
