// src/screens/Journal/JournalDetailScreen.tsx

import { getMarkdownStyles } from "@/src/utils/markdownStyles";
import { useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import {
  ActivityIndicator,
  Button,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { base64ToDataUri } from "@/src/services/imageService";
import {
  deleteJournal,
  getJournal,
} from "@/src/services/unifiedStorageService";
import { useAppDispatch, useAppSelector } from "@/src/stores/hooks";
import { deleteJournal as deleteJournalAction } from "@/src/stores/slices/journalsSlice";
import type { Journal } from "@/src/types";
import { Alert } from "@/src/utils/alert";

const { width: screenWidth } = Dimensions.get("window");

const JournalDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const encryptionKey = useAppSelector((state) => state.auth.encryptionKey);

  const { journalId, backColor } = route.params;

  const [journal, setJournal] = useState<Journal | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Journal Data
  useFocusEffect(
    useCallback(() => {
      const loadJournal = async () => {
        if (!encryptionKey) return;
        setIsLoading(true);
        try {
          const loadedJournal = await getJournal(journalId, encryptionKey);
          setJournal(loadedJournal);
        } catch (error) {
          console.error("❌ Error loading journal detail:", error);
          Alert.alert("Error", "Failed to load journal entry");
          navigation.goBack();
        } finally {
          setIsLoading(false);
        }
      };
      loadJournal();
    }, [journalId, encryptionKey, navigation]),
  );

  const ratiosRef = useRef<Record<string, number>>({});
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});

  const cacheRatio = useCallback((uri: string, ratio: number) => {
    if (ratiosRef.current[uri]) return;
    ratiosRef.current = { ...ratiosRef.current, [uri]: ratio };
    setImageRatios(ratiosRef.current);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!journal?.images?.length) return;

      let isActive = true;

      for (const base64 of journal.images) {
        const uri = base64ToDataUri(base64);
        if (ratiosRef.current[uri]) continue;

        Image.getSize(
          uri,
          (w, h) => {
            if (!isActive) return;
            if (!w || !h) return cacheRatio(uri, 4 / 3);
            cacheRatio(uri, w / h);
          },
          () => {
            if (!isActive) return;
            cacheRatio(uri, 4 / 3);
          },
        );
      }

      return () => {
        isActive = false;
      };
    }, [journal?.images, cacheRatio]),
  );

  const handleDelete = () => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this journal? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!encryptionKey) return;
            setIsDeleting(true);
            try {
              await deleteJournal(journalId);
              dispatch(deleteJournalAction(journalId));
              navigation.goBack();
            } catch (error) {
              console.error("❌ Delete error:", error);
              Alert.alert("Error", "Failed to delete journal");
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  // Styles
  const markdownStyles = getMarkdownStyles(theme);
  const backgroundColor = backColor ?? theme.colors.background;

  // Text Contrast Fix: Ensure text is readable on colored backgrounds
  // We use a slightly darker version of 'onSurface' for better contrast on pastel cards
  const contentColor = theme.dark ? theme.colors.onSurface : "#1a1c1e"; // Almost black for light mode readability

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!journal) return null;

  const dateObj = new Date(journal.date);
  const formattedDate = format(dateObj, "EEEE, MMMM do, yyyy");
  const formattedTime = format(dateObj, "h:mm a");
  const hasTitle = !!journal.title && journal.title.trim().length > 0;

  const isSingleImage = (journal.images?.length ?? 0) === 1;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["left", "right","bottom"]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <IconButton
                icon="calendar-month-outline"
                size={18}
                iconColor={theme.colors.onSurfaceVariant}
                style={styles.metaIcon}
              />
              <Text
                style={[
                  styles.metaText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {formattedDate}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <IconButton
                icon="clock-time-four-outline"
                size={18}
                iconColor={theme.colors.onSurfaceVariant}
                style={styles.metaIcon}
              />
              <Text
                style={[
                  styles.metaText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {formattedTime}
              </Text>
            </View>
          </View>

          {hasTitle ? (
            <Text
              style={[styles.title, { color: contentColor }]}
              variant="displaySmall"
            >
              {journal.title}
            </Text>
          ) : (
            <Text
              style={[
                styles.title,
                styles.untitled,
                { color: theme.colors.onSurfaceVariant },
              ]}
              variant="displaySmall"
            >
              Untitled Entry
            </Text>
          )}
        </View>

        {/* Image Gallery (Grid Layout) */}

        {journal.images?.length ? (
          <View style={styles.galleryGrid}>
            {journal.images.map((base64, index) => {
              const imageUri = base64ToDataUri(base64);
              const ratio = imageRatios[imageUri] ?? 4 / 3;

              const wrapperStyle = isSingleImage
                ? [styles.singleImageWrapper, { aspectRatio: ratio }]
                : styles.thumbWrapper;

              return (
                <TouchableOpacity
                  key={index}
                  style={wrapperStyle}
                  onPress={() => setSelectedImage(imageUri)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.imageFill}
                    resizeMode={isSingleImage ? "contain" : "cover"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* Content Body */}
        <View style={styles.body}>
          <Markdown
            style={{
              ...markdownStyles,
              body: {
                ...markdownStyles.body,
                fontSize: 16,
                lineHeight: 26,
                color: contentColor,
              },
              paragraph: { marginBottom: 16 },
              heading1: {
                ...markdownStyles.heading1,
                color: contentColor,
                marginTop: 24,
              },
              heading2: {
                ...markdownStyles.heading2,
                color: contentColor,
                marginTop: 20,
              },
            }}
          >
            {journal.text}
          </Markdown>
        </View>

        {/* Bottom spacer for the floating bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <Surface
        style={[
          styles.bottomBar,
          { backgroundColor: theme.colors.elevation.level2 },
        ]}
        elevation={4}
      >
        <Button
          mode="text"
          textColor={theme.colors.error}
          onPress={handleDelete}
          disabled={isDeleting}
          icon="trash-can-outline"
        >
          Delete
        </Button>
        <View style={styles.spacer} />
        <Button
          mode="contained"
          onPress={() =>
            navigation.navigate("JournalEditor", { journalId: journal.id })
          }
          icon="pencil"
        >
          Edit Entry
        </Button>
      </Surface>

      {/* Full Screen Image Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackground}
            onPress={() => setSelectedImage(null)}
            activeOpacity={1}
          />
          {selectedImage && (
            <Image
              source={{ uri: selectedImage! }}
              style={[
                styles.fullImage,
                { aspectRatio: imageRatios[selectedImage!] ?? 4 / 3 },
              ]}
              resizeMode="contain"
            />
          )}
          <IconButton
            icon="close"
            iconColor="white"
            size={30}
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom:80
  },
  header: {
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    opacity: 0.8,
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    margin: 0,
    marginRight: -4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
  },
  title: {
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 4,
    lineHeight: 40,
  },
  untitled: {
    fontStyle: "italic",
    opacity: 0.5,
    fontWeight: "300",
  },
  body: {
    minHeight: 200,
  },

  // Image Grid
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  singleImageWrapper: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },

  // new: multi-image thumbs stay square (no stretch)
  thumbWrapper: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },

  // new: shared fill style
  imageFill: {
    width: "100%",
    height: "100%",
  },
  imageWrapper: {
    width: "100%", // Default to full width for single image
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  gridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },


  modalImageFrame: {
    width: "100%",
    height: undefined,
    justifyContent: "center",
    alignItems: "center",
  },
  // Floating Bar
  bottomBar: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    justifyContent: "space-between",
  },
  spacer: {
    flex: 1,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
    fullImage: {
    width: "100%", // was screenWidth
    height: undefined, // was 80
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});

export default JournalDetailScreen;
