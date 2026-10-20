import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary'
  | 'secondary'
  | 'ghost'
  /** Destructive but quiet: red text on a pale wash. */
  | 'danger'
  /** Solid red ink, for "You gave". */
  | 'negative'
  /** Solid ledger green, for "You got". */
  | 'positive';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `small` for actions that sit beside a heading rather than below a form. */
  size?: 'regular' | 'small';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  disabled = false,
  busy = false,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const isInactive = disabled || busy;

  const surface: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: theme.accent },
    secondary: { backgroundColor: theme.backgroundElement },
    ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
    danger: { backgroundColor: theme.negativeSoft },
    negative: { backgroundColor: theme.negative },
    positive: { backgroundColor: theme.positive },
  };

  const labelColor: Record<ButtonVariant, string> = {
    primary: theme.onAccent,
    secondary: theme.text,
    ghost: theme.text,
    danger: theme.negative,
    negative: theme.onAccent,
    positive: theme.onAccent,
  };

  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive }}
      disabled={isInactive}
      onPress={onPress}
      style={[
        styles.button,
        size === 'small' && styles.small,
        surface[variant],
        isInactive && styles.inactive,
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={labelColor[variant]} size="small" />
      ) : (
        <ThemedText
          style={[styles.label, size === 'small' && styles.smallLabel, { color: labelColor[variant] }]}>
          {label}
        </ThemedText>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  small: {
    minHeight: 34,
    paddingHorizontal: Spacing.three - 4,
    borderRadius: Radius.small,
  },
  smallLabel: {
    fontSize: 14,
  },
  inactive: {
    opacity: 0.4,
  },
});
