import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors, FontFaces } from '@/constants/theme';
import { LedgerProvider } from '@/state/ledger-store';

SplashScreen.preventAutoHideAsync();

/** Headers and modal chrome drawn by the navigator, in the ledger palette. */
function navigationTheme(isDark: boolean): Theme {
  const base = isDark ? DarkTheme : DefaultTheme;
  const colors = Colors[isDark ? 'dark' : 'light'];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.text,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });

  // The native splash stays up until the faces are ready, so no screen is
  // ever drawn in a fallback font and then reflowed.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme(isDark)}>
        <LedgerProvider>
          <AnimatedSplashOverlay />
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerBackButtonDisplayMode: 'minimal',
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: FontFaces.display[600], fontSize: 18 },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="ledger/[id]" options={{ title: '' }} />
            <Stack.Screen
              name="ledger/new"
              options={{ title: 'New ledger', presentation: 'modal' }}
            />
            <Stack.Screen
              name="ledger/share"
              options={{ title: 'Share statement', presentation: 'modal' }}
            />
            <Stack.Screen
              name="settings"
              options={{ title: 'Payment details', presentation: 'modal' }}
            />
            <Stack.Screen
              name="ledger/edit"
              options={{ title: 'Edit ledger', presentation: 'modal' }}
            />
            <Stack.Screen
              name="ledger/settle"
              options={{ title: 'Settle up', presentation: 'modal' }}
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
            <Stack.Screen name="entry/[id]" options={{ title: 'Entry', presentation: 'modal' }} />
          </Stack>
        </LedgerProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
