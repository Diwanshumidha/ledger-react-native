import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Ease } from '@/constants/motion';
import { FontFaces, Radius, Spacing } from '@/constants/theme';
import {
  CurrencySymbol,
  evaluateAmount,
  formatMoney,
  hasArithmetic,
  type Money,
} from '@/domain/money';
import { useTheme } from '@/hooks/use-theme';
import { tick } from '@/utils/haptics';
import { ChoiceChips } from '../ui/choice-chips';

/** Approximate advance width of one digit at the 40px bold display size. */
const DIGIT_WIDTH = 24;
const MIN_INPUT_WIDTH = 72;

/** The calculator keys, shown as a person would write them. */
const OPERATORS = [
  { glyph: '+', label: 'Plus' },
  { glyph: '−', label: 'Minus' },
  { glyph: '×', label: 'Times' },
  { glyph: '÷', label: 'Divided by' },
] as const;
const TRAILING_OPERATOR = /[+−×÷]$/;

/** Typed operators ("*", "/", "-", "x") shown in their written form. */
function tidy(text: string): string {
  return (
    text
      .replace(/[^0-9.+\-*/×÷−xX]/g, '')
      .replace(/\*|x|X/g, '×')
      .replace(/\//g, '÷')
      .replace(/-/g, '−')
      // Two operators in a row: the later one wins.
      .replace(/[+−×÷]+(?=[+−×÷])/g, '')
  );
}

/** A worked-out total as editable text: "650", or "650.50" with paise. */
function toInputText(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}

export interface AmountFieldProps {
  value: string;
  onChangeText: (next: string) => void;
  /** Tint for the figure — usually the direction's tone. */
  tint?: string;
  autoFocus?: boolean;
  /** Increment to shake the field, e.g. on a failed submit. */
  shakeKey?: number;
  /** Amounts offered as one-tap chips, usually the ones used most here. */
  suggestions?: Money[];
}

/**
 * Large currency input that doubles as a calculator: "450+120+80" shows
 * "= ₹650" as it is typed, and Enter settles it to 650. The value handed
 * back may still be a sum; `parseMoney` works it out when it is saved. It shakes when
 * the caller reports a bad value.
 */
export function AmountField({
  value,
  onChangeText,
  tint,
  autoFocus = false,
  shakeKey = 0,
  suggestions = [],
}: AmountFieldProps) {
  const theme = useTheme();
  const shift = useSharedValue(0);
  const input = useRef<TextInput>(null);

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
  const isSum = hasArithmetic(value);
  const result = isSum ? evaluateAmount(value) : null;

  const appendOperator = (glyph: string) => {
    // A number has to come first; a second operator replaces the first.
    if (value.length === 0) {
      return;
    }
    tick();
    onChangeText(value.replace(TRAILING_OPERATOR, '') + glyph);
    input.current?.focus();
  };

  // Enter turns the sum into its total. Leaving the field does not: tapping
  // an operator key briefly takes focus on some platforms, and the sum stays
  // readable with its total beside it until the entry is saved.
  const settle = () => {
    if (isSum && result !== null && result > 0) {
      onChangeText(toInputText(result));
    }
  };

  // A bare <input> reports a wide intrinsic width at this font size, which
  // would strand the ₹ at the far left of a centred row. Sizing the field to
  // the digits typed keeps the symbol next to the number as it grows.
  const inputWidth = Math.max(MIN_INPUT_WIDTH, value.length * DIGIT_WIDTH + DIGIT_WIDTH);

  return (
    <View style={styles.wrapper}>
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
          ref={input}
          value={value}
          onChangeText={(next) => onChangeText(tidy(next))}
          onSubmitEditing={settle}
          placeholder="0"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          inputMode="decimal"
          autoFocus={autoFocus}
          accessibilityLabel="Amount"
          accessibilityHint="You can type a sum, like 450 plus 120"
          style={[styles.input, noFocusRing, { color, width: inputWidth }]}
        />
      </Animated.View>

      <View style={styles.calculator}>
        <View style={styles.keys}>
        {suggestions.length > 0 ? (
            <ChoiceChips
              choices={suggestions.map((amount) => ({
                value: toInputText(amount),
                label: formatMoney(amount),
              }))}
              value={value}
              onChange={(next) => {
                tick();
                onChangeText(next);
              }}
            />
      ) : null}
        </View>

        {isSum ? (
          <ThemedText
            type="figure"
            accessibilityLiveRegion="polite"
            style={[
              styles.result,
              { color: result !== null && result > 0 ? color : theme.negative },
            ]}>
            {result === null
              ? 'Check the sum'
              : result > 0
                ? `= ${formatMoney(result)}`
                : `= ${formatMoney(result)}, must be more than 0`}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
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
  calculator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  keys: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  key: {
    width: 40,
    height: 36,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGlyph: {
    fontSize: 20,
    lineHeight: 24,
  },
  result: {
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
  },
});

/** Browsers draw a focus ring on the bare input; the container shows focus instead. */
const noFocusRing = Platform.select({ web: { outline: 'none' }, default: undefined });
