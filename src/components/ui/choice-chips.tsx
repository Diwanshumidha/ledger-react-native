import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface Choice<T extends string> {
  value: T;
  label: string;
}

export interface ChoiceChipsProps<T extends string> {
  label?: string;
  choices: Choice<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Wrap instead of scrolling horizontally. */
  wrap?: boolean;
}

/** Single-select chip row, animated on selection. */
export function ChoiceChips<T extends string>({
  label,
  choices,
  value,
  onChange,
  wrap = false,
}: ChoiceChipsProps<T>) {
  const chips = choices.map((choice) => (
    <Chip
      key={choice.value}
      label={choice.label}
      isSelected={choice.value === value}
      onPress={() => onChange(choice.value)}
    />
  ));

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}

      {wrap ? (
        <View style={styles.wrapRow}>{chips}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {chips}
        </ScrollView>
      )}
    </View>
  );
}

interface ChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

function Chip({ label, isSelected, onPress }: ChipProps) {
  const theme = useTheme();
  const progress = useDerivedValue(() => withTiming(isSelected ? 1 : 0, { duration: 170 }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.03 }],
  }));

  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      scaleTo={0.94}>
      <Animated.View
        style={[
          styles.chip,
          animatedStyle,
          {
            borderColor: isSelected ? theme.accent : theme.border,
            backgroundColor: isSelected ? theme.accentSoft : theme.card,
          },
        ]}>
        <ThemedText
          type="smallBold"
          style={{ color: isSelected ? theme.accent : theme.textSecondary }}>
          {label}
        </ThemedText>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  scrollContent: {
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
