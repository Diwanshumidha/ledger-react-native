import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { SectionList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { JournalEntryCard } from '@/components/ledger/journal-entry-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import { fadeIn, riseIn, rowIn } from '@/constants/motion';
import { BottomTabInset, Spacing, TopBarInset } from '@/constants/theme';
import { buildTrialBalance, sortChronologically, totalFor } from '@/domain/accounting';
import { formatRelativeDay } from '@/domain/date';
import { formatMoney } from '@/domain/money';
import type { JournalEntry } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useLedger } from '@/state/ledger-store';

/** Above this width the day book reads better as two columns than one long list. */
const TWO_COLUMN_BREAKPOINT = 720;

/** Each row holds one card on phones, two side by side on wide screens. */
type EntryRow = JournalEntry[];

interface DaySection {
  title: string;
  dayTotal: number;
  count: number;
  data: EntryRow[];
}

function chunk(entries: JournalEntry[], size: number): EntryRow[] {
  const rows: EntryRow[] = [];
  for (let index = 0; index < entries.length; index += size) {
    rows.push(entries.slice(index, index + size));
  }
  return rows;
}

export default function JournalScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { accounts, entries, isHydrated } = useLedger();

  const columns = width >= TWO_COLUMN_BREAKPOINT ? 2 : 1;

  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const sections = useMemo<DaySection[]>(() => {
    const byDate = new Map<string, JournalEntry[]>();
    // Newest first for display, but grouped on the calendar date.
    for (const entry of sortChronologically(entries).reverse()) {
      const bucket = byDate.get(entry.date);
      if (bucket) {
        bucket.push(entry);
      } else {
        byDate.set(entry.date, [entry]);
      }
    }

    return [...byDate.entries()].map(([date, dayEntries]) => ({
      title: formatRelativeDay(date),
      dayTotal: dayEntries.reduce((sum, entry) => sum + totalFor(entry.postings, 'dr'), 0),
      count: dayEntries.length,
      data: chunk(dayEntries, columns),
    }));
  }, [columns, entries]);

  const trialBalance = useMemo(() => buildTrialBalance(accounts, entries), [accounts, entries]);
  const turnover = useMemo(
    () => entries.reduce((sum, entry) => sum + totalFor(entry.postings, 'dr'), 0),
    [entries],
  );

  return (
    <Screen>
      <Animated.View entering={riseIn(0, 6)} style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="title">Journal</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Every entry, in double-entry form
          </ThemedText>
        </View>
        <IconButton
          glyph="+"
          accessibilityLabel="New entry"
          onPress={() => router.push('/entry/new')}
        />
      </Animated.View>

      {entries.length > 0 ? (
        <Animated.View
          entering={fadeIn(80)}
          style={[styles.summary, { borderColor: theme.border }]}>
          <SummaryCell label="Entries" value={String(entries.length)} />
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <SummaryCell label="Turnover" value={formatMoney(turnover)} />
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <SummaryCell
            label="Trial balance"
            value={trialBalance.isBalanced ? 'Tallied' : 'Off'}
            tone={trialBalance.isBalanced ? theme.positive : theme.negative}
          />
        </Animated.View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(row) => row.map((entry) => entry.id).join('-')}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleColumn}>
              <ThemedText type="heading" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {section.count} {section.count === 1 ? 'entry' : 'entries'}
              </ThemedText>
            </View>
            <View style={[styles.sectionRule, { backgroundColor: theme.border }]} />
            <ThemedText type="figure" themeColor="textSecondary" style={styles.sectionTotal}>
              {formatMoney(section.dayTotal)}
            </ThemedText>
          </View>
        )}
        renderItem={({ item: row, index }) => (
          <Animated.View entering={rowIn(index)} style={styles.row}>
            {row.map((entry) => (
              <View key={entry.id} style={styles.cell}>
                <JournalEntryCard
                  entry={entry}
                  accountNames={accountNames}
                  hideDate
                  style={styles.card}
                  onPress={() => router.push(`/entry/${entry.id}`)}
                  onLongPress={() => router.push(`/entry/new?editId=${entry.id}`)}
                />
              </View>
            ))}
            {/* Keeps a lone card on the last row at column width. */}
            {row.length < columns
              ? Array.from({ length: columns - row.length }, (_, index) => (
                  <View key={`filler-${index}`} style={styles.cell} />
                ))
              : null}
          </Animated.View>
        )}
        ListEmptyComponent={
          isHydrated ? (
            <EmptyState
              glyph="🧾"
              title="No entries yet"
              message="Every 'you gave' or 'you got' you record shows up here as a balanced journal entry."
              actionLabel="Record an entry"
              onAction={() => router.push('/entry/new')}
            />
          ) : null
        }
      />
    </Screen>
  );
}

interface SummaryCellProps {
  label: string;
  value: string;
  tone?: string;
}

function SummaryCell({ label, value, tone }: SummaryCellProps) {
  return (
    <View style={styles.summaryCell}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText
        type="figure"
        face="display"
        style={[styles.summaryValue, tone ? { color: tone } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {value}
      </ThemedText>
    </View>
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
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryCell: {
    flex: 1,
    gap: Spacing.one,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: Spacing.three,
  },
  summaryValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  sectionTitleColumn: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  sectionTotal: {
    fontSize: 14,
  },
  sectionRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
  /** Cards in the same row share the tallest card's height. */
  card: {
    flex: 1,
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.four,
    flexGrow: 1,
  },
});
