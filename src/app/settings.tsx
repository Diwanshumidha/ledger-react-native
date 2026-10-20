import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { HydrationGate } from '@/components/ui/hydration-gate';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { riseIn } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import { isValidUpiId } from '@/domain/upi';
import { useLedgerActions, useProfile } from '@/state/ledger-store';

export default function PaymentDetailsScreen() {
  // The form starts from the saved details, so wait for the book to load.
  return (
    <HydrationGate>
      <PaymentDetailsForm />
    </HydrationGate>
  );
}

function PaymentDetailsForm() {
  const router = useRouter();
  const profile = useProfile();
  const { updateProfile } = useLedgerActions();

  const [name, setName] = useState(profile.name ?? '');
  const [upiId, setUpiId] = useState(profile.upiId ?? '');
  const [error, setError] = useState<string | undefined>();

  const save = () => {
    const trimmed = upiId.trim();
    if (trimmed.length > 0 && !isValidUpiId(trimmed)) {
      setError('That doesn’t look like a UPI ID. It should look like name@okaxis.');
      return;
    }
    updateProfile({ name: name.trim() || undefined, upiId: trimmed || undefined });
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
            <ThemedText type="small" themeColor="textSecondary">
              When you share a statement with someone who owes you, it ends with your UPI ID and a
              link that opens their UPI app with the amount filled in.
            </ThemedText>

            <TextField
              label="Your UPI ID"
              value={upiId}
              onChangeText={(next) => {
                setUpiId(next);
                setError(undefined);
              }}
              placeholder="name@okaxis"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              error={error}
              maxLength={100}
            />

            <TextField
              label="Your name (optional)"
              value={name}
              onChangeText={setName}
              placeholder="Shown to the person paying"
              maxLength={60}
            />
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Save" onPress={save} />
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
