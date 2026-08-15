import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AnimatedMoney } from '@/components/ui/animated-money';
import { Radius, Spacing } from '@/constants/theme';
import type { Money } from '@/domain/money';
import { useTheme } from '@/hooks/use-theme';

export interface BalanceSummaryProps {
  /** Total owed to you across all party ledgers. */
  receivable: Money;
  /** Total you owe across all party ledgers. */
  payable: Money;
}

export function BalanceSummary({ receivable, payable }: BalanceSummaryProps) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(320)}
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.half}>
        <ThemedText type="small" themeColor="textSecondary">
          You&apos;ll get
        </ThemedText>
        <AnimatedMoney value={receivable} style={[styles.amount, { color: theme.positive }]} />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.half}>
        <ThemedText type="small" themeColor="textSecondary">
          You&apos;ll give
        </ThemedText>
        <AnimatedMoney value={payable} style={[styles.amount, { color: theme.negative }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.large,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  half: {
    flex: 1,
    gap: Spacing.one,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: Spacing.three,
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
  },
});
