import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AccountPickerSheet } from '@/components/ledger/account-picker-sheet';
import { AmountField } from '@/components/ledger/amount-field';
import { DirectionToggle } from '@/components/ledger/direction-toggle';
import { PostingLineEditor, type DraftPosting } from '@/components/ledger/posting-line-editor';
import { SplitExpenseComposer } from '@/components/ledger/split-expense-composer';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { HydrationGate } from '@/components/ui/hydration-gate';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Duration, fadeIn, riseIn, settle } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import {
  balanceOf,
  buildSimplePostings,
  describePartyBalance,
  validatePostings,
} from '@/domain/accounting';
import { formatDateLong, formatDateShort, shiftCalendarDate, today } from '@/domain/date';
import { formatAmount, formatMoney, parseMoney } from '@/domain/money';
import { CASH_ACCOUNT_ID } from '@/domain/seed';
import type { Account, JournalEntry, Posting, SimpleDirection } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useLedger, useLedgerActions } from '@/state/ledger-store';

type ComposerMode = 'simple' | 'split' | 'advanced';

const MODE_CHOICES = [
  { value: 'simple' as const, label: 'Quick entry' },
  { value: 'split' as const, label: 'Split expense' },
  { value: 'advanced' as const, label: 'Journal entry' },
];

let draftKeySeed = 0;
function nextDraftKey(): string {
  draftKeySeed += 1;
  return `line-${draftKeySeed}`;
}

export default function NewEntryScreen() {
  // The composer seeds its default ledger from the book, so wait for storage.
  return (
    <HydrationGate>
      <NewEntryComposer />
    </HydrationGate>
  );
}

/**
 * How an existing entry opens for editing. A two-line entry against a person
 * reopens as the quick entry it was made with; anything else as journal lines.
 */
function draftFromEntry(entry: JournalEntry, accounts: Account[]) {
  const roleOf = new Map(accounts.map((account) => [account.id, account.role]));
  const partyPosting = entry.postings.find((posting) => roleOf.get(posting.accountId) === 'party');
  const counterPosting = entry.postings.find((posting) => posting !== partyPosting);

  if (entry.postings.length === 2 && partyPosting && counterPosting) {
    return {
      mode: 'simple' as const,
      partyId: partyPosting.accountId,
      counterId: counterPosting.accountId,
      // A debit to the person is money that went to them.
      direction: (partyPosting.side === 'dr' ? 'gave' : 'got') as SimpleDirection,
      amountText: toInputText(partyPosting.amount),
    };
  }
  return { mode: 'advanced' as const };
}

/** Minor units as an editable figure: "8400", or "8400.50" with paise. */
function toInputText(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}

function NewEntryComposer() {
  const params = useLocalSearchParams<{
    ledgerId?: string;
    direction?: string;
    mode?: string;
    editId?: string;
  }>();
  const router = useRouter();
  const theme = useTheme();
  const { accounts, entries: allEntries } = useLedger();
  const { addEntry, updateEntry } = useLedgerActions();

  // Read once: the form is seeded from the entry as it was when opened.
  const [editing] = useState(() => allEntries.find((entry) => entry.id === params.editId));
  const [initialDraft] = useState(() => (editing ? draftFromEntry(editing, accounts) : null));
  const isEditing = editing !== undefined;

  // Balances shown while editing must leave out the entry's old version.
  const entries = useMemo(
    () => (editing ? allEntries.filter((entry) => entry.id !== editing.id) : allEntries),
    [allEntries, editing],
  );

  const parties = useMemo(() => accounts.filter((account) => account.role === 'party'), [accounts]);
  const counterAccounts = useMemo(
    () => accounts.filter((account) => account.role !== 'party'),
    [accounts],
  );

  const [mode, setMode] = useState<ComposerMode>(
    initialDraft?.mode ?? (params.mode === 'split' ? 'split' : 'simple'),
  );
  const [date, setDate] = useState(editing?.date ?? today());
  const [narration, setNarration] = useState(editing?.narration ?? '');
  const [error, setError] = useState<string | undefined>();
  const [shakeKey, setShakeKey] = useState(0);

  // Quick-entry state
  const [chosenPartyId, setPartyId] = useState<string | null>(
    initialDraft?.mode === 'simple' ? initialDraft.partyId : (params.ledgerId ?? null),
  );

  /**
   * Falls back to the first ledger at render time rather than in `useState`:
   * on a cold load the store has not hydrated yet, so an initial-state default
   * would capture an empty list and never recover.
   */
  const partyId = chosenPartyId ?? parties[0]?.id ?? null;
  const [counterId, setCounterId] = useState<string>(
    (initialDraft?.mode === 'simple' ? initialDraft.counterId : undefined) ??
      counterAccounts.find((account) => account.id === CASH_ACCOUNT_ID)?.id ??
      counterAccounts[0]?.id ??
      CASH_ACCOUNT_ID,
  );
  const [direction, setDirection] = useState<SimpleDirection>(
    initialDraft?.mode === 'simple'
      ? initialDraft.direction
      : params.direction === 'got'
        ? 'got'
        : 'gave',
  );
  const [amountText, setAmountText] = useState(
    initialDraft?.mode === 'simple' ? initialDraft.amountText : '',
  );

  // Journal-entry state
  const [lines, setLines] = useState<DraftPosting[]>(() =>
    editing && initialDraft?.mode === 'advanced'
      ? editing.postings.map((posting) => ({
          key: nextDraftKey(),
          accountId: posting.accountId,
          side: posting.side,
          amountText: toInputText(posting.amount),
        }))
      : [
          { key: nextDraftKey(), accountId: null, side: 'dr', amountText: '' },
          { key: nextDraftKey(), accountId: null, side: 'cr', amountText: '' },
        ],
  );

  const [picker, setPicker] = useState<
    { kind: 'party' } | { kind: 'counter' } | { kind: 'line'; key: string } | null
  >(null);

  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const party = partyId ? accountById.get(partyId) : undefined;
  const counter = accountById.get(counterId);
  const amount = parseMoney(amountText);

  /** Where this ledger stands before the entry being composed. */
  const partyBalance = useMemo(
    () => (partyId ? balanceOf(partyId, entries) : 0),
    [entries, partyId],
  );
  const currentSummary = describePartyBalance(partyBalance);
  // "You gave" debits the party, moving the balance further into "you'll get".
  const projectedBalance = partyBalance + (direction === 'gave' ? amount : -amount);
  const projectedSummary = describePartyBalance(projectedBalance);

  const draftPostings = useMemo<Posting[]>(() => {
    if (mode === 'simple') {
      if (!partyId || !counterId || amount <= 0) {
        return [];
      }
      return buildSimplePostings(partyId, counterId, direction, amount);
    }
    return lines
      .filter((line) => line.accountId !== null && parseMoney(line.amountText) > 0)
      .map((line) => ({
        accountId: line.accountId as string,
        side: line.side,
        amount: parseMoney(line.amountText),
      }));
  }, [amount, counterId, direction, lines, mode, partyId]);

  const validation = useMemo(() => validatePostings(draftPostings), [draftPostings]);

  const reject = (message: string) => {
    setError(message);
    setShakeKey((key) => key + 1);
  };

  /** The composer can be deep-linked to, where there is no history to pop. */
  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/journal');
    }
  };

  const submit = () => {
    if (mode === 'simple') {
      if (!partyId) {
        reject('Choose a ledger first.');
        return;
      }
      if (amount <= 0) {
        reject('Enter an amount greater than zero.');
        return;
      }
    }
    if (!validation.isValid) {
      reject(validation.errors[0] ?? 'This entry does not balance.');
      return;
    }

    try {
      // An untitled quick entry reads better in the day book as "You gave"
      // than as the generic "Journal entry" fallback.
      const fallback = mode === 'simple' ? (direction === 'gave' ? 'You gave' : 'You got') : '';
      const input = { date, narration: narration.trim() || fallback, postings: draftPostings };
      if (editing) {
        updateEntry(editing.id, input);
      } else {
        addEntry(input);
      }
      close();
    } catch (cause) {
      reject(cause instanceof Error ? cause.message : 'Could not save this entry.');
    }
  };

  const updateLine = (key: string, changes: Partial<DraftPosting>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    );
    setError(undefined);
  };

  const directionTint = direction === 'gave' ? theme.negative : theme.positive;

  // An edit keeps the entry's shape, so there is no switching between kinds.
  const modeSwitcher = isEditing ? (
    <Stack.Screen options={{ title: `Edit voucher #${editing.voucherNo}` }} />
  ) : (
    <ChoiceChips choices={MODE_CHOICES} value={mode} onChange={setMode} />
  );

  // The quick dates, plus the entry's own date when it is older than those.
  const dateChoices = [
    { value: today(), label: 'Today' },
    { value: shiftCalendarDate(today(), -1), label: 'Yesterday' },
  ];
  if (editing && !dateChoices.some((choice) => choice.value === editing.date)) {
    dateChoices.push({ value: editing.date, label: formatDateShort(editing.date) });
  }

  if (mode === 'split') {
    return (
      <Screen edges={['bottom']}>
        {/* No initial ledger: `params.ledgerId` is a party, not an expense head. */}
        <SplitExpenseComposer header={modeSwitcher} onSaved={close} />
      </Screen>
    );
  }

  if (parties.length === 0 && mode === 'simple') {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.blocked}>
          <ThemedText style={styles.blockedTitle}>Create a ledger first</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.blockedMessage}>
            A quick entry needs a customer or supplier to post against.
          </ThemedText>
          <Button label="Create a ledger" onPress={() => router.replace('/ledger/new')} />
          <Button
            label="Split a shared expense"
            variant="secondary"
            onPress={() => setMode('split')}
          />
          <Button
            label="Use journal entry instead"
            variant="ghost"
            onPress={() => setMode('advanced')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {modeSwitcher}

          {mode === 'simple' ? (
            <Animated.View
              entering={fadeIn(0, Duration.base)}
              layout={settle}
              style={styles.section}>
              <SelectRow
                label="Ledger"
                value={party?.name ?? 'Choose a ledger'}
                subtitle={
                  party
                    ? currentSummary.tone === 'neutral'
                      ? 'Settled up'
                      : `${currentSummary.label} ${formatMoney(currentSummary.amount)}`
                    : undefined
                }
                subtitleColor={toneColor(theme, currentSummary.tone)}
                onPress={() => setPicker({ kind: 'party' })}
              />

              <DirectionToggle value={direction} onChange={setDirection} />

              <AmountField
                value={amountText}
                onChangeText={(next) => {
                  setAmountText(next);
                  setError(undefined);
                }}
                tint={directionTint}
                autoFocus
                shakeKey={shakeKey}
              />

              <SelectRow
                label={direction === 'gave' ? 'Paid from' : 'Received into'}
                value={counter?.name ?? 'Choose an account'}
                onPress={() => setPicker({ kind: 'counter' })}
              />

              {party && counter && amount > 0 ? (
                <EntryPreview
                  debitName={direction === 'gave' ? party.name : counter.name}
                  creditName={direction === 'gave' ? counter.name : party.name}
                  amount={formatAmount(amount)}
                  outcome={
                    projectedSummary.tone === 'neutral'
                      ? `${party.name} settles up`
                      : `${party.name}: ${projectedSummary.label} ${formatMoney(projectedSummary.amount)}`
                  }
                  outcomeColor={toneColor(theme, projectedSummary.tone)}
                />
              ) : null}
            </Animated.View>
          ) : (
            <Animated.View
              entering={fadeIn(0, Duration.base)}
              layout={settle}
              style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                Add lines until debits equal credits.
              </ThemedText>

              {lines.map((line) => (
                <PostingLineEditor
                  key={line.key}
                  line={line}
                  accountName={line.accountId ? accountById.get(line.accountId)?.name : undefined}
                  canRemove={lines.length > 2}
                  onPickAccount={() => setPicker({ kind: 'line', key: line.key })}
                  onChange={(changes) => updateLine(line.key, changes)}
                  onRemove={() =>
                    setLines((current) => current.filter((item) => item.key !== line.key))
                  }
                />
              ))}

              <Button
                label="Add line"
                variant="secondary"
                onPress={() =>
                  setLines((current) => [
                    ...current,
                    { key: nextDraftKey(), accountId: null, side: 'cr', amountText: '' },
                  ])
                }
              />

              <BalanceIndicator
                debit={validation.debit}
                credit={validation.credit}
                shakeKey={shakeKey}
              />
            </Animated.View>
          )}

          <View style={styles.section}>
            <ChoiceChips label="Date" choices={dateChoices} value={date} onChange={setDate} />
            <ThemedText type="small" themeColor="textSecondary">
              {formatDateLong(date)}
            </ThemedText>

            <TextField
              label="Note (optional)"
              value={narration}
              onChangeText={setNarration}
              placeholder="What was this for?"
              maxLength={120}
            />
          </View>

          {error ? (
            <Animated.View entering={riseIn(0, 6, Duration.base)}>
              <ThemedText type="small" style={{ color: theme.negative }}>
                {error}
              </ThemedText>
            </Animated.View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button label={isEditing ? 'Save changes' : 'Save entry'} onPress={submit} />
        </View>
      </KeyboardAvoidingView>

      <AccountPickerSheet
        visible={picker !== null}
        title={picker?.kind === 'party' ? 'Choose a ledger' : 'Choose an account'}
        accounts={picker?.kind === 'party' ? parties : accounts}
        selectedId={picker?.kind === 'party' ? partyId : counterId}
        onClose={() => setPicker(null)}
        onSelect={(account: Account) => {
          if (picker?.kind === 'party') {
            setPartyId(account.id);
          } else if (picker?.kind === 'counter') {
            setCounterId(account.id);
          } else if (picker?.kind === 'line') {
            updateLine(picker.key, { accountId: account.id });
          }
          setPicker(null);
          setError(undefined);
        }}
      />
    </Screen>
  );
}

type Theme = ReturnType<typeof useTheme>;

function toneColor(theme: Theme, tone: 'positive' | 'negative' | 'neutral'): string {
  if (tone === 'positive') {
    return theme.positive;
  }
  if (tone === 'negative') {
    return theme.negative;
  }
  return theme.textSecondary;
}

interface SelectRowProps {
  label: string;
  value: string;
  /** Secondary line under the value, e.g. the ledger's current balance. */
  subtitle?: string;
  subtitleColor?: string;
  onPress: () => void;
}

function SelectRow({ label, value, subtitle, subtitleColor, onPress }: SelectRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.selectRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${label}: ${value}, ${subtitle}` : `${label}: ${value}`}
        onPress={onPress}
        scaleTo={0.98}
        style={[
          styles.selectButton,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <View style={styles.selectTextColumn}>
          <ThemedText style={styles.selectValue} numberOfLines={1}>
            {value}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="small" style={{ color: subtitleColor ?? theme.textSecondary }}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Change
        </ThemedText>
      </PressableScale>
    </View>
  );
}

interface EntryPreviewProps {
  debitName: string;
  creditName: string;
  amount: string;
  /** Where the ledger stands once this entry is saved. */
  outcome: string;
  outcomeColor: string;
}

/** Shows the balanced entry that the quick-entry taps will actually store. */
function EntryPreview({ debitName, creditName, amount, outcome, outcomeColor }: EntryPreviewProps) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={riseIn(0, 6, Duration.base)}
      layout={settle}
      style={[styles.preview, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        Will be recorded as
      </ThemedText>
      <View style={styles.previewRow}>
        <ThemedText type="smallBold" style={{ color: theme.negative }}>
          Dr
        </ThemedText>
        <ThemedText style={styles.previewName} numberOfLines={1}>
          {debitName}
        </ThemedText>
        <ThemedText type="smallBold">{amount}</ThemedText>
      </View>
      <View style={[styles.previewRow, styles.previewIndent]}>
        <ThemedText type="smallBold" style={{ color: theme.positive }}>
          Cr
        </ThemedText>
        <ThemedText style={styles.previewName} numberOfLines={1}>
          {creditName}
        </ThemedText>
        <ThemedText type="smallBold">{amount}</ThemedText>
      </View>

      <View style={[styles.previewOutcome, { borderTopColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          After saving
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: outcomeColor }} numberOfLines={1}>
          {outcome}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

interface BalanceIndicatorProps {
  debit: number;
  credit: number;
  shakeKey: number;
}

function BalanceIndicator({ debit, credit, shakeKey }: BalanceIndicatorProps) {
  const theme = useTheme();
  const difference = debit - credit;
  const isBalanced = difference === 0 && debit > 0;

  return (
    <Animated.View
      key={shakeKey}
      entering={fadeIn(0, Duration.base)}
      style={[
        styles.balanceBar,
        {
          backgroundColor: isBalanced ? theme.positiveSoft : theme.negativeSoft,
        },
      ]}>
      <View style={styles.balanceCell}>
        <ThemedText type="small" themeColor="textSecondary">
          Debit
        </ThemedText>
        <ThemedText type="smallBold">{formatAmount(debit)}</ThemedText>
      </View>
      <View style={styles.balanceCell}>
        <ThemedText type="small" themeColor="textSecondary">
          Credit
        </ThemedText>
        <ThemedText type="smallBold">{formatAmount(credit)}</ThemedText>
      </View>
      <View style={styles.balanceCell}>
        <ThemedText type="small" themeColor="textSecondary">
          Difference
        </ThemedText>
        <ThemedText
          type="smallBold"
          style={{ color: isBalanced ? theme.positive : theme.negative }}>
          {isBalanced ? 'Balanced' : formatAmount(Math.abs(difference))}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.three,
  },
  selectRow: {
    gap: Spacing.one,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectTextColumn: {
    flexShrink: 1,
    minWidth: 0,
  },
  selectValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewOutcome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  preview: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  previewIndent: {
    paddingLeft: Spacing.four,
  },
  previewName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  balanceBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  balanceCell: {
    flex: 1,
    gap: Spacing.half,
  },
  footer: {
    paddingVertical: Spacing.three,
  },
  blocked: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  blockedTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  blockedMessage: {
    marginBottom: Spacing.two,
  },
});
