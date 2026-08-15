import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import type { AccountType } from '@/domain/types';
import { useLedger, useLedgerActions } from '@/state/ledger-store';

type LedgerKind = 'party' | 'category';

const KIND_CHOICES = [
  { value: 'party' as const, label: 'Customer / Supplier' },
  { value: 'category' as const, label: 'Income / Expense' },
];

const CATEGORY_TYPE_CHOICES: { value: AccountType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Capital' },
];

export default function NewLedgerScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const router = useRouter();
  const { accounts } = useLedger();
  const { addAccount } = useLedgerActions();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [kind, setKind] = useState<LedgerKind>(params.kind === 'category' ? 'category' : 'party');
  const [categoryType, setCategoryType] = useState<AccountType>('expense');
  const [isShared, setShared] = useState(params.kind === 'category');
  const [error, setError] = useState<string | undefined>();

  const canBeShared = kind === 'category' && categoryType === 'expense';

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Give this ledger a name.');
      return;
    }
    const isDuplicate = accounts.some(
      (account) => account.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setError('A ledger with this name already exists.');
      return;
    }

    const account = addAccount({
      name: trimmed,
      type: kind === 'party' ? 'asset' : categoryType,
      role: kind === 'party' ? 'party' : 'category',
      phone: kind === 'party' ? phone : undefined,
      note,
    });

    // A shared expense is only useful once its members are set, so go straight
    // to the sharing setup instead of an empty ledger.
    if (canBeShared && isShared) {
      router.replace(`/ledger/split-group?id=${account.id}`);
      return;
    }
    router.replace(`/ledger/${account.id}`);
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
          <Animated.View entering={FadeInDown.duration(280)} style={styles.form}>
            <TextField
              label="Ledger name"
              value={name}
              onChangeText={(next) => {
                setName(next);
                setError(undefined);
              }}
              placeholder="e.g. Ramesh Kumar"
              autoFocus
              error={error}
              maxLength={60}
            />

            <ChoiceChips label="Type" choices={KIND_CHOICES} value={kind} onChange={setKind} />

            {kind === 'party' ? (
              <TextField
                label="Phone (optional)"
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit number"
                keyboardType="phone-pad"
                maxLength={15}
              />
            ) : (
              <ChoiceChips
                label="Account type"
                choices={CATEGORY_TYPE_CHOICES}
                value={categoryType}
                onChange={setCategoryType}
                wrap
              />
            )}

            {canBeShared ? (
              <ChoiceChips
                label="Shared with others?"
                choices={[
                  { value: 'yes' as const, label: 'Split with people' },
                  { value: 'no' as const, label: 'Just mine' },
                ]}
                value={isShared ? 'yes' : 'no'}
                onChange={(next) => setShared(next === 'yes')}
              />
            ) : null}

            <TextField
              label="Note (optional)"
              value={note}
              onChangeText={setNote}
              placeholder="Anything you want to remember"
              multiline
              maxLength={200}
            />

            <ThemedText type="small" themeColor="textSecondary">
              {kind === 'party'
                ? 'Party ledgers carry a debit balance when someone owes you and a credit balance when you owe them.'
                : canBeShared && isShared
                  ? 'You will pick who shares this next. Each bill is then split into one balanced entry: your share as an expense, everyone else’s as money they owe you.'
                  : 'Category ledgers let you post entries against income and expense heads instead of a person.'}
            </ThemedText>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Create ledger" onPress={submit} disabled={name.trim().length === 0} />
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
  footer: {
    paddingVertical: Spacing.three,
  },
});
