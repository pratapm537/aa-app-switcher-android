import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/theme';

interface SettingsCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  description,
  icon,
  rightElement,
  onPress,
  style,
  children
}) => {
  const { theme, typography } = useTheme();
  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer style={[
      {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.large,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadow.card,
      }, style
    ]} onPress={onPress} activeOpacity={0.7}>
      {(title || icon || rightElement) && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icon && (
            <View style={{
              marginRight: theme.spacing.md,
              width: 40, height: 40,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.background,
              alignItems: 'center', justifyContent: 'center'
            }}>
              {icon}
            </View>
          )}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ ...typography.cardTitle }}>{title}</Text>
            {description && <Text style={{ ...typography.description }}>{description}</Text>}
          </View>
          {rightElement && (
            <View style={{ marginLeft: theme.spacing.md }}>
              {rightElement}
            </View>
          )}
        </View>
      )}
      {children && <View style={{ marginTop: theme.spacing.lg }}>{children}</View>}
    </CardContainer>
  );
};
