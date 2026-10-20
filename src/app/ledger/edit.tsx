import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { HydrationGate } from '@/components/ui/hydration-gate';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { riseIn } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import type { Account } from '@/domain/types';
import { isValidUpiId } from '@/domain/upi';
import { useAccount, useLedger, useLedgerActions } from '@/state/ledger-store';

export default function EditLedgerScreen() {
  // The form is seeded from the saved ledger, so wait for the book to load.
  return (
    <HydrationGate>
      <EditLedgerLoader />
    </HydrationGate>
  );
}

function EditLedgerLoader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const account = useAccount(id);

  if (!account) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          glyph="🔍"
          title="Ledger not found"
          message="It may have been deleted."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return <EditLedgerForm account={account} />;
}

function EditLedgerForm({ account }: { account: Account }) {
  const router = useRouter();
  const { accounts } = useLedger();
  const { updateAccount, deleteAccount } = useLedgerActions();

  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone ?? '');
  const [upiId, setUpiId] = useState(account.upiId ?? '');
  const [upiError, setUpiError] = useState<string | undefined>();
  const [note, setNote] = useState(account.note ?? '');
  const [error, setError] = useState<string | undefined>();
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);

  const isParty = account.role === 'party';

  const save = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Give this ledger a name.');
      return;
    }
    const isDuplicate = accounts.some(
      (other) => other.id !== account.id && other.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setError('A ledger with this name already exists.');
      return;
    }

    const trimmedUpi = upiId.trim();
    if (isParty && trimmedUpi.length > 0 && !isValidUpiId(trimmedUpi)) {
      setUpiError('That doesn’t look like a UPI ID. It should look like name@okaxis.');
      return;
    }

    updateAccount(account.id, {
      name: trimmed,
      phone: isParty ? phone.trim() || undefined : account.phone,
      upiId: isParty ? trimmedUpi || undefined : account.upiId,
      note: note.trim() || undefined,
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
            <TextField
              label="Ledger name"
              value={name}
              onChangeText={(next) => {
                setName(next);
                setError(undefined);
              }}
              error={error}
              maxLength={60}
            />

            {isParty ? (
              <TextField
                label="Phone (optional)"
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit number"
                keyboardType="phone-pad"
                maxLength={15}
              />
            ) : null}

            {isParty ? (
              <TextField
                label="UPI ID (optional)"
                value={upiId}
                onChangeText={(next) => {
                  setUpiId(next);
                  setUpiError(undefined);
                }}
                placeholder="So you can pay them from here"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                error={upiError}
                maxLength={100}
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

            {account.isSystem ? (
              <ThemedText type="small" themeColor="textSecondary">
                {account.name} is one of the book’s built-in ledgers. You can rename it, but not
                delete it.
              </ThemedText>
            ) : (
              <Button
                label="Delete ledger"
                variant="danger"
                onPress={() => setConfirmingDelete(true)}
                style={styles.delete}
              />
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Save changes" onPress={save} disabled={name.trim().length === 0} />
        </View>
      </KeyboardAvoidingView>

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
          router.dismissTo('/');
        }}
      />
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
  delete: {
    marginTop: Spacing.four,
  },
  footer: {
    paddingVertical: Spacing.three,
  },
});
