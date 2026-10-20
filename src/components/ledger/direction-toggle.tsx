import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { TimingBase } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import type { SimpleDirection } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

const TRACK_PADDING = 4;

export interface DirectionToggleProps {
  value: SimpleDirection;
  onChange: (next: SimpleDirection) => void;
}

/**
 * "You gave" / "You got" switch. The highlight slides between the two halves
 * and takes on the tone of the selected side.
 */
export function DirectionToggle({ value, onChange }: DirectionToggleProps) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const segmentWidth = Math.max(0, (trackWidth - TRACK_PADDING * 2) / 2);
  const targetIndex = value === 'gave' ? 0 : 1;

  const offset = useDerivedValue(() =>
    withTiming(targetIndex * segmentWidth, TimingBase),
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: offset.value }],
  }));

  const indicatorColor = value === 'gave' ? theme.negative : theme.positive;

  return (
    <View
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      <Animated.View
        style={[styles.indicator, indicatorStyle, { backgroundColor: indicatorColor }]}
      />

      <Segment
        label="You gave"
        hint="they owe you"
        isActive={value === 'gave'}
        onPress={() => onChange('gave')}
      />
      <Segment
        label="You got"
        hint="you received"
        isActive={value === 'got'}
        onPress={() => onChange('got')}
      />
    </View>
  );
}

interface SegmentProps {
  label: string;
  hint: string;
  isActive: boolean;
  onPress: () => void;
}

function Segment({ label, hint, isActive, onPress }: SegmentProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={styles.segment}>
      <ThemedText
        style={[styles.segmentLabel, { color: isActive ? theme.onAccent : theme.text }]}>
        {label}
      </ThemedText>
      <ThemedText
        type="small"
        style={{ color: isActive ? theme.onAccent : theme.textSecondary, opacity: 0.9 }}>
        {hint}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.medium,
    padding: TRACK_PADDING,
  },
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    bottom: TRACK_PADDING,
    borderRadius: Radius.small + 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    gap: 1,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
