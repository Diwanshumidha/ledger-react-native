import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { CurrencySymbol } from '@/domain/money';
import type { PostingSide } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

export interface DraftPosting {
  key: string;
  accountId: string | null;
  side: PostingSide;
  amountText: string;
}

export interface PostingLineEditorProps {
  line: DraftPosting;
  accountName?: string;
  canRemove: boolean;
  onPickAccount: () => void;
  onChange: (changes: Partial<DraftPosting>) => void;
  onRemove: () => void;
}

/** One editable Dr/Cr line of a manual journal entry. */
export function PostingLineEditor({
  line,
  accountName,
  canRemove,
  onPickAccount,
  onChange,
  onRemove,
}: PostingLineEditorProps) {
  const theme = useTheme();
  const isDebit = line.side === 'dr';
  const sideColor = isDebit ? theme.negative : theme.positive;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(160)}
      layout={LinearTransition.springify().damping(18)}
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Toggle debit or credit, currently ${isDebit ? 'debit' : 'credit'}`}
        onPress={() => onChange({ side: isDebit ? 'cr' : 'dr' })}
        scaleTo={0.9}
        style={[styles.sideToggle, { borderColor: sideColor }]}>
        <ThemedText type="smallBold" style={{ color: sideColor }}>
          {isDebit ? 'Dr' : 'Cr'}
        </ThemedText>
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={accountName ? `Ledger: ${accountName}` : 'Choose a ledger'}
        onPress={onPickAccount}
        scaleTo={0.98}
        style={styles.accountButton}>
        <ThemedText
          numberOfLines={1}
          style={[styles.accountName, !accountName && { color: theme.textSecondary }]}>
          {accountName ?? 'Choose ledger'}
        </ThemedText>
      </PressableScale>

      <View style={[styles.amountBox, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary">
          {CurrencySymbol}
        </ThemedText>
        <TextInput
          value={line.amountText}
          onChangeText={(next) => onChange({ amountText: next.replace(/[^0-9.]/g, '') })}
          placeholder="0"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          inputMode="decimal"
          accessibilityLabel="Line amount"
          style={[styles.amountInput, noFocusRing, { color: theme.text }]}
        />
      </View>

      {canRemove ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Remove line"
          onPress={onRemove}
          scaleTo={0.88}
          style={styles.removeButton}>
          <ThemedText style={{ color: theme.textSecondary }}>✕</ThemedText>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sideToggle: {
    width: 40,
    height: 36,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountButton: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    minHeight: 36,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    height: 36,
    borderRadius: Radius.small,
    minWidth: 96,
  },
  amountInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    paddingVertical: 0,
  },
  removeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const noFocusRing = Platform.select({ web: { outline: 'none' }, default: undefined });
