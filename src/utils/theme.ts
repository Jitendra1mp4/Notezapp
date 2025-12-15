// src/utils/theme.ts
import {
  configureFonts,
  MD3DarkTheme,
  MD3LightTheme,
  MD3Theme,
} from 'react-native-paper';

const fontConfig = {
  displayLarge: {
    fontFamily: 'System',
    fontSize: 57,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 64,
  },
};

export const lightTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0083eeff',
    secondary: '#03DAC6',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    error: '#B00020',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#86e0fcff',
    secondary: '#03DAC6',
    background: '#121212',
    surface: '#1E1E1E',
    error: '#CF6679',
  },
};

/**
 * Generates dynamic, theme-aware colors for Journal Cards.
 * Light Mode: Pastel colors.
 * Dark Mode: Deep, desaturated tones for better text contrast.
 */
export const getJournalCardStyle = (theme: MD3Theme, index: number) => {
  const isDark = theme.dark;

  const lightColors = [
    "#c5ffe4", // Mint
    "#fff3ce", // Cream
    "#ffcff3", // Pink
    "#d1e0ff", // Blue
    "#ffd3d3", // Red
  ];

  const darkColors = [
    "#1c3b2f", // Deep Green
    "#3b3215", // Deep Gold
    "#3b1a2e", // Deep Purple
    "#1a2642", // Deep Blue
    "#3b1a1a", // Deep Red
  ];

  const backgroundColor = isDark
    ? darkColors[index % darkColors.length]
    : lightColors[index % lightColors.length];

  return {
    marginBottom:20,
    backgroundColor,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
  };
};

/**
 * Generates the configuration object for react-native-calendars
 * ensuring visibility in both Light and Dark modes.
 */
export const getCalendarTheme = (theme: MD3Theme) => {
  return {
    // Backgrounds
    backgroundColor: theme.colors.surface,
    calendarBackground: theme.colors.surface,

    // Text Colors
    textSectionTitleColor: theme.colors.onSurfaceVariant,
    dayTextColor: theme.colors.onSurface,
    todayTextColor: theme.colors.primary,
    monthTextColor: theme.colors.onSurface,
    textDisabledColor: theme.colors.onSurfaceDisabled,

    // Selection States
    selectedDayBackgroundColor: theme.colors.primary,
    selectedDayTextColor: theme.colors.onPrimary,

    // Dots and Indicators
    dotColor: theme.colors.primary,
    selectedDotColor: theme.colors.onPrimary,
    arrowColor: theme.colors.primary,
    indicatorColor: theme.colors.primary,
    
    // Fonts (Optional consistency)
    textDayFontWeight: '400' as const,
    textMonthFontWeight: 'bold' as const,
    textDayHeaderFontWeight: '600' as const,
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
  };
};
