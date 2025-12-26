// src/screens/Journal/JournalListScreen.tsx

import { ExportModal } from "@/src/components/common/ExportModal";
import { setIsExportInProgress } from "@/src/stores/slices/settingsSlice";
import { getMarkdownStyles } from "@/src/utils/markdownStyles";
import { getJournalCardStyle } from "@/src/utils/theme";

import { useFocusEffect } from "@react-navigation/native";
import { format, isFuture, parseISO } from "date-fns";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { Card, FAB, IconButton, Searchbar, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { exportAsJSON, exportAsMarkdown, exportAsPDF } from "@/src/services/exportService";
import { getVaultStorageProvider } from "@/src/services/vaultStorageProvider";
import { useAppDispatch, useAppSelector } from "@/src/stores/hooks";
import {
  deleteJournal as deleteJournalAction,
  setJournals,
  setLoading,
} from "@/src/stores/slices/journalsSlice";
import type { Journal } from "@/src/types";
import { Alert } from "@/src/utils/alert";

const VaultStorageProvider = getVaultStorageProvider()

const JournalListScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const encryptionKey = useAppSelector((state) => state.auth.encryptionKey);
  const journals = useAppSelector((state) => state.journals.journals);
  const isGlobalLoading = useAppSelector((state) => state.journals.isLoading);

  const selectedDate = route.params?.selectedDate as string | undefined;

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);

  const filteredJournals = useMemo(() => {
    let result = [...journals];

    if (selectedDate) {
      result = result.filter((journal) => {
        const journalDate = new Date(journal.date);
        const year = journalDate.getFullYear();
        const month = String(journalDate.getMonth() + 1).padStart(2, "0");
        const day = String(journalDate.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}` === selectedDate;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (journal) =>
          (journal.title || "").toLowerCase().includes(query) ||
          journal.text.toLowerCase().includes(query),
      );
    }

    return result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [journals, selectedDate, searchQuery]);

  const loadJournals = useCallback(async () => {
    if (!encryptionKey) return;

    dispatch(setLoading(true));
    try {
      const loadedJournals = await VaultStorageProvider.listJournals(encryptionKey);
      dispatch(setJournals(loadedJournals));
    } catch (error) {
      console.error("❌ Error loading journals:", error);
      Alert.alert("Error", "Failed to load journals");
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, encryptionKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJournals();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (journals.length === 0 && encryptionKey) {
        loadJournals();
      }
    }, [encryptionKey, journals.length, loadJournals]),
  );

  const handleExport = async (exportFormat: "json" | "text" | "pdf") => {
    if (!encryptionKey) return;

    if (filteredJournals.length === 0) {
      Alert.alert("Nothing to Export", "No journals match your current filters.");
      return;
    }

    setIsExporting(true);
    dispatch(setIsExportInProgress(true));

    try {
      const dateSuffix = selectedDate || format(new Date(), "yyyy-MM-dd");

      let fileUri: string;
      let fileName: string;
      let mimeType: string;

      if (exportFormat === "json") {
        const content = await exportAsJSON(filteredJournals);
        fileName = `journals-${dateSuffix}.json`;
        mimeType = "application/json";
        fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, content);
      } else if (exportFormat === "text") {
        const content = await exportAsMarkdown(filteredJournals);
        fileName = `journals-${dateSuffix}.md`;
        mimeType = "text/markdown";
        fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, content);
      } else {
        fileUri = await exportAsPDF(filteredJournals);
        fileName = `journals-${dateSuffix}.pdf`;
        mimeType = "application/pdf";
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: "Share Journals",
        });
      } else {
        Alert.alert("Export Complete", `File saved: ${fileUri}`);
      }
    } catch (error) {
      console.error("❌ Export error:", error);
      Alert.alert("Export Failed", "Could not create export file");
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
      dispatch(setIsExportInProgress(false));
    }
  };

  const handleDeleteJournal = async (journalId: string) => {
    Alert.alert(
      "Delete?",
      "Are you sure you want to delete this memory? This cannot be undone.?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!encryptionKey) return;

            setIsDeleting(true);
            try {
              await VaultStorageProvider.deleteJournal(
                journalId,
                encryptionKey,
              );
              dispatch(deleteJournalAction(journalId));
            } catch (error) {
              console.error("❌ Delete error:", error);
              Alert.alert("Oops!", "Failed to delete journal");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleFabPress = () => {
    if (selectedDate) {
      const dateObj = parseISO(selectedDate);
      if (isFuture(dateObj)) {
        Alert.alert(
          "Future Date Selected",
          "Cannot create journals for future dates yet. Feature Todo: notes and reminders for future dates!",
          [{ text: "OK" }],
        );
        return;
      }
      navigation.navigate("JournalEditor", { selectedDate });
    } else {
      navigation.navigate("JournalEditor");
    }
  };

  const selectedDateFormatted = selectedDate
    ? format(parseISO(selectedDate), "EEEE, MMMM do, yyyy")
    : null;

  /**
   * Elegant card with left date banner + preserved background color scheme
   */
  const JournalCard = ({ item, index }: { item: Journal; index: number }) => {
    const dateObj = new Date(item.date);
    const day = format(dateObj, "dd");
    const month = format(dateObj, "MMM").toUpperCase();
    const formattedTime = format(dateObj, "hh:mm a");

    const hasImages = !!item.images && item.images.length > 0;

    const cardStyle = getJournalCardStyle(theme, index);
    const markdownStyles = getMarkdownStyles(theme);

    const titleValue = (item.title || "").trim();
    const hasTitle = titleValue.length > 0;

    const previewText =
      item.text.length > 180
        ? item.text.substring(0, 180).replace(/\n/g, " ") + "…"
        : item.text;

    const bannerBg =
      theme.dark ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.55)";

    return (
      <Card
        style={[styles.card, cardStyle]}
        onPress={() =>
          navigation.navigate("JournalDetail", {
            journalId: item.id,
            backColor: cardStyle.backgroundColor as string,
          })
        }
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardRow}>
            {/* Left date banner */}
            <View style={[styles.dateBanner, { backgroundColor: bannerBg }]}>
              <Text
                style={[styles.bannerDay, { color: theme.colors.onSurface }]}
              >
                {day}
              </Text>
              <Text
                style={[
                  styles.bannerMonth,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {month}
              </Text>
              <Text
                style={[
                  styles.bannerTime,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {formattedTime}
              </Text>
            </View>

            {/* Right content */}
            <View style={styles.cardMain}>
              <View style={styles.cardHeaderRow}>
                {hasTitle ? (
                  <Text
                    variant="titleMedium"
                    style={styles.cardTitle}
                    numberOfLines={1}
                  >
                    {titleValue}
                  </Text>
                ) : (
                  <Text
                    variant="titleMedium"
                    style={[styles.cardTitle, styles.untitled]}
                    numberOfLines={1}
                  >
                    Untitled
                  </Text>
                )}
              </View>

              <View style={styles.preview}>
                <Markdown
                  style={{
                    ...markdownStyles,
                    // Force body text to be compact
                    body: {
                      fontSize: 14,
                      lineHeight: 20,
                      color: theme.colors.onSurfaceVariant,
                    },
                    // Kill margins on paragraphs
                    paragraph: {
                      marginBottom: 0,
                      marginTop: 0,
                    },
                    // NEUTRALIZE HEADERS (h1-h6) to look like normal bold text
                    heading1: {
                      fontSize: 14,
                      lineHeight: 20,
                      fontWeight: "700",
                      marginBottom: 4,
                      marginTop: 0,
                    },
                    heading2: {
                      fontSize: 14,
                      lineHeight: 20,
                      fontWeight: "700",
                      marginBottom: 4,
                      marginTop: 0,
                    },
                    heading3: {
                      fontSize: 14,
                      lineHeight: 20,
                      fontWeight: "700",
                      marginBottom: 4,
                      marginTop: 0,
                    },
                    // Ensure lists don't add huge padding
                    list: {
                      marginBottom: 0,
                    },
                  }}
                >
                  {previewText}
                </Markdown>
              </View>

              <View style={styles.metaRow}>
                {hasImages && (
                  <View
                    style={[
                      styles.metaPill,
                      { borderColor: theme.colors.outlineVariant },
                    ]}
                  >
                    <IconButton
                      icon="image-outline"
                      size={14}
                      iconColor={theme.colors.onSurfaceVariant}
                      style={styles.metaIcon}
                    />
                    <Text
                      style={[
                        styles.metaText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {item.images!.length}
                    </Text>
                  </View>
                )}

                <View style={styles.actionButtonContainer}>
                  <IconButton
                    icon="trash-can-outline"
                    size={20}
                    mode="contained-tonal"
                    iconColor={theme.colors.error}
                    style={styles.editButton}
                    onPress={() => handleDeleteJournal(item.id)}
                  />
                  <IconButton
                    icon="pencil-outline"
                    size={20}
                    mode="contained-tonal"
                    iconColor={theme.colors.primary}
                    style={styles.editButton}
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      navigation.navigate("JournalEditor", {
                        journalId: item.id,
                      });
                    }}
                  />
                </View>
                {/* keep delete functionality available (not wired to UI previously) */}
                {/* if you want, we can add a long-press or menu for delete without cluttering */}
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <ExportModal
        visible={showExportModal}
        journalsList={filteredJournals}
        selectedDate={selectedDate || format(new Date(), "yyyy-MM-dd")}
        onExport={handleExport}
        onClose={() => setShowExportModal(false)}
      />

      {/* Header */}
      <Card
        style={[
          styles.headerCard,
          { borderColor: theme.colors.outlineVariant },
        ]}
      >
        <Card.Content>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text variant="headlineSmall" style={styles.headerTitle}>
                {selectedDateFormatted || "📖 All My Journals"}
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                {filteredJournals.length}{" "}
                {filteredJournals.length === 1 ? "entry" : "entries"}
              </Text>
            </View>

            <IconButton
              icon="export-variant"
              mode="contained-tonal"
              onPress={() => setShowExportModal(true)}
              disabled={
                filteredJournals.length === 0 || isDeleting || isExporting
              }
            />
          </View>
        </Card.Content>
      </Card>

      {/* Search */}
      {journals.length > 0 && (
        <Searchbar
          placeholder="Search in journals..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          icon="magnify"
        />
      )}

      {/* Content */}
      {filteredJournals.length === 0 && !isGlobalLoading ? (
        <View style={styles.empty}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            {searchQuery ? "No matches found" : "No journals yet"}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {searchQuery
              ? "Try different keywords"
              : selectedDateFormatted
                ? `No entries for ${selectedDateFormatted}`
                : "Start your first journal entry"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredJournals}
          renderItem={({ item, index }) => (
            <JournalCard item={item} index={index} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isGlobalLoading}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="plus"
        label={selectedDate ? "New Entry" : "New Journal"}
        style={styles.fab}
        onPress={handleFabPress}
        disabled={!encryptionKey}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerCard: {
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: { flex: 1, marginRight: 12 },
  headerTitle: { fontWeight: "700", marginBottom: 4 },
  subtitle: { opacity: 0.7 },

  searchbar: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 100, // keep FAB space (existing behavior)
  },

  // Card base
  card: {
    marginBottom: 12,
    borderRadius: 18,
    elevation: 2,
    overflow: "hidden",
  },
  cardContent: {
    paddingVertical: 14,
  },

  // New elegant layout
  cardRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },

  dateBanner: {
    width: 82,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerDay: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 24,
  },
  bannerMonth: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    opacity: 0.85,
  },
  bannerTime: {
    marginTop: 6,
    fontSize: 11,
    opacity: 0.7,
  },

  cardMain: {
    flex: 1,
    minWidth: 0, // important for text truncation on Android
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
  },

  cardTitle: {
    flex: 1,
    fontWeight: "800",
  },
  untitled: {
    fontWeight: "300",
    fontStyle: "italic",
    opacity: 0.7,
  },

  actionButtonContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  editButton: { margin: 0 },

  preview: {
    marginTop: 10,
  },

  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  metaIcon: {
    margin: 0,
    padding: 0,
    height: 16,
    width: 16,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.8,
  },

  // Empty state
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 48,
  },
  emptyTitle: { marginBottom: 8, textAlign: "center" },
  emptyText: { opacity: 0.6, textAlign: "center", lineHeight: 22 },

  // FAB
  fab: {
    position: "absolute",
    margin: 16,
    right: 20,
    bottom: 80,
  },
});

export default JournalListScreen;
