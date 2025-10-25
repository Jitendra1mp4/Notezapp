import React, { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { useAppSelector } from '../../stores/hooks';
import { lightTheme, darkTheme } from '../../utils/theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const themePreference = useAppSelector(state => state.settings.theme);

  const theme = useMemo(() => {
    if (themePreference === 'auto') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themePreference === 'dark' ? darkTheme : lightTheme;
  }, [themePreference, systemColorScheme]);

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
};

