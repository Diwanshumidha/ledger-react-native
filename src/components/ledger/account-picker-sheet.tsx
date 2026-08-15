import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import type { Account } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

export interface AccountPickerSheetProps {
  visible: boolean;
  title: string;
  accounts: Account[];
  selectedId?: string | null;
  onSelect: (account: Account) => void;
  onClose: () => void;
  /** Shown when the list is empty. */
  emptyMessage?: string;
}

/** Bottom sheet for choosing a ledger, with search. */
export function AccountPickerSheet({
  visible,
  title,
  accounts,
  selectedId,
  onSelect,
  onClose,
  emptyMessage = 'No ledgers available.',
}: AccountPickerSheetProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const visibleAccounts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) {
      return accounts;
    }
    return accounts.filter((account) => account.name.toLowerCase().includes(needle));
  }, [accounts, query]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(120)}
        style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <Pressable accessibilityLabel="Dismiss" style={styles.flex} onPress={onClose} />

        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(180)}
          style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <ThemedText style={styles.title}>{title}</ThemedText>

          <TextField
            label="Search"
            value={query}
            onChangeText={setQuery}
            placeholder="Ledger name"
          />

          <FlatList
            data={visibleAccounts}
            keyExtractor={(account) => account.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.gap} />}
            renderItem={({ item }) => (
              <PressableScale
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === selectedId }}
                onPress={() => {
                  setQuery('');
                  onSelect(item);
                }}
                style={[
                  styles.option,
                  {
                    backgroundColor: item.id === selectedId ? theme.accentSoft : theme.card,
                    borderColor: item.id === selectedId ? theme.accent : theme.border,
                  },
                ]}>
                <Avatar name={item.name} hue={item.hue} size={36} />
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {labelForAccount(item)}
                  </ThemedText>
                </View>
              </PressableScale>
            )}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                {emptyMessage}
              </ThemedText>
            }
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function labelForAccount(account: Account): string {
  if (account.role === 'party') {
    return 'Party';
  }
  if (account.role === 'cash' || account.role === 'bank') {
    return account.role === 'cash' ? 'Cash' : 'Bank';
  }
  return account.type.charAt(0).toUpperCase() + account.type.slice(1);
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    alignSelf: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: Spacing.four,
  },
  gap: {
    height: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  empty: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
});
