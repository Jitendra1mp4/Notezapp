// src/components/home/WeeklyReviewStory.tsx
import { WeeklyReviewSummary } from '@/src/services/weeklyReviewService';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type Props = {
  summary: WeeklyReviewSummary;
  isNew?: boolean;
  onPress: () => void;
};

export const WeeklyReviewStory: React.FC<Props> = ({ summary, isNew, onPress }) => {
  const theme = useTheme();

  const ringColor =
    summary.entryCount > 0 ? theme.colors.primary : theme.colors.outlineVariant;

  const bg =
    theme.dark ? theme.colors.elevation.level2 : theme.colors.surface;

  const subtitle =
    summary.entryCount > 0
      ? `${summary.weekLabel} • ${summary.daysWritten}/7 days`
      : `${summary.weekLabel} • Tap to start a rhythm`;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: bg, borderColor: theme.colors.outlineVariant },
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.ring, { borderColor: ringColor }]}>
          <View
            style={[
              styles.inner,
              { backgroundColor: theme.colors.elevation.level1 },
            ]}
          >
            <Text style={styles.emoji}>
              {summary.topMood?.emoji ?? (summary.entryCount > 0 ? '✨' : '🗓️')}
            </Text>
          </View>
        </View>

        {isNew ? (
          <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
        ) : null}
      </View>

      <View style={styles.right}>
        <Text variant="titleMedium" style={styles.title}>
          Weekly Review
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  left: { position: 'relative' },
  ring: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 18 },
  dot: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  right: { flex: 1 },
  title: { fontWeight: '800' },
});
