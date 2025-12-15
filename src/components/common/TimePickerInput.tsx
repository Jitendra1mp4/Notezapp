// src/components/common/TimePickerInput.tsx
/**
 * Cross-platform Time Picker Input
 * - Native: Uses @react-native-community/datetimepicker
 * - Web: Uses HTML5 time input with nice styling
 */

import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

interface TimePickerInputProps {
  value: string; // Format: "HH:mm" (e.g., "20:00")
  onChangeTime: (time: string) => void;
  label?: string;
  disabled?: boolean;
}

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value,
  onChangeTime,
  label = 'Time',
  disabled = false,
}) => {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  // Parse time string to Date object
  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 20); // Default to 20:00 if invalid
    date.setMinutes(minutes || 0);
    date.setSeconds(0);
    return date;
  };

  // Format Date to HH:mm string
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Format display with AM/PM
  const formatDisplayTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert to 12-hour format
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    // Android: dismiss picker on any interaction
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate && event.type !== 'dismissed') {
      const timeString = formatTime(selectedDate);
      onChangeTime(timeString);
    }
  };

  // ============ NATIVE (iOS/Android) ============
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        {label && <Text variant="bodyMedium" style={styles.label}>{label}</Text>}
        
        <Pressable
          onPress={() => !disabled && setShowPicker(true)}
          disabled={disabled}
          style={[
            styles.nativeButton,
            { 
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outline,
            },
            disabled && styles.disabled,
          ]}
        >
          <IconButton icon="clock-outline" size={20} />
          <Text 
            variant="bodyLarge" 
            style={[
              styles.timeText,
              disabled && styles.disabledText,
            ]}
          >
            {formatDisplayTime(value)}
          </Text>
          <IconButton icon="chevron-down" size={20} />
        </Pressable>

        {showPicker && (
          <DateTimePicker
            value={parseTime(value)}
            mode="time"
            is24Hour={false} // Use 12-hour format with AM/PM
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
      </View>
    );
  }

  // ============ WEB ============
  return (
    <View style={styles.container}>
      {label && <Text variant="bodyMedium" style={styles.label}>{label}</Text>}
      
      <View
        style={[
          styles.webInputContainer,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outline,
          },
          disabled && styles.disabled,
        ]}
      >
        <IconButton icon="clock-outline" size={20} />
        
        <input
          type="time"
          value={value}
          onChange={(e) => onChangeTime(e.target.value)}
          disabled={disabled}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: 16,
            fontFamily: theme.fonts.bodyLarge.fontFamily,
            color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.onSurface,
            padding: '8px',
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    marginBottom: 8,
    marginLeft: 4,
  },
  nativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 56,
  },
  timeText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  webInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    minHeight: 56,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.6,
  },
});
