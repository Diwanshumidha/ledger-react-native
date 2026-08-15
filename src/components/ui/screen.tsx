import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Centres content in a readable column on wide web viewports. */
  constrainWidth?: boolean;
  edges?: readonly Edge[];
  style?: ViewStyle;
}

export function Screen({
  children,
  constrainWidth = true,
  edges = ['top'],
  style,
}: ScreenProps) {
  return (
    <ThemedView style={styles.root}>
      <SafeAreaView edges={edges} style={styles.safeArea}>
        <View style={[styles.column, constrainWidth && styles.constrained, style]}>{children}</View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
  },
  constrained: {
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
  },
});
