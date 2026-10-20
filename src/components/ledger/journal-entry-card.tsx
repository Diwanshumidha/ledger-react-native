import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { totalFor } from '@/domain/accounting';
import { formatDateShort } from '@/domain/date';
import { formatAmount, formatMoney } from '@/domain/money';
import type { JournalEntry } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

export interface JournalEntryCardProps {
  entry: JournalEntry;
  /** Account id → display name, for resolving posting lines. */
  accountNames: Map<string, string>;
  /** Hides the date in the meta line when the section header already shows it. */
  hideDate?: boolean;
  /** Lets a grid cell stretch the card to the row height. */
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
  /** Long press goes straight to editing the entry. */
  onLongPress?: () => void;
}

/** A voucher: headline amount, then the postings indented like a journal. */
export function JournalEntryCard({
  entry,
  accountNames,
  hideDate = false,
  style,
  onPress,
  onLongPress,
}: JournalEntryCardProps) {
  const theme = useTheme();
  const debits = entry.postings.filter((posting) => posting.side === 'dr');
  const credits = entry.postings.filter((posting) => posting.side === 'cr');
  const total = totalFor(entry.postings, 'dr');

  // More than one debit means the cost was shared out across people.
  const splitWays = debits.length > 1 ? debits.length : 0;

  const meta = hideDate
    ? `Voucher ${entry.voucherNo}`
    : `Voucher ${entry.voucherNo}, ${formatDateShort(entry.date)}`;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Voucher ${entry.voucherNo}, ${entry.narration || 'journal entry'}, ${formatMoney(total)}`}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityHint={onLongPress ? 'Long press to edit' : undefined}
      scaleTo={0.995}
      // The "split N ways" badge carries that meaning; tinting the whole
      // border as well made every card read as selected.
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      <View style={styles.header}>
        <View style={styles.titleColumn}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {entry.narration || 'Journal entry'}
          </ThemedText>
          <View style={styles.metaRow}>
            <ThemedText type="caption" themeColor="textSecondary">
              {meta}
            </ThemedText>
            {splitWays > 0 ? (
              <View style={[styles.badge, { borderColor: theme.border }]}>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.badgeText}>
                  split {splitWays} ways
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        <ThemedText type="figure" face="display" style={styles.amount}>
          {formatMoney(total)}
        </ThemedText>
      </View>

      <View style={[styles.postings, { borderTopColor: theme.border }]}>
        {debits.map((posting, index) => (
          <PostingLine
            key={`dr-${posting.accountId}-${index}`}
            name={accountNames.get(posting.accountId) ?? 'Deleted ledger'}
            amount={formatAmount(posting.amount)}
            side="dr"
          />
        ))}
        {credits.map((posting, index) => (
          <PostingLine
            key={`cr-${posting.accountId}-${index}`}
            name={accountNames.get(posting.accountId) ?? 'Deleted ledger'}
            amount={formatAmount(posting.amount)}
            side="cr"
          />
        ))}
      </View>
    </PressableScale>
  );
}

interface PostingLineProps {
  name: string;
  amount: string;
  side: 'dr' | 'cr';
}

function PostingLine({ name, amount, side }: PostingLineProps) {
  const theme = useTheme();
  const isDebit = side === 'dr';

  return (
    <View style={[styles.postingRow, !isDebit && styles.creditIndent]}>
      <ThemedText
        type="small"
        style={[styles.sideTag, { color: isDebit ? theme.negative : theme.positive }]}>
        {isDebit ? 'Dr' : 'Cr'}
      </ThemedText>
      <ThemedText type="small" numberOfLines={1} style={styles.postingName}>
        {name}
      </ThemedText>
      <ThemedText type="figure" themeColor="textSecondary" style={styles.postingAmount}>
        {amount}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: '600',
  },
  amount: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  postings: {
    gap: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  postingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  creditIndent: {
    paddingLeft: Spacing.four,
  },
  sideTag: {
    fontWeight: '600',
    width: 20,
  },
  postingName: {
    flex: 1,
    minWidth: 0,
  },
  postingAmount: {
    fontSize: 14,
    fontWeight: '400',
  },
});
