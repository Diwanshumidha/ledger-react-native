import { Platform, StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface FabProps {
  label: string;
  onPress: () => void;
  /** Extra lift so the button clears the tab bar. */
  offset?: number;
}

export function Fab({ label, onPress, offset = BottomTabInset }: FabProps) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={ZoomIn.delay(180).springify().damping(14)}
      style={[styles.wrapper, { bottom: offset + Spacing.three }]}
      pointerEvents="box-none">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        scaleTo={0.94}
        style={[styles.fab, { backgroundColor: theme.accent, shadowColor: theme.accent }]}>
        <ThemedText style={[styles.plus, { color: theme.onAccent }]}>+</ThemedText>
        <ThemedText style={[styles.label, { color: theme.onAccent }]}>{label}</ThemedText>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: Spacing.three,
    left: Spacing.three,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    height: 54,
    borderRadius: Radius.pill,
    ...Platform.select({
      web: { boxShadow: '0 10px 30px rgba(47, 107, 255, 0.35)' },
      default: {
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      },
    }),
  },
  plus: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
