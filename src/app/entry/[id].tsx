import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Duration, riseIn } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import { totalFor } from '@/domain/accounting';
import { formatDateLong, formatTime } from '@/domain/date';
import { formatAmount, formatMoney } from '@/domain/money';
import { useTheme } from '@/hooks/use-theme';
import { useLedger, useLedgerActions } from '@/state/ledger-store';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { accounts, entries } = useLedger();
  const { deleteEntry } = useLedgerActions();
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);

  const entry = useMemo(() => entries.find((item) => item.id === id), [entries, id]);
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  if (!entry) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          glyph="🔍"
          title="Entry not found"
          message="It may have been deleted."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const total = totalFor(entry.postings, 'dr');
  const debits = entry.postings.filter((posting) => posting.side === 'dr');
  const credits = entry.postings.filter((posting) => posting.side === 'cr');

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          title: `Voucher #${entry.voucherNo}`,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit entry"
              onPress={() => router.push(`/entry/new?editId=${entry.id}`)}
              hitSlop={12}
              style={styles.headerAction}>
              <ThemedText type="smallBold">Edit</ThemedText>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={riseIn(0, 6, Duration.base)} style={styles.header}>
          <ThemedText style={styles.amount}>{formatMoney(total)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDateLong(entry.date)} · recorded {formatTime(entry.createdAt)}
          </ThemedText>
          {entry.narration ? (
            <ThemedText style={styles.narration}>{entry.narration}</ThemedText>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={riseIn(80, 6)}
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {debits.map((posting, index) => (
            <PostingRow
              key={`dr-${index}`}
              side="Dr"
              color={theme.negative}
              name={accountById.get(posting.accountId)?.name ?? 'Deleted ledger'}
              amount={formatAmount(posting.amount)}
            />
          ))}
          {credits.map((posting, index) => (
            <PostingRow
              key={`cr-${index}`}
              side="Cr"
              color={theme.positive}
              name={accountById.get(posting.accountId)?.name ?? 'Deleted ledger'}
              amount={formatAmount(posting.amount)}
              indent
            />
          ))}

          <View style={[styles.totals, { borderTopColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Total
            </ThemedText>
            <ThemedText type="smallBold">
              {formatAmount(total)} Dr · {formatAmount(totalFor(entry.postings, 'cr'))} Cr
            </ThemedText>
          </View>
        </Animated.View>

        <View style={styles.actions}>
          <Button label="Edit entry" onPress={() => router.push(`/entry/new?editId=${entry.id}`)} />
          <Button label="Delete entry" variant="danger" onPress={() => setConfirmingDelete(true)} />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={isConfirmingDelete}
        title="Delete this entry?"
        message="Both sides of the entry are removed and every affected balance is recalculated."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          deleteEntry(entry.id);
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/journal');
          }
        }}
      />
    </Screen>
  );
}

interface PostingRowProps {
  side: string;
  color: string;
  name: string;
  amount: string;
  indent?: boolean;
}

function PostingRow({ side, color, name, amount, indent = false }: PostingRowProps) {
  return (
    <View style={[styles.postingRow, indent && styles.indent]}>
      <ThemedText type="smallBold" style={{ color }}>
        {side}
      </ThemedText>
      <ThemedText style={styles.postingName} numberOfLines={2}>
        {name}
      </ThemedText>
      <ThemedText type="smallBold">{amount}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    // The web header places this flush against the viewport edge.
    paddingHorizontal: Spacing.three,
  },
  content: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  amount: {
    fontSize: 34,
    fontWeight: '700',
  },
  narration: {
    fontSize: 16,
    fontWeight: '500',
    paddingTop: Spacing.one,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  postingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  indent: {
    paddingLeft: Spacing.four,
  },
  postingName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
