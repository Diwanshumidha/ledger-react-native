import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { BalanceSummary } from '@/components/ledger/balance-summary';
import { LedgerRow } from '@/components/ledger/ledger-row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { BottomTabInset, Spacing, TopBarInset } from '@/constants/theme';
import { balancesByAccount, sortChronologically } from '@/domain/accounting';
import type { Account } from '@/domain/types';
import { useLedger } from '@/state/ledger-store';

const STAGGER_MS = 45;

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

  const parties = useMemo(
    () => accounts.filter((account) => account.role === 'party'),
    [accounts],
  );

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

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Ledgers</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {parties.length === 0
            ? 'Track what you gave and what you got'
            : `${parties.length} ${parties.length === 1 ? 'party' : 'parties'}`}
        </ThemedText>
      </View>

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
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            {section.title}
          </ThemedText>
        )}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(Math.min(index, 8) * STAGGER_MS)
              .springify()
              .damping(16)}
            layout={LinearTransition.springify().damping(18)}
            style={styles.rowWrapper}>
            <LedgerRow
              account={item}
              balance={balances.get(item.id) ?? 0}
              lastActivityDate={lastActivity.get(item.id)}
              onPress={() => openLedger(item)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          <EmptyState
            glyph="🔍"
            title="No matches"
            message="Try a different name or number."
          />
        }
      />
      )}
      <Fab label="Add ledger" onPress={() => router.push('/ledger/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: TopBarInset + Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.half,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
  },
  search: {
    paddingTop: Spacing.three,
  },
  sectionHeader: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  rowWrapper: {
    paddingBottom: Spacing.two,
  },
  listContent: {
    paddingBottom: BottomTabInset + 96,
    flexGrow: 1,
  },
});
