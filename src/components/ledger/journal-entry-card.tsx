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
}

/** A voucher: headline amount, then the postings indented like a journal. */
export function JournalEntryCard({
  entry,
  accountNames,
  hideDate = false,
  style,
  onPress,
}: JournalEntryCardProps) {
  const theme = useTheme();
  const debits = entry.postings.filter((posting) => posting.side === 'dr');
  const credits = entry.postings.filter((posting) => posting.side === 'cr');
  const total = totalFor(entry.postings, 'dr');

  // More than one debit means the cost was shared out across people.
  const splitWays = debits.length > 1 ? debits.length : 0;

  const meta = [`#${entry.voucherNo}`, hideDate ? null : formatDateShort(entry.date)]
    .filter(Boolean)
    .join(' · ');

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Voucher ${entry.voucherNo}, ${entry.narration || 'journal entry'}, ${formatMoney(total)}`}
      onPress={onPress}
      scaleTo={0.985}
      // The "split N ways" badge carries that meaning; tinting the whole
      // border as well made every card read as selected.
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      <View style={styles.header}>
        <View style={styles.titleColumn}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {entry.narration || 'Journal entry'}
          </ThemedText>
          <View style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {meta}
            </ThemedText>
            {splitWays > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
                <ThemedText type="small" style={[styles.badgeText, { color: theme.accent }]}>
                  split {splitWays} ways
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        <ThemedText style={styles.amount}>{formatMoney(total)}</ThemedText>
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
      <ThemedText type="small" themeColor="textSecondary" style={styles.postingAmount}>
        {amount}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
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
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
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
    fontWeight: '700',
    width: 20,
  },
  postingName: {
    flex: 1,
    minWidth: 0,
  },
  postingAmount: {
    fontVariant: ['tabular-nums'],
  },
});
