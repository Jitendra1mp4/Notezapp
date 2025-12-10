import { setIsImagePickingInProgress } from "@/src/stores/slices/settingsSlice";
import { getMarkdownStyles } from "@/src/utils/markdownStyles";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display"; // [web:2][web:10]
import {
  Button,
  Chip,
  HelperText,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import {
  base64ToDataUri,
  compressImage,
  imageUriToBase64,
} from "../../services/imageService";
import { getJournal, saveJournal } from "../../services/unifiedStorageService";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { addJournal, updateJournal } from "../../stores/slices/journalsSlice";
import { Journal } from "../../types";
import { Alert } from "../../utils/alert";

const JournalEditorScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  // const { encryptionKey } = useAuth();
  const encryptionKey = useAppSelector((state) => state.auth.encryptionKey);

  const journalId = route.params?.journalId || null;
  const selectedDate = route.params?.selectedDate || null;
  const isAlreadyExist = !!journalId;

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [imageBase64List, setImageBase64List] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isJournalCreated, setIsJournalCreated] = useState(isAlreadyExist);
  const [generatedJournalId, setGeneratedJournalId] = useState(journalId);
  const [isJournalModified, setIsJournalModified] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // New state for Markdown Preview toggle
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Request camera permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        console.warn("Camera roll permission not granted");
      }
    };
    requestPermissions();
  }, []);

  const handlePickImage = async () => {
    try {

      dispatch (setIsImagePickingInProgress(true))
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        aspect: [4, 3],
        quality: 1,
        // style: "contain",
      });
      
      dispatch (setIsImagePickingInProgress(false))
      
      if (!result.canceled && result.assets[0]) {
        setIsCompressingImage(true);
        const selectedUri = result.assets[0].uri;

        // Compress and convert to base64 for optimal storage
        const compressedUri = await compressImage(selectedUri, 1200, 1200, 0.8);
        const base64 = await imageUriToBase64(compressedUri);

        setImageBase64List([...imageBase64List, base64]);
        setImageIds([...imageIds, uuidv4()]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageBase64List(imageBase64List.filter((_, i) => i !== index));
    setImageIds(imageIds.filter((_, i) => i !== index));
  };

  // This triggers by pressing back from any screen which I am not intended for.
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (!encryptionKey) {
          navigation.goBack();
          return true;
        }
        handleSave().then(() => {
          if (isJournalModified) {
            Alert.alert("Got it!", "🔐Your Journal entry is saved securely");
          }
          navigation.goBack();
        });
        return true;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [text, title, imageBase64List, encryptionKey, isJournalModified]),
  );

  useEffect(() => {
    if (isJournalCreated) {
      loadJournal();
    }
  }, [journalId]);

  useEffect(() => {
    const callSaveAsync = async () => {
      await handleSave(false);
    };
    callSaveAsync();
  }, [encryptionKey, text, title, imageBase64List]);

  const loadJournal = async () => {
    if (!encryptionKey) return;

    setIsLoading(true);
    try {
      const journal = await getJournal(generatedJournalId, encryptionKey);
      if (journal) {
        setTitle(journal.title || "");
        setText(journal.text);
        if (journal.images && journal.images.length > 0) {
          setImageBase64List(journal.images);
          setImageIds(journal.images.map(() => uuidv4()));
        } else {
          setImageBase64List([]);
          setImageIds([]);
        }
      }
    } catch (error) {
      Alert.alert("Oops!", "Failed to load journal entry");
    } finally {
      setIsLoading(false);
    }
  };

  // Find the handleSave function and update it with future date validation
const handleSave = async (showAlert = false) => {
  if (isSaving) return false;

  if (!encryptionKey) {
    if (showAlert)
      Alert.alert("Oops!", "Encryption key not found. Please login again.");
    return false;
  }

  if (!text.trim()) {
    if (showAlert)
      Alert.alert("Validation", "Please write something before saving");
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
      const [year, month, day] = selectedDate.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day, 12);
      
      // ✅ VALIDATION: Prevent future dates
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
      
      const selectedDateObj = new Date(year, month - 1, day);
      selectedDateObj.setHours(0, 0, 0, 0);
      
      if (selectedDateObj > today) {
        Alert.alert(
          "Future Date Not Allowed 📅",
          "You can only create journal entries for today or past dates.\n\n" +
          "🚀 Upcoming Feature:\n" +
          "We're working on a 'Todo & Reminders' feature that will let you plan future notes!\n\n" +
          "Stay tuned for updates! ✨",
          [{ text: "Got it!", onPress: () => navigation.goBack() }]
        );
        return false;
      }
      
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

    setIsJournalCreated(true);
    setIsJournalModified(true);

    if (!generatedJournalId) setGeneratedJournalId(journal.id);

    if (showAlert) {
      Alert.alert("Yep!", "🔐Your Journal entry is saved securely!");
    }
    return true;
  } catch (error) {
    console.error("Error saving journal:", error);
    if (showAlert) {
      Alert.alert("Oops!", "Failed to save journal entry");
    }
    return false;
  } finally {
    setIsSaving(false);
  }
};

  // Define Markdown styles based on current theme
  const markdownStyles = getMarkdownStyles(theme);
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={["top", "bottom"]}
      >
        <HelperText type="info" style={styles.loadingText}>
          Loading journal...
        </HelperText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]} // ✅ Only protect bottom edge
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // ✅ Add offset for header
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 80 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Editor/Preview Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Switch
              style={styles.toggleButton}
              value={isPreviewMode}
              onValueChange={() => setIsPreviewMode(!isPreviewMode)}
            />

            <Chip
              icon="floppy"
              onPress={async () => await handleSave(true)}
              style={styles.saveButton}
              disabled={isSaving || !text.trim()}
            >
              {isJournalCreated ? "" : "Type to save..."}
            </Chip>
          </View>

          <TextInput
            label="Title (optional)"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.titleInput}
            placeholder="Title"
            returnKeyType="next"
          />

          {isPreviewMode ? (
            <View
              style={[
                styles.previewContainer,
                { borderColor: theme.colors.outline },
              ]}
            >
              <Pressable onPress={() => setIsPreviewMode(!isPreviewMode)}>
                <Markdown style={markdownStyles}>
                  {text ||
                    "*Nothing to preview*\n ### Quick Guid\n- start line with # [space] for heading heading.\n- Start line with ## [space] for sub heading and so on.\n - Start line with - [space] for bullet\n- Surround text with * to make it italic\n- Surround text with ** to make it bold."}
                </Markdown>
              </Pressable>
            </View>
          ) : (
            <TextInput
              label="What's on your mind? (Markdown supported)"
              value={text}
              onChangeText={setText}
              mode="outlined"
              multiline
              style={styles.textInput}
              autoFocus
            />
          )}

          {/* Image Gallery Section */}
          {imageBase64List.length > 0 && (
            <View style={styles.gallerySection}>
              <HelperText type="info" style={styles.galleryTitle}>
                📸 {imageBase64List.length} Image
                {imageBase64List.length === 1 ? "" : "s"} Added
              </HelperText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imageGallery}
              >
                {imageBase64List.map((base64, index) => {
                  const imageUri = base64ToDataUri(base64);
                  return (
                    <View
                      key={imageIds[index] || `img-${index}`}
                      style={styles.imageThumbnailContainer}
                    >
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setSelectedImage(imageUri)}
                      >
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.imageThumbnail}
                          onError={(error) => {
                            console.log(
                              "Failed image URI preview:",
                              imageUri.substring(0, 100),
                            );
                          }}
                          onLoad={() => {
                            console.log(
                              "Image loaded successfully in editor:",
                              index,
                            );
                          }}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveImage(index)}
                        style={styles.removeImageButton}
                      >
                        <HelperText type="error" style={styles.removeImageText}>
                          ✕
                        </HelperText>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Image Picker Button */}
          <Button
            mode="outlined"
            onPress={handlePickImage}
            style={styles.imagePickerButton}
            loading={isCompressingImage}
            disabled={isCompressingImage}
            icon="image-plus"
          >
            {isCompressingImage ? "Processing..." : "Add Images"}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Full Screen Image Modal */}
      {selectedImage && (
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={styles.fullscreenBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedImage(null)}
          />
          <View style={styles.fullscreenContent}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
            <Button
              mode="contained-tonal"
              style={styles.fullscreenCloseButton}
              onPress={() => setSelectedImage(null)}
            >
              Close
            </Button>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 10,
    paddingBottom: 100, // ✅ Add extra bottom padding
    justifyContent: "flex-start",
  },
  keyboardView: {
    flex: 1,
  },
  titleInput: {
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    minHeight: 300,
    textAlignVertical: "top",
  },
  // New styles for toggle and preview
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    marginBottom: 8,
    gap: 8,
  },
  toggleButton: {
    marginBottom: -5,
  },
  previewLabel: {
    marginBottom: 8,
  },
  previewContainer: {
    flex: 1,
    minHeight: 300,
    padding: 12,
    borderWidth: 1,
    borderRadius: 4,
  },
  gallerySection: {
    marginVertical: 16,
  },
  galleryTitle: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  imageGallery: {
    marginBottom: 8,
  },
  imageThumbnailContainer: {
    position: "relative",
    marginRight: 8,
  },
  imageThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ff6b6b",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  removeImageText: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
  },
  imagePickerButton: {
    marginVertical: 12,
  },
  saveButton: {
    marginTop: 20,
    marginBottom: 40, // ✅ Increase bottom margin
  },
  loadingText: {
    marginTop: 30,
    textAlign: "center",
  },
  fullscreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  fullscreenBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  fullscreenContent: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  fullscreenImage: {
    width: "100%",
    height: "80%",
  },
  fullscreenCloseButton: {
    marginTop: 12,
  },
});

export default JournalEditorScreen;
