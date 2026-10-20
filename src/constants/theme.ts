/**
 * The palette is taken from an accountant's columnar pad: pale sage paper,
 * green ruling, green-black ink, and red ink for what goes out. Primary actions
 * are filled with ink rather than a brand colour, the way a ledger is written.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** Ink. */
    text: '#17261E',
    /** Paper. */
    background: '#EEF2EA',
    /** Wells for inputs and segmented controls. */
    backgroundElement: '#E1E8DC',
    backgroundSelected: '#D2DCCB',
    textSecondary: '#56675C',
    /** Surface for panels that sit on `background`. */
    card: '#F6F8F2',
    /** Ruling. */
    border: '#C9D6C3',
    accent: '#17261E',
    accentSoft: '#DAE3D3',
    onAccent: '#F3F6EF',
    /** Money coming to you. */
    positive: '#1D6A44',
    positiveSoft: '#D6E7D8',
    /** Money you owe — red ink. */
    negative: '#B0302A',
    negativeSoft: '#F2DDD8',
    overlay: 'rgba(23, 38, 30, 0.38)',
  },
  dark: {
    text: '#E3EBE2',
    background: '#111914',
    backgroundElement: '#1A241E',
    backgroundSelected: '#25322A',
    textSecondary: '#93A398',
    card: '#16201A',
    border: '#2A3930',
    accent: '#E3EBE2',
    accentSoft: '#22302A',
    onAccent: '#111914',
    positive: '#6FCB98',
    positiveSoft: '#16301F',
    negative: '#F07A70',
    negativeSoft: '#37201C',
    overlay: 'rgba(0, 0, 0, 0.55)',
  },
} as const;

export const Radius = {
  small: 6,
  medium: 10,
  large: 14,
  pill: 999,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Font files are loaded per weight, so a weight is chosen by family name
 * rather than `fontWeight` (which Android ignores for custom fonts and iOS
 * may answer with the system font). `ThemedText` does the mapping.
 */
export const FontFaces = {
  body: {
    400: 'PublicSans_400Regular',
    500: 'PublicSans_500Medium',
    600: 'PublicSans_600SemiBold',
    700: 'PublicSans_700Bold',
  },
  display: {
    400: 'BricolageGrotesque_500Medium',
    500: 'BricolageGrotesque_500Medium',
    600: 'BricolageGrotesque_600SemiBold',
    700: 'BricolageGrotesque_700Bold',
  },
} as const;

export type FontFace = keyof typeof FontFaces;

export function fontFamilyFor(face: FontFace, weight: unknown): string {
  const numeric = Number(weight === 'bold' ? 700 : weight === 'normal' ? 400 : weight);
  const snapped = !Number.isFinite(numeric)
    ? 400
    : numeric >= 700
      ? 700
      : numeric >= 600
        ? 600
        : numeric >= 500
          ? 500
          : 400;
  return FontFaces[face][snapped];
}

export const Fonts = Platform.select({
  ios: {
    sans: FontFaces.body[400],
    mono: 'ui-monospace',
  },
  default: {
    sans: FontFaces.body[400],
    mono: 'monospace',
  },
  web: {
    sans: FontFaces.body[400],
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
