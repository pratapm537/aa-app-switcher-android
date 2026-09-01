import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/theme';

export interface SegmentedControlOption<T> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T> {
  options: SegmentedControlOption<T>[];
  selectedValue: T;
  onValueChange: (value: T) => void;
}

export function SegmentedControl<T>({ options, selectedValue, onValueChange }: SegmentedControlProps<T>) {
  const { theme, typography } = useTheme();

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: theme.radius.medium,
      padding: theme.spacing.xs,
    }}>
      {options.map((option, index) => {
        const isSelected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={index}
            style={[
              {
                flex: 1,
                paddingVertical: theme.spacing.md,
                alignItems: 'center',
                borderRadius: theme.radius.small,
              },
              isSelected && {
                backgroundColor: theme.colors.surface,
                ...theme.shadow.card,
              }
            ]}
            onPress={() => onValueChange(option.value)}
            activeOpacity={0.8}
          >
            <Text style={[
              { ...typography.smallLabel, fontWeight: '600' },
              isSelected && { color: theme.colors.textPrimary }
            ]}>
              {option.label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
