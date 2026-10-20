import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { riseIn } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
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
    <Animated.View entering={riseIn(120)} style={styles.container}>
      <View style={[styles.glyphCircle, { borderColor: theme.border }]}>
        <ThemedText style={styles.glyph}>{glyph}</ThemedText>
      </View>
      <ThemedText type="heading">{title}</ThemedText>
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
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  glyph: {
    fontSize: 32,
    lineHeight: 40,
  },
  message: {
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: Spacing.three,
    width: '100%',
    maxWidth: 280,
  },
});
