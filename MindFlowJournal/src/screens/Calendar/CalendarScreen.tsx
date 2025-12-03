import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import {
    Button,
    Card,
    Chip,
    Divider,
    IconButton,
    Text,
    useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMarkedDates } from '../../services/streakService';
import { useAppSelector } from '../../stores/hooks';
import { Journal } from '../../types';

const CalendarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();
  const journals = useAppSelector(state => state.journals.journals);
  const currentStreak = useAppSelector(state => state.journals.currentStreak);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateFormatted, setSelectedDateFormatted] = useState<string>('');
  const [markedDates, setMarkedDates] = useState<any>({});
  const [journalsForSelectedDate, setJournalsForSelectedDate] = useState<Journal[]>([]);

  // Initialize on mount
  useEffect(() => {
    initializeCalendar();
  }, []);

  // Refresh when journals change OR when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Calendar screen focused - refreshing data');
      updateMarkedDates();
      if (selectedDate) {
        loadJournalsForDate(selectedDate);
      }
    }, [journals, selectedDate])
  );

  const initializeCalendar = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setSelectedDate(today);
    setSelectedDateFormatted(format(new Date(), 'EEEE, MMMM dd, yyyy'));
    updateMarkedDates();
    loadJournalsForDate(today);
  };

  const updateMarkedDates = () => {
    const marked = getMarkedDates(journals);
    const currentSelected = selectedDate || format(new Date(), 'yyyy-MM-dd');

    console.log('Updating marked dates. Total journals:', journals.length);
    console.log('Marked dates:', Object.keys(marked));

    setMarkedDates({
      ...marked,
      [currentSelected]: {
        ...marked[currentSelected],
        selected: true,
        selectedColor: theme.colors.primary,
        selectedTextColor: theme.colors.onPrimary,
      },
    });
  };

const loadJournalsForDate = (dateKey: string) => {
  const journalsForDate = journals.filter(j => {
    // Use local date comparison
    const date = new Date(j.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const journalDateKey = `${year}-${month}-${day}`;
    
    console.log('Comparing:', journalDateKey, 'with', dateKey);
    return journalDateKey === dateKey;
  });
  console.log(`Journals for ${dateKey}:`, journalsForDate.length);
  setJournalsForSelectedDate(journalsForDate);
};


  const handleDayPress = (day: DateData) => {
    const dateKey = day.dateString;
    console.log('Day pressed:', dateKey);
    
    setSelectedDate(dateKey);
    setSelectedDateFormatted(format(parseISO(dateKey), 'EEEE, MMMM dd, yyyy'));

    // Update marked dates to show new selection
    const marked = getMarkedDates(journals);
    setMarkedDates({
      ...marked,
      [dateKey]: {
        ...marked[dateKey],
        selected: true,
        selectedColor: theme.colors.primary,
        selectedTextColor: theme.colors.onPrimary,
      },
    });

    // Load journals for selected date
    loadJournalsForDate(dateKey);
  };

  const handleCreateJournal = () => {
    console.log('Creating journal for date:', selectedDate);
    navigation.navigate('JournalEditor', { selectedDate });
  };

  const renderJournalItem = ({ item }: { item: Journal }) => {
    const time = format(parseISO(item.date), 'hh:mm a');
    const hasImages = item.images && item.images.length > 0;

    return (
      <Card
        style={styles.journalCard}
        onPress={() => navigation.navigate('JournalDetail', { journalId: item.id })}
      >
        <Card.Content>
          <View style={styles.journalHeader}>
            <View style={styles.journalTitleRow}>
              {item.title && (
                <Text variant="titleMedium" style={styles.journalTitle}>
                  {item.title}
                </Text>
              )}
              <Chip icon="clock-outline" compact style={styles.timeChip}>
                {time}
              </Chip>
            </View>
            <IconButton
              icon="chevron-right"
              size={20}
              onPress={() => navigation.navigate('JournalDetail', { journalId: item.id })}
            />
          </View>
          <Text variant="bodyMedium" numberOfLines={2} style={styles.journalPreview}>
            {item.text}
          </Text>
          {hasImages && (
            <Chip icon="image" compact style={styles.imageIndicator}>
              {item.images!.length} {item.images!.length === 1 ? 'image' : 'images'}
            </Chip>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
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

      {/* Selected Date Section */}
      <View style={styles.selectedDateSection}>
       <View style={styles.selectedDateHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text variant="titleLarge" style={styles.selectedDateTitle}>
            {selectedDateFormatted}
          </Text>
          <Text variant="bodySmall" style={styles.entryCount}>
            {journalsForSelectedDate.length}{' '}
            {journalsForSelectedDate.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
        <Button
          mode="contained"
          icon="plus"
          onPress={handleCreateJournal}
          compact
        >
          New Entry
        </Button>
      </View>


        <Divider style={styles.divider} />

        {/* Journal List for Selected Date */}
        {journalsForSelectedDate.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No entries for this day
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                Tap "New Entry" to start writing
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <FlatList
            data={journalsForSelectedDate}
            renderItem={renderJournalItem}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.journalList, { paddingBottom: 16 }]}
          />
        )}
      </View>
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
    marginHorizontal: 16,
    marginVertical: 8,
  },
  selectedDateSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // CHANGED from 'center' to 'flex-start'
    marginBottom: 12,
  },
  selectedDateTitle: {
    fontWeight: 'bold',
    flex: 1, // ADD THIS - allows text to take available space
    marginRight: 8, // ADD THIS - spacing before button
  },
  entryCount: {
    opacity: 0.7,
    marginTop: 4,
  },
  divider: {
    marginBottom: 12,
  },
  journalList: {
    paddingBottom: 16,
  },
  journalCard: {
    marginBottom: 12,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  journalTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  journalTitle: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  timeChip: {
    marginRight: 8,
  },
  journalPreview: {
    marginBottom: 8,
    opacity: 0.8,
  },
  imageIndicator: {
    alignSelf: 'flex-start',
  },
  emptyCard: {
    marginTop: 24,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginBottom: 8,
    opacity: 0.7,
  },
  emptySubtext: {
    opacity: 0.5,
  },
});

export default CalendarScreen;
