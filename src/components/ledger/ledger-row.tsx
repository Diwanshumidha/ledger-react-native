import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Spacing } from '@/constants/theme';
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

/** One line of the index: who, when last touched, and where the balance stands. */
export function LedgerRow({ onPress, ...content }: LedgerRowProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={ledgerRowLabel(content.account, content.balance)}
      onPress={onPress}
      scaleTo={1}>
      <LedgerRowContent {...content} />
    </PressableScale>
  );
}

export function ledgerRowLabel(account: Account, balance: Money): string {
  const summary = summarise(account, balance);
  return `${account.name}, ${summary.label} ${formatMoney(summary.amount)}`;
}

function summarise(account: Account, balance: Money) {
  return account.role === 'party'
    ? describePartyBalance(balance)
    : describeAccountBalance(account, balance);
}

/**
 * The row's visuals without a press target, so a caller can put it inside a
 * different touch handler — the swipeable list handles taps itself.
 */
export function LedgerRowContent({
  account,
  balance,
  lastActivityDate,
}: Omit<LedgerRowProps, 'onPress'>) {
  const theme = useTheme();

  const summary = summarise(account, balance);

  const toneColor =
    summary.tone === 'positive'
      ? theme.positive
      : summary.tone === 'negative'
        ? theme.negative
        : theme.textSecondary;

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Avatar name={account.name} hue={account.hue} size={40} />

      <View style={styles.identity}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {account.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {lastActivityDate ? formatDateShort(lastActivityDate) : 'No entries yet'}
        </ThemedText>
      </View>

      <View style={styles.amountColumn}>
        <ThemedText type="figure" style={[styles.amount, { color: toneColor }]}>
          {formatMoney(summary.amount)}
        </ThemedText>
        <ThemedText type="caption" style={{ color: toneColor }}>
          {summary.label}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountColumn: {
    alignItems: 'flex-end',
    gap: 1,
  },
  amount: {
    fontSize: 16,
  },
});
