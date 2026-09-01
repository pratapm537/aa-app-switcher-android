import React, { createContext, useContext } from 'react';

const lightColors = {
  background: '#F5F5F7',
  surface: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  accent: '#FF6B00',
  border: '#E5E5EA',
};

const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  textPrimary: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTertiary: '#8E8E93',
  accent: '#FF6B00',
  border: '#38383A',
};

export const getTypography = (colors: any) => ({
  screenTitle: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500' as const,
  },
  smallLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

const sharedDesignTokens = {
  radius: {
    small: 8,
    medium: 12,
    large: 24,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  }
};

export const LightTheme = {
  colors: lightColors,
  ...sharedDesignTokens,
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
  },
  typography: getTypography(lightColors)
};

export const DarkTheme = {
  colors: darkColors,
  ...sharedDesignTokens,
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 2,
    },
  },
  typography: getTypography(darkColors)
};

export const ThemeContext = createContext<{isDarkMode: boolean, theme: typeof LightTheme, typography: ReturnType<typeof getTypography>}>({
  isDarkMode: false,
  theme: LightTheme,
  typography: LightTheme.typography
});

export const useTheme = () => useContext(ThemeContext);

export const Theme = LightTheme; // Fallback for any static references

