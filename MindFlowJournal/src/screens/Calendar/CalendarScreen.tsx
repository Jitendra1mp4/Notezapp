import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Card, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useAppSelector } from '../../stores/hooks';
import { getMarkedDates } from '../../services/streakService';
import { format, parseISO } from 'date-fns';

const CalendarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const journals = useAppSelector(state => state.journals.journals);
  const currentStreak = useAppSelector(state => state.journals.currentStreak);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [markedDates, setMarkedDates] = useState<any>({});

  useEffect(() => {
    // Get marked dates from journals
    const marked = getMarkedDates(journals);
    
    // Add today's date
    const today = format(new Date(), 'yyyy-MM-dd');
    setMarkedDates({
      ...marked,
      [today]: {
        ...marked[today],
        selected: true,
        selectedColor: theme.colors.primary,
      },
    });
  }, [journals, theme]);

  const handleDayPress = (day: DateData) => {
    const dateKey = day.dateString;
    setSelectedDate(dateKey);

    // Find journals for this date
    const journalsForDate = journals.filter(j => {
      const journalDate = format(parseISO(j.date), 'yyyy-MM-dd');
      return journalDate === dateKey;
    });

    if (journalsForDate.length === 1) {
      // Navigate to journal detail
      navigation.navigate('JournalDetail', {
        journalId: journalsForDate[0].id,
      });
    } else if (journalsForDate.length > 1) {
      // Multiple entries - show list (could navigate to filtered list)
      navigation.navigate('JournalList');
    } else {
      // No entry - create new one for this date
      navigation.navigate('JournalEditor');
    }
  };

  const getJournalsCountForDate = (dateString: string): number => {
    return journals.filter(j => {
      const journalDate = format(parseISO(j.date), 'yyyy-MM-dd');
      return journalDate === dateString;
    }).length;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView>
        {/* Streak Stats */}
        <Card style={styles.statsCard}>
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="displaySmall" style={styles.statNumber}>
                  {currentStreak}
                </Text>
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

        {/* Calendar */}
        <Card style={styles.calendarCard}>
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

        {/* Instructions */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.infoTitle}>
              How to use Calendar
            </Text>
            <View style={styles.infoRow}>
              <Chip icon="circle" compact style={styles.infoChip}>
                Blue dot
              </Chip>
              <Text variant="bodyMedium">= Has journal entry</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium">
                • Tap any date to view or create journal entry
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium">
                • Keep your streak alive by writing daily!
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calendarCard: {
    margin: 16,
    marginVertical: 8,
  },
  infoCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  infoTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoChip: {
    marginRight: 8,
  },
});

export default CalendarScreen;
