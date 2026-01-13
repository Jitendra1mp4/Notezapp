// src/screens/WeeklyReview/WeeklyReviewScreen.tsx
import { buildWeeklyReviewSummary } from '@/src/services/weeklyReviewService';
import { useAppSelector } from '@/src/stores/hooks';
import { getPromptByCategory } from '@/src/utils/journalPrompts';
import { format } from 'date-fns';
import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const WeeklyReviewScreen: React.FC<any> = ({ navigation }) => {
  const theme = useTheme();
  const journals = useAppSelector((s) => s.journals.journals);

  const summary = useMemo(() => buildWeeklyReviewSummary(journals), [journals]);

  const subtleBorder = theme.colors.outlineVariant;
  const heroBg = theme.dark ? theme.colors.elevation.level3 : theme.colors.primaryContainer;

  const handleStartNow = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const prompt = getPromptByCategory('reflection');
    navigation.navigate('JournalEditor', {
      selectedDate: today,
      promptText: prompt.text,
      promptId: prompt.id,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={[styles.hero, { backgroundColor: heroBg, borderColor: subtleBorder }]}>
          <Card.Content style={{ gap: 10 }}>
            <Text variant="labelLarge" style={{ opacity: 0.75 }}>
              {summary.weekLabel}
            </Text>

            <View style={styles.heroRow}>
              <Text style={styles.bigEmoji}>{summary.topMood?.emoji ?? '✨'}</Text>
              <View style={{ flex: 1 }}>
                <Text variant="headlineSmall" style={{ fontWeight: '900' }}>
                  Your week
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {summary.entryCount > 0
                    ? `You showed up ${summary.daysWritten} days. Keep that momentum.`
                    : `No entries last week. Want to restart gently?`}
                </Text>
              </View>
            </View>

            <View style={styles.chipsRow}>
              <Chip icon="notebook-outline" compact style={{ backgroundColor: theme.colors.elevation.level2 }}>
                {summary.entryCount} entries
              </Chip>
              <Chip icon="calendar-check-outline" compact style={{ backgroundColor: theme.colors.elevation.level2 }}>
                {summary.daysWritten}/7 days
              </Chip>
              {summary.topMood ? (
                <Chip icon="emoticon-outline" compact style={{ backgroundColor: theme.colors.elevation.level2 }}>
                  {summary.topMood.emoji} {summary.topMood.label}
                </Chip>
              ) : null}
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { borderColor: subtleBorder }]}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Mood timeline
            </Text>
            <View style={styles.timelineRow}>
              {summary.days.map((d) => {
                const active = d.entryCount > 0;
                const bg = active ? theme.colors.primaryContainer : theme.colors.elevation.level1;
                const fg = active ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;

                return (
                  <View key={d.dateKey} style={[styles.dayDot, { backgroundColor: bg, borderColor: subtleBorder }]}>
                    <Text style={[styles.dayLabel, { color: fg }]}>{d.label}</Text>
                    <Text style={[styles.dayEmoji, { color: fg }]}>{d.mood?.emoji ?? (active ? '•' : '—')}</Text>
                  </View>
                );
              })}
            </View>
          </Card.Content>
        </Card>

        {summary.highlight?.snippet ? (
          <Card style={[styles.card, { borderColor: subtleBorder }]}>
            <Card.Content style={{ gap: 10 }}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Highlight
              </Text>

              {summary.highlight.title ? (
                <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                  {summary.highlight.title}
                </Text>
              ) : null}

              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {summary.highlight.snippet}
              </Text>

              <Button
                mode="text"
                onPress={() =>
                  navigation.navigate('JournalDetail', {
                    journalId: summary.highlight!.journalId,
                  })
                }
              >
                Open entry
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        {summary.imageUris.length > 0 ? (
          <Card style={[styles.card, { borderColor: subtleBorder }]}>
            <Card.Content style={{ gap: 10 }}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Photos from the week
              </Text>

              <View style={styles.grid}>
                {summary.imageUris.map((uri, idx) => (
                  <Pressable key={`${uri}-${idx}`} style={styles.thumb}>
                    <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
                  </Pressable>
                ))}
              </View>
            </Card.Content>
          </Card>
        ) : null}

        <View style={{ height: 6 }} />

        <Button mode="contained" onPress={handleStartNow} style={styles.cta} contentStyle={{ height: 52 }}>
          Start this week strong
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 96, gap: 12 },

  hero: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  bigEmoji: { fontSize: 36 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },

  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: { fontWeight: '800', marginBottom: 10 },

  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  dayDot: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 11, opacity: 0.9 },
  dayEmoji: { fontSize: 16, marginTop: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: '48%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },

  cta: { borderRadius: 14, marginTop: 4 },
});

export default WeeklyReviewScreen;
