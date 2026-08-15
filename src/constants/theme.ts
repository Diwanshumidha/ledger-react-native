/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    /** Surface for cards that sit on `background`. */
    card: '#FFFFFF',
    border: '#E4E4E8',
    accent: '#2F6BFF',
    accentSoft: '#E8EFFF',
    onAccent: '#FFFFFF',
    /** Money coming to you. */
    positive: '#0E8A4A',
    positiveSoft: '#E3F5EB',
    /** Money you owe. */
    negative: '#D23F3F',
    negativeSoft: '#FCE9E9',
    overlay: 'rgba(15, 17, 21, 0.35)',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    card: '#151619',
    border: '#2A2C31',
    accent: '#5B8CFF',
    accentSoft: '#17203A',
    onAccent: '#0B1020',
    positive: '#3DD68C',
    positiveSoft: '#12261C',
    negative: '#FF6B6B',
    negativeSoft: '#2A1516',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export const Radius = {
  small: 8,
  medium: 14,
  large: 20,
  pill: 999,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
/** The web tab bar floats over the top of the page; content clears it. */
export const TopBarInset = Platform.select({ web: 76, default: 0 }) ?? 0;
export const MaxContentWidth = 800;
