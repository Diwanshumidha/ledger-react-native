import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { AccountPickerSheet } from '@/components/ledger/account-picker-sheet';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import type { Account, SplitMethod } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useAccount, useLedger, useLedgerActions } from '@/state/ledger-store';

const METHOD_CHOICES: { value: SplitMethod; label: string }[] = [
  { value: 'equal', label: 'Split equally' },
  { value: 'exact', label: 'Exact amounts' },
];

const SELF_CHOICES = [
  { value: 'yes' as const, label: 'You take a share' },
  { value: 'no' as const, label: 'You only collect' },
];

export default function SplitGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { accounts } = useLedger();
  const { updateAccount } = useLedgerActions();
  const ledger = useAccount(id);

  const parties = useMemo(() => accounts.filter((a) => a.role === 'party'), [accounts]);
  const fundingAccounts = useMemo(
    () => accounts.filter((a) => a.role === 'cash' || a.role === 'bank'),
    [accounts],
  );
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const existing = ledger?.splitGroup;
  const [memberIds, setMemberIds] = useState<string[]>(existing?.memberIds ?? []);
  const [includeSelf, setIncludeSelf] = useState(existing?.includeSelf ?? true);
  const [method, setMethod] = useState<SplitMethod>(existing?.method ?? 'equal');
  const [payerId, setPayerId] = useState(
    existing?.defaultPayerId ?? fundingAccounts[0]?.id ?? '',
  );
  const [picker, setPicker] = useState<'member' | 'payer' | null>(null);

  if (!ledger) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          glyph="🔍"
          title="Ledger not found"
          message="It may have been deleted."
          actionLabel="Back"
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  const payer = accountById.get(payerId);
  const memberPool = parties.filter((party) => !memberIds.includes(party.id));

  const save = () => {
    updateAccount(ledger.id, {
      splitGroup: { memberIds, includeSelf, method, defaultPayerId: payerId },
    });
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/ledger/${ledger.id}`);
    }
  };

  const stopSharing = () => {
    updateAccount(ledger.id, { splitGroup: undefined });
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/ledger/${ledger.id}`);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: `${ledger.name} · sharing` }} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ThemedText type="small" themeColor="textSecondary">
          Members and defaults are remembered, so recording a shared {ledger.name.toLowerCase()}{' '}
          expense is just the amount and who paid.
        </ThemedText>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              Members
            </ThemedText>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Add a member"
              onPress={() => setPicker('member')}
              scaleTo={0.95}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                + Add member
              </ThemedText>
            </PressableScale>
          </View>

          {memberIds.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              No one added yet. Add the people you split this expense with.
            </ThemedText>
          ) : (
            memberIds.map((memberId) => {
              const member = accountById.get(memberId);
              if (!member) {
                return null;
              }
              return (
                <Animated.View
                  key={memberId}
                  layout={LinearTransition.springify().damping(18)}
                  style={[styles.memberRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Avatar name={member.name} hue={member.hue} size={36} />
                  <ThemedText type="smallBold" style={styles.memberName} numberOfLines={1}>
                    {member.name}
                  </ThemedText>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.name}`}
                    onPress={() =>
                      setMemberIds((current) => current.filter((item) => item !== memberId))
                    }
                    scaleTo={0.88}
                    style={styles.removeButton}>
                    <ThemedText style={{ color: theme.textSecondary }}>✕</ThemedText>
                  </PressableScale>
                </Animated.View>
              );
            })
          )}
        </View>

        <ChoiceChips
          label="Your part"
          choices={SELF_CHOICES}
          value={includeSelf ? 'yes' : 'no'}
          onChange={(next) => setIncludeSelf(next === 'yes')}
        />

        <ChoiceChips label="Default split" choices={METHOD_CHOICES} value={method} onChange={setMethod} />

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Usually paid from
          </ThemedText>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Usually paid from: ${payer?.name ?? 'not set'}`}
            onPress={() => setPicker('payer')}
            scaleTo={0.98}
            style={[
              styles.selectButton,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <ThemedText style={styles.selectValue}>{payer?.name ?? 'Choose an account'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Change
            </ThemedText>
          </PressableScale>
        </View>

        <Button label="Save sharing" onPress={save} disabled={memberIds.length === 0 || !payerId} />

        {existing ? (
          <Button label="Stop sharing this ledger" variant="ghost" onPress={stopSharing} />
        ) : null}
      </ScrollView>

      <AccountPickerSheet
        visible={picker !== null}
        title={picker === 'member' ? 'Add a member' : 'Usually paid from'}
        accounts={picker === 'member' ? memberPool : [...fundingAccounts, ...parties]}
        selectedId={picker === 'payer' ? payerId : null}
        emptyMessage={
          picker === 'member'
            ? 'Create a ledger for the person first, then add them here.'
            : 'No accounts available.'
        }
        onClose={() => setPicker(null)}
        onSelect={(account: Account) => {
          if (picker === 'member') {
            setMemberIds((current) =>
              current.includes(account.id) ? current : [...current, account.id],
            );
          } else {
            setPayerId(account.id);
          }
          setPicker(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  hint: {
    paddingVertical: Spacing.two,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  memberName: {
    flex: 1,
    minWidth: 0,
  },
  removeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
