import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LedgerProvider } from '@/state/ledger-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <LedgerProvider>
          <AnimatedSplashOverlay />
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="ledger/[id]" options={{ title: '' }} />
            <Stack.Screen
              name="ledger/new"
              options={{ title: 'New ledger', presentation: 'modal' }}
            />
            <Stack.Screen
              name="ledger/split-group"
              options={{ title: 'Sharing', presentation: 'modal' }}
            />
            <Stack.Screen
              name="entry/new"
              options={{ title: 'New entry', presentation: 'modal' }}
            />
            <Stack.Screen
              name="entry/split"
              options={{ title: 'Split expense', presentation: 'modal' }}
            />
            <Stack.Screen
              name="entry/[id]"
              options={{ title: 'Entry', presentation: 'modal' }}
            />
          </Stack>
        </LedgerProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
