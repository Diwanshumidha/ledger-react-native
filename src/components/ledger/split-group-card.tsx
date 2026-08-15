import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import type { SharedLedgerSummary } from '@/domain/accounting';
import { formatMoney } from '@/domain/money';
import type { Account, SplitGroup } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

export interface SplitGroupCardProps {
  group: SplitGroup;
  summary: SharedLedgerSummary;
  accountById: Map<string, Account>;
  onEdit: () => void;
}

/**
 * Shows who a shared expense is split with and what each of them has been
 * billed from this ledger.
 */
export function SplitGroupCard({ group, summary, accountById, onEdit }: SplitGroupCardProps) {
  const theme = useTheme();
  const billedById = new Map(summary.members.map((member) => [member.accountId, member.billed]));

  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      layout={LinearTransition}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="smallBold">Shared expense</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {group.method === 'equal' ? 'Split equally' : 'Exact amounts'} ·{' '}
            {group.includeSelf ? 'you take a share' : 'you only collect'}
          </ThemedText>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Edit sharing"
          onPress={onEdit}
          scaleTo={0.95}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            Edit
          </ThemedText>
        </PressableScale>
      </View>

      <View style={[styles.totals, { borderTopColor: theme.border }]}>
        <View style={styles.totalCell}>
          <ThemedText type="small" themeColor="textSecondary">
            Your spend
          </ThemedText>
          <ThemedText type="smallBold">{formatMoney(summary.yourSpend)}</ThemedText>
        </View>
        <View style={styles.totalCell}>
          <ThemedText type="small" themeColor="textSecondary">
            Bills recorded
          </ThemedText>
          <ThemedText type="smallBold">{formatMoney(summary.billedTotal)}</ThemedText>
        </View>
      </View>

      <View style={styles.members}>
        {group.memberIds.map((memberId) => {
          const member = accountById.get(memberId);
          if (!member) {
            return null;
          }
          const billed = billedById.get(memberId) ?? 0;

          return (
            <View key={memberId} style={styles.memberRow}>
              <Avatar name={member.name} hue={member.hue} size={30} />
              <ThemedText type="small" style={styles.memberName} numberOfLines={1}>
                {member.name}
              </ThemedText>
              <ThemedText type="smallBold">{formatMoney(billed)}</ThemedText>
            </View>
          );
        })}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        Amounts are what each member was billed from this ledger. Repayments show on their own
        ledger, so they do not reduce these figures.
      </ThemedText>
    </Animated.View>
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
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  totals: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  totalCell: {
    flex: 1,
    gap: Spacing.half,
  },
  members: {
    gap: Spacing.two,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  memberName: {
    flex: 1,
    minWidth: 0,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 16,
  },
});
