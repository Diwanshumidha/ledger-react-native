import { Tabs, TabList, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';

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
  return (
    <View {...props} style={styles.barContainer}>
      <ThemedView type="backgroundElement" style={styles.bar}>
        <ThemedText type="smallBold" style={styles.brand}>
          Ledger
        </ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButton}>
        <ThemedText type="smallBold" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
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
    padding: Spacing.three,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexGrow: 1,
    maxWidth: MaxContentWidth,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
  },
  brand: {
    marginRight: 'auto',
    fontSize: 16,
  },
  tabButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.7,
  },
});
