// src/utils/theme.ts
import {
  configureFonts,
  MD3DarkTheme,
  MD3LightTheme,
  MD3Theme
} from 'react-native-paper';

const fontConfig = {
  displayLarge: {
    fontFamily: 'SourceSerif4_400Regular',
    fontSize: 57,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 64,
  },
  displayMedium: {
    fontFamily: 'SourceSerif4_400Regular',
    fontSize: 45,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 52,
  },
  displaySmall: {
    fontFamily: 'SourceSerif4_400Regular',
    fontSize: 36,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 44,
  },

  headlineLarge: {
    fontFamily: 'SourceSerif4_600SemiBold',
    fontSize: 32,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 40,
  },
  headlineMedium: {
    fontFamily: 'SourceSerif4_600SemiBold',
    fontSize: 28,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 36,
  },
  headlineSmall: {
    fontFamily: 'SourceSerif4_600SemiBold',
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 32,
  },

  titleLarge: {
    fontFamily: 'SourceSerif4_600SemiBold',
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: 'SourceSerif4_500Medium',
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: 'SourceSerif4_500Medium',
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },

  bodyLarge: {
    fontFamily: 'SourceSerif4_400Regular',
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'SourceSerif4_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: 'SourceSerif4_400Regular',
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 16,
  },

  labelLarge: {
    fontFamily: 'SourceSerif4_500Medium',
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: 'SourceSerif4_500Medium',
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: 'SourceSerif4_500Medium',
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
};


// CALM GREEN
export const lightTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,

    // Key colors - Sage green primary
    primary: '#3A7D6D',
    onPrimary: '#FFFFFF',
    primaryContainer: '#BFF0E0',
    onPrimaryContainer: '#002019',

    secondary: '#4AA3FF',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#D4E8FF',
    onSecondaryContainer: '#001C38',

    tertiary: '#FFB457',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFECD3',
    onTertiaryContainer: '#2B1700',

    // Neutrals - Warm paper
    background: '#F7F6F2',
    onBackground: '#1A1C1A',
    surface: '#FDFCF8',
    onSurface: '#1A1C1A',
    surfaceVariant: '#DBE5DF',
    onSurfaceVariant: '#3F4945',

    outline: '#6F7971',
    outlineVariant: '#BFC9C3',

    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',

    inverseSurface: '#2E312E',
    inverseOnSurface: '#F0F1EC',
    inversePrimary: '#A3D4C4',

    elevation: {
      level0: 'transparent',
      level1: '#F0F5F3',
      level2: '#EBF2EF',
      level3: '#E5EEEB',
      level4: '#E3ECE9',
      level5: '#DFEAE7',
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,

    primary: '#A3D4C4',
    onPrimary: '#00382D',
    primaryContainer: '#1F5246',
    onPrimaryContainer: '#BFF0E0',

    secondary: '#A3CBFF',
    onSecondary: '#00315C',
    secondaryContainer: '#1E4977',
    onSecondaryContainer: '#D4E8FF',

    tertiary: '#FFCA7F',
    onTertiary: '#462B00',
    tertiaryContainer: '#634000',
    onTertiaryContainer: '#FFECD3',

    background: '#0E110F',
    onBackground: '#E1E3DE',
    surface: '#11140F',
    onSurface: '#E1E3DE',
    surfaceVariant: '#3F4945',
    onSurfaceVariant: '#BFC9C3',

    outline: '#899389',
    outlineVariant: '#3F4945',

    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',

    inverseSurface: '#E1E3DE',
    inverseOnSurface: '#2E312E',
    inversePrimary: '#3A7D6D',

    elevation: {
      level0: 'transparent',
      level1: '#171D1B',
      level2: '#1C2321',
      level3: '#202827',
      level4: '#222A29',
      level5: '#242D2C',
    },
  },
};

// INDIGO
// export const lightTheme = {
//   ...MD3LightTheme,
//   fonts: configureFonts({ config: fontConfig }),
//   colors: {
//     ...MD3LightTheme.colors,

//     // Key colors - Indigo primary
//     primary: '#4C5CFF',
//     onPrimary: '#FFFFFF',
//     primaryContainer: '#E0E1FF',
//     onPrimaryContainer: '#00006E',

//     secondary: '#2BB7A8',
//     onSecondary: '#FFFFFF',
//     secondaryContainer: '#B9F2E9',
//     onSecondaryContainer: '#002019',

//     tertiary: '#FF9E4D',
//     onTertiary: '#FFFFFF',
//     tertiaryContainer: '#FFE3CF',
//     onTertiaryContainer: '#2B1200',

//     background: '#F7F6F9',
//     onBackground: '#1A1B1F',
//     surface: '#FDFCFF',
//     onSurface: '#1A1B1F',
//     surfaceVariant: '#E1E2EC',
//     onSurfaceVariant: '#44464E',

//     outline: '#75777F',
//     outlineVariant: '#C5C6D0',

//     error: '#BA1A1A',
//     onError: '#FFFFFF',
//     errorContainer: '#FFDAD6',
//     onErrorContainer: '#410002',

//     inverseSurface: '#2F3033',
//     inverseOnSurface: '#F2F0F4',
//     inversePrimary: '#BEC2FF',

//     elevation: {
//       level0: 'transparent',
//       level1: '#F4F4FF',
//       level2: '#EDEDFF',
//       level3: '#E6E7FF',
//       level4: '#E3E4FF',
//       level5: '#DFE0FF',
//     },
//   },
// };

// export const darkTheme = {
//   ...MD3DarkTheme,
//   fonts: configureFonts({ config: fontConfig }),
//   colors: {
//     ...MD3DarkTheme.colors,

//     primary: '#BEC2FF',
//     onPrimary: '#0000A1',
//     primaryContainer: '#2331D8',
//     onPrimaryContainer: '#E0E1FF',

//     secondary: '#5DDBCE',
//     onSecondary: '#003731',
//     secondaryContainer: '#00504A',
//     onSecondaryContainer: '#B9F2E9',

//     tertiary: '#FFB784',
//     onTertiary: '#4B2800',
//     tertiaryContainer: '#6B3A00',
//     onTertiaryContainer: '#FFE3CF',

//     background: '#0E0F13',
//     onBackground: '#E3E2E6',
//     surface: '#12131A',
//     onSurface: '#E3E2E6',
//     surfaceVariant: '#44464E',
//     onSurfaceVariant: '#C5C6D0',

//     outline: '#8F9098',
//     outlineVariant: '#44464E',

//     error: '#FFB4AB',
//     onError: '#690005',
//     errorContainer: '#93000A',
//     onErrorContainer: '#FFDAD6',

//     inverseSurface: '#E3E2E6',
//     inverseOnSurface: '#2F3033',
//     inversePrimary: '#4C5CFF',

//     elevation: {
//       level0: 'transparent',
//       level1: '#171A22',
//       level2: '#1B1F2A',
//       level3: '#202532',
//       level4: '#222734',
//       level5: '#242A38',
//     },
//   },
// };

// export const lightTheme = {
//   ...MD3LightTheme,
//   fonts: configureFonts({ config: fontConfig }),
//   colors: {
//     ...MD3LightTheme.colors,

//     // Key colors - Plum primary
//     primary: '#7B5CFF',
//     onPrimary: '#FFFFFF',
//     primaryContainer: '#E8DEFF',
//     onPrimaryContainer: '#23005C',

//     secondary: '#FF6FAE',
//     onSecondary: '#FFFFFF',
//     secondaryContainer: '#FFD9E6',
//     onSecondaryContainer: '#3E0020',

//     tertiary: '#42C7B7',
//     onTertiary: '#FFFFFF',
//     tertiaryContainer: '#B8F3E8',
//     onTertiaryContainer: '#00201C',

//     background: '#F9F7FA',
//     onBackground: '#1C1B1F',
//     surface: '#FFFBFF',
//     onSurface: '#1C1B1F',
//     surfaceVariant: '#E7E0EC',
//     onSurfaceVariant: '#49454E',

//     outline: '#7A757F',
//     outlineVariant: '#CBC4CF',

//     error: '#BA1A1A',
//     onError: '#FFFFFF',
//     errorContainer: '#FFDAD6',
//     onErrorContainer: '#410002',

//     inverseSurface: '#313033',
//     inverseOnSurface: '#F4EFF4',
//     inversePrimary: '#CFBDFF',

//     elevation: {
//       level0: 'transparent',
//       level1: '#F6F2FF',
//       level2: '#F0ECFF',
//       level3: '#EAE6FF',
//       level4: '#E7E3FF',
//       level5: '#E3DFFF',
//     },
//   },
// };

// export const darkTheme = {
//   ...MD3DarkTheme,
//   fonts: configureFonts({ config: fontConfig }),
//   colors: {
//     ...MD3DarkTheme.colors,

//     primary: '#CFBDFF',
//     onPrimary: '#3E0092',
//     primaryContainer: '#5A39D7',
//     onPrimaryContainer: '#E8DEFF',

//     secondary: '#FFB0D5',
//     onSecondary: '#5E1037',
//     secondaryContainer: '#7A2C4F',
//     onSecondaryContainer: '#FFD9E6',

//     tertiary: '#67EBD9',
//     onTertiary: '#003731',
//     tertiaryContainer: '#00504A',
//     onTertiaryContainer: '#B8F3E8',

//     background: '#0E0D11',
//     onBackground: '#E6E1E9',
//     surface: '#12111A',
//     onSurface: '#E6E1E9',
//     surfaceVariant: '#49454E',
//     onSurfaceVariant: '#CBC4CF',

//     outline: '#958F99',
//     outlineVariant: '#49454E',

//     error: '#FFB4AB',
//     onError: '#690005',
//     errorContainer: '#93000A',
//     onErrorContainer: '#FFDAD6',

//     inverseSurface: '#E6E1E9',
//     inverseOnSurface: '#313033',
//     inversePrimary: '#7B5CFF',

//     elevation: {
//       level0: 'transparent',
//       level1: '#1A171F',
//       level2: '#1E1B26',
//       level3: '#23202D',
//       level4: '#25222F',
//       level5: '#282533',
//     },
//   },
// };

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

  const calenderBackground = theme.colors.elevation.level1 ;
  // const calenderBackground = theme.colors.surface ;

  return {
    // Backgrounds
    backgroundColor: calenderBackground,
    calendarBackground: calenderBackground,

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
