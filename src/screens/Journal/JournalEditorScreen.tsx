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
  ActivityIndicator,
  Button,
  Chip,
  IconButton,
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
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});

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
      dispatch(setIsImagePickingInProgress(true));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        aspect: [4, 3],
        quality: 1,
        // style: "contain",
      });

      dispatch(setIsImagePickingInProgress(false));

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
    Alert.alert("Confirm", "Are you sure you want to delete image?", [
      { text: "Cancel" },
      {
        text: "Remove Image",
        onPress: () => {
          setImageBase64List(imageBase64List.filter((_, i) => i !== index));
          setImageIds(imageIds.filter((_, i) => i !== index));
        },
      },
    ]);
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
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]} // Standard navigation handles top; we protect bottom
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar: Date & Actions */}
          <View style={styles.headerRow}>
            {selectedDate ? (
              <Chip
                icon="calendar-month-outline"
                compact
                style={styles.dateChip}
                textStyle={styles.dateChipText}
              >
                {selectedDate}
              </Chip>
            ) : (
              <View />
            )}

            <View style={styles.headerRight}>
              {/* Toggle Preview/Edit */}
              <View style={styles.toggleContainer}>
                <IconButton
                  icon={isPreviewMode ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  onPress={() => setIsPreviewMode(!isPreviewMode)}
                  iconColor={theme.colors.onSurfaceVariant}
                />
              </View>

              {/* <Button
                mode="contained"
                icon="check"
                onPress={() => handleSave(true)}
                loading={isSaving}
                disabled={isSaving || !text.trim()}
                compact
                style={styles.saveButton}
                labelStyle={styles.saveButtonLabel}
              >
                Save
              </Button> */}
            </View>
          </View>

          {/* Title - Modern "Ghost" Style */}
          <TextInput
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            style={[styles.titleInput, { color: theme.colors.onSurface }]}
            cursorColor={theme.colors.primary}              // make caret pop
            selectionColor={theme.colors.primary + '55'}    // semi‑transparent selection
            placeholderTextColor={theme.colors.onSurfaceDisabled}
            returnKeyType="next"
            contentStyle={styles.titleContent}
          />

          {/* Editor Area - Distraction Free */}
          {/* Editor / Preview Area */}
          {isPreviewMode ? (
            <View style={styles.previewContainer}>
              <Markdown style={markdownStyles}>
                {text.trim()
                  ? text
                  : "### ✨ Quick Guide\n" +
                    "Start writing in **Edit** mode using these formats:\n\n" +
                    "• `Start with # for Big Header`\n" +
                    "• `Start with ## for Medium Header`\n" +
                    "• `Start with - for unordered List item`" +
                    "• `Surround like **Bold Text** for bold text`\n" +
                    "• `Surround like *Italic Text* for italic`\n"}
              </Markdown>
            </View>
          ) : (
            <TextInput
              placeholder="Start writing... (Markdown supported)"
              value={text}
              onChangeText={setText}
              mode="flat"
              multiline
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={[styles.bodyInput, { color: theme.colors.onSurface }]}
              placeholderTextColor={theme.colors.onSurfaceDisabled}
              contentStyle={styles.bodyContent}
               cursorColor={theme.colors.primary}              // make caret pop
              selectionColor={theme.colors.primary + '55'}    // semi‑transparent selection
              textAlignVertical="top"
              autoFocus={!title}
            />
          )}

          {/* Attachments Section */}
          {(imageBase64List.length > 0 || isCompressingImage) && (
            <View style={styles.attachmentsArea}>
              <View style={styles.divider} />
              <View style={styles.sectionHeader}>
                <Text
                  variant="labelLarge"
                  style={{ color: theme.colors.outline }}
                >
                  Attachments
                </Text>
                <Button
                  mode="text"
                  compact
                  onPress={handlePickImage}
                  disabled={isCompressingImage}
                >
                  + Add
                </Button>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.galleryScroll}
              >
                {imageBase64List.map((base64, index) => {
                  const imageUri = base64ToDataUri(base64);
                  if (!imageRatios[imageUri]) {
                    Image.getSize(
                      imageUri,
                      (w, h) =>
                        setImageRatios((r) => ({
                          ...r,
                          [imageUri]: w / h || 4 / 3,
                        })),
                      () =>
                        setImageRatios((r) => ({ ...r, [imageUri]: 4 / 3 })),
                    );
                  }
                  return (
                    <View key={index} style={styles.thumbnailWrapper}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setSelectedImage(imageUri)}
                      >
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.thumbnail}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.removeBtn,
                          { backgroundColor: theme.colors.errorContainer },
                        ]}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <Text
                          style={{
                            color: theme.colors.onErrorContainer,
                            fontSize: 10,
                            fontWeight: "bold",
                          }}
                        >
                          ✕
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {isCompressingImage && (
                  <View
                    style={[
                      styles.thumbnail,
                      styles.centerContent,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  >
                    <ActivityIndicator size="small" />
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Floating Action Button for Images if list is empty, or general convenience */}
          {imageBase64List.length === 0 && !isPreviewMode && (
            <Button
              icon="image-plus-outline"
              mode="text"
              textColor={theme.colors.secondary}
              onPress={handlePickImage}
              style={{ alignSelf: "flex-start", marginLeft: -8 }}
            >
              Add Image
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fullscreen Image Viewer */}
      {selectedImage && (
        <View style={styles.fullscreenOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedImage(null)}
          />
          <Image
            source={{ uri: selectedImage }}
            style={[
              styles.fullscreenImage,
              { aspectRatio: imageRatios[selectedImage] ?? 4 / 3 },
            ]}
            resizeMode="contain"
          />
          <IconButton
            icon="close-circle"
            size={32}
            iconColor="white"
            style={styles.closeFullscreenBtn}
            onPress={() => setSelectedImage(null)}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
    flexGrow: 1,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateChip: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(128,128,128, 0.2)",
    height: 32,
  },
  dateChipText: {
    fontSize: 12,
    marginVertical: -2, // Tighten vertical centering on some platforms
  },
  toggleContainer: {
    marginRight: 8,
  },
  saveButton: {
    borderRadius: 20,
    minWidth: 80,
  },
  saveButtonLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginVertical: 4,
    marginHorizontal: 12,
  },

  // Inputs
  titleInput: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    marginBottom: 8,
    // Negative margin to align text with left edge (Paper adds internal padding)
    marginLeft: -4,
  },
  titleContent: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
  },
  bodyInput: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    marginLeft: -4, // Align with title
    flex: 1, // Take remaining space
  },
  bodyContent: {
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: 0.3,
  },

  // Preview
  previewContainer: {
    paddingVertical: 12,
    flex: 1,
  },

  // Attachments
  attachmentsArea: {
    marginTop: 32,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(128,128,128, 0.1)",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  galleryScroll: {
    overflow: "visible",
  },
  thumbnailWrapper: {
    position: "relative",
    marginRight: 12,
    marginBottom: 4, // shadow room
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },

  // Fullscreen
  // styles
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  fullscreenImage: {
    width: "100%", // was 100
    height: undefined, // was 85
    // aspectRatio: 1, // default; will be overridden per-image
  },

  closeFullscreenBtn: {
    position: "absolute",
    top: 40,
    right: 20,
  },
});

export default JournalEditorScreen;
