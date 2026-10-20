import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AnimatedMoney } from '@/components/ui/animated-money';
import { DoubleRule } from '@/components/ui/double-rule';
import { fadeIn } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import type { Money } from '@/domain/money';
import { useTheme } from '@/hooks/use-theme';

export interface BalanceSummaryProps {
  /** Total owed to you across all party ledgers. */
  receivable: Money;
  /** Total you owe across all party ledgers. */
  payable: Money;
}

/** The two closing totals of the book, each ruled off underneath. */
export function BalanceSummary({ receivable, payable }: BalanceSummaryProps) {
  const theme = useTheme();

  return (
    <Animated.View entering={fadeIn(80)} style={styles.container}>
      <Total label="You’ll get" value={receivable} color={theme.positive} />
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <Total label="You’ll give" value={payable} color={theme.negative} />
    </Animated.View>
  );
}

interface TotalProps {
  label: string;
  value: Money;
  color: string;
}

function Total({ label, value, color }: TotalProps) {
  return (
    <View style={styles.total}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <AnimatedMoney
        value={value}
        face="display"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.amount, { color }]}
      />
      <DoubleRule color={color} delay={360} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: Spacing.two,
  },
  total: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.four,
  },
  amount: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
});
