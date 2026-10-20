import { Tabs, TabList, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { LogoMark } from '@/components/ui/logo-mark';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Ledgers</TabButton>
          </TabTrigger>
          <TabTrigger name="journal" href="/journal" asChild>
            <TabButton>Journal</TabButton>
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}

function TabBar(props: { children?: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View {...props} style={styles.barContainer}>
      <ThemedView style={[styles.bar, { borderBottomColor: theme.border }]}>
        <View style={styles.brand}>
          <LogoMark size={26} />
          <ThemedText type="heading" style={styles.brandName}>
            Ledger
          </ThemedText>
        </View>
        {props.children}
      </ThemedView>
    </View>
  );
}

/** The current tab is underlined in ink, the way a heading is ruled off. */
function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      <View
        style={[styles.tabButton, { borderBottomColor: isFocused ? theme.text : 'transparent' }]}>
        <ThemedText type="smallBold" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  barContainer: {
    position: 'absolute',
    width: '100%',
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    flexGrow: 1,
    maxWidth: MaxContentWidth,
    height: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    marginRight: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandName: {
    fontSize: 19,
  },
  tabButton: {
    height: 60,
    justifyContent: 'center',
    borderBottomWidth: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
