// src/screens/Home/HomeScreen.tsx
import { MOOD_OPTIONS } from "@/src/components/journal/MoodSelector";
import { getVaultStorageProvider } from "@/src/services/vaultStorageProvider";
import { Alert } from "@/src/utils/alert";
import { getRandomPrompt } from "@/src/utils/journalPrompts";
import { getCalendarTheme } from "@/src/utils/theme";
import { useFocusEffect } from "@react-navigation/native";
import { format, subDays } from "date-fns";
import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import {
  Button,
  Card,
  Chip,
  IconButton,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  calculateLongestStreak,
  getMarkedDates,
} from "../../services/streakService";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import {
  setJournals,
  setLongestStreak,
} from "../../stores/slices/journalsSlice";

const VaultStorageProvider = getVaultStorageProvider();

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const encryptionKey = useAppSelector((state) => state.auth.encryptionKey);

  const currentStreak = useAppSelector((state) => state.journals.currentStreak);
  const longestStreak = useAppSelector((state) => state.journals.longestStreak);
  const journals = useAppSelector((state) => state.journals.journals);

  const [todayPrompt, setTodayPrompt] = useState(getRandomPrompt());

  const [markedDates, setMarkedDates] = useState<any>({});
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadJournals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encryptionKey]);

  useFocusEffect(
    React.useCallback(() => {
      updateMarkedDates();
    }, [journals]),
  );

  useEffect(() => {
    updateMarkedDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journals]);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.12, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [currentStreak, scaleAnim]);

  const loadJournals = async () => {
    if (!encryptionKey) return;

    try {
      const loadedJournals =
        await VaultStorageProvider.listJournals(encryptionKey);
      dispatch(setJournals(loadedJournals));

      const longest = calculateLongestStreak(loadedJournals);
      dispatch(setLongestStreak(longest));
    } catch (error) {
      console.error("Error loading journals:", error);
    }
  };

  const updateMarkedDates = () => {
    const marked = getMarkedDates(journals, theme.colors);
    setMarkedDates(marked);
  };

  const handleDayPress = (day: DateData) => {
    // ✅ VALIDATION: Prevent selecting future dates
    const selectedDate = new Date(day.dateString);
    selectedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      Alert.alert(
        "Future Date Not Available",
        "Journals can only be created for today or past dates.\n\n" +
          "🚀 Coming Soon:\n" +
          "'Todo & Reminders' feature will allow you to plan ahead!\n\n" +
          "For now, select today or a past date to view or create entries. ✨",
      );
      return;
    }

    navigation.navigate("JournalList", { selectedDate: day.dateString });
  };

  const handleCreateJournalForToday = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    navigation.navigate("JournalEditor", {
      selectedDate: today,
      promptText: todayPrompt.text, // Pass the current prompt
      promptId: todayPrompt.id, // Pass prompt ID for tracking
    });
  };

  const calendarTheme = React.useMemo(
    () => getCalendarTheme(theme),
    [theme.dark, theme.colors],
  );

  const last3Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const count = journals.filter(
        (j) => format(new Date(j.date), "yyyy-MM-dd") === dateStr,
      ).length;

      days.push({
        dateKey: dateStr,
        dateLabel: format(date, "MMM dd"),
        count,
        isToday: i === 0,
      });
    }
    return days;
  }, [journals]);

  const hasEntries = journals.length > 0;

  const heroBg = theme.dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const subtleBorder = theme.colors.outlineVariant;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 96 }]}
      >
        {/* HERO / OVERVIEW */}
        <Card style={[styles.heroCard, { borderColor: subtleBorder }]}>
          <Card.Content>
            <View style={styles.heroTopRow}>
              <View style={styles.heroText}>
                <Text variant="titleLarge" style={styles.heroTitle}>
                  {hasEntries ? "Welcome back" : "Start journaling"}
                </Text>
                <Text variant="bodyMedium" style={styles.heroSubtitle}>
                  {hasEntries
                    ? "Your progress is building day by day."
                    : "Create your first entry and begin your streak."}
                </Text>
              </View>
            </View>

            <View style={styles.statGrid}>
              <Pressable
                style={[
                  styles.statTile,
                  { backgroundColor: heroBg, borderColor: subtleBorder },
                ]}
                onPress={() => navigation.navigate("JournalList")}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: scaleAnim }],
                    flexDirection: "row",
                  }}
                >
                  <Text variant="displaySmall" style={styles.statValue}>
                    {journals.length}
                  </Text>
                  <Text style={styles.statEmojiValue}>📝</Text>
                </Animated.View>
                <Text
                  variant="labelMedium"
                  style={[styles.statLabel, { paddingTop: 10 }]}
                >
                  Total entries
                </Text>
              </Pressable>

              <View
                style={[
                  styles.statTile,
                  { backgroundColor: heroBg, borderColor: subtleBorder },
                ]}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: scaleAnim }],
                    flexDirection: "row",
                  }}
                >
                  <Text variant="displayMedium" style={styles.statValue}>
                    {currentStreak}
                  </Text>
                  <Text style={styles.statEmojiValue}>🔥</Text>
                </Animated.View>

                {/* <IconButton
                      icon="fire"
                      size={25}
                      style={{ margin: 0, marginBottom: 5 }}
                    /> */}
                <Text
                  variant="labelMedium"
                  style={[styles.statLabel, { paddingTop: 10 }]}
                >
                  {" "}
                  Current Streak
                </Text>
                {/* </View> */}
              </View>
            </View>

            <View style={styles.heroChipsRow}>
              <Chip
                icon="trophy"
                compact
                textStyle={{
                  color: theme.colors.onSurface,
                }}
                style={[
                  styles.heroChip,
                  {
                    backgroundColor: theme.colors.elevation.level5,
                  },
                ]}
              >
                {`Longest streak: ${longestStreak}`}
              </Chip>
              {/*               
              <Chip
                icon="calendar-check-outline"
                compact
                style={[
                  styles.heroChip,
                  { backgroundColor: theme.colors.elevation.level1 },
                ]}
                onPress={() => navigation.navigate("JournalList")}
              >
                View journals
              </Chip> */}
            </View>
          </Card.Content>
        </Card>

          {/* RECENT ACTIVITY */}
        <Card style={[styles.card, { borderColor: subtleBorder }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Recent activity
              </Text>
              {/* <Button
                mode="text"
                onPress={() => navigation.navigate("JournalList")}
              >
                View all
              </Button> */}
            </View>

            <View style={styles.daysRow}>
              {last3Days.map((d) => {
                const active = d.count > 0;
                const pillBg = active
                  ? theme.colors.primaryContainer
                  : theme.colors.elevation.level1;
                const pillText = active
                  ? theme.colors.onPrimaryContainer
                  : theme.colors.onSurfaceVariant;

                // GET MOOD FOR THIS DAY - ADD THIS
                const dayJournals = journals.filter(
                  (j) => format(new Date(j.date), "yyyy-MM-dd") === d.dateKey,
                );
                const dayMoods = dayJournals
                  .map((j) => j.mood)
                  .filter((m) => m)
                  .map(
                    (m) => MOOD_OPTIONS.find((opt) => opt.value === m)?.emoji,
                  )
                  .filter((e) => e);
                const moodDisplay = dayMoods.length > 0 ? dayMoods[0] : null;

                return (
                  <Pressable
                    key={d.dateKey}
                    onPress={() =>
                      navigation.navigate("JournalList", {
                        selectedDate: d.dateKey,
                      })
                    }
                    style={[
                      styles.dayPill,
                      { backgroundColor: pillBg, borderColor: subtleBorder },
                    ]}
                  >
                    
                    <Text style={[styles.dayPillTop, { color: pillText }]}>
                      {d.isToday ? "Today" : d.dateLabel}
                    </Text>
                    {/* <Text style={[styles.dayPillMid, { color: pillText }]}>
                      {active ? "✓" : "·"}
                    </Text> */}
                    {/* ADD MOOD DISPLAY */}
                    {
                    moodDisplay ? (
                      <Text style={styles.dayPillMood}>{moodDisplay}</Text>
                    ): 
                    <Text style={[styles.dayPillMid, { color: pillText }]}>
                      {active ? "✓" : "·"}
                    </Text>}
                    {/* <Text style={[styles.dayPillBottom, { color: pillText }]}>
                      {d.count} {d.count === 1 ? "entry" : "entries"}
                    </Text> */}
                  </Pressable>
                );
              })}
            </View>
          </Card.Content>
        </Card>

        <Card style={{ ...styles.card, borderColor: subtleBorder }}>
          <Card.Content>
            <View style={styles.promptPreviewContainer}>
              {/* Header */}

              {/* Prompt Text - Tappable */}
              <Pressable
                onPress={handleCreateJournalForToday}
                style={{
                  padding: 16,
                  backgroundColor: heroBg,
                  borderRadius: 12,
                  borderColor: theme.colors.primary,
                }}
              >
                <Text
                  variant="titleMedium"
                  style={{
                    fontSize: 20,
                    opacity: 0.8,
                    color: theme.colors.onSurface,
                    lineHeight: 24,
                    fontWeight: "500",
                  }}
                >
                  {todayPrompt.text}
                </Text>
              </Pressable>

              {/* Actions */}
              <View style={styles.promptActions}>
                <View style={styles.promptHeader}>
                  <IconButton
                    icon="lightbulb-on-outline"
                    size={15}
                    iconColor={theme.colors.primary}
                    style={{ margin: 0, marginRight: 0 }}
                  />
                  <Text
                    variant="labelSmall"
                    style={{
                      marginLeft: -10,
                      fontWeight: "400",
                      opacity: 0.7,
                    }}
                  >
                    Today's Prompt
                  </Text>
                </View>
                <Button
                  mode="text"
                  icon="shuffle-variant"
                  onPress={() => setTodayPrompt(getRandomPrompt())}
                  compact
                >
                  <Text
                    style={{
                      fontSize: 11,
                      marginLeft: 2,
                      opacity: 0.9,
                      fontStyle: "italic",
                    }}
                  >
                    Shuffle
                  </Text>
                </Button>

                <Button
                  icon="pencil-outline"
                  onPress={handleCreateJournalForToday}
                >
                  <Text style={{ fontSize: 13 }}>Write...</Text>
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>

      

        {/* CALENDAR */}
        <Card style={[styles.card, { borderColor: subtleBorder }]}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.sectionTitleCentered}>
            Your memory calender...
            </Text>
            <Calendar
              key={theme.dark ? "cal-dark" : "cal-light"}
              theme={calendarTheme}
              markedDates={markedDates}
              markingType="dot"
              onDayPress={handleDayPress}
              maxDate={format(new Date(), "yyyy-MM-dd")}
              disabledByDefault={false}
            />
          </Card.Content>
        </Card>

        {/* QUICK ACTIONS */}
        <Card style={[styles.card, { borderColor: subtleBorder }]}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitleCentered}>
              Quick actions
            </Text>

            <View style={styles.actionsRow}>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate("JournalList")}
                style={styles.actionButton}
                icon="notebook-outline"
                compact
              >
                View All
              </Button>

              <Button
                mode="contained"
                onPress={handleCreateJournalForToday}
                style={styles.actionButton}
                icon="pencil"
                compact
                disabled={!encryptionKey}
              >
                New entry
              </Button>
            </View>

            {/* keep your bottom nav actions, but styled cleaner */}
            <View style={[styles.bottomNav, { borderTopColor: subtleBorder }]}>
              <Button
                mode="text"
                onPress={() => navigation.navigate("Export")}
                icon="import"
              >
                Import/Export
              </Button>
              <Button
                mode="text"
                onPress={() => navigation.navigate("Settings")}
                icon="cog"
              >
                Settings
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  dayPillMood: {
    fontSize: 18,
    marginVertical: 2,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },

  heroCard: {
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroText: { flex: 1 },
  heroTitle: { fontWeight: "800" },
  heroSubtitle: { opacity: 0.7, marginTop: 4, lineHeight: 20 },

  statGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  statTile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingTop: 28,
    paddingHorizontal: 14,
    alignItems: "center", // add
    justifyContent: "center", // add
  },
  statLabel: {
    opacity: 0.75,
    marginBottom: 6,
    textAlign: "center", // add
  },
  statValue: {
    fontSize: 35,
    fontWeight: "800",
    textAlign: "center", // add
  },
  statEmojiValue: {
    // marginTop:6,
    fontSize: 20, // add
  },

  heroChipsRow: {
    display: "flex",
    justifyContent: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  heroChip: {
    alignSelf: "flex-start",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontWeight: "800" },
  sectionTitleCentered: {
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },

  daysRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  dayPill: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 3,
    justifyContent:'center',
    alignItems: "center",
  },
  dayPillTop: { fontSize: 11, fontWeight: "400", opacity: 0.9 },
  dayPillMid: { fontSize: 12, fontWeight: "400", marginVertical: 4 },
  dayPillBottom: { fontSize: 12, opacity: 0.85 },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 12,
    marginTop: 4,
  },
  actionButton: { flex: 1, borderRadius: 14 },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "stretch", // add
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center", // add
    minHeight: 90, // add (adjust 80-110)
  },
  statNumber: {
    fontWeight: "bold",
    marginBottom: 6, // little spacing
    textAlign: "center",
  },

  promptPreviewContainer: {
    gap: 12,
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  promptActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
});

export default HomeScreen;
