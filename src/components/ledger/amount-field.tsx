import { useEffect } from 'react';
import { Platform, StyleSheet, TextInput } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Ease } from '@/constants/motion';
import { FontFaces, Radius, Spacing } from '@/constants/theme';
import { CurrencySymbol } from '@/domain/money';
import { useTheme } from '@/hooks/use-theme';

/** Approximate advance width of one digit at the 40px bold display size. */
const DIGIT_WIDTH = 24;
const MIN_INPUT_WIDTH = 72;

export interface AmountFieldProps {
  value: string;
  onChangeText: (next: string) => void;
  /** Tint for the figure — usually the direction's tone. */
  tint?: string;
  autoFocus?: boolean;
  /** Increment to shake the field, e.g. on a failed submit. */
  shakeKey?: number;
}

/** Large currency input that shakes when the caller reports a bad value. */
export function AmountField({
  value,
  onChangeText,
  tint,
  autoFocus = false,
  shakeKey = 0,
}: AmountFieldProps) {
  const theme = useTheme();
  const shift = useSharedValue(0);

  useEffect(() => {
    if (shakeKey === 0) {
      return;
    }
    shift.value = withSequence(
      // A slow, small head-shake: enough to point at the field, not to jolt.
      withTiming(-6, { duration: 90, easing: Ease }),
      withTiming(5, { duration: 140, easing: Ease }),
      withTiming(-2, { duration: 140, easing: Ease }),
      withTiming(0, { duration: 160, easing: Ease }),
    );
  }, [shakeKey, shift]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }],
  }));

  const color = tint ?? theme.text;

  // A bare <input> reports a wide intrinsic width at this font size, which
  // would strand the ₹ at the far left of a centred row. Sizing the field to
  // the digits typed keeps the symbol next to the number as it grows.
  const inputWidth = Math.max(MIN_INPUT_WIDTH, value.length * DIGIT_WIDTH + DIGIT_WIDTH);

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <ThemedText face="display" style={[styles.symbol, { color }]}>
        {CurrencySymbol}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={(next) => onChangeText(next.replace(/[^0-9.]/g, ''))}
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        inputMode="decimal"
        autoFocus={autoFocus}
        accessibilityLabel="Amount"
        style={[styles.input, noFocusRing, { color, width: inputWidth }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.large,
    borderWidth: 1,
  },
  symbol: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '500',
  },
  input: {
    fontSize: 40,
    fontFamily: FontFaces.display[700],
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
    // `flexGrow: 0` keeps the field hugging the currency symbol instead of
    // stretching to the full width, which would strand the ₹ on the far left.
    flexGrow: 0,
    flexShrink: 1,
    textAlign: 'center',
    paddingVertical: 0,
  },
});

/** Browsers draw a focus ring on the bare input; the container shows focus instead. */
const noFocusRing = Platform.select({ web: { outline: 'none' }, default: undefined });
