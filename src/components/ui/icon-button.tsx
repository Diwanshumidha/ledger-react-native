import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Matches the `title` type's line height so it sits level with a screen title. */
const SIZE = 38;

export interface IconButtonProps {
  glyph: string;
  /** Spoken name — the glyph alone says nothing to a screen reader. */
  accessibilityLabel: string;
  onPress: () => void;
  /** `quiet` is outlined, for a secondary action beside a filled one. */
  variant?: 'filled' | 'quiet';
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  glyph,
  accessibilityLabel,
  onPress,
  variant = 'filled',
  style,
}: IconButtonProps) {
  const theme = useTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPress={onPress}
      style={[
        styles.button,
        variant === 'filled'
          ? { backgroundColor: theme.accent }
          : { borderWidth: 1, borderColor: theme.border },
        style,
      ]}>
      <ThemedText
        style={[styles.glyph, { color: variant === 'filled' ? theme.onAccent : theme.text }]}>
        {glyph}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '400',
  },
});
