import { ExportModal } from "@/src/components/common/ExportModal";
import { setIsExportInProgress } from "@/src/stores/slices/settingsSlice";
import { getMarkdownStyles } from "@/src/utils/markdownStyles";
import { getJournalCardStyle } from "@/src/utils/theme";
import { useFocusEffect } from "@react-navigation/native";
import { format, isFuture, parseISO } from "date-fns";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { Card, Chip, FAB, Searchbar, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  exportAsJSON,
  exportAsMarkdown,
  exportAsPDF,
} from "../../services/exportService";
import { deleteJournal, listJournals } from "../../services/unifiedStorageService";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { deleteJournal as deleteJournalAction, setJournals, setLoading } from "../../stores/slices/journalsSlice";
import { Journal } from "../../types";

const JournalListScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const encryptionKey = useAppSelector((state) => state.auth.encryptionKey);
  const journals = useAppSelector((state) => state.journals.journals);
  const isGlobalLoading = useAppSelector((state) => state.journals.isLoading);

  // Route params
  const { selectedDate } = route.params || {};

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // SAFE FILTERING - Read-only derived state
  const filteredJournals = useMemo(() => {
    let result = [...journals];

    // Filter by selected date (if provided)
    if (selectedDate) {
      result = result.filter((journal) => {
        const journalDate = new Date(journal.date);
        const year = journalDate.getFullYear();
        const month = String(journalDate.getMonth() + 1).padStart(2, "0");
        const day = String(journalDate.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}` === selectedDate;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (journal) =>
          journal.title?.toLowerCase().includes(query) ||
          journal.text.toLowerCase().includes(query)
      );
    }

    // Sort newest first
    return result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [journals, selectedDate, searchQuery]);

  // Load journals from storage
  const loadJournals = useCallback(async () => {
    if (!encryptionKey) return;
    dispatch(setLoading(true));
    try {
      const loadedJournals = await listJournals(encryptionKey);
      dispatch(setJournals(loadedJournals));
    } catch (error) {
      console.error("❌ Error loading journals:", error);
      Alert.alert("Error", "Failed to load journals");
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, encryptionKey]);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadJournals();
    setRefreshing(false);
  };

  // Auto-refresh on focus if empty
  useFocusEffect(
    useCallback(() => {
      if (journals.length === 0 && encryptionKey) {
        loadJournals();
      }
    }, [encryptionKey, journals.length, loadJournals])
  );

  // Export handler
  const handleExport = async (exportFormat: "json" | "text" | "pdf") => {
    if (filteredJournals.length === 0) {
      Alert.alert("Nothing to Export", "No journals match your current filters.");
      return;
    }

    setIsExporting(true);
        dispatch(setIsExportInProgress(true)); // ✅ SET FLAG BEFORE EXPORT

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
        await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: "Share Journals" });
      } else {
        Alert.alert("Export Complete", `File saved:\n${fileUri}`);
      }
    } catch (error) {
      console.error("❌ Export error:", error);
      Alert.alert("Export Failed", "Could not create export file");
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
            dispatch(setIsExportInProgress(false)); // ✅ CLEAR FLAG AFTER EXPORT

    }
  };

  // Delete single journal
  const handleDeleteJournal = async (journalId: string) => {
    Alert.alert(
      "Delete Journal",
      "This action cannot be undone. Are you sure?",
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
              Alert.alert("Deleted", "Journal entry removed successfully");
            } catch (error) {
              console.error("❌ Delete error:", error);
              Alert.alert("Error", "Failed to delete journal");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

   const handleFabPress = () => {
    if (selectedDate) {
      const dateObj = parseISO(selectedDate);
      if (isFuture(dateObj)) {
        Alert.alert(
          "Future Date Selected",
          "Cannot create journals for future dates yet.\n\n✨ Upcoming Feature: Todo notes and Reminders for future dates!",
          [{ text: "OK" }]
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

  // Journal Card Component
  const JournalCard = ({ item, index }: { item: Journal; index: number }) => {
    const dateObj = new Date(item.date);
    const formattedDate = format(dateObj, "MMM dd, yyyy");
    const formattedTime = format(dateObj, "hh:mm a");
    const hasImages = item.images && item.images.length > 0;
    const cardStyle = getJournalCardStyle(theme, index);
    const markdownStyles = getMarkdownStyles(theme);

    const previewText = item.text.length > 100
      ? item.text.substring(0, 100).replace(/\n/g, " ") + "..."
      : item.text;

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
        <Card.Content>
          {item.title && (
            <Text variant="titleMedium" style={styles.title}>
              {item.title}
            </Text>
          )}
          <View style={styles.preview}>
            <Markdown
              style={{
                ...markdownStyles,
                body: { fontSize: 14, lineHeight: 20 },
              }}
            >
              {previewText}
            </Markdown>
          </View>
          <View style={styles.footer}>
            <View style={styles.meta}>
              <Chip
                icon="calendar"
                style={styles.metaChip}
                textStyle={styles.chipText}
                compact
              >
                {formattedDate}
              </Chip>
              <Chip
                icon="clock-outline"
                style={styles.metaChip}
                textStyle={styles.chipText}
                compact
              >
                {formattedTime}
              </Chip>
              {hasImages && (
                <Chip
                  icon="image"
                  style={styles.metaChip}
                  textStyle={styles.chipText}
                  compact
                >
                  {item.images!.length}
                </Chip>
              )}
            </View>
            <Chip
              icon="pencil"
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate("JournalEditor", { journalId: item.id });
              }}
              style={styles.editChip}
              compact
              mode="outlined"
            >
              Edit
            </Chip>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Export Modal */}
      <ExportModal
        visible={showExportModal}
        journalsList={filteredJournals}
        selectedDate={selectedDate || format(new Date(), "yyyy-MM-dd")}
        onExport={handleExport}
        onClose={() => setShowExportModal(false)}
      />

      {/* Header */}
      <Card style={[styles.headerCard, { borderColor: theme.colors.outline }]}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text variant="headlineSmall" style={styles.headerTitle}>
                {selectedDateFormatted || "All My Journals"}
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                {filteredJournals.length} entr{filteredJournals.length === 1 ? "y" : "ies"}
              </Text>
            </View>
            <Chip
              icon="export-variant"
              mode="outlined"
              onPress={() => setShowExportModal(true)}
              disabled={filteredJournals.length === 0 || isDeleting||isExporting}
              style={styles.exportChip}
            >Export
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Search Bar */}
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
              : selectedDate
              ? `No entries for ${selectedDateFormatted}`
              : "Start your first journal entry"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredJournals}
          renderItem={({ item, index }) => (
            <JournalCard key={item.id} item={item} index={index} />
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

      {/* FAB */}
     <FAB
        icon="plus"
        label={selectedDate ? "New Entry" : "New Journal"}
        style={styles.fab}
        onPress={handleFabPress} // Use the new handler
        disabled={!encryptionKey}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.7,
  },
  exportChip: {
    minHeight: 36,
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
  },
  title: {
    fontWeight: "600",
    marginBottom: 8,
  },
  preview: {
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  metaChip: {
    height: 28,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  chipText: {
    fontSize: 11,
  },
  editChip: {
    height: 32,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 48,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    opacity: 0.6,
    textAlign: "center",
    lineHeight: 22,
  },
 fab: {
    position: "absolute",
    margin: 16,
    right: 20,
    bottom: 80, // ✅ Changed from 50 to avoid navigation bar
  },
});

export default JournalListScreen;
