import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { Card, Text, Button, useTheme, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../stores/hooks';
import { setJournals, setLongestStreak } from '../../stores/slices/journalsSlice'; // UPDATED
import { useAuth } from '../../utils/authContext';
import { listJournals } from '../../services/storageService';
import { calculateLongestStreak } from '../../services/streakService'; // MAKE SURE THIS EXISTS
import { format, subDays } from 'date-fns';

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { encryptionKey } = useAuth();

  const currentStreak = useAppSelector(state => state.journals.currentStreak);
  const longestStreak = useAppSelector(state => state.journals.longestStreak); // GET FROM REDUX
  const journals = useAppSelector(state => state.journals.journals);

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadJournals();
  }, [encryptionKey]);

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
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Streak Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium">🔥 Current Streak</Text>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Text variant="displayLarge" style={styles.streakNumber}>
                {currentStreak}
              </Text>
            </Animated.View>
            <Text variant="bodyLarge">days in a row</Text>
            <View style={styles.streakInfo}>
              <Chip icon="trophy" compact>
                Best: {longestStreak} days
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Last 3 Days Status */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Recent Activity
            </Text>
            <View style={styles.daysRow}>
              {last3Days.map((day, index) => (
                <View key={index} style={styles.dayCard}>
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
          </Card.Content>
        </Card>

        {/* Stats Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Your Journals
            </Text>
            <Text variant="displayMedium" style={styles.statNumber}>
              {journals.length}
            </Text>
            <Text variant="bodyMedium">total entries</Text>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Quick Actions
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('JournalEditor')}
              style={styles.actionButton}
              icon="pencil"
            >
              New Journal Entry
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('JournalList')}
              style={styles.actionButton}
              icon="book-open-variant"
            >
              View All Journals
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Calendar')}
              style={styles.actionButton}
              icon="calendar"
            >
              Calendar View
            </Button>
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
  },
  streakNumber: {
    textAlign: 'center',
    marginVertical: 8,
    fontWeight: 'bold',
  },
  streakInfo: {
    marginTop: 12,
    alignItems: 'center',
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
  statNumber: {
    textAlign: 'center',
    fontSize: 48,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
});

export default HomeScreen;
