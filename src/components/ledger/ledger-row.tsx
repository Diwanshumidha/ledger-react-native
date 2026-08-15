import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { describeAccountBalance, describePartyBalance } from '@/domain/accounting';
import { formatDateShort } from '@/domain/date';
import { formatMoney, type Money } from '@/domain/money';
import type { Account } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

export interface LedgerRowProps {
  account: Account;
  balance: Money;
  lastActivityDate?: string;
  onPress: () => void;
}

export function LedgerRow({ account, balance, lastActivityDate, onPress }: LedgerRowProps) {
  const theme = useTheme();

  const summary =
    account.role === 'party'
      ? describePartyBalance(balance)
      : describeAccountBalance(account, balance);

  const toneColor =
    summary.tone === 'positive'
      ? theme.positive
      : summary.tone === 'negative'
        ? theme.negative
        : theme.textSecondary;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, ${summary.label} ${formatMoney(summary.amount)}`}
      onPress={onPress}
      style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Avatar name={account.name} hue={account.hue} />

      <View style={styles.identity}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {account.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {lastActivityDate ? formatDateShort(lastActivityDate) : 'No entries yet'}
        </ThemedText>
      </View>

      <View style={styles.amountColumn}>
        <ThemedText style={[styles.amount, { color: toneColor }]}>
          {formatMoney(summary.amount)}
        </ThemedText>
        <ThemedText type="small" style={{ color: toneColor }}>
          {summary.label}
        </ThemedText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  identity: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  amountColumn: {
    alignItems: 'flex-end',
    gap: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
});
