import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { formatDateShort } from '@/domain/date';
import { formatAmount } from '@/domain/money';
import type { StatementLine } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

/** Below this width the Debit/Credit columns are collapsed into one. */
export const WIDE_STATEMENT_BREAKPOINT = 520;

export interface StatementRowProps {
  line: StatementLine;
  /** Names of the accounts on the other side, e.g. "Cash". */
  contraNames: string[];
  /** True on phones: one signed amount instead of separate Dr/Cr columns. */
  compact: boolean;
  onPress: () => void;
}

/**
 * One line of a ledger statement. On wide viewports it reads like a real
 * account book (Date | Particulars | Debit | Credit | Balance); on phones it
 * collapses to a single tinted amount with the running balance beneath.
 */
export function StatementRow({ line, contraNames, compact, onPress }: StatementRowProps) {
  const theme = useTheme();
  const isDebit = line.posting.side === 'dr';
  const balanceIsDebit = line.runningBalance >= 0;
  const amountColor = isDebit ? theme.negative : theme.positive;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${line.entry.narration || (isDebit ? 'You gave' : 'You got')}, ${
        isDebit ? 'debit' : 'credit'
      } ${formatAmount(line.posting.amount)}`}
      onPress={onPress}
      scaleTo={0.985}
      style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.dateColumn}>
        <ThemedText type="smallBold">{formatDateShort(line.entry.date)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          #{line.entry.voucherNo}
        </ThemedText>
      </View>

      <View style={styles.detailColumn}>
        <ThemedText numberOfLines={1} style={styles.narration}>
          {line.entry.narration || (isDebit ? 'You gave' : 'You got')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          via {contraNames.join(', ') || '—'}
        </ThemedText>
      </View>

      {compact ? (
        <View style={styles.compactColumn}>
          <ThemedText style={[styles.amount, { color: amountColor }]}>
            {formatAmount(line.posting.amount)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {formatAmount(Math.abs(line.runningBalance))}
            {line.runningBalance === 0 ? '' : balanceIsDebit ? ' Dr' : ' Cr'}
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.amountColumn}>
            <ThemedText
              style={[styles.amount, { color: isDebit ? theme.negative : theme.textSecondary }]}>
              {isDebit ? formatAmount(line.posting.amount) : '—'}
            </ThemedText>
          </View>

          <View style={styles.amountColumn}>
            <ThemedText
              style={[styles.amount, { color: isDebit ? theme.textSecondary : theme.positive }]}>
              {isDebit ? '—' : formatAmount(line.posting.amount)}
            </ThemedText>
          </View>

          <View style={styles.balanceColumn}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {formatAmount(Math.abs(line.runningBalance))}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {line.runningBalance === 0 ? '—' : balanceIsDebit ? 'Dr' : 'Cr'}
            </ThemedText>
          </View>
        </>
      )}
    </PressableScale>
  );
}

/** Column headings that line up with `StatementRow`. */
export function StatementHeader({ compact }: { compact: boolean }) {
  const theme = useTheme();

  return (
    <View style={[styles.row, styles.header, { borderColor: theme.border }]}>
      <View style={styles.dateColumn}>
        <ThemedText type="small" themeColor="textSecondary">
          Date
        </ThemedText>
      </View>
      <View style={styles.detailColumn}>
        <ThemedText type="small" themeColor="textSecondary">
          Particulars
        </ThemedText>
      </View>

      {compact ? (
        <View style={[styles.compactColumn, styles.headerEnd]}>
          <ThemedText type="small" themeColor="textSecondary">
            Amount
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Balance
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.amountColumn}>
            <ThemedText type="small" themeColor="textSecondary">
              Debit
            </ThemedText>
          </View>
          <View style={styles.amountColumn}>
            <ThemedText type="small" themeColor="textSecondary">
              Credit
            </ThemedText>
          </View>
          <View style={styles.balanceColumn}>
            <ThemedText type="small" themeColor="textSecondary">
              Balance
            </ThemedText>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    paddingBottom: Spacing.two,
  },
  headerEnd: {
    alignItems: 'flex-end',
  },
  dateColumn: {
    width: 56,
  },
  detailColumn: {
    flex: 1,
    minWidth: 0,
  },
  compactColumn: {
    alignItems: 'flex-end',
    minWidth: 88,
  },
  amountColumn: {
    width: 74,
    alignItems: 'flex-end',
  },
  balanceColumn: {
    width: 78,
    alignItems: 'flex-end',
  },
  narration: {
    fontSize: 15,
    fontWeight: '600',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
