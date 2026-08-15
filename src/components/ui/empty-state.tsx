import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface EmptyStateProps {
  glyph: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ glyph, title, message, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Animated.View entering={FadeInDown.duration(420).springify()} style={styles.container}>
      <View style={[styles.glyphCircle, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={styles.glyph}>{glyph}</ThemedText>
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  glyphCircle: {
    width: 76,
    height: 76,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  glyph: {
    fontSize: 32,
    lineHeight: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  message: {
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: Spacing.three,
    alignSelf: 'stretch',
    maxWidth: 280,
  },
});
