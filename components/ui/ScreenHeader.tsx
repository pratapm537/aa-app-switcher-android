import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/theme';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  onHamburger?: () => void;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, onHamburger }) => {
  const { theme, typography } = useTheme();

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    }}>
      {onHamburger && !onBack && (
        <TouchableOpacity style={{
          marginRight: theme.spacing.md,
          padding: theme.spacing.xs,
          justifyContent: 'center',
          alignItems: 'center',
          minWidth: 48,
          minHeight: 48,
        }} onPress={onHamburger}>
          <Text style={{
            fontSize: 28,
            color: theme.colors.textPrimary,
            fontWeight: '300'
          }}>☰</Text>
        </TouchableOpacity>
      )}
      {onBack && (
        <TouchableOpacity style={{
          marginRight: theme.spacing.md,
          padding: theme.spacing.xs,
          minWidth: 48,
          minHeight: 48,
          justifyContent: 'center',
          alignItems: 'center',
        }} onPress={onBack}>
          <Text style={{
            fontSize: 24,
            color: theme.colors.textPrimary,
          }}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={{
        ...typography.screenTitle,
        marginBottom: 0,
      }}>{title}</Text>
    </View>
  );
};
