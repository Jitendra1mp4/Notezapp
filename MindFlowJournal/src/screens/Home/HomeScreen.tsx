import { Alert } from "@/src/utils/alert";
import { getCalendarTheme } from "@/src/utils/theme";
import { format, isFuture, startOfDay, subDays } from "date-fns";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { Button, Card, Chip, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  calculateLongestStreak,
  getMarkedDates,
} from "../../services/streakService";
import { listJournals } from "../../services/unifiedStorageService";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import {
  setJournals,
  setLongestStreak,
} from "../../stores/slices/journalsSlice";

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const encryptionKey = useAppSelector((state) => state.auth.encryptionKey);

  const currentStreak = useAppSelector((state) => state.journals.currentStreak);
  const longestStreak = useAppSelector((state) => state.journals.longestStreak);
  const journals = useAppSelector((state) => state.journals.journals);

  const [markedDates, setMarkedDates] = useState<any>({});
  
  // Animation value for streak number
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Initial load
  useEffect(() => {
    loadJournals();
  }, [encryptionKey]);

  // Refresh marked dates whenever journals change
  useEffect(() => {
    updateMarkedDates();
  }, [journals]);

  // Animate streak when it changes
  useEffect(() => {
    if (currentStreak > 0) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          useNativeDriver: true,
          friction: 3,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
        }),
      ]).start();
    }
  }, [currentStreak]);

  const loadJournals = async () => {
    if (!encryptionKey) return;

    try {
      const loadedJournals = await listJournals(encryptionKey);
      dispatch(setJournals(loadedJournals));

      // Calculate and store longest streak
      const longest = calculateLongestStreak(loadedJournals);
      dispatch(setLongestStreak(longest));
    } catch (error) {
      console.error("Error loading journals:", error);
    }
  };

  const updateMarkedDates = () => {
    const marked = getMarkedDates(journals);
    setMarkedDates(marked);
  };

  const handleDayPress = (day: DateData) => {
    // robust date comparison using date-fns
    const selectedDate = new Date(day.dateString);
    // Normalize to start of day to avoid time issues
    const normalizedSelected = startOfDay(selectedDate);
    const normalizedToday = startOfDay(new Date());

    if (isFuture(normalizedSelected)) {
       Alert.alert(
        "Future Date 📅",
        "You can't write journals for the future yet.\n\n" +
          "🚀 Coming Soon: Todo & Reminders!",
        [{ text: "OK" }]
      );
      return;
    }

    navigation.navigate("JournalList", { selectedDate: day.dateString });
  };

  const handleCreateJournalForToday = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    navigation.navigate("JournalEditor", { selectedDate: today });
  };

  // Get last 3 days of entries for the "Recent Activity" cards
  const getLast3DaysJournals = () => {
    const last3Days = [];
    for (let i = 0; i < 3; i++) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const count = journals.filter(
        (j) => format(new Date(j.date), "yyyy-MM-dd") === dateStr,
      ).length;
      
      last3Days.push({
        dateKey: dateStr,
        dateLabel: format(date, "MMM dd"),
        count,
        isToday: i === 0,
      });
    }
    // Reverse to show oldest (2 days ago) on left, Today on right? 
    // Usually "Today" first (left) is better for LTR languages, or logic in map.
    // Let's keep the order [Today, Yesterday, 2 Days Ago]
    return last3Days;
  };

  const last3DaysData = getLast3DaysJournals();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Streak and Total Count Row */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            {journals.length > 0 ? (
              <View style={styles.statsRow}>
                {/* Streak */}
                <View style={styles.statItem}>
                  <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Text variant="displaySmall" style={[styles.statNumber, {color: theme.colors.primary}]}>
                      {currentStreak}
                    </Text>
                  </Animated.View>
                  <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant}}>
                    🔥 Day Streak
                  </Text>
                </View>

                {/* Vertical Divider */}
                <View style={[styles.vertDivider, {backgroundColor: theme.colors.outlineVariant}]} />

                {/* Total Entries */}
                <Pressable
                  style={styles.statItem}
                  onPress={() => navigation.navigate("JournalList")}
                >
                  <Text variant="displaySmall" style={[styles.statNumber, {color: theme.colors.secondary}]}>
                    {journals.length}
                  </Text>
                  <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant}}>
                    📝 Total Memories
                  </Text>
                </Pressable>
              </View>
            ) : (
              // Empty State
              <Pressable onPress={() => navigation.navigate("JournalEditor")}>
                <View style={styles.emptyStatItem}>
                   <Text variant="titleMedium" style={{textAlign:'center', marginBottom:8}}>
                    Welcome to your Journal!
                   </Text>
                   <Button mode="contained-tonal" icon="pencil-plus">
                    Write Your First Entry
                   </Button>
                </View>
              </Pressable>
            )}
          </Card.Content>
        </Card>

        {/* 2. Recent Activity Bubbles */}
        {journals.length > 0 && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Recent Activity
              </Text>
              <View style={styles.daysRow}>
                {last3DaysData.map((day) => (
                  <View key={day.dateKey} style={styles.dayCard}>
                    <Text variant="bodySmall" style={styles.dayLabel}>
                      {day.isToday ? "Today" : day.dateLabel}
                    </Text>
                    <View style={[
                        styles.checkCircle, 
                        { 
                          backgroundColor: day.count > 0 ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                          borderColor: day.count > 0 ? theme.colors.primary : 'transparent'
                        }
                    ]}>
                      <Text
                        variant="headlineSmall"
                        style={{
                          color: day.count > 0 ? theme.colors.primary : theme.colors.outline,
                          fontWeight: 'bold'
                        }}
                      >
                        {day.count > 0 ? "✓" : "·"}
                      </Text>
                    </View>
                    <Text variant="labelSmall" style={{marginTop:4, opacity: 0.7}}>
                      {day.count} {day.count === 1 ? "entry" : "entries"}
                    </Text>
                  </View>
                ))}
              </View>
              
              {longestStreak > 0 && (
                <View style={{alignItems:'center', marginTop: 12}}>
                   <Chip icon="trophy-variant" compact mode="outlined">
                      Best Streak: {longestStreak} days
                   </Chip>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* 3. Calendar */}
        <Card style={styles.card} mode="elevated">
          <Card.Content style={{paddingHorizontal: 4}}>
            <Calendar
              markingType="dot"
              markedDates={markedDates}
              onDayPress={handleDayPress}
              theme={getCalendarTheme(theme)}
              enableSwipeMonths={true}
            />
          </Card.Content>
        </Card>

        {/* 4. Quick Actions */}
        <View style={styles.actionsRow}>
          <Button
            mode="contained"
            onPress={handleCreateJournalForToday}
            style={[styles.actionButton, { flex: 2 }]} // Make "New" button larger
            icon="plus"
            contentStyle={{height: 48}}
          >
            New Entry
          </Button>
          <Button
            mode="contained-tonal"
            onPress={() => navigation.navigate("JournalList")}
            style={[styles.actionButton, { flex: 1 }]}
            icon="book-open-page-variant"
            contentStyle={{height: 48}}
          >
            View All
          </Button>
        </View>

        {/* 5. Bottom Navigation Links */}
        <View style={styles.bottomNav}>
          <Button
            mode="text"
            onPress={() => navigation.navigate("Export")}
            icon="export-variant"
            compact
          >
            Export Data
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate("Settings")}
            icon="cog-outline"
            compact
          >
            Settings
          </Button>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
  },
  cardTitle: {
    marginBottom: 16,
    textAlign: "center",
    opacity: 0.8,
    fontWeight: '600'
  },
  
  // Stats Row
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    paddingVertical: 8
  },
  vertDivider: {
    width: 1,
    height: '80%',
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontWeight: "bold",
    marginBottom: 0,
    textAlign: "center",
  },
  emptyStatItem: {
    alignItems: 'center',
    paddingVertical: 12
  },

  // Recent Activity
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8
  },
  dayCard: {
    alignItems: "center",
    flex: 1,
  },
  dayLabel: {
    marginBottom: 8,
    opacity: 0.7,
    fontWeight: '500'
  },
  checkCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 12,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
    opacity: 0.8
  },
});

export default HomeScreen;
