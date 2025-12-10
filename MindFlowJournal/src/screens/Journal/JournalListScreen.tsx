import { ExportModal } from "@/src/components/common/ExportModal";
import { setIsExportInProgress } from "@/src/stores/slices/settingsSlice";
import { useFocusEffect } from "@react-navigation/native";
import { format, isFuture, parseISO } from "date-fns";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  FAB,
  IconButton,
  Searchbar,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  exportAsJSON,
  exportAsMarkdown,
  exportAsPDF,
} from "../../services/exportService";
import { base64ToDataUri } from "../../services/imageService";
import {
  listJournals
} from "../../services/unifiedStorageService";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import {
  setJournals,
  setLoading
} from "../../stores/slices/journalsSlice";
import { Journal } from "../../types";
import { Alert } from "../../utils/alert";
// Import your theme helper
import { getJournalCardStyle } from "../../utils/theme";

// ----------------------------------------------------------------------
// 1. Memoized Journal Row Component (Timeline + Color Bubble)
// ----------------------------------------------------------------------
const JournalRow = React.memo(
  ({
    item,
    index,
    onPress,
    theme,
  }: {
    item: Journal;
    index: number;
    onPress: (color: string) => void;
    theme: any;
  }) => {
    const dateObj = new Date(item.date);
    const day = format(dateObj, "dd");
    const month = format(dateObj, "MMM");
    const year = format(dateObj, "yyyy");
    const time = format(dateObj, "h:mm a");

    // Get dynamic color from your theme util
    const cardStyle = getJournalCardStyle(theme, index);
    const dynamicColor = cardStyle.backgroundColor;

    // Get first image for thumbnail
    const firstImage = item.images?.[0] ? base64ToDataUri(item.images[0]) : null;

    // Clean preview text
    const cleanText =
      item.text
        .replace(/[#*`_]/g, "") // Remove bold/italic/header markers
        .replace(/\n/g, " ") // Flatten newlines
        .trim() || "No content";

    return (
      <TouchableOpacity
        onPress={() => onPress(dynamicColor)}
        activeOpacity={0.8}
        style={[
          styles.rowContainer, 
          { 
            backgroundColor: dynamicColor, // Apply the bubble color
            elevation: 2, // Slight shadow
          }
        ]}
      >
        {/* Left: Date Timeline */}
        <View style={styles.dateColumn}>
          <Text style={[styles.dayText, { color: theme.colors.onSurface }]}>
            {day}
          </Text>
          <Text
            style={[styles.monthText, { color: theme.colors.onSurfaceVariant }]}
          >
            {month}
          </Text>
          <Text
            style={[styles.yearText, { color: theme.colors.outline }]}
          >
            {year}
          </Text>
        </View>

        {/* Middle: Content */}
        <View style={styles.contentColumn}>
          <View style={styles.rowHeader}>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.primary, marginBottom: 2, opacity: 0.8 }}
            >
              {time}
            </Text>
          </View>

          {/* Title with your Requested Fallback */}
          <Text
            variant="titleMedium"
            style={[styles.titleText, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {item.title || (
              <Text style={{ fontWeight: '100', fontStyle: "italic", opacity: 0.7 }}>
                Untitled
              </Text>
            )}
          </Text>

          <Text
            variant="bodyMedium"
            style={[styles.previewText, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
            {cleanText}
          </Text>
        </View>

        {/* Right: Thumbnail (if exists) */}
        {firstImage && (
          <Image source={{ uri: firstImage }} style={styles.thumbnail} />
        )}
      </TouchableOpacity>
    );
  }
);

// ----------------------------------------------------------------------
// 2. Main Screen Component
// ----------------------------------------------------------------------
const JournalListScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const encryptionKey = useAppSelector((state) => state.auth.encryptionKey);
  const journals = useAppSelector((state) => state.journals.journals);
  const isGlobalLoading = useAppSelector((state) => state.journals.isLoading);

  // Route params for date filtering
  const { selectedDate } = route.params || {};

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Filter Logic
  const filteredJournals = useMemo(() => {
    let result = [...journals];

    if (selectedDate) {
      result = result.filter((journal) => {
        const d = new Date(journal.date);
        return format(d, "yyyy-MM-dd") === selectedDate;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (journal) =>
          journal.title?.toLowerCase().includes(query) ||
          journal.text.toLowerCase().includes(query)
      );
    }

    // Sort descending
    return result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [journals, selectedDate, searchQuery]);

  const loadJournals = useCallback(async () => {
    if (!encryptionKey) return;
    dispatch(setLoading(true));
    try {
      const loadedJournals = await listJournals(encryptionKey);
      dispatch(setJournals(loadedJournals));
    } catch (error) {
      console.error("❌ Error loading journals:", error);
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
    }, [encryptionKey, journals.length, loadJournals])
  );

  const handleFabPress = () => {
    if (selectedDate) {
      const dateObj = parseISO(selectedDate);
      if (isFuture(dateObj)) {
        Alert.alert(
          "Future Date",
          "Cannot create journals for future dates yet.",
          [{ text: "OK" }]
        );
        return;
      }
      navigation.navigate("JournalEditor", { selectedDate });
    } else {
      navigation.navigate("JournalEditor");
    }
  };

  // Export Logic
  const handleExport = async (exportFormat: "json" | "text" | "pdf") => {
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      {/* 1. Header Area: Search + Export */}
      <View style={styles.headerContainer}>
        <Searchbar
          placeholder="Search memories..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
          inputStyle={styles.searchInput}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          right={(props) => (
             <IconButton
                {...props}
                icon="export-variant"
                onPress={() => setShowExportModal(true)}
             />
          )}
        />
      </View>

      {/* 2. Active Filter Chip */}
      {selectedDate && (
        <View style={styles.filterBanner}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Viewing {format(parseISO(selectedDate), "MMM do, yyyy")}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.setParams({ selectedDate: null })}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: "bold" }}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. The List */}
      <FlatList
        data={filteredJournals}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <JournalRow
            item={item}
            index={index}
            theme={theme}
            onPress={(color) =>
              navigation.navigate("JournalDetail", { 
                journalId: item.id,
                backColor: color // Pass the specific bubble color
              })
            }
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !isGlobalLoading ? (
            <View style={styles.emptyState}>
              <Text variant="titleMedium" style={{ opacity: 0.5, marginBottom: 8 }}>
                {searchQuery ? "No matches found" : "No journals yet"}
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.4 }}>
                {searchQuery ? "Try a different search term" : "Tap + to write your first entry"}
              </Text>
            </View>
          ) : (
             <View style={styles.loadingContainer}>
                <ActivityIndicator />
             </View>
          )
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={handleFabPress}
      />

      {/* Export Modal */}
      <ExportModal
        visible={showExportModal}
        journalsList={filteredJournals}
        selectedDate={selectedDate || new Date().toISOString()}
        onExport={handleExport}
        onClose={() => setShowExportModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchBar: {
    elevation: 0,
    borderRadius: 16,
    height: 48,
  },
  searchInput: {
    minHeight: 0,
  },
  filterBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  
  // Row Styles
  rowContainer: {
    flexDirection: "row",
    paddingVertical: 16, // More breathing room inside the bubble
    paddingHorizontal: 16,
    marginHorizontal: 16, // Pull away from screen edges
    marginBottom: 12, // Gap between bubbles
    borderRadius: 16, // Rounded corners
    alignItems: 'center',
  },
  dateColumn: {
    width: 48,
    alignItems: "center",
    marginRight: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)', // Subtle divider
    paddingRight: 8,
  },
  dayText: {
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 24,
  },
  monthText: {
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "700",
    marginTop: 2,
  },
  yearText: {
    fontSize: 10,
    marginTop: 1,
    opacity: 0.7,
  },
  contentColumn: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 8,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    fontWeight: "700",
    marginBottom: 4,
    fontSize: 16,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginLeft: 4,
    backgroundColor: "#eee",
  },
  
  // Empty & Loading
  emptyState: {
    alignItems: "center",
    marginTop: 80,
  },
  loadingContainer: {
    paddingVertical: 40,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});

export default JournalListScreen;
