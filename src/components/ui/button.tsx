import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
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
  };

  const labelColor: Record<ButtonVariant, string> = {
    primary: theme.onAccent,
    secondary: theme.text,
    ghost: theme.text,
    danger: theme.negative,
  };

  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive }}
      disabled={isInactive}
      onPress={onPress}
      style={[styles.button, surface[variant], isInactive && styles.inactive, style]}>
      {busy ? (
        <ActivityIndicator color={labelColor[variant]} size="small" />
      ) : (
        <ThemedText style={[styles.label, { color: labelColor[variant] }]}>{label}</ThemedText>
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
    fontWeight: '700',
  },
  inactive: {
    opacity: 0.45,
  },
});
