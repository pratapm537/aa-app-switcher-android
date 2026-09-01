import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../theme/theme';

interface OpacitySliderProps {
  value: number; // 0.1 to 1.0
  onValueChange: (value: number) => void;
}

export const OpacitySlider: React.FC<OpacitySliderProps> = ({ value, onValueChange }) => {
  const { theme, typography } = useTheme();
  const containerRef = useRef<View>(null);
  const containerWidth = useRef(0);
  const trackPageX = useRef(0);

  const calculateValue = (x: number) => {
    if (containerWidth.current === 0) return value;
    const boundedX = Math.max(0, Math.min(x, containerWidth.current));
    const rawPercentage = boundedX / containerWidth.current;
    
    // Map 0 -> 0.1 (10%), 1 -> 1.0 (100%)
    const mappedValue = 0.1 + (0.9 * rawPercentage);
    return Math.max(0.1, Math.min(mappedValue, 1.0));
  };

  const updatePosition = () => {
    containerRef.current?.measure((x, y, w, h, pageX, pageY) => {
      containerWidth.current = w;
      trackPageX.current = pageX;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        updatePosition();
        // Fallback if measurement failed or wasn't ready
        const x = gestureState.x0 - trackPageX.current;
        onValueChange(calculateValue(x));
      },
      onPanResponderMove: (evt, gestureState) => {
        const x = gestureState.moveX - trackPageX.current;
        onValueChange(calculateValue(x));
      },
      onPanResponderRelease: (evt, gestureState) => {
        const x = gestureState.moveX - trackPageX.current;
        onValueChange(calculateValue(x));
      },
    })
  ).current;

  // Visual percentage for rendering (value is 0.1 to 1.0)
  const renderPercentage = ((value - 0.1) / 0.9) * 100;

  return (
    <View style={{ paddingVertical: theme.spacing.md }}>
      <View 
        ref={containerRef}
        style={{
          height: 48,
          justifyContent: 'center',
          position: 'relative',
          marginBottom: theme.spacing.xs,
        }} 
        onLayout={(e: LayoutChangeEvent) => {
          containerWidth.current = e.nativeEvent.layout.width;
          updatePosition();
        }}
        {...panResponder.panHandlers}
      >
        <View style={{
          height: 12,
          backgroundColor: '#FFD8B3',
          borderRadius: theme.radius.full,
          width: '100%',
        }} />
        <View style={{
          height: 12,
          backgroundColor: theme.colors.accent,
          borderRadius: theme.radius.full,
          position: 'absolute',
          left: 0,
          width: `${renderPercentage}%`
        }} />
        <View style={{
          width: 24,
          height: 24,
          backgroundColor: theme.colors.accent,
          borderRadius: theme.radius.full,
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
          ...theme.shadow.card,
          elevation: 3,
          left: `${renderPercentage}%`, 
          transform: [{ translateX: -12 }]
        }}>
            <View style={{
              width: 12,
              height: 12,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.full,
            }} />
        </View>
      </View>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.xs,
      }}>
        <Text style={{ ...typography.smallLabel }}>10%</Text>
        <Text style={{ ...typography.smallLabel }}>50%</Text>
        <Text style={{ ...typography.smallLabel }}>100%</Text>
      </View>
    </View>
  );
};
