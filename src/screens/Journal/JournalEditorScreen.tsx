import { MoodSelector } from "@/src/components/journal/MoodSelector";
import { getVaultStorageProvider } from "@/src/services/vaultStorageProvider";
import { setIsImagePickingInProgress } from "@/src/stores/slices/settingsSlice";
import { getRandomPrompt, JournalPrompt } from "@/src/utils/journalPrompts";
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
import { base64ToDataUri, imageUriToBase64 } from "../../services/imageService";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { addJournal, updateJournal } from "../../stores/slices/journalsSlice";
import { Journal } from "../../types";
import { Alert } from "../../utils/alert";
const VaultStorageProvider = getVaultStorageProvider();

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
  const promptFromHome = route.params?.promptText ?? null;
  const promptIdFromHome = route.params?.promptId ?? null;

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

  // Inside the JournalEditorScreen component, add mood state after other states:
  const [selectedMood, setSelectedMood] = useState<string>("");

  // New state for Markdown Preview toggle
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});

  const [currentPrompt, setCurrentPrompt] = useState<JournalPrompt | null>(
    null,
  );
  const [showPrompt, setShowPrompt] = useState(false);

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

        const base64 = await imageUriToBase64(selectedUri);

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

  // Initialize prompt for NEW entries only
  useFocusEffect(
    useCallback(() => {
      if (!journalId && !isAlreadyExist && title.length === 0) {
        let prompt;

        // Use prompt passed from home screen if available
        if (promptFromHome && promptIdFromHome) {
          prompt = {
            id: promptIdFromHome,
            text: promptFromHome,
            category: "reflection" as const, // Default category
          };
        } else {
          // Otherwise get a random prompt
          prompt = getRandomPrompt();
        }

        setCurrentPrompt(prompt);
        setShowPrompt(true);
        // Pre-fill title with prompt text so user can edit it
        setTitle(prompt.text);
      }
    }, [journalId, isAlreadyExist, promptFromHome, promptIdFromHome]),
  );

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
    }, [text, title, imageBase64List,selectedMood, encryptionKey, isJournalModified]),
  );

  useFocusEffect(
    useCallback(() => {
      if (isJournalCreated) {
        loadJournal();
      }
    }, [journalId]),
  );

  useFocusEffect(
    useCallback(() => {
      const callSaveAsync = async () => {
        await handleSave(false);
      };
      callSaveAsync();
    }, [encryptionKey, text, title, selectedMood, imageBase64List]),
  );

  const loadJournal = async () => {
    if (!encryptionKey) return;

    setIsLoading(true);
    try {
      const journal = await VaultStorageProvider.getJournal(
        generatedJournalId,
        encryptionKey,
      );
      if (journal) {
        setTitle(journal.title || "");
        setText(journal.text);
        setSelectedMood(journal.mood || ""); // ADD THIS LINE
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

  const handleShufflePrompt = () => {
    const newPrompt = getRandomPrompt();
    setCurrentPrompt(newPrompt);
    setShowPrompt(true);
    // Pre-fill title with new prompt
    setTitle(newPrompt.text);
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
        existingJournal = await VaultStorageProvider.getJournal(
          generatedJournalId,
          encryptionKey,
        );
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
            [{ text: "Got it!", onPress: () => navigation.goBack() }],
          );
          return false;
        }

        const currentTime = new Date();
        const dateObj = new Date(
          year,
          month - 1,
          day,
          currentTime.getHours(), // Actual current hour
          currentTime.getMinutes(), // Actual current minute
          currentTime.getSeconds(), // Actual current second
          currentTime.getMilliseconds(), // Actual current millisecond
        );

        journalDate = dateObj.toISOString();
      }

      const journal: Journal = {
        id: generatedJournalId || uuidv4(),
        date: journalDate,
        createdAt: existingJournal?.createdAt || now,
        updatedAt: now,
        title: title.trim() || undefined,
        text: text.trim(),
        mood: selectedMood || undefined, // ADD THIS LINE
        images: imageBase64List.length > 0 ? imageBase64List : undefined,
      };

      await VaultStorageProvider.saveJournal(journal, encryptionKey);

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
                compact={false}
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

              {/* Shuffle button - only show for new entries with prompt */}
              {showPrompt && currentPrompt && !journalId && (
                <IconButton
                  icon="shuffle-variant"
                  size={20}
                  onPress={handleShufflePrompt}
                  iconColor={theme.colors.primary}
                  style={styles.toggleContainer}
                  animated
                />
              )}
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

          <View style={styles.titleRow}>
            <TextInput
              placeholder="Title (tap to edit)"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                // Hide prompt indicator once user modifies the text
                if (
                  showPrompt &&
                  currentPrompt &&
                  text !== currentPrompt.text
                ) {
                  // setShowPrompt(false);
                }
              }}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              multiline={true} // ✅ ADD THIS
              // numberOfLines={3}                         // ✅ ADD THIS (shows up to 3 lines)
              textAlignVertical="center" // ✅ ADD THIS (align text to top)
              style={{
                ...styles.titleInput,
                color: theme.colors.onSurface,
              }}
              cursorColor={theme.colors.primary}
              selectionColor={`${theme.colors.primary}55`}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              returnKeyType="next"
              contentStyle={styles.titleContent}
            />
          </View>
          {/* Editor Area - Distraction Free */}
          {/* Editor / Preview Area */}
          {isPreviewMode ? (
            <View style={styles.previewContainer}>
              <Pressable onPress={() => setIsPreviewMode(!isPreviewMode)}>
                <Markdown style={markdownStyles}>
                  {text.trim()
                    ? text
                    : "### ✨ Quick Guide for better formatting\n" +
                      "you can use these formats:\n\n" +
                      "• `Start with # for Big Header`\n" +
                      "• `Start with ## for Medium Header and so on...`\n" +
                      "• `Start with - for unordered List item`\n" +
                      "• `Surround like **Bold Text** for bold text`\n" +
                      "• `Surround like *Italic Text* for italic`\n" +
                      "\nTap on eye icon to toggle between preview and edit mode\n"}
                </Markdown>
              </Pressable>
            </View>
          ) : (
            <TextInput
              placeholder="Start writing..."
              value={text}
              onChangeText={setText}
              mode="flat"
              multiline
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={[styles.bodyInput, { color: theme.colors.onSurface }]}
              placeholderTextColor={theme.colors.onSurfaceDisabled}
              contentStyle={styles.bodyContent}
              cursorColor={theme.colors.primary} // make caret pop
              selectionColor={theme.colors.primary + "55"} // semi‑transparent selection
              textAlignVertical="top"
              autoFocus={!title}
            />
          )}

          <MoodSelector
            selectedMood={selectedMood}
            onSelectMood={setSelectedMood}
            label="I am feeling:"
          />

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
    paddingTop: 10,
    paddingBottom: 80,
    flexGrow: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    paddingBottom: 0,
  },

  promptIndicator: {
    marginBottom: 12,
    marginTop: -4,
    paddingHorizontal: 4,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  headerRight: {
    padding: 0,
    height: 0,
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
  },
  toggleContainer: {
    // marginRight: 8,
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
    flex: 1,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginLeft: -4,
  },
  titleContent: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
    flexWrap: "wrap",
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
    opacity:0.7,
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
