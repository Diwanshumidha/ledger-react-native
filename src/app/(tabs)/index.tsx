import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BalanceSummary } from '@/components/ledger/balance-summary';

import {
  SwipeableLedgerRow,
  type SwipeAction,
  type SwipeRowHandle,
} from '@/components/ledger/swipeable-ledger-row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { riseIn, rowIn, settle } from '@/constants/motion';
import { BottomTabInset, Spacing, TopBarInset } from '@/constants/theme';
import { balancesByAccount, sortChronologically } from '@/domain/accounting';
import type { Account } from '@/domain/types';
import { useLedger } from '@/state/ledger-store';

interface LedgerSection {
  title: string;
  data: Account[];
}

export default function LedgersScreen() {
  const router = useRouter();
  const { accounts, entries, isHydrated } = useLedger();
  const [query, setQuery] = useState('');

  const balances = useMemo(() => balancesByAccount(entries), [entries]);

  /** Most recent entry date per account, for the row subtitle. */
  const lastActivity = useMemo(() => {
    const dates = new Map<string, string>();
    for (const entry of sortChronologically(entries)) {
      for (const posting of entry.postings) {
        dates.set(posting.accountId, entry.date);
      }
    }
    return dates;
  }, [entries]);

  const parties = useMemo(() => accounts.filter((account) => account.role === 'party'), [accounts]);

  const totals = useMemo(() => {
    let receivable = 0;
    let payable = 0;

    for (const account of parties) {
      const balance = balances.get(account.id) ?? 0;
      if (balance > 0) {
        receivable += balance;
      } else {
        payable += -balance;
      }
    }

    return { receivable, payable };
  }, [balances, parties]);

  const sections = useMemo<LedgerSection[]>(() => {
    const needle = query.trim().toLowerCase();
    const matches = (account: Account) =>
      needle.length === 0 ||
      account.name.toLowerCase().includes(needle) ||
      (account.phone ?? '').includes(needle);

    // Ledgers with an outstanding balance matter most; settled ones sink.
    const byOutstanding = (a: Account, b: Account) => {
      const balanceA = Math.abs(balances.get(a.id) ?? 0);
      const balanceB = Math.abs(balances.get(b.id) ?? 0);
      if (balanceA !== balanceB) {
        return balanceB - balanceA;
      }
      return a.name.localeCompare(b.name);
    };

    const visible = accounts.filter(matches);
    const shared = visible
      .filter((account) => account.splitGroup !== undefined)
      .sort(byOutstanding);
    const sharedIds = new Set(shared.map((account) => account.id));

    const people = visible
      .filter((account) => account.role === 'party' && !sharedIds.has(account.id))
      .sort(byOutstanding);

    const others = visible
      .filter((account) => account.role !== 'party' && !sharedIds.has(account.id))
      .sort(byOutstanding);

    return [
      { title: 'Shared expenses', data: shared },
      { title: 'People', data: people },
      { title: 'Cash, bank & categories', data: others },
    ].filter((section) => section.data.length > 0);
  }, [accounts, balances, query]);

  const hasAnyLedger = accounts.some((account) => !account.isSystem);
  const openLedger = (account: Account) => router.push(`/ledger/${account.id}`);

  // Only one row stays swiped open; opening another closes the last.
  const openRow = useRef<SwipeRowHandle | null>(null);
  const handleRowOpen = useCallback((row: SwipeRowHandle) => {
    if (openRow.current && openRow.current !== row) {
      openRow.current.close();
    }
    openRow.current = row;
  }, []);

  /** The same shortcuts the ledger's own page offers at the bottom. */
  const swipeActionsFor = (account: Account): SwipeAction[] => {
    if (account.role === 'category' && account.type === 'expense') {
      return [
        {
          label: 'Add expense',
          tone: 'ink',
          onPress: () => router.push(`/entry/split?ledgerId=${account.id}`),
        },
      ];
    }
    const record = (direction: 'gave' | 'got') =>
      router.push(`/entry/new?ledgerId=${account.id}&direction=${direction}`);
    return [
      { label: 'You gave', tone: 'negative', onPress: () => record('gave') },
      { label: 'You got', tone: 'positive', onPress: () => record('got') },
    ];
  };

  return (
    <Screen>
      <Animated.View entering={riseIn(0, 6)} style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="title">Ledgers</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {parties.length === 0
              ? 'Track what you gave and what you got'
              : 'Swipe a row left to record an entry'}
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            glyph="₹"
            variant="quiet"
            accessibilityLabel="Payment details"
            onPress={() => router.push('/settings')}
          />
          <IconButton
            glyph="+"
            accessibilityLabel="Add ledger"
            onPress={() => router.push('/ledger/new')}
          />
        </View>
      </Animated.View>

      {parties.length > 0 ? (
        <>
          <BalanceSummary receivable={totals.receivable} payable={totals.payable} />
          <View style={styles.search}>
            <TextField
              label="Search"
              value={query}
              onChangeText={setQuery}
              placeholder="Name or phone number"
            />
          </View>
        </>
      ) : null}

      {isHydrated && !hasAnyLedger ? (
        // A fresh book still has the seeded Cash and Bank ledgers, so the list
        // is not empty — show the onboarding prompt instead of the sections.
        <EmptyState
          glyph="📗"
          title="No ledgers yet"
          message="Create a ledger for each customer or supplier, then record what you gave and what you got."
          actionLabel="Create first ledger"
          onAction={() => router.push('/ledger/new')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(account) => account.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <ThemedText type="heading" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item, index }) => (
            <Animated.View entering={rowIn(index)} layout={settle}>
              <SwipeableLedgerRow
                account={item}
                balance={balances.get(item.id) ?? 0}
                lastActivityDate={lastActivity.get(item.id)}
                onPress={() => openLedger(item)}
                actions={swipeActionsFor(item)}
                onOpen={handleRowOpen}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <EmptyState glyph="🔍" title="No matches" message="Try a different name or number." />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: TopBarInset + Spacing.two,
    paddingBottom: Spacing.four,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  search: {
    paddingTop: Spacing.four,
  },
  sectionHeader: {
    fontSize: 17,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.one,
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.four,
    flexGrow: 1,
  },
});
