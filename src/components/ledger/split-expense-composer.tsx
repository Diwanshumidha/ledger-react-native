import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AccountPickerSheet } from '@/components/ledger/account-picker-sheet';
import { AmountField } from '@/components/ledger/amount-field';
import { ParticipantRow } from '@/components/ledger/participant-row';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { TextField } from '@/components/ui/text-field';
import { Duration, fadeIn, riseIn, settle } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import { formatDateLong, shiftCalendarDate, today } from '@/domain/date';
import { formatAmount, formatMoney, parseMoney } from '@/domain/money';
import {
  allocateEqually,
  buildSplitPostings,
  describeSplit,
  SELF_PARTICIPANT,
  validateSplit,
  type ParticipantShare,
} from '@/domain/split';
import type { Account, SplitMethod } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useLedger, useLedgerActions } from '@/state/ledger-store';

const METHOD_CHOICES: { value: SplitMethod; label: string }[] = [
  { value: 'equal', label: 'Split equally' },
  { value: 'exact', label: 'Exact amounts' },
];

export interface SplitExpenseComposerProps {
  /** Expense ledger to start on, e.g. when opened from the Gym ledger. */
  initialLedgerId?: string;
  /** Rendered above the form — used to keep the mode switcher in view. */
  header?: ReactNode;
  /** Called after the entry has been recorded. */
  onSaved: () => void;
}

/**
 * Records a shared expense as one balanced entry. Used both by the dedicated
 * split route and by the split mode of the main entry composer.
 */
export function SplitExpenseComposer({
  initialLedgerId,
  header,
  onSaved,
}: SplitExpenseComposerProps) {
  const router = useRouter();
  const theme = useTheme();
  const { accounts } = useLedger();
  const { addEntry } = useLedgerActions();

  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const parties = useMemo(() => accounts.filter((a) => a.role === 'party'), [accounts]);
  const expenseLedgers = useMemo(
    () => accounts.filter((a) => a.role === 'category' && a.type === 'expense'),
    [accounts],
  );
  const fundingAccounts = useMemo(
    () => accounts.filter((a) => a.role === 'cash' || a.role === 'bank'),
    [accounts],
  );

  const initialLedger = initialLedgerId ? accountById.get(initialLedgerId) : expenseLedgers[0];
  const group = initialLedger?.splitGroup;

  // These seed from the saved group once, on mount. The caller must not render
  // this composer until the store has hydrated, or the defaults would be taken
  // from an empty account list. See the `isHydrated` guards in the routes.
  const [expenseId, setExpenseId] = useState<string | null>(initialLedger?.id ?? null);
  const [payerId, setPayerId] = useState<string>(
    group?.defaultPayerId ?? fundingAccounts[0]?.id ?? '',
  );
  const [method, setMethod] = useState<SplitMethod>(group?.method ?? 'equal');
  const [includeSelf, setIncludeSelf] = useState(group?.includeSelf ?? true);
  const [memberIds, setMemberIds] = useState<string[]>(group?.memberIds ?? []);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [totalText, setTotalText] = useState('');
  const [exactText, setExactText] = useState<Record<string, string>>({});
  const [date, setDate] = useState(today());
  const [narration, setNarration] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [shakeKey, setShakeKey] = useState(0);
  const [picker, setPicker] = useState<'expense' | 'payer' | 'member' | null>(null);

  const expense = expenseId ? accountById.get(expenseId) : undefined;
  const payer = accountById.get(payerId);
  const total = parseMoney(totalText);

  /** Stable participant order: you first, then members as they were added. */
  const participantIds = useMemo(() => {
    const ids = includeSelf ? [SELF_PARTICIPANT, ...memberIds] : [...memberIds];
    return ids.filter((id) => !excluded.has(id));
  }, [excluded, includeSelf, memberIds]);

  const shares = useMemo<ParticipantShare[]>(() => {
    if (method === 'equal') {
      const amounts = allocateEqually(total, participantIds.length);
      return participantIds.map((participantId, index) => ({
        participantId,
        amount: amounts[index] ?? 0,
      }));
    }
    return participantIds.map((participantId) => ({
      participantId,
      amount: parseMoney(exactText[participantId] ?? ''),
    }));
  }, [exactText, method, participantIds, total]);

  const splitInput = useMemo(
    () => ({
      expenseAccountId: expenseId ?? '',
      payerAccountId: payerId,
      shares,
    }),
    [expenseId, payerId, shares],
  );

  const validation = useMemo(() => validateSplit(splitInput), [splitInput]);
  const sharesTotal = validation.total;
  const exactMismatch = method === 'exact' && total > 0 && sharesTotal !== total;

  const postings = useMemo(() => {
    if (!validation.isValid || exactMismatch) {
      return [];
    }
    try {
      return buildSplitPostings(splitInput);
    } catch {
      return [];
    }
  }, [exactMismatch, splitInput, validation.isValid]);

  const reject = (message: string) => {
    setError(message);
    setShakeKey((key) => key + 1);
  };

  const submit = () => {
    if (!expenseId) {
      reject('Choose the expense ledger.');
      return;
    }
    if (method === 'equal' && total <= 0) {
      reject('Enter the bill amount.');
      return;
    }
    if (exactMismatch) {
      reject(
        `Shares add up to ${formatAmount(sharesTotal)}, but the bill is ${formatAmount(total)}.`,
      );
      return;
    }
    if (!validation.isValid) {
      reject(validation.errors[0] ?? 'This split cannot be recorded.');
      return;
    }

    try {
      addEntry({
        date,
        narration: narration.trim() || defaultNarration(expense),
        postings: buildSplitPostings(splitInput),
      });
      onSaved();
    } catch (cause) {
      reject(cause instanceof Error ? cause.message : 'Could not save this split.');
    }
  };

  if (expenseLedgers.length === 0) {
    return (
      <EmptyState
        glyph="🏋️"
        title="No shared expense ledger yet"
        message="Create an expense ledger — like Gym — then choose who it is split with."
        actionLabel="Create expense ledger"
        onAction={() => router.replace('/ledger/new?kind=category')}
      />
    );
  }

  const memberPool = parties.filter((party) => !memberIds.includes(party.id));

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {header}

          <SelectRow
            label="Expense ledger"
            value={expense?.name ?? 'Choose a ledger'}
            onPress={() => setPicker('expense')}
          />

          <AmountField
            value={totalText}
            onChangeText={(next) => {
              setTotalText(next);
              setError(undefined);
            }}
            autoFocus
            shakeKey={shakeKey}
          />

          <SelectRow
            label="Paid by"
            value={payer?.name ?? 'Choose an account'}
            onPress={() => setPicker('payer')}
          />

          {payer ? (
            <Animated.View
              entering={fadeIn(0, Duration.base)}
              style={[styles.note, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {describeSplit(validation, payer.name)}
              </ThemedText>
            </Animated.View>
          ) : null}

          <ChoiceChips
            label="Split"
            choices={METHOD_CHOICES}
            value={method}
            onChange={(next) => {
              setMethod(next);
              setError(undefined);
            }}
          />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="small" themeColor="textSecondary">
                Split between
              </ThemedText>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Add someone to this split"
                onPress={() => setPicker('member')}
                scaleTo={0.95}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  + Add person
                </ThemedText>
              </PressableScale>
            </View>

            <ParticipantRow
              name="You"
              hue={210}
              isIncluded={includeSelf && !excluded.has(SELF_PARTICIPANT)}
              amount={shareFor(shares, SELF_PARTICIPANT)}
              editable={method === 'exact'}
              amountText={exactText[SELF_PARTICIPANT] ?? ''}
              onToggle={() => {
                setIncludeSelf((current) => !current);
                setError(undefined);
              }}
              onChangeAmount={(next) =>
                setExactText((current) => ({ ...current, [SELF_PARTICIPANT]: next }))
              }
            />

            {memberIds.map((memberId) => {
              const member = accountById.get(memberId);
              if (!member) {
                return null;
              }
              return (
                <ParticipantRow
                  key={memberId}
                  name={member.name}
                  hue={member.hue}
                  isPayer={member.id === payerId}
                  hint={
                    validation.payerIsMember && payer
                      ? `settles with ${payer.name}`
                      : undefined
                  }
                  isIncluded={!excluded.has(memberId)}
                  amount={shareFor(shares, memberId)}
                  editable={method === 'exact'}
                  amountText={exactText[memberId] ?? ''}
                  onToggle={() => {
                    setExcluded((current) => {
                      const next = new Set(current);
                      if (next.has(memberId)) {
                        next.delete(memberId);
                      } else {
                        next.add(memberId);
                      }
                      return next;
                    });
                    setError(undefined);
                  }}
                  onChangeAmount={(next) =>
                    setExactText((current) => ({ ...current, [memberId]: next }))
                  }
                />
              );
            })}

            {method === 'exact' ? (
              <View style={styles.tallyRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Shares total
                </ThemedText>
                <ThemedText
                  type="smallBold"
                  style={{ color: exactMismatch ? theme.negative : theme.positive }}>
                  {formatAmount(sharesTotal)}
                  {total > 0 ? ` of ${formatAmount(total)}` : ''}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {postings.length > 0 ? (
            <SplitPreview
              postings={postings}
              nameFor={(id) => accountById.get(id)?.name ?? 'Deleted ledger'}
            />
          ) : null}

          <View style={styles.section}>
            <ChoiceChips
              label="Date"
              choices={[
                { value: today(), label: 'Today' },
                { value: shiftCalendarDate(today(), -1), label: 'Yesterday' },
              ]}
              value={date}
              onChange={setDate}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {formatDateLong(date)}
            </ThemedText>

            <TextField
              label="Note (optional)"
              value={narration}
              onChangeText={setNarration}
              placeholder={defaultNarration(expense)}
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
          <Button label="Save split" onPress={submit} />
        </View>
      </KeyboardAvoidingView>

      <AccountPickerSheet
        visible={picker !== null}
        title={
          picker === 'expense'
            ? 'Choose expense ledger'
            : picker === 'payer'
              ? 'Who paid?'
              : 'Add someone'
        }
        accounts={
          picker === 'expense'
            ? expenseLedgers
            : picker === 'payer'
              ? [...fundingAccounts, ...parties]
              : memberPool
        }
        selectedId={picker === 'expense' ? expenseId : picker === 'payer' ? payerId : null}
        emptyMessage={
          picker === 'member'
            ? 'Everyone you have a ledger for is already in this split.'
            : 'No ledgers available.'
        }
        onClose={() => setPicker(null)}
        onSelect={(account: Account) => {
          if (picker === 'expense') {
            setExpenseId(account.id);
            const nextGroup = account.splitGroup;
            if (nextGroup) {
              setMemberIds(nextGroup.memberIds);
              setIncludeSelf(nextGroup.includeSelf);
              setMethod(nextGroup.method);
              setPayerId(nextGroup.defaultPayerId);
              setExcluded(new Set());
            }
          } else if (picker === 'payer') {
            setPayerId(account.id);
          } else if (picker === 'member') {
            setMemberIds((current) =>
              current.includes(account.id) ? current : [...current, account.id],
            );
          }
          setPicker(null);
          setError(undefined);
        }}
      />
    </>
  );
}

function shareFor(shares: ParticipantShare[], participantId: string): number {
  return shares.find((share) => share.participantId === participantId)?.amount ?? 0;
}

/**
 * The ledger name alone — the journal card derives the "split N ways" badge
 * from the postings, so repeating it in the narration is noise.
 */
function defaultNarration(expense: Account | undefined): string {
  return expense?.name ?? 'Shared expense';
}

interface SelectRowProps {
  label: string;
  value: string;
  onPress: () => void;
}

function SelectRow({ label, value, onPress }: SelectRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.selectRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={onPress}
        scaleTo={0.98}
        style={[
          styles.selectButton,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <ThemedText style={styles.selectValue}>{value}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Change
        </ThemedText>
      </PressableScale>
    </View>
  );
}

interface SplitPreviewProps {
  postings: { accountId: string; side: 'dr' | 'cr'; amount: number }[];
  nameFor: (id: string) => string;
}

/** The exact entry that will be written, so the split is never a black box. */
function SplitPreview({ postings, nameFor }: SplitPreviewProps) {
  const theme = useTheme();
  const debits = postings.filter((posting) => posting.side === 'dr');
  const credits = postings.filter((posting) => posting.side === 'cr');

  return (
    <Animated.View
      entering={riseIn(0, 6, Duration.base)}
      layout={settle}
      style={[styles.preview, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        Will be recorded as
      </ThemedText>

      {debits.map((posting, index) => (
        <View key={`dr-${index}`} style={styles.previewRow}>
          <ThemedText type="smallBold" style={{ color: theme.negative }}>
            Dr
          </ThemedText>
          <ThemedText style={styles.previewName} numberOfLines={1}>
            {nameFor(posting.accountId)}
          </ThemedText>
          <ThemedText type="smallBold">{formatAmount(posting.amount)}</ThemedText>
        </View>
      ))}

      {credits.map((posting, index) => (
        <View key={`cr-${index}`} style={[styles.previewRow, styles.previewIndent]}>
          <ThemedText type="smallBold" style={{ color: theme.positive }}>
            Cr
          </ThemedText>
          <ThemedText style={styles.previewName} numberOfLines={1}>
            {nameFor(posting.accountId)}
          </ThemedText>
          <ThemedText type="smallBold">{formatAmount(posting.amount)}</ThemedText>
        </View>
      ))}

      <View style={[styles.previewTotal, { borderTopColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Balanced
        </ThemedText>
        <ThemedText type="smallBold">
          {formatMoney(credits.reduce((sum, posting) => sum + posting.amount, 0))}
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
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  selectValue: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  note: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  tallyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.one,
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
  previewTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  footer: {
    paddingVertical: Spacing.three,
  },
});
