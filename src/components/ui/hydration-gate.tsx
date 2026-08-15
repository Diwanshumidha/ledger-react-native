import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useLedger } from '@/state/ledger-store';

export interface HydrationGateProps {
  children: ReactNode;
}

/**
 * Holds a screen back until the book has loaded from storage.
 *
 * Composers seed their form state from existing ledgers on mount — the default
 * party, a shared expense's saved members and payer. Mounting before hydration
 * would capture an empty account list as the default and never recover, so the
 * screens that do this wait here first.
 */
export function HydrationGate({ children }: HydrationGateProps) {
  const { isHydrated } = useLedger();
  const theme = useTheme();

  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={theme.textSecondary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
