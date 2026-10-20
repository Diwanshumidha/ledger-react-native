import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { riseIn } from '@/constants/motion';

export interface DoubleRuleProps {
  color: string;
  style?: StyleProp<ViewStyle>;
  /** Delay before the rule draws in, to land after the figure above it. */
  delay?: number;
}

/**
 * The two lines a bookkeeper draws under a final total. Used only under
 * closing balances, so it always means "this figure is the bottom line".
 */
export function DoubleRule({ color, style, delay = 0 }: DoubleRuleProps) {
  return (
    <Animated.View entering={riseIn(delay, 0)} style={[styles.container, style]}>
      <View style={[styles.line, { backgroundColor: color }]} />
      <View style={[styles.line, { backgroundColor: color }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  line: {
    height: 1.5,
  },
});
