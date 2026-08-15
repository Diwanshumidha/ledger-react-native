import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import {
  StatementHeader,
  StatementRow,
  WIDE_STATEMENT_BREAKPOINT,
} from '@/components/ledger/statement-row';
import { SplitGroupCard } from '@/components/ledger/split-group-card';
import { ThemedText } from '@/components/themed-text';
import { AnimatedMoney } from '@/components/ui/animated-money';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import {
  balanceOf,
  buildStatement,
  describeAccountBalance,
  describePartyBalance,
  summariseSharedLedger,
} from '@/domain/accounting';
import type { SimpleDirection } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useAccount, useLedger, useLedgerActions } from '@/state/ledger-store';

export default function LedgerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const { accounts, entries } = useLedger();
  const { deleteAccount } = useLedgerActions();
  const account = useAccount(id);
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);

  const accountNames = useMemo(
    () => new Map(accounts.map((item) => [item.id, item.name])),
    [accounts],
  );

  const balance = useMemo(() => (id ? balanceOf(id, entries) : 0), [entries, id]);
  const statement = useMemo(() => (id ? buildStatement(id, entries) : []), [entries, id]);
  const sharedSummary = useMemo(
    () => (id ? summariseSharedLedger(id, entries) : null),
    [entries, id],
  );
  const accountById = useMemo(
    () => new Map(accounts.map((item) => [item.id, item])),
    [accounts],
  );

  if (!account) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Ledger' }} />
        <EmptyState
          glyph="🔍"
          title="Ledger not found"
          message="It may have been deleted."
          actionLabel="Back to ledgers"
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  const summary =
    account.role === 'party'
      ? describePartyBalance(balance)
      : describeAccountBalance(account, balance);

  const toneColor =
    summary.tone === 'positive'
      ? theme.positive
      : summary.tone === 'negative'
        ? theme.negative
        : theme.text;

  const isCompact = width < WIDE_STATEMENT_BREAKPOINT;
  const isExpenseLedger = account.role === 'category' && account.type === 'expense';
  const splitGroup = account.splitGroup;

  const recordEntry = (direction: SimpleDirection) =>
    router.push(`/entry/new?ledgerId=${account.id}&direction=${direction}`);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          title: account.name,
          headerRight: () =>
            account.isSystem ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete ledger"
                onPress={() => setConfirmingDelete(true)}
                hitSlop={12}
                style={styles.headerAction}>
                <ThemedText type="smallBold" style={{ color: theme.negative }}>
                  Delete
                </ThemedText>
              </Pressable>
            ),
        }}
      />

      <Animated.View
        entering={FadeIn.duration(280)}
        style={[styles.hero, { backgroundColor: theme.backgroundElement }]}>
        <Avatar name={account.name} hue={account.hue} size={52} />
        <View style={styles.heroText}>
          <ThemedText type="small" themeColor="textSecondary">
            {summary.label}
          </ThemedText>
          <AnimatedMoney value={summary.amount} style={[styles.heroAmount, { color: toneColor }]} />
          {account.phone ? (
            <ThemedText type="small" themeColor="textSecondary">
              {account.phone}
            </ThemedText>
          ) : null}
        </View>
      </Animated.View>

      {isExpenseLedger && splitGroup && sharedSummary ? (
        <View style={styles.sharedCard}>
          <SplitGroupCard
            group={splitGroup}
            summary={sharedSummary}
            accountById={accountById}
            onEdit={() => router.push(`/ledger/split-group?id=${account.id}`)}
          />
        </View>
      ) : null}

      <FlatList
        data={statement}
        keyExtractor={(line, index) => `${line.entry.id}-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={statement.length > 0 ? <StatementHeader compact={isCompact} /> : null}
        ItemSeparatorComponent={ListGap}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(Math.min(index, 8) * 35)
              .springify()
              .damping(16)}
            layout={LinearTransition.springify().damping(18)}>
            <StatementRow
              line={item}
              compact={isCompact}
              contraNames={item.contraAccountIds.map(
                (contraId) => accountNames.get(contraId) ?? 'Deleted ledger',
              )}
              onPress={() => router.push(`/entry/${item.entry.id}`)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          <EmptyState
            glyph={isExpenseLedger ? '🧾' : '🧮'}
            title="Nothing recorded yet"
            message={
              isExpenseLedger
                ? `Record a ${account.name} bill and split it with the people who share it.`
                : `Use the buttons below to record what you gave to or got from ${account.name}.`
            }
          />
        }
      />

      <Animated.View
        entering={FadeInDown.delay(120).springify().damping(18)}
        style={[styles.actionBar, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        {isExpenseLedger ? (
          <>
            <Button
              label={splitGroup ? 'Record split expense' : 'Record expense'}
              onPress={() => router.push(`/entry/split?ledgerId=${account.id}`)}
              style={styles.actionButton}
            />
            {splitGroup ? null : (
              <Button
                label="Share this"
                variant="secondary"
                onPress={() => router.push(`/ledger/split-group?id=${account.id}`)}
                style={styles.actionButton}
              />
            )}
          </>
        ) : (
          <>
            <Button
              label="You gave"
              variant="danger"
              onPress={() => recordEntry('gave')}
              style={styles.actionButton}
            />
            <Button
              label="You got"
              onPress={() => recordEntry('got')}
              style={[styles.actionButton, { backgroundColor: theme.positive }]}
            />
          </>
        )}
      </Animated.View>

      <ConfirmDialog
        visible={isConfirmingDelete}
        title={`Delete ${account.name}?`}
        message="This removes the ledger and every entry that touches it. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          deleteAccount(account.id);
          router.replace('/');
        }}
      />
    </Screen>
  );
}

function ListGap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  headerAction: {
    // The web header places this flush against the viewport edge.
    paddingHorizontal: Spacing.three,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    marginTop: Spacing.three,
    borderRadius: Radius.large,
  },
  sharedCard: {
    paddingTop: Spacing.three,
  },
  heroText: {
    flex: 1,
    gap: Spacing.half,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '700',
  },
  listContent: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    flexGrow: 1,
  },
  gap: {
    height: Spacing.one,
  },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
  },
});
