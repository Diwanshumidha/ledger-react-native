import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AmountField } from '@/components/ledger/amount-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { EmptyState } from '@/components/ui/empty-state';
import { HydrationGate } from '@/components/ui/hydration-gate';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { riseIn } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import { balanceOf, buildSettlement } from '@/domain/accounting';
import { formatMoney, parseMoney, type Money } from '@/domain/money';
import { CASH_ACCOUNT_ID } from '@/domain/seed';
import { useTheme } from '@/hooks/use-theme';
import { useAccount, useLedger, useLedgerActions } from '@/state/ledger-store';

/** Minor units as an editable figure: "8400", or "8400.50" with paise. */
function toInputText(minor: Money): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}

export default function SettleScreen() {
  // The default amount is the balance, so wait for the book to load.
  return (
    <HydrationGate>
      <SettleComposer />
    </HydrationGate>
  );
}

function SettleComposer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { accounts, entries } = useLedger();
  const { addEntry } = useLedgerActions();
  const party = useAccount(id);

  const balance = useMemo(() => (id ? balanceOf(id, entries) : 0), [entries, id]);
  const outstanding = Math.abs(balance);

  const moneyAccounts = useMemo(
    () => accounts.filter((account) => account.role === 'cash' || account.role === 'bank'),
    [accounts],
  );

  const [amountText, setAmountText] = useState(() => toInputText(outstanding));
  const [counterId, setCounterId] = useState(CASH_ACCOUNT_ID);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [shakeKey, setShakeKey] = useState(0);

  if (!party || party.role !== 'party') {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          glyph="🔍"
          title="Nothing to settle"
          message="Settling up works on a person's ledger."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (balance === 0) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          glyph="✅"
          title="Already settled"
          message={`You and ${party.name} are even. There is nothing to pay.`}
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const theyPay = balance > 0;
  const amount = parseMoney(amountText);
  const remaining = outstanding - amount;
  const tint = theyPay ? theme.positive : theme.negative;

  const submit = () => {
    const settlement = buildSettlement(party.id, counterId, balance, amount);
    if (!settlement) {
      setError(
        amount > outstanding
          ? `That is more than the ${formatMoney(outstanding)} due.`
          : 'Enter the amount paid.',
      );
      setShakeKey((key) => key + 1);
      return;
    }
    addEntry({
      narration: note.trim() || (remaining === 0 ? 'Settled up' : 'Part payment'),
      postings: settlement.postings,
    });
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={riseIn(0, 6)} style={styles.form}>
            <View style={styles.intro}>
              <ThemedText type="heading">
                {theyPay ? `${party.name} pays you` : `You pay ${party.name}`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatMoney(outstanding)} is due. Change the amount for a part payment.
              </ThemedText>
            </View>

            <AmountField
              value={amountText}
              onChangeText={(next) => {
                setAmountText(next);
                setError(undefined);
              }}
              tint={tint}
              shakeKey={shakeKey}
            />

            {error ? (
              <ThemedText type="small" style={{ color: theme.negative }}>
                {error}
              </ThemedText>
            ) : amount > 0 && remaining > 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {formatMoney(remaining)} will still be due after this.
              </ThemedText>
            ) : null}

            {moneyAccounts.length > 1 ? (
              <ChoiceChips
                label={theyPay ? 'Received into' : 'Paid from'}
                choices={moneyAccounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
                value={counterId}
                onChange={setCounterId}
              />
            ) : null}

            <TextField
              label="Note (optional)"
              value={note}
              onChangeText={setNote}
              placeholder={remaining === 0 ? 'Settled up' : 'Part payment'}
              maxLength={120}
            />
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={remaining === 0 ? 'Settle up' : 'Record payment'}
            variant={theyPay ? 'positive' : 'negative'}
            onPress={submit}
            disabled={amount <= 0}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
  form: {
    gap: Spacing.three,
  },
  intro: {
    gap: Spacing.one,
  },
  footer: {
    paddingVertical: Spacing.three,
  },
});
