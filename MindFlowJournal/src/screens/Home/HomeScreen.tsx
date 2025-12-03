import { useFocusEffect } from '@react-navigation/native';
import { format, subDays } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculateLongestStreak, getMarkedDates } from '../../services/streakService';
import { listJournals } from '../../services/unifiedStorageService';
import { useAppDispatch, useAppSelector } from '../../stores/hooks';
import { setJournals, setLongestStreak } from '../../stores/slices/journalsSlice';
import { useAuth } from '../../utils/authContext';

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { encryptionKey } = useAuth();

  const currentStreak = useAppSelector(state => state.journals.currentStreak);
  const longestStreak = useAppSelector(state => state.journals.longestStreak);
  const journals = useAppSelector(state => state.journals.journals);

  const [markedDates, setMarkedDates] = useState<any>({});
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadJournals();
  }, [encryptionKey]);

  useFocusEffect(
    React.useCallback(() => {
      updateMarkedDates();
    }, [journals])
  );

  useEffect(() => {
    updateMarkedDates();
  }, [journals]);

  useEffect(() => {
    // Animate streak number on change
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
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
      console.error('Error loading journals:', error);
    }
  };

  const updateMarkedDates = () => {
    const marked = getMarkedDates(journals);
    setMarkedDates(marked);
  };

  const handleDayPress = (day: DateData) => {
    navigation.navigate('DateJournalList', { selectedDate: day.dateString });
  };

  const handleCreateJournalForToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    navigation.navigate('JournalEditor', { selectedDate: today });
  };

  // Get last 3 days of entries
  const getLast3DaysJournals = () => {
    const last3Days = [];
    for (let i = 0; i < 3; i++) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = journals.filter(
        j => format(new Date(j.date), 'yyyy-MM-dd') === dateStr
      ).length;
      last3Days.push({
        dateKey: dateStr,
        date: format(date, 'MMM dd'),
        count,
        isToday: i === 0,
      });
    }
    return last3Days;
  };

  const last3Days = getLast3DaysJournals();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: 16 }]}
      >
        {/* Streak and Journal Count Row */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
               

                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <Text variant="displaySmall" style={styles.statNumber}>
                    {currentStreak}
                  </Text>
                </Animated.View>
                <Text variant="bodyMedium">🔥 Current Streak</Text>
               
              </View>
              <View style={styles.statItem}>
                <Text variant="displaySmall" style={styles.statNumber}>
                  {journals.length}
                </Text>
                <Text variant="bodyMedium">📝 Total Entries</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Recent Activity
            </Text>
            <View style={styles.daysRow}>
              {last3Days.map((day) => (
                <View key={day.dateKey} style={styles.dayCard}>
                  <Text variant="bodySmall" style={styles.dayLabel}>
                    {day.isToday ? 'Today' : day.date}
                  </Text>
                  <Text
                    variant="headlineMedium"
                    style={[
                      styles.dayCount,
                      { color: day.count > 0 ? theme.colors.primary : theme.colors.outline },
                    ]}
                  >
                    {day.count > 0 ? '✓' : '—'}
                  </Text>
                  <Text variant="bodySmall">
                    {day.count} {day.count === 1 ? 'entry' : 'entries'}
                  </Text>
                </View>
              ))}
            </View>
            <Chip icon="trophy" compact style={[styles.bestChip,{marginHorizontal:20}]}>
              Longest Strike: {longestStreak}
            </Chip>
          </Card.Content>
        </Card>

        {/* Calendar View */}
        <Card style={styles.card}>
          <Card.Content>
            <Calendar
              markingType="dot"
              markedDates={markedDates}
              onDayPress={handleDayPress}
              theme={{
                backgroundColor: theme.colors.surface,
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.onSurface,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: theme.colors.onPrimary,
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.onSurface,
                textDisabledColor: theme.colors.outline,
                dotColor: theme.colors.primary,
                selectedDotColor: theme.colors.onPrimary,
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.onSurface,
                indicatorColor: theme.colors.primary,
                textDayFontWeight: '400',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
            />
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.actionsRow}>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('JournalList')}
                style={styles.actionButton}
                icon="book-open-variant"
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
              >
                New Entry Today
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.bottomNav}>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Export')}
            icon="export"
          >
            Export
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Settings')}
            icon="cog"
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
  },
  cardTitle: {
    marginBottom: 16,
    textAlign:"center"
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  bestChip: {
    marginTop: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayCard: {
    alignItems: 'center',
    padding: 12,
  },
  dayLabel: {
    marginBottom: 8,
    opacity: 0.7,
  },
  dayCount: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
});

export default HomeScreen;
