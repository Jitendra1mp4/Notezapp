// src/components/journal/MoodSelector.tsx
/**
 * Mood Selector Component with Emoji Support
 * Provides an intuitive UI for users to track their emotional state
 * Psychology-backed mood categories for effective journaling
 */
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export interface MoodOption {
  emoji: string;
  label: string;
  value: string;
}

// Psychology-backed mood categories
export const MOOD_OPTIONS: MoodOption[] = [
  { emoji: '🤗', label: 'Grateful', value: 'grateful' },
  { emoji: '😊', label: 'Happy', value: 'happy' },
  { emoji: '😃', label: 'Excited', value: 'excited' },
  { emoji: '🥰', label: 'Loved', value: 'loved' },
  { emoji: '😎', label: 'Confident', value: 'confident' },
  { emoji: '😌', label: 'Calm', value: 'calm' },
  { emoji: '😢', label: 'Sad', value: 'sad' },
  { emoji: '😴', label: 'Tired', value: 'tired' },
  { emoji: '😠', label: 'Angry', value: 'angry' },
  { emoji: '😰', label: 'Anxious', value: 'anxious' },
  { emoji: '😔', label: 'Lonely', value: 'lonely' },
  { emoji: '😕', label: 'Confused', value: 'confused' },
  { emoji: '😤', label: 'Frustrated', value: 'frustrated' },
  { emoji: '🤔', label: 'Thoughtful', value: 'thoughtful' },
  { emoji: '😱', label: 'Scared', value: 'scared' },
  { emoji: '😶', label: `Don't know`, value: 'dontKnow' },
];
interface MoodSelectorProps {
  selectedMood?: string;
  onSelectMood: (mood: string) => void;
  label?: string;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  selectedMood,
  onSelectMood,
  label = 'How are you feeling?',
}) => {
  const theme = useTheme();

  const getMoodEmoji = (value: string): string => {
    return MOOD_OPTIONS.find(m => m.value === value)?.emoji || '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text variant="titleSmall" style={[styles.label, { color: theme.colors.onSurface }]}>
          {label}
        </Text>
        {selectedMood && (
          <TouchableOpacity
            onPress={() => onSelectMood('')}
            style={[styles.clearButton, { backgroundColor: theme.colors.errorContainer }]}
          >
            <Text style={[styles.clearText, { color: theme.colors.onErrorContainer }]}>
              Clear
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {MOOD_OPTIONS.map((mood) => {
          const isSelected = selectedMood === mood.value;
          return (
            <TouchableOpacity
              key={mood.value}
              onPress={() => onSelectMood(isSelected ? '' : mood.value)}
              style={[
                styles.moodButton,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primaryContainer
                    : theme.colors.surfaceVariant,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                },
                isSelected && styles.moodButtonSelected,
              ]}
              // activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{mood.emoji}</Text>
              <Text
                variant="labelSmall"
                style={[
                  styles.moodLabel,
                  {
                    color: isSelected
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurfaceVariant,
                  },
                ]}
              >
                {mood.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected Mood Display */}
      {/* {selectedMood && (
        <View
          style={[
            styles.selectedMoodBadge,
            { backgroundColor: theme.colors.secondaryContainer },
          ]}
        >
          <Text style={styles.selectedMoodEmoji}>{getMoodEmoji(selectedMood)}</Text>
          <Text
            variant="labelMedium"
            style={[styles.selectedMoodText, { color: theme.colors.onSecondaryContainer }]}
          >
            Feeling {MOOD_OPTIONS.find(m => m.value === selectedMood)?.label}
          </Text>
        </View>
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingVertical: 4,
  },
  moodButton: {
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius:5,
    marginHorizontal:3,
    alignItems: 'center',
    justifyContent: 'center',
   flexDirection:'row',
    
  },
  moodButtonSelected: {
    // for now nothing, can be added later if needed.
  },
  emoji: {
    fontSize: 15,
    // marginBottom: 1,
  },
  moodLabel: {
    fontWeight: '300',
    fontSize:11,    
    // fontStyle:'italic'
  },
  selectedMoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // marginTop: 12,
    // paddingVertical: 10,
    // paddingHorizontal: 16,
    // borderRadius: 20,
    alignSelf: 'center',
  },
  selectedMoodEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  selectedMoodText: {
    fontWeight: '600',
  },
});

