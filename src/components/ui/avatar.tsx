import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export interface AvatarProps {
  name: string;
  hue: number;
  size?: number;
}

/** Initials chip tinted by the ledger's stable hue. */
export function Avatar({ name, hue, size = 44 }: AvatarProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const backgroundColor = isDark ? `hsl(${hue} 45% 22%)` : `hsl(${hue} 78% 93%)`;
  const color = isDark ? `hsl(${hue} 75% 72%)` : `hsl(${hue} 55% 32%)`;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: Radius.pill, backgroundColor },
      ]}>
      <ThemedText style={[styles.label, { color, fontSize: size * 0.36 }]}>
        {initialsOf(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
  },
});
